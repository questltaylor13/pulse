/**
 * Discovery orchestrator (PRD 3 Phases 4 + 6).
 *
 * Runs all three pipelines (llm-research, reddit, niche-sites), passes
 * every raw candidate through the Phase 4 enrichment flow, and upserts
 * into the Discovery table. Per-pipeline counts are persisted to the
 * DiscoveryRun table so the admin dashboard can show at-a-glance
 * health.
 *
 * Flow per candidate:
 *   1. Event-vs-Gem classifier (DATED_EVENT with confidence > 0.7 → drop)
 *   2. Pulse-voice enrichment (quality < 6 → drop)
 *   3. Regional metadata via DRIVE_TIMES_FROM_DENVER
 *   4. Location verification via Google Places (no match → UNVERIFIED)
 *   5. Fuzzy dedup (same subtype + normalized title + ≤100m) → update
 *      existing instead of inserting
 *   6. Upsert Discovery row
 */

import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { lookupDriveTime } from "@/lib/regional/drive-times";
import { runLLMResearch } from "@/lib/discoveries/pipelines/llm-research";
import { runRedditMining } from "@/lib/discoveries/pipelines/reddit";
import { runNicheSites } from "@/lib/discoveries/pipelines/niche-sites";
import {
  classifyEventVsGem,
  enrichCandidate,
  QUALITY_THRESHOLD,
} from "@/lib/discoveries/enrichment";
import { verifyLocation, hasLocationSignal } from "@/lib/discoveries/verification";
import { findExistingMatch } from "@/lib/discoveries/dedup";
import type {
  PipelineCandidate,
  PipelineRunResult,
} from "@/lib/discoveries/types";
import type {
  Discovery,
  DiscoverySource,
  EventRegion,
  Prisma,
} from "@prisma/client";

const DATED_EVENT_CONFIDENCE_THRESHOLD = 0.7;
const MAX_CANDIDATES_PER_PIPELINE = 60; // Safety cap for runaway LLM output

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelineBucket {
  name: string;
  sourceType: DiscoverySource;
  run: (runBatchId: string) => Promise<PipelineRunResult>;
}

interface PipelineProcessingStats {
  rawCandidateCount: number;
  rejectedAsEventCount: number;
  droppedForQualityCount: number;
  unverifiedCount: number;
  upsertedCount: number;
  updatedExistingCount: number;
  errorCount: number;
  errors: string[];
}

function emptyStats(): PipelineProcessingStats {
  return {
    rawCandidateCount: 0,
    rejectedAsEventCount: 0,
    droppedForQualityCount: 0,
    unverifiedCount: 0,
    upsertedCount: 0,
    updatedExistingCount: 0,
    errorCount: 0,
    errors: [],
  };
}

export interface OrchestratorResult {
  runBatchId: string;
  perPipeline: Record<DiscoverySource, PipelineProcessingStats | undefined>;
  totalUpserted: number;
  totalUpdated: number;
  durationMs: number;
}

export interface RunOrchestratorOptions {
  enabledSources?: Array<"LLM_RESEARCH" | "REDDIT" | "NICHE_SITE">;
  redditMaxPostsPerSub?: number;
  runBatchId?: string;
}

// ---------------------------------------------------------------------------
// Regional metadata helper
// ---------------------------------------------------------------------------

