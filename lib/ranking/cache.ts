/**
 * PRD 6 — RankedFeedCache read/write helpers.
 *
 * Thin wrapper over Prisma for the Phase 2 cache. Keeps the rest of the
 * ranking module from having to know about the JSON column shape.
 */

import { prisma } from "@/lib/prisma";
import type { RankedItem } from "./types";

export interface CachedFeed {
  userId: string;
  rankedItems: RankedItem[];
  computedAt: Date;
  profileVersion: number;
  feedbackCount: number;
  isDirty: boolean;
}

/**
 * Read a user's cached ranked feed. Returns null on cache miss.
 * Callers are responsible for fallback behavior (quality-only sort).
 */
export async function readCache(userId: string): Promise<CachedFeed | null> {
  const row = await prisma.rankedFeedCache.findUnique({ where: { userId } });
  if (!row) return null;
  return {
    userId: row.userId,
    rankedItems: Array.isArray(row.rankedItems) ? (row.rankedItems as unknown as RankedItem[]) : [],
    computedAt: row.computedAt,
    profileVersion: row.profileVersion,
    feedbackCount: row.feedbackCount,
    isDirty: row.isDirty,
  };
}

/**
 * Write (upsert) a user's cached ranked feed. Always clears the dirty
 * flag on write.
 */
export async function writeCache(
  userId: string,
  rankedItems: RankedItem[],
  meta: { profileVersion: number; feedbackCount: number },
): Promise<void> {
  await prisma.rankedFeedCache.upsert({
    where: { userId },
    create: {
      userId,
      rankedItems: rankedItems as unknown as object[],
      profileVersion: meta.profileVersion,
      feedbackCount: meta.feedbackCount,
      isDirty: false,
    },
    update: {
      rankedItems: rankedItems as unknown as object[],
      computedAt: new Date(),
      profileVersion: meta.profileVersion,
      feedbackCount: meta.feedbackCount,
      isDirty: false,
    },
  });
}

/**
 * Mark a user's cache dirty so the next precompute run re-ranks them.
 * No-op if the user has no cache row yet (nothing to invalidate).
 */
export async function markDirty(userId: string): Promise<void> {
  await prisma.rankedFeedCache.updateMany({
    where: { userId },
    data: { isDirty: true },
  });
}

// ---------------------------------------------------------------------------
// Fast per-item lookup for rail re-sorting
// ---------------------------------------------------------------------------

/**
 * Convert the cached feed into a lookup map keyed by `${itemType}:${itemId}`.
 * fetchHomeFeed uses this to re-sort each rail's raw items by the user's
 * personalized score without firing its own scoring work.
 */
export function buildCacheLookup(cache: CachedFeed | null): Map<string, number> {
  const map = new Map<string, number>();
  if (!cache) return map;
  for (const item of cache.rankedItems) {
    map.set(`${item.itemType}:${item.itemId}`, item.score);
  }
  return map;
}

/**
 * Re-sort a rail's items in place by cache score. Items absent from the
 * cache retain their existing relative order at the tail of the array.
 */
export function sortByCacheScore<T extends { id: string }>(
  items: T[],
  itemType: "event" | "place" | "discovery",
  lookup: Map<string, number>,
): T[] {
  if (lookup.size === 0) return items;
  const scored = items.map((item, idx) => ({
    item,
    score: lookup.get(`${itemType}:${item.id}`),
    fallbackOrder: idx,
  }));
  scored.sort((a, b) => {
    if (a.score !== undefined && b.score !== undefined) return b.score - a.score;
    if (a.score !== undefined) return -1; // a in cache, b not → a first
    if (b.score !== undefined) return 1; // b in cache, a not → b first
    return a.fallbackOrder - b.fallbackOrder; // neither in cache → preserve order
  });
  return scored.map((s) => s.item);
}
