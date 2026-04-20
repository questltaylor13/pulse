/**
 * Shared types for the Hidden Gems Engine (PRD 3).
 *
 * Candidates are the canonical intermediate format produced by each pipeline
 * (LLM research, Reddit, niche sites). The Phase 4 enrichment orchestrator
 * takes these, verifies + enriches + dedups, and upserts into the Discovery
 * table.
 *
 * Phase 1 only produces candidates from the LLM research pipeline and stores
 * them in LLMResearchRun.candidates (JSON). Do not insert directly into
 * Discovery from a pipeline — enrichment gates every candidate.
 */

import { z } from "zod";
import type { DiscoverySource, DiscoverySubtype } from "@prisma/client";

// ---------------------------------------------------------------------------
// Canonical Candidate shape (pipeline output → enrichment input)
// ---------------------------------------------------------------------------

export const DiscoveryCandidateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  subtype: z.enum(["HIDDEN_GEM", "NICHE_ACTIVITY", "SEASONAL_TIP"]),
  category_hint: z.string().nullable().optional(),
  location_hint: z.string().nullable().optional(),
  town_hint: z.string().nullable().optional(),
  season_hint: z.string().nullable().optional(),
  source_urls: z.array(z.string().url()).min(1, "At least one source URL required"),
});

export type DiscoveryCandidate = z.infer<typeof DiscoveryCandidateSchema>;

// LLM research returns an envelope of candidates
export const LLMResearchResponseSchema = z.object({
  candidates: z.array(DiscoveryCandidateSchema),
});

export type LLMResearchResponse = z.infer<typeof LLMResearchResponseSchema>;

// ---------------------------------------------------------------------------
// Pipeline result shape
// ---------------------------------------------------------------------------

export interface PipelineSourceContext {
  queryLabel?: string;
  runBatchId?: string;
  // Reddit-specific
  subreddit?: string;
  postId?: string;
  postUpvotes?: number;
  postNumComments?: number;
  // Cross-pipeline dedup / enrichment hints
  mentionedByN?: number;
}

export interface PipelineCandidate extends DiscoveryCandidate {
  // Provenance metadata — enrichment uses this to set Discovery.sourceType and
  // Discovery.sourceUrl, and to apply per-source quality heuristics.
  sourceType: DiscoverySource;
  sourceContext?: PipelineSourceContext;
}

export interface PipelineRunResult {
  sourceType: DiscoverySource;
  runBatchId: string;
  candidates: PipelineCandidate[];
  rawCount: number; // Before any filtering
  droppedCount: number; // Parse failures, missing source URLs, etc.
  durationMs: number;
  errors: string[];
}

export function normalizeSubtype(s: string): DiscoverySubtype | null {
  const up = s.trim().toUpperCase();
  if (up === "HIDDEN_GEM" || up === "NICHE_ACTIVITY" || up === "SEASONAL_TIP") {
    return up;
  }
  return null;
}
