/**
 * PRD 6 — Candidate pool construction.
 *
 * Queries Events, Places, and Discoveries with the filters required by
 * signal-map.md §Updated formula (before scoring) and returns them in the
 * RankableItem shape the formula consumes.
 *
 * Not pure — this talks to Prisma. Tests for it will come once we wire
 * real DB fixtures; for now the formula tests use hand-built
 * RankableItem[] arrays directly.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { RankableItem, RankingContext } from "./types";
import { normalizeQuality, normalizePriceTier } from "./normalizers";
import { RANKING_CONFIG } from "./config";

export type PoolScope = "near" | "all";

interface BuildCandidatePoolOptions {
  scope: PoolScope;
  /** If provided, cap the returned pool at this many items. */
  maxPoolSize?: number;
}

/**
 * Build the candidate pool for a user. Applies the filters in signal-map:
 *   - Active/published only
 *   - Not DONE'd by the user
 *   - Not budget-filtered (FREE_FOCUSED drops HIGH-price items entirely)
 *   - Regional scope ('near' excludes MOUNTAIN_DEST)
 *   - For VISITING: items within 5 days of account creation
 *   - Capped at maxPoolSize (default 500), sorted by normalized quality
 */
export async function buildCandidatePool(
  ctx: RankingContext,
  opts: BuildCandidatePoolOptions,
): Promise<RankableItem[]> {
  const maxPoolSize = opts.maxPoolSize ?? RANKING_CONFIG.candidatePool.maxPoolSize;
  const regionFilter: Prisma.EnumEventRegionFilter | undefined =
    opts.scope === "near" ? { not: "MOUNTAIN_DEST" } : undefined;

  const budgetHardDrop = ctx.profile?.budgetTier === "FREE_FOCUSED";
  const visitingWindowEnd = computeVisitingWindowEnd(ctx);
  const doneIds = Array.from(ctx.doneItemIds);

  // --- Events ------------------------------------------------------------
  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      isArchived: false,
      startTime: {
        gte: new Date(),
        ...(visitingWindowEnd ? { lte: visitingWindowEnd } : {}),
      },
      ...(regionFilter ? { region: regionFilter } : {}),
      ...(doneIds.length
        ? { userStatuses: { none: { userId: ctx.userId, status: "DONE" } } }
        : {}),
    },
    select: {
      id: true,
      title: true,
      category: true,
      tags: true,
      vibeTags: true,
      companionTags: true,
      occasionTags: true,
      priceRange: true,
      qualityScore: true,
      region: true,
      startTime: true,
      createdAt: true,
    },
    take: maxPoolSize,
  });

  // --- Places ------------------------------------------------------------
  const places = await prisma.place.findMany({
    where: {
      openingStatus: "OPEN",
      ...(regionFilter ? { region: regionFilter } : {}),
      ...(doneIds.length
        ? { userStatuses: { none: { userId: ctx.userId, status: "DONE" } } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      category: true,
      tags: true,
      vibeTags: true,
      companionTags: true,
      goodForTags: true,
      priceLevel: true,
      combinedScore: true,
      region: true,
      createdAt: true,
    },
    take: maxPoolSize,
  });

  // --- Discoveries -------------------------------------------------------
  const discoveries = await prisma.discovery.findMany({
    where: {
      status: "ACTIVE",
      qualityScore: { gte: 6 },
      ...(regionFilter ? { region: regionFilter } : {}),
      ...(doneIds.length
        ? { userStatuses: { none: { userId: ctx.userId, status: "DONE" } } }
        : {}),
    },
    select: {
      id: true,
      title: true,
      category: true,
      tags: true,
      subtype: true,
      qualityScore: true,
      region: true,
      createdAt: true,
    },
    take: maxPoolSize,
  });

  // --- Normalize into RankableItem shape --------------------------------
  const pool: RankableItem[] = [
    ...events.map((e) => eventToRankable(e)),
    ...places.map((p) => placeToRankable(p)),
    ...discoveries.map((d) => discoveryToRankable(d)),
  ];

  // --- Budget hard-drop (FREE_FOCUSED) -----------------------------------
  const filtered = budgetHardDrop
    ? pool.filter((item) => item.priceTier !== "HIGH")
    : pool;

  // --- Drop items below min quality threshold ----------------------------
  const qualityGated = filtered.filter(
    (item) => item.normalizedQuality >= RANKING_CONFIG.candidatePool.minQualityScore,
  );

  // --- Cap at maxPoolSize (sort by quality desc then take N) -------------
  qualityGated.sort((a, b) => b.normalizedQuality - a.normalizedQuality);
  return qualityGated.slice(0, maxPoolSize);
}

// ===========================================================================
// Item → RankableItem adapters
// ===========================================================================

function eventToRankable(e: {
  id: string;
  category: string;
  tags: string[];
  vibeTags: string[];
  companionTags: string[];
  occasionTags: string[];
  priceRange: string;
  qualityScore: number | null;
  region: string;
  startTime: Date;
  createdAt: Date;
}): RankableItem {
  return {
    itemType: "event",
    itemId: e.id,
    normalizedQuality: normalizeQuality({ qualityScore: e.qualityScore }),
    priceTier: normalizePriceTier({ priceRange: e.priceRange, itemType: "event" }),
    tags: unionTags(e.tags, e.vibeTags, e.companionTags, e.occasionTags),
    category: e.category,
    region: e.region,
    createdAt: e.createdAt,
    startsAt: e.startTime,
    isHiddenGem: false,
  };
}

function placeToRankable(p: {
  id: string;
  category: string | null;
  tags: string[];
  vibeTags: string[];
  companionTags: string[];
  goodForTags: string[];
  priceLevel: number | null;
  combinedScore: number | null;
  region: string;
  createdAt: Date;
}): RankableItem {
  return {
    itemType: "place",
    itemId: p.id,
    normalizedQuality: normalizeQuality({ combinedScore: p.combinedScore }),
    priceTier: normalizePriceTier({ priceLevel: p.priceLevel, itemType: "place" }),
    tags: unionTags(p.tags, p.vibeTags, p.companionTags, p.goodForTags),
    category: p.category,
    region: p.region,
    createdAt: p.createdAt,
    startsAt: null,
    isHiddenGem: false,
  };
}

function discoveryToRankable(d: {
  id: string;
  category: string;
  tags: string[];
  subtype: string;
  qualityScore: number;
  region: string;
  createdAt: Date;
}): RankableItem {
  return {
    itemType: "discovery",
    itemId: d.id,
    normalizedQuality: normalizeQuality({ qualityScore: d.qualityScore }),
    priceTier: "FREE",
    tags: d.tags,
    category: d.category,
    region: d.region,
    createdAt: d.createdAt,
    startsAt: null,
    isHiddenGem: d.subtype === "HIDDEN_GEM" && d.qualityScore >= 7,
  };
}

// ===========================================================================
// Helpers
// ===========================================================================

function unionTags(...sets: string[][]): string[] {
  const out = new Set<string>();
  for (const set of sets) {
    if (!set) continue;
    for (const tag of set) out.add(tag);
  }
  return Array.from(out);
}

function computeVisitingWindowEnd(ctx: RankingContext): Date | null {
  if (ctx.profile?.contextSegment !== "VISITING") return null;
  // Default visiting window: 5 days from account creation (proxy for trip end)
  const msInDay = 24 * 60 * 60 * 1000;
  const accountCreatedMs = Date.now() - ctx.accountAgeDays * msInDay;
  return new Date(accountCreatedMs + 5 * msInDay);
}
