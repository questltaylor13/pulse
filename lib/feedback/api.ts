/**
 * Server-side feedback operations (PRD 5 §0.4).
 *
 * Thin wrappers around Prisma that (a) handle the polymorphic ref, (b) write
 * the denormalized snapshot at create time, (c) set `source` so the new flow
 * is distinguishable from pre-Phase-5 LEGACY rows.
 *
 * Distinct from `lib/actions/items.ts`, which is the pre-Phase-5 Want/Done/
 * Pass path backing the existing /lists UI. That file continues to write
 * UserItemStatus rows with the default `source = LEGACY` and no snapshot —
 * valid by design until those call sites migrate to this module.
 */

import { prisma } from "@/lib/prisma";
import type {
  FeedbackSource,
  ItemStatus,
  Prisma,
  UserItemStatus,
} from "@prisma/client";
import { markDirty, markFollowersDirty } from "@/lib/ranking/cache";
import { triggerUserRerank } from "@/lib/ranking/rerank-trigger";
// ordering.ts only (never service.ts, which imports this module) — no cycle.
import { removeRankedEntryForRef, type RankRef } from "@/lib/rank-engine/ordering";
import type { FeedbackRef } from "./types";
import {
  isDiscoveryRef,
  isEventRef,
  isItemRef,
  isPlaceRef,
  isSeriesRef,
} from "./types";
import { seriesIdForEvent } from "@/lib/series/resolve";
import {
  EMPTY_SNAPSHOT,
  loadDiscoverySnapshot,
  loadEventSnapshot,
  loadItemSnapshot,
  loadPlaceSnapshot,
  loadSeriesSnapshot,
} from "@/lib/content/snapshot";

/**
 * Wave 6A — an event that belongs to a series is rated AS the series.
 * Everything else passes through untouched.
 */
async function promoteRef(ref: FeedbackRef): Promise<FeedbackRef> {
  if (!isEventRef(ref)) return ref;
  const seriesId = await seriesIdForEvent(ref.eventId);
  return seriesId ? { seriesId } : ref;
}

// After PRD 5 Phase 1, UserItemStatus has four native FKs (itemId, eventId,
// placeId, discoveryId). Each ref shape maps directly to one column — no
// lazy Item bridge needed anymore. The pre-Phase-5 /lists UI still writes
// via `itemId` for backwards compatibility; new UI surfaces write direct.
//
// The table→snapshot mapping itself lives in lib/content/snapshot.ts, shared
// with the rank engine. These wrappers keep this module's existing contract:
// a missing row degrades to null snapshot fields rather than refusing the
// write — feedback on a since-deleted item is still feedback worth recording.

/**
 * Wrap a Prisma write in a cache-invalidation hook. Flags the user's
 * RankedFeedCache as dirty so the next precompute run re-ranks them.
 * Keeps the ranking dependency out of every individual upsert call site.
 */
function markDirtyAfter<T>(userId: string, p: Promise<T>): Promise<T> {
  return p.then(async (result) => {
    try {
      await markDirty(userId);
    } catch (err) {
      // Dirty-flagging failure is non-fatal — the next scheduled precompute
      // will still pick up the feedback via count + profileVersion changes.
      console.warn("[feedback.markDirty] failed:", err);
    }
    return result;
  });
}

/**
 * markDirtyAfter + Wave 2 live re-rank. After the write lands, flag the cache
 * dirty AND schedule a coalesced forced recompute so feedback feels responsive
 * despite the daily precompute cron. PROFILE_SWIPER writes are excluded: the
 * swiper fires a burst of up to 12 writes, coalesced into a single recompute
 * when it closes (see components/feedback/TasteSwiper.tsx).
 */
function afterWrite<T>(
  userId: string,
  source: FeedbackSource,
  p: Promise<T>,
): Promise<T> {
  return markDirtyAfter(userId, p).then((result) => {
    if (source !== "PROFILE_SWIPER") triggerUserRerank(userId);
    return result;
  });
}

/**
 * Recompute a place's Pulse rating aggregate from its UserItemStatus rows.
 * Recomputed from source (not incremented) so it never drifts across rating
 * changes/removals. Best-effort — a failure must not fail the feedback write.
 * Exported for lib/rank-engine/service.ts, which refines the bridge star
 * after a placement lands.
 */
export async function recomputePlaceRating(placeId: string): Promise<void> {
  try {
    const agg = await prisma.userItemStatus.aggregate({
      where: { placeId, rating: { not: null } },
      _sum: { rating: true },
      _count: { rating: true },
    });
    await prisma.place.update({
      where: { id: placeId },
      data: {
        pulseRatingSum: agg._sum.rating ?? 0,
        pulseRatingCount: agg._count.rating ?? 0,
      },
    });
  } catch (err) {
    console.warn("[feedback.recomputePlaceRating] failed:", err);
  }
}