function resolveRegion(townHint: string | null | undefined): {
  region: EventRegion;
  townName: string | null;
} {
  if (!townHint) return { region: "DENVER_METRO", townName: null };
  const match = lookupDriveTime(townHint);
  if (match) return { region: match.region, townName: townHint };
  // Fallback: unknown town — assume Denver metro unless name contains a
  // known signal. Cheap heuristic; enrichment LLM can refine later.
  return { region: "DENVER_METRO", townName: townHint };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function runOrchestrator(
  options: RunOrchestratorOptions = {}
): Promise<OrchestratorResult> {
  const runBatchId = options.runBatchId ?? randomUUID();
  const enabled = options.enabledSources ?? ["LLM_RESEARCH", "REDDIT", "NICHE_SITE"];
  const startedAt = Date.now();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env and the Vercel project env before running the orchestrator."
    );
  }
  const client = new OpenAI({ apiKey });

  const buckets: PipelineBucket[] = [];
  if (enabled.includes("LLM_RESEARCH")) {
    buckets.push({
      name: "llm-research",
      sourceType: "LLM_RESEARCH",
      run: (id) => runLLMResearch({ runBatchId: id }),
    });
  }
  if (enabled.includes("REDDIT")) {
    buckets.push({
      name: "reddit",
      sourceType: "REDDIT",
      run: (id) =>
        runRedditMining({
          runBatchId: id,
          maxPostsPerSub: options.redditMaxPostsPerSub,
        }),
    });
  }
  if (enabled.includes("NICHE_SITE")) {
    buckets.push({
      name: "niche-sites",
      sourceType: "NICHE_SITE",
      run: (id) => runNicheSites({ runBatchId: id }),
    });
  }

  const perPipeline: OrchestratorResult["perPipeline"] = {
    REDDIT: undefined,
    LLM_RESEARCH: undefined,
    NICHE_SITE: undefined,
    EDITORIAL: undefined,
    COMMUNITY: undefined,
  };
  let totalUpserted = 0;
  let totalUpdated = 0;

  for (const bucket of buckets) {
    const runRow = await prisma.discoveryRun.create({
      data: {
        runBatchId,
        source: bucket.sourceType,
        status: "PENDING",
      },
    });
    const pipelineStartedAt = Date.now();
    const stats = emptyStats();

    try {
      const pipelineResult = await bucket.run(runBatchId);
      stats.errors.push(...pipelineResult.errors);
      stats.errorCount += pipelineResult.errors.length;

      const candidates = pipelineResult.candidates.slice(0, MAX_CANDIDATES_PER_PIPELINE);
      stats.rawCandidateCount = candidates.length;

      for (const candidate of candidates) {
        try {
          const upsertResult = await processCandidate(client, candidate);
          stats.rejectedAsEventCount += upsertResult.rejectedAsEvent ? 1 : 0;
          stats.droppedForQualityCount += upsertResult.droppedForQuality ? 1 : 0;
          stats.unverifiedCount += upsertResult.unverified ? 1 : 0;
          if (upsertResult.action === "created") {
            stats.upsertedCount += 1;
            totalUpserted += 1;
          } else if (upsertResult.action === "updated") {
            stats.updatedExistingCount += 1;
            totalUpdated += 1;
          }
        } catch (err) {
          stats.errorCount += 1;
          stats.errors.push(
            `[candidate:${candidate.title.slice(0, 40)}] ${(err as Error).message}`
          );
        }
      }

      const finalStatus =
        stats.errorCount === 0
          ? "SUCCESS"
          : stats.upsertedCount + stats.updatedExistingCount > 0
            ? "PARTIAL"
            : "FAILED";

      await prisma.discoveryRun.update({
        where: { id: runRow.id },
        data: {
          status: finalStatus,
          rawCandidateCount: stats.rawCandidateCount,
          rejectedAsEventCount: stats.rejectedAsEventCount,
          droppedForQualityCount: stats.droppedForQualityCount,
          unverifiedCount: stats.unverifiedCount,
          upsertedCount: stats.upsertedCount,
          updatedExistingCount: stats.updatedExistingCount,
          errorCount: stats.errorCount,
          errors: stats.errors.slice(0, 30),
          durationMs: Date.now() - pipelineStartedAt,
        },
      });
      perPipeline[bucket.sourceType] = stats;
    } catch (err) {
      stats.errorCount += 1;
      stats.errors.push(`[pipeline:${bucket.name}] ${(err as Error).message}`);
      await prisma.discoveryRun.update({
        where: { id: runRow.id },
        data: {
          status: "FAILED",
          errorCount: stats.errorCount,
          errors: stats.errors.slice(0, 30),
          durationMs: Date.now() - pipelineStartedAt,
        },
      });
      perPipeline[bucket.sourceType] = stats;
    }
  }

  return {
    runBatchId,
    perPipeline,
    totalUpserted,
    totalUpdated,
    durationMs: Date.now() - startedAt,
  };
}

