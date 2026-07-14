/**
 * Wave 4 Rate & Rank — DB service (plan decisions D1, D4, D9).
 *
 * Owns UserRankedEntry ordering. Status (WANT/DONE/PASS) stays in
 * UserItemStatus via lib/feedback/api.ts — beginPlacement writes BOTH: the
 * provisional ranked entry here, and DONE (+ a coarse bridge star so
 * Place.pulseRating* aggregates and /your-denver keep working) through
 * upsertFeedback, which already handles cache-dirtying and live re-rank.
 *
 * Positions are dense 0-based integers per (userId, category); the whole
 * category is renumbered + rescored inside every mutating transaction, so a
 * torn flow can never corrupt ordering — worst case is a provisional entry
 * sitting at the bottom of its sentiment bucket until re-ranked.
 */

import { prisma } from "@/lib/prisma";
import type {
  ComparisonOutcome,
  FeedbackSource,
  Prisma,
  RankCategory,
  RankSentiment,
} from "@prisma/client";
import { markDirty, markFollowersDirty } from "@/lib/ranking/cache";
import { triggerUserRerank } from "@/lib/ranking/rerank-trigger";
import { emitRankedItemActivity } from "@/lib/social/activity";
import {
  loadEventSnapshot,
  loadPlaceSnapshot,
  loadDiscoverySnapshot,
  resolveContent,
  type ContentSnapshot,
} from "@/lib/content/snapshot";
import { recomputePlaceRating, upsertFeedback } from "@/lib/feedback/api";
import {
  RANK_CATEGORY_LABELS,
  rankCategorySlug,
  toRankCategory,
} from "./categories";
import { bucketRank, deriveScores } from "./scores";
import {
  loadCategoryEntries,
  persistOrder,
  refWhere,
  type RankRef,
} from "./ordering";
import { expectedComparisons } from "./insertion";

export type { RankRef } from "./ordering";

/** Coarse star bridged into UserItemStatus.rating (decision D9). */
export function bridgeRating(sentiment: RankSentiment): number {
  switch (sentiment) {
    case "LIKED":
      return 5;
    case "FINE":
      return 3;
    case "DISLIKED":
      return 1;
  }
}

/** Ref dispatch over the shared table→snapshot mapping in lib/content/snapshot. */
function loadContent(ref: RankRef): Promise<ContentSnapshot | null> {
  if ("eventId" in ref) return loadEventSnapshot(ref.eventId);
  if ("placeId" in ref) return loadPlaceSnapshot(ref.placeId);
  return loadDiscoverySnapshot(ref.discoveryId);
}

function refCreateFields(ref: RankRef): {
  eventId?: string;
  placeId?: string;
  discoveryId?: string;
} {
  if ("eventId" in ref) return { eventId: ref.eventId };
  if ("placeId" in ref) return { placeId: ref.placeId };
  return { discoveryId: ref.discoveryId };
}

export interface BeginPlacementResult {
  entryId: string;
  category: RankCategory;
  categoryLabel: string;
  categorySlug: string;
  /** Same-sentiment opponents, best first, excluding the subject. */
  bucketEntries: { entryId: string; title: string; imageUrl: string | null }[];
  maxComparisons: number;
}

/**
 * Commit the sentiment immediately (crash-safe): upsert the entry
 * provisionally at the BOTTOM of its sentiment bucket, write DONE + bridge
 * star through the existing feedback path, and return the duel candidates.
 * Re-invoking on an already-ranked item is a re-rank: the entry is pulled
 * out and re-inserted provisionally (handles sentiment changes too).
 */