export async function upsertFeedback(params: {
  userId: string;
  ref: FeedbackRef;
  status: ItemStatus;
  source: FeedbackSource;
  /** Wave 2 Beli: optional 1–5 rating (typically written with DONE). */
  rating?: number;
}): Promise<UserItemStatus> {
  const { userId, status, source, rating } = params;
  // Wave 6A — rating one Tuesday's trivia rates THE trivia. The UI still sends
  // { eventId }; the promotion happens here, server-side, so a client that has
  // never heard of series still rates them at the right grain.
  const ref = await promoteRef(params.ref);
  // Only include `rating` in the write when the caller passed one, so a plain
  // WANT/PASS/DONE toggle never clobbers an existing rating.
  const common = { status, source, ...(rating !== undefined ? { rating } : {}) };

  if (isItemRef(ref)) {
    const snap = (await loadItemSnapshot(ref.itemId)) ?? EMPTY_SNAPSHOT;
    return afterWrite(userId, source, prisma.userItemStatus.upsert({
      where: { userId_itemId: { userId, itemId: ref.itemId } },
      update: { ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
      create: { userId, itemId: ref.itemId, ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
    }));
  }
  if (isEventRef(ref)) {
    const snap = (await loadEventSnapshot(ref.eventId)) ?? EMPTY_SNAPSHOT;
    return afterWrite(userId, source, prisma.userItemStatus.upsert({
      where: { userId_eventId: { userId, eventId: ref.eventId } },
      update: { ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
      create: { userId, eventId: ref.eventId, ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
    }));
  }
  if (isPlaceRef(ref)) {
    const snap = (await loadPlaceSnapshot(ref.placeId)) ?? EMPTY_SNAPSHOT;
    const row = await afterWrite(userId, source, prisma.userItemStatus.upsert({
      where: { userId_placeId: { userId, placeId: ref.placeId } },
      update: { ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
      create: { userId, placeId: ref.placeId, ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
    }));
    // Keep the place's rating aggregate in sync with this write.
    await recomputePlaceRating(ref.placeId);
    return row;
  }
  if (isDiscoveryRef(ref)) {
    const snap = (await loadDiscoverySnapshot(ref.discoveryId)) ?? EMPTY_SNAPSHOT;
    return afterWrite(userId, source, prisma.userItemStatus.upsert({
      where: { userId_discoveryId: { userId, discoveryId: ref.discoveryId } },
      update: { ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
      create: { userId, discoveryId: ref.discoveryId, ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
    }));
  }
  if (isSeriesRef(ref)) {
    const snap = (await loadSeriesSnapshot(ref.seriesId)) ?? EMPTY_SNAPSHOT;
    return afterWrite(userId, source, prisma.userItemStatus.upsert({
      where: { userId_seriesId: { userId, seriesId: ref.seriesId } },
      update: { ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
      create: { userId, seriesId: ref.seriesId, ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
    }));
  }
  throw new Error("upsertFeedback: ref missing valid id");
}

export async function deleteFeedback(params: {
  userId: string;
  ref: FeedbackRef;
}): Promise<number> {
  const { userId } = params;
  // Wave 6A — the write went in against the SERIES, so the delete must too.
  // Without this, un-marking a DONE on a series occurrence would delete nothing
  // and the rating would silently survive the retraction.
  const ref = await promoteRef(params.ref);
  // Wave 4 — retracting a DONE must also retract its ranked entry, or the
  // item lingers in /rankings after the visit itself was undone. Best-effort:
  // the status delete is the primary operation.
  const retractRankedEntry = async (rankRef: RankRef): Promise<void> => {
    try {
      const removed = await removeRankedEntryForRef(userId, rankRef);
      // Wave 5 — this is the THIRD path that deletes a ranked entry (alongside
      // removeEntry and re-rank), and the one easiest to miss: retracting a
      // DONE. The entry fed the social signal, so every follower's cache is now
      // stale. Without this, the following feed would drop the row (cascade)
      // while their For-You card kept the +0.20 boost and the "Alex loved this"
      // why-line until the daily cron — two surfaces contradicting each other.
      if (removed) await markFollowersDirty(userId);
    } catch (err) {
      console.warn("[feedback.retractRankedEntry] failed:", err);
    }
  };
  const runDelete = async (where: Prisma.UserItemStatusWhereInput): Promise<number> => {
    const count = (await prisma.userItemStatus.deleteMany({ where })).count;
    try { await markDirty(userId); } catch (err) { console.warn("[feedback.markDirty] failed:", err); }
    // Retracting a WANT (heart unsave / undo) changes the taste signal too.
    triggerUserRerank(userId);
    return count;
  };
  if (isItemRef(ref)) return runDelete({ userId, itemId: ref.itemId });
  if (isEventRef(ref)) {
    const count = await runDelete({ userId, eventId: ref.eventId });
    await retractRankedEntry({ eventId: ref.eventId });
    return count;
  }
  if (isPlaceRef(ref)) {
    const count = await runDelete({ userId, placeId: ref.placeId });
    await retractRankedEntry({ placeId: ref.placeId });
    await recomputePlaceRating(ref.placeId); // removing DONE may drop a rating
    return count;
  }
  if (isDiscoveryRef(ref)) {
    const count = await runDelete({ userId, discoveryId: ref.discoveryId });
    await retractRankedEntry({ discoveryId: ref.discoveryId });
    return count;
  }
  if (isSeriesRef(ref)) {
    const count = await runDelete({ userId, seriesId: ref.seriesId });
    await retractRankedEntry({ seriesId: ref.seriesId });
    return count;
  }
  throw new Error("deleteFeedback: ref missing valid id");
}
