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
import { isSeriesV1Enabled } from "./flags";
import type { Prisma } from "@prisma/client";
import type { RankableItem, RankingContext, RankedItemType } from "./types";
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
      // Exclude DONE'd events from BOTH stores: the legacy EventUserStatus
      // relation (`userStatuses`, written by the event-detail toggle) AND the
      // new UserItemStatus relation (`userItemStatuses`, written by the taste
      // swiper / feed-card DONE). Filtering only the legacy one let new-flow
      // DONE'd events keep reappearing in the feed (Wave 2 review finding).
      ...(doneIds.length
        ? {
            userStatuses: { none: { userId: ctx.userId, status: "DONE" } },
            userItemStatuses: { none: { userId: ctx.userId, status: "DONE" } },
          }
        : {}),
      // Wave 6A — a DONE'd SERIES suppresses all of its future occurrences.
      //
      // Without this, rating "Trivia at Ratio" would suppress exactly one row —
      // the 14 July edition — and next Tuesday's row, being a different Event,
      // would come straight back into the feed. Forever. Every week. Rating the
      // thing you love is not a reason to keep recommending it to you as though
      // it were new; it is the reason to stop (and to surface it in the regulars
      // rail instead — see components/home/RegularsRail.tsx).
      //
      // Events with no series pass through untouched.
      //
      // Flag-gated, and that matters for ROLLBACK, not for the happy path: if the
      // flag is flipped off after users have rated series, an ungated clause would
      // keep suppressing every occurrence of those series while the regulars rail
      // went dark — the favourite weekly would vanish from every surface at once,
      // repairable only by hand-deleting rows. Flag-off must mean pre-Wave-6.
      ...(isSeriesV1Enabled()
        ? {
            OR: [
              { seriesId: null },
              {
                series: {
                  is: {
                    userItemStatuses: {
                      none: { userId: ctx.userId, status: "DONE" },
                    },
                  },
                },
              },
            ],
          }
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
      // NB: Place's UserItemStatus reverse relation is `userItemStatuses`
      // (there is no `userStatuses` on Place). Using the wrong name threw a
      // runtime "Unknown field" error whenever the user had DONE'd a place,
      // silently failing that user's entire precompute. (Wave 2 fix.)
      ...(doneIds.length
        ? { userItemStatuses: { none: { userId: ctx.userId, status: "DONE" } } }
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

// ===========================================================================
// Wave 2 — hydrate specific items (by id) into the RankableItem shape.
//
// Used by the live re-rank path (lib/ranking/rerank-trigger.ts) to re-score an
// already-ranked baseline against fresh feedback WITHOUT rebuilding the whole
// pool. Reuses the exact selects + adapters above so the RankableItem mapping
// stays single-sourced with buildCandidatePool.
// ===========================================================================

export async function hydrateRankables(
  refs: { itemType: RankedItemType; itemId: string }[],
): Promise<Map<string, RankableItem>> {
  const eventIds = refs.filter((r) => r.itemType === "event").map((r) => r.itemId);
  const placeIds = refs.filter((r) => r.itemType === "place").map((r) => r.itemId);
  const discoveryIds = refs.filter((r) => r.itemType === "discovery").map((r) => r.itemId);

  const [events, places, discoveries] = await Promise.all([
    eventIds.length
      ? prisma.event.findMany({
          where: { id: { in: eventIds } },
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
        })
      : Promise.resolve([]),
    placeIds.length
      ? prisma.place.findMany({
          where: { id: { in: placeIds } },
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
        })
      : Promise.resolve([]),
    discoveryIds.length
      ? prisma.discovery.findMany({
          where: { id: { in: discoveryIds } },
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
        })
      : Promise.resolve([]),
  ]);

  const map = new Map<string, RankableItem>();
  for (const e of events) map.set(`event:${e.id}`, eventToRankable(e));
  for (const p of places) map.set(`place:${p.id}`, placeToRankable(p));
  for (const d of discoveries) map.set(`discovery:${d.id}`, discoveryToRankable(d));
  return map;
}