export async function beginPlacement(params: {
  userId: string;
  ref: RankRef;
  sentiment: RankSentiment;
  source: FeedbackSource;
}): Promise<BeginPlacementResult> {
  const { userId, ref, sentiment, source } = params;

  const content = await loadContent(ref);
  if (!content) throw new Error("beginPlacement: content not found");
  const category = toRankCategory(content.category);

  // Status + bridge star FIRST, through the existing path (markDirty, live
  // re-rank, Place.pulseRating* recompute). Ordered before the entry write so
  // a failure between the two leaves the benign state — DONE recorded, item
  // simply unranked (reachable anyway via "just mark as been there") — rather
  // than a ranked entry with no DONE. confirmPlacement later refines this
  // coarse star from the entry's final derived score.
  await upsertFeedback({
    userId,
    ref,
    status: "DONE",
    source,
    rating: bridgeRating(sentiment),
  });

  const { entryId, bucketEntries } = await prisma.$transaction(async (tx) => {
    const existing = await tx.userRankedEntry.findFirst({
      where: refWhere(userId, ref),
    });

    // Re-rank with unchanged category AND sentiment: leave the entry exactly
    // where it is (still confirmed) — abandoning the duels then costs
    // nothing. Only a sentiment/category change (or a new entry) warrants
    // the provisional bucket-bottom move.
    if (
      existing &&
      existing.category === category &&
      existing.sentiment === sentiment
    ) {
      await tx.userRankedEntry.update({
        where: { id: existing.id },
        data: {
          titleSnapshot: content.title,
          imageSnapshot: content.imageUrl,
          categorySnapshot: content.category,
        },
      });
      const others = (await loadCategoryEntries(tx, userId, category)).filter(
        (e) => e.id !== existing.id
      );
      return {
        entryId: existing.id,
        bucketEntries: others
          .filter((e) => e.sentiment === sentiment)
          .map((e) => ({
            entryId: e.id,
            title: e.titleSnapshot ?? "Untitled",
            imageUrl: e.imageSnapshot,
          })),
      };
    }

    // If the entry exists in a different category (content was re-categorized
    // since), pull it out of the old category and renumber that list.
    if (existing && existing.category !== category) {
      const oldList = (
        await loadCategoryEntries(tx, userId, existing.category)
      ).filter((e) => e.id !== existing.id);
      await persistOrder(tx, oldList);
    }

    const current = (await loadCategoryEntries(tx, userId, category)).filter(
      (e) => !existing || e.id !== existing.id
    );

    // Provisional slot: bottom of the sentiment bucket — after every entry in
    // the same-or-better bucket, before worse buckets.
    const insertAt = current.filter(
      (e) => bucketRank(e.sentiment) <= bucketRank(sentiment)
    ).length;

    let rowId: string;
    if (existing) {
      const row = await tx.userRankedEntry.update({
        where: { id: existing.id },
        data: {
          category,
          sentiment,
          isPlacementConfirmed: false,
          titleSnapshot: content.title,
          imageSnapshot: content.imageUrl,
          categorySnapshot: content.category,
          // position/score corrected by persistOrder below
        },
      });
      rowId = row.id;
    } else {
      const row = await tx.userRankedEntry.create({
        data: {
          userId,
          ...refCreateFields(ref),
          category,
          sentiment,
          position: insertAt,
          score: 0,
          isPlacementConfirmed: false,
          titleSnapshot: content.title,
          imageSnapshot: content.imageUrl,
          categorySnapshot: content.category,
        },
      });
      rowId = row.id;
    }

    const ordered = [
      ...current.slice(0, insertAt),
      { id: rowId, sentiment, position: -1, score: -1 },
      ...current.slice(insertAt),
    ];
    await persistOrder(tx, ordered);

    const opponents = current
      .filter((e) => e.sentiment === sentiment)
      .map((e) => ({
        entryId: e.id,
        title: e.titleSnapshot ?? "Untitled",
        imageUrl: e.imageSnapshot,
      }));

    return { entryId: rowId, bucketEntries: opponents };
  });

  return {
    entryId,
    category,
    categoryLabel: RANK_CATEGORY_LABELS[category],
    categorySlug: rankCategorySlug(category),
    bucketEntries,
    maxComparisons: expectedComparisons(bucketEntries.length),
  };
}