// ---------------------------------------------------------------------------
// Per-candidate processor
// ---------------------------------------------------------------------------

interface CandidateProcessResult {
  action: "created" | "updated" | "dropped";
  rejectedAsEvent?: boolean;
  droppedForQuality?: boolean;
  unverified?: boolean;
  reason?: string;
}

async function processCandidate(
  client: OpenAI,
  candidate: PipelineCandidate
): Promise<CandidateProcessResult> {
  // 1. Event-vs-Gem classifier
  const classification = await classifyEventVsGem(candidate, client);
  if (
    classification.classification === "DATED_EVENT" &&
    classification.confidence > DATED_EVENT_CONFIDENCE_THRESHOLD
  ) {
    return {
      action: "dropped",
      rejectedAsEvent: true,
      reason: classification.reason,
    };
  }

  // 2. Pulse-voice enrichment + quality scoring
  const enrichment = await enrichCandidate(candidate, client);
  if (!enrichment.enriched) {
    return {
      action: "dropped",
      droppedForQuality: true,
      reason: enrichment.reason ?? "enrichment-failed",
    };
  }
  if (enrichment.enriched.quality_score < QUALITY_THRESHOLD) {
    return {
      action: "dropped",
      droppedForQuality: true,
      reason: `quality=${enrichment.enriched.quality_score}`,
    };
  }

  // 3. Regional metadata
  const { region, townName } = resolveRegion(candidate.town_hint);

  // 4. Location verification
  const verification = await verifyLocation(candidate);
  const isVerified = verification.verified;
  const locationSignal = hasLocationSignal(candidate);
  const status = locationSignal && !isVerified ? "UNVERIFIED" : "ACTIVE";

  // 5. Dedup against existing Discoveries
  const existing = await findExistingMatch({
    subtype: candidate.subtype,
    title: enrichment.enriched.title,
    latitude: verification.latitude ?? null,
    longitude: verification.longitude ?? null,
    townName,
  });

  const baseData: Prisma.DiscoveryUncheckedCreateInput = {
    title: enrichment.enriched.title,
    description: enrichment.enriched.description,
    subtype: candidate.subtype,
    category: enrichment.enriched.category,
    neighborhood: verification.neighborhood ?? null,
    townName,
    region,
    latitude: verification.latitude ?? null,
    longitude: verification.longitude ?? null,
    seasonHint: enrichment.cleanedSeasonHint ?? candidate.season_hint ?? null,
    sourceType: candidate.sourceType,
    sourceUrl: candidate.source_urls[0] ?? null,
    sourceUpvotes: candidate.sourceContext?.postUpvotes ?? null,
    mentionedByN: candidate.sourceContext?.mentionedByN ?? 1,
    qualityScore: enrichment.enriched.quality_score,
    tags: enrichment.enriched.tags,
    status,
    verifiedAt: status === "ACTIVE" && locationSignal ? new Date() : null,
  };

  if (existing) {
    await prisma.discovery.update({
      where: { id: existing.id },
      data: {
        description: baseData.description,
        category: baseData.category,
        tags: baseData.tags,
        qualityScore: Math.max(existing.qualityScore, baseData.qualityScore),
        mentionedByN: existing.mentionedByN + 1,
        sourceUpvotes:
          (existing.sourceUpvotes ?? 0) + (baseData.sourceUpvotes ?? 0) || null,
        updatedAt: new Date(),
        // Keep existing verified/location — don't overwrite a verified row
        // with an unverified rerun.
        latitude: existing.latitude ?? baseData.latitude,
        longitude: existing.longitude ?? baseData.longitude,
        neighborhood: existing.neighborhood ?? baseData.neighborhood,
      },
    });
    return {
      action: "updated",
      unverified: status === "UNVERIFIED",
      reason: "dedup-match",
    };
  }

  await prisma.discovery.create({ data: baseData });
  return {
    action: "created",
    unverified: status === "UNVERIFIED",
  };
}

export async function findLatestDiscovery(): Promise<Discovery | null> {
  return prisma.discovery.findFirst({ orderBy: { createdAt: "desc" } });
}
