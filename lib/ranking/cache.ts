/**
 * PRD 6 — RankedFeedCache read/write helpers.
 *
 * Thin wrapper over Prisma for the Phase 2 cache. Keeps the rest of the
 * ranking module from having to know about the JSON column shape.
 */

import { prisma } from "@/lib/prisma";
import { isSocialV1Enabled } from "./flags";
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

/**
 * Wave 5 — dirty everyone who follows `userId`.
 *
 * When you rate something, your followers' feeds are now stale: the social
 * sub-factor reads *your* ranked entries. Nothing in maybeSkip() would ever
 * notice on its own — it gates freshness on the viewer's own feedback count,
 * profile version, and dirty flag, none of which change when someone *else*
 * rates something. Without this call the social signal would silently never
 * recompute.
 *
 * markDirty, deliberately NOT triggerUserRerank. triggerUserRerank runs a full
 * precomputeUser (context build + candidate pool + ~500 scored items + cache
 * write) per user, fire-and-forget, with no queue, backpressure, or dedupe.
 * Fanning that out per rating per follower is an amplification bomb: one
 * popular user rating one taco shop would kick off hundreds of full recomputes.
 * The dirty flag is enough — maybeSkip() refuses to skip when isDirty is set,
 * so each follower recomputes lazily on their next read, or on the daily cron.
 *
 * One findMany + one updateMany, regardless of follower count.
 */
export async function markFollowersDirty(userId: string): Promise<void> {
  // The dirty flag exists only to make the social signal recompute, and the
  // social signal is flag-gated. With SOCIAL_V1 off this would dirty caches
  // that provably cannot change (the social context is empty), forcing
  // recomputes for byte-identical output — "flag off ⇒ unchanged app" has to
  // mean unchanged work too, or a rollback still costs money.
  if (!isSocialV1Enabled()) return;

  // One statement. Materializing every follower id into an IN list is fine at
  // ten followers and a bad idea at a hundred thousand; the relation filter
  // never pulls them over the wire at all.
  //
  // `User.following` is the set of follows this cache's owner MADE (relation
  // "Following", keyed on followerId). So "caches whose owner follows userId"
  // is `following: { some: { followingId: userId } }`. Note it is NOT
  // `followers` — that relation holds the rows pointing *at* the owner, and
  // would collapse to dirtying only the rater themselves.
  await prisma.rankedFeedCache.updateMany({
    where: { user: { following: { some: { followingId: userId } } } },
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