export interface ConfirmPlacementResult {
  entryId: string;
  category: RankCategory;
  categoryLabel: string;
  categorySlug: string;
  /** 1-based rank across the whole category. */
  rank: number;
  categorySize: number;
  score: number;
}

/**
 * Land the entry at the client-resolved in-bucket index. The index is
 * clamped server-side; the comparison log is stored as a write-only audit
 * trail. Idempotent: re-placing just moves the entry.
 */
export async function confirmPlacement(params: {
  userId: string;
  ref: RankRef;
  inBucketIndex: number;
  comparisons: { opponentEntryId: string; outcome: ComparisonOutcome }[];
}): Promise<ConfirmPlacementResult> {
  const { userId, ref, inBucketIndex, comparisons } = params;

  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.userRankedEntry.findFirst({
      where: refWhere(userId, ref),
    });
    if (!entry) throw new Error("confirmPlacement: entry not found — call begin first");

    const rest = (
      await loadCategoryEntries(tx, userId, entry.category)
    ).filter((e) => e.id !== entry.id);

    const bucketStart = rest.filter(
      (e) => bucketRank(e.sentiment) < bucketRank(entry.sentiment)
    ).length;
    const bucketSize = rest.filter(
      (e) => e.sentiment === entry.sentiment
    ).length;
    const clamped = Math.max(0, Math.min(inBucketIndex, bucketSize));
    const globalIndex = bucketStart + clamped;

    const ordered = [
      ...rest.slice(0, globalIndex),
      { id: entry.id, sentiment: entry.sentiment, position: -1, score: -1 },
      ...rest.slice(globalIndex),
    ];
    await persistOrder(tx, ordered);
    await tx.userRankedEntry.update({
      where: { id: entry.id },
      data: { isPlacementConfirmed: true },
    });

    if (comparisons.length > 0) {
      await tx.rankComparison.createMany({
        data: comparisons.map((c) => ({
          userId,
          category: entry.category,
          subjectEntryId: entry.id,
          opponentEntryId: c.opponentEntryId,
          outcome: c.outcome,
        })),
      });
    }

    const scores = deriveScores(ordered.map((e) => e.sentiment));
    return {
      entryId: entry.id,
      category: entry.category,
      rank: globalIndex + 1,
      categorySize: ordered.length,
      score: scores[globalIndex],
    };
  });

  // Refine the coarse begin-time bridge star (5/3/1) from the final derived
  // score so Place.pulseRating* aggregates keep real granularity instead of
  // collapsing to the 1/3/5 poles: 0–10 → 1–5.
  const refinedStar = Math.min(5, Math.max(1, Math.round(result.score / 2)));
  try {
    await prisma.userItemStatus.updateMany({
      where: {
        userId,
        ...("eventId" in ref
          ? { eventId: ref.eventId }
          : "placeId" in ref
            ? { placeId: ref.placeId }
            : { discoveryId: ref.discoveryId }),
        status: "DONE",
      },
      data: { rating: refinedStar },
    });
    if ("placeId" in ref) await recomputePlaceRating(ref.placeId);
  } catch (err) {
    console.warn("[rank-engine.refineBridgeStar] failed:", err);
  }

  // Wave 5 — tell followers. Pointer row only; hydrated at read time. Already
  // swallows its own errors, so a social failure cannot fail a placement.
  await emitRankedItemActivity({ userId, rankedEntryId: result.entryId });

  // beginPlacement already dirtied via upsertFeedback; the placement changes
  // ordering (and therefore loved/disliked weighting), so dirty again. The
  // 45s rerank coalesce window absorbs the begin→place double-trigger.
  try {
    await markDirty(userId);
    // Wave 5 — this rating also stales every follower's feed (the social
    // sub-factor reads our entries). Dirty only: see markFollowersDirty on why
    // fanning out triggerUserRerank here would be an amplification bomb.
    await markFollowersDirty(userId);
  } catch (err) {
    console.warn("[rank-engine.markDirty] failed:", err);
  }
  triggerUserRerank(userId);

  return {
    ...result,
    categoryLabel: RANK_CATEGORY_LABELS[result.category],
    categorySlug: rankCategorySlug(result.category),
  };
}

/** Remove a ranked entry (keeps the UserItemStatus DONE row). */
export async function removeEntry(params: {
  userId: string;
  entryId: string;
}): Promise<boolean> {
  const { userId, entryId } = params;
  const removed = await prisma.$transaction(async (tx) => {
    const entry = await tx.userRankedEntry.findFirst({
      where: { id: entryId, userId },
    });
    if (!entry) return false;
    await tx.userRankedEntry.delete({ where: { id: entry.id } });
    const rest = (
      await loadCategoryEntries(tx, userId, entry.category)
    ).filter((e) => e.id !== entry.id);
    await persistOrder(tx, rest);
    return true;
  });
  if (removed) {
    try {
      await markDirty(userId);
      // Removing an entry retracts the social signal it was contributing, and
      // cascades away its feed row — followers are stale either way.
      await markFollowersDirty(userId);
    } catch (err) {
      console.warn("[rank-engine.markDirty] failed:", err);
    }
    triggerUserRerank(userId);
  }
  return removed;
}

export async function updateEntryNote(params: {
  userId: string;
  entryId: string;
  note: string | null;
}): Promise<boolean> {
  const { userId, entryId, note } = params;
  const res = await prisma.userRankedEntry.updateMany({
    where: { id: entryId, userId },
    data: { note },
  });
  return res.count > 0;
}

/**
 * Idempotent repair: re-sort a category by bucket order (stable within
 * buckets by current position), renumber, rescore. Exported for
 * scripts/recompute-rank-scores.ts.
 */
export async function recomputeCategory(
  userId: string,
  category: RankCategory
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const entries = await loadCategoryEntries(tx, userId, category);
    const ordered = [...entries].sort(
      (a, b) =>
        bucketRank(a.sentiment) - bucketRank(b.sentiment) ||
        a.position - b.position
    );
    await persistOrder(tx, ordered);
  });
}

export interface RankedEntryView {
  entryId: string;
  rank: number;
  title: string;
  imageUrl: string | null;
  town: string | null;
  note: string | null;
  score: number;
  sentiment: RankSentiment;
  isPlacementConfirmed: boolean;
  /** Detail-page href for the underlying content, when it still exists. */
  href: string | null;
  ref: RankRef | null;
}

export interface RankedCategoryView {
  category: RankCategory;
  label: string;
  slug: string;
  total: number;
  entries: RankedEntryView[];
}

const CONTENT_INCLUDE = {
  event: { select: { id: true, title: true, imageUrl: true, townName: true, neighborhood: true } },
  place: { select: { id: true, name: true, primaryImageUrl: true, townName: true, neighborhood: true } },
  discovery: { select: { id: true, title: true, townName: true } },
} as const;

// Derived from the include const so the fetched shape and the type can
// never drift apart.
type EntryWithContent = Prisma.UserRankedEntryGetPayload<{
  include: typeof CONTENT_INCLUDE;
}>;

function toView(e: EntryWithContent, rank: number): RankedEntryView {
  // Shared with the feedback writer and the social surfaces — see
  // lib/content/snapshot.ts for why this mapping lives in exactly one place.
  const content = resolveContent(e);
  const title = content.title ?? "Untitled";
  const imageUrl = content.imageUrl;
  const town = content.town;
  let href: string | null = null;
  let ref: RankRef | null = null;
  if (e.eventId) {
    href = `/events/${e.eventId}`;
    ref = { eventId: e.eventId };
  } else if (e.placeId) {
    href = `/places/${e.placeId}`;
    ref = { placeId: e.placeId };
  } else if (e.discoveryId) {
    href = `/discoveries/${e.discoveryId}`;
    ref = { discoveryId: e.discoveryId };
  }
  return {
    entryId: e.id,
    rank,
    title,
    imageUrl: imageUrl ?? null,
    town,
    note: e.note,
    score: e.score,
    sentiment: e.sentiment,
    isPlacementConfirmed: e.isPlacementConfirmed,
    href,
    ref,
  };
}

/** All of a user's rankings (own view — includes provisional entries). */
export async function fetchRankings(
  userId: string,
  category?: RankCategory
): Promise<RankedCategoryView[]> {
  const entries = (await prisma.userRankedEntry.findMany({
    where: { userId, ...(category ? { category } : {}) },
    orderBy: [{ category: "asc" }, { position: "asc" }],
    include: CONTENT_INCLUDE,
  })) as EntryWithContent[];

  const byCategory = new Map<RankCategory, EntryWithContent[]>();
  for (const e of entries) {
    const list = byCategory.get(e.category) ?? [];
    list.push(e);
    byCategory.set(e.category, list);
  }

  return [...byCategory.entries()].map(([cat, list]) => ({
    category: cat,
    label: RANK_CATEGORY_LABELS[cat],
    slug: rankCategorySlug(cat),
    total: list.length,
    entries: list
      .sort((a, b) => a.position - b.position)
      .map((e, i) => toView(e, i + 1)),
  }));
}

export interface PublicRankingsResult {
  user: { username: string; name: string | null; profileImageUrl: string | null };
  category: RankedCategoryView;
  /** Entries beyond the public top-25 cutoff. */
  moreCount: number;
}

export const PUBLIC_RANKINGS_LIMIT = 25;

/**
 * Public view: confirmed entries only, top 25. Returns null when the user
 * doesn't exist, has rankings hidden, or the category is empty.
 */
export async function fetchPublicRankings(
  username: string,
  category: RankCategory
): Promise<PublicRankingsResult | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      profileImageUrl: true,
      rankingsArePublic: true,
    },
  });
  if (!user?.username || !user.rankingsArePublic) return null;

  const entries = (await prisma.userRankedEntry.findMany({
    where: { userId: user.id, category, isPlacementConfirmed: true },
    orderBy: { position: "asc" },
    include: CONTENT_INCLUDE,
  })) as EntryWithContent[];
  if (entries.length === 0) return null;

  const top = entries.slice(0, PUBLIC_RANKINGS_LIMIT);
  return {
    user: {
      username: user.username,
      name: user.name,
      profileImageUrl: user.profileImageUrl,
    },
    category: {
      category,
      label: RANK_CATEGORY_LABELS[category],
      slug: rankCategorySlug(category),
      total: entries.length,
      entries: top.map((e, i) => toView(e, i + 1)),
    },
    moreCount: Math.max(0, entries.length - PUBLIC_RANKINGS_LIMIT),
  };
}

/** A ranked entry as the following feed renders it: content + where it landed. */
export interface FeedRankedEntry extends RankedEntryView {
  category: RankCategory;
  categoryLabel: string;
  categorySlug: string;
  categorySize: number;
}

/**
 * Wave 5 — hydrate feed pointer rows into current content.
 *
 * The following feed stores only `rankedEntryId`; everything a row displays is
 * read through here, so a re-rank is reflected the next time the feed is read
 * and a deleted entry simply drops out (its id is absent from the map). Keeping
 * this in the service — rather than re-deriving title/image/href in the route —
 * means the feed and the rankings pages can never disagree about what an entry
 * is called.
 *
 * Entries the caller isn't allowed to see are the caller's problem: this
 * resolves ids, it does not authorize them.
 */
export async function hydrateRankedEntriesForFeed(
  entryIds: string[]
): Promise<Map<string, FeedRankedEntry>> {
  if (entryIds.length === 0) return new Map();

  // Confirmed only — and this is load-bearing, not defensive. beginPlacement
  // flips isPlacementConfirmed back to false and drops the entry to the bottom
  // of its bucket whenever someone re-rates; the activity row deliberately
  // survives that. Without this filter the feed would publish a verdict its
  // author abandoned mid-duel, at a position they never chose.
  const entries = (await prisma.userRankedEntry.findMany({
    where: { id: { in: entryIds }, isPlacementConfirmed: true },
    include: CONTENT_INCLUDE,
  })) as EntryWithContent[];
  if (entries.length === 0) return new Map();

  // Rank has to be computed the way fetchPublicRankings computes it — as the
  // index among CONFIRMED entries — not as position + 1. Positions are dense
  // over *all* entries including provisional ones, so position + 1 would print
  // "#4 of 5" on a card that links to a page saying "#3 of 4" about the same
  // spot. A rank that contradicts the list it links to is exactly the false
  // claim this wave exists to prevent.
  const pairs = [
    ...new Map(
      entries.map((e) => [`${e.userId}|${e.category}`, { userId: e.userId, category: e.category }])
    ).values(),
  ];
  const siblings = await prisma.userRankedEntry.findMany({
    where: { OR: pairs, isPlacementConfirmed: true },
    orderBy: { position: "asc" },
    select: { id: true, userId: true, category: true },
  });

  // Position-ordered confirmed entries per (user, category) → dense 1-based rank.
  const rankById = new Map<string, number>();
  const sizeByPair = new Map<string, number>();
  for (const s of siblings) {
    const key = `${s.userId}|${s.category}`;
    const next = (sizeByPair.get(key) ?? 0) + 1;
    sizeByPair.set(key, next);
    rankById.set(s.id, next); // siblings are position-asc, so this IS the rank
  }

  return new Map(
    entries.map((e) => {
      const key = `${e.userId}|${e.category}`;
      return [
        e.id,
        {
          ...toView(e, rankById.get(e.id) ?? 1),
          category: e.category,
          categoryLabel: RANK_CATEGORY_LABELS[e.category],
          categorySlug: rankCategorySlug(e.category),
          // "#3" is a lie without a denominator.
          categorySize: sizeByPair.get(key) ?? 1,
        },
      ];
    })
  );
}

export interface EntryStatusView {
  entryId: string;
  rank: number;
  categorySize: number;
  categoryLabel: string;
  categorySlug: string;
  score: number;
  sentiment: RankSentiment;
  isPlacementConfirmed: boolean;
}

/**
 * The user's ranked-entry state for one content ref (detail-page rate
 * blocks). Positions are dense, so rank = position + 1.
 */
export async function fetchEntryForRef(
  userId: string,
  ref: RankRef
): Promise<EntryStatusView | null> {
  const entry = await prisma.userRankedEntry.findFirst({
    where: refWhere(userId, ref),
  });
  if (!entry) return null;
  const categorySize = await prisma.userRankedEntry.count({
    where: { userId, category: entry.category },
  });
  return {
    entryId: entry.id,
    rank: entry.position + 1,
    categorySize,
    categoryLabel: RANK_CATEGORY_LABELS[entry.category],
    categorySlug: rankCategorySlug(entry.category),
    score: entry.score,
    sentiment: entry.sentiment,
    isPlacementConfirmed: entry.isPlacementConfirmed,
  };
}

/** Per-category counts of confirmed public rankings (profile page section). */
export async function fetchPublicRankingSummary(
  userId: string
): Promise<{ category: RankCategory; label: string; slug: string; count: number; topTitle: string | null }[]> {
  const entries = await prisma.userRankedEntry.findMany({
    where: { userId, isPlacementConfirmed: true },
    orderBy: { position: "asc" },
    select: { category: true, titleSnapshot: true },
  });
  const byCategory = new Map<RankCategory, { count: number; topTitle: string | null }>();
  for (const e of entries) {
    const cur = byCategory.get(e.category);
    if (cur) cur.count++;
    else byCategory.set(e.category, { count: 1, topTitle: e.titleSnapshot });
  }
  return [...byCategory.entries()].map(([category, { count, topTitle }]) => ({
    category,
    label: RANK_CATEGORY_LABELS[category],
    slug: rankCategorySlug(category),
    count,
    topTitle,
  }));
}
