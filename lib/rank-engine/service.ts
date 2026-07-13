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
  UserRankedEntry,
} from "@prisma/client";
import { markDirty } from "@/lib/ranking/cache";
import { triggerUserRerank } from "@/lib/ranking/rerank-trigger";
import { upsertFeedback } from "@/lib/feedback/api";
import {
  RANK_CATEGORY_LABELS,
  rankCategorySlug,
  toRankCategory,
} from "./categories";
import { deriveScores, assertBucketInvariant, SENTIMENT_ORDER } from "./scores";
import { expectedComparisons } from "./insertion";

/** Rank engine refs are content-native only — no legacy Item bridge. */
export type RankRef =
  | { eventId: string }
  | { placeId: string }
  | { discoveryId: string };

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

interface ContentSnapshot {
  title: string | null;
  imageUrl: string | null;
  category: string | null;
  town: string | null;
}

async function loadContent(ref: RankRef): Promise<ContentSnapshot | null> {
  if ("eventId" in ref) {
    const row = await prisma.event.findUnique({
      where: { id: ref.eventId },
      select: {
        title: true,
        imageUrl: true,
        category: true,
        townName: true,
        neighborhood: true,
      },
    });
    if (!row) return null;
    return {
      title: row.title,
      imageUrl: row.imageUrl,
      category: row.category,
      town: row.townName ?? row.neighborhood,
    };
  }
  if ("placeId" in ref) {
    const row = await prisma.place.findUnique({
      where: { id: ref.placeId },
      select: {
        name: true,
        primaryImageUrl: true,
        category: true,
        townName: true,
        neighborhood: true,
      },
    });
    if (!row) return null;
    return {
      title: row.name,
      imageUrl: row.primaryImageUrl,
      category: row.category,
      town: row.townName ?? row.neighborhood,
    };
  }
  const row = await prisma.discovery.findUnique({
    where: { id: ref.discoveryId },
    select: { title: true, category: true, townName: true },
  });
  if (!row) return null;
  return {
    title: row.title,
    imageUrl: null, // Discoveries have no image field
    category: row.category,
    town: row.townName,
  };
}

function refWhere(userId: string, ref: RankRef): Prisma.UserRankedEntryWhereInput {
  if ("eventId" in ref) return { userId, eventId: ref.eventId };
  if ("placeId" in ref) return { userId, placeId: ref.placeId };
  return { userId, discoveryId: ref.discoveryId };
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

const bucketRank = (s: RankSentiment) => SENTIMENT_ORDER.indexOf(s);

/**
 * Renumber + rescore an ordered category list inside a transaction. `ordered`
 * is the desired final order, best first. Only rows whose position or score
 * changed are written.
 */
async function persistOrder(
  tx: Prisma.TransactionClient,
  ordered: { id: string; sentiment: RankSentiment; position: number; score: number }[]
): Promise<void> {
  assertBucketInvariant(ordered.map((e) => e.sentiment));
  const scores = deriveScores(ordered.map((e) => e.sentiment));
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].position !== i || ordered[i].score !== scores[i]) {
      await tx.userRankedEntry.update({
        where: { id: ordered[i].id },
        data: { position: i, score: scores[i] },
      });
    }
  }
}

async function loadCategoryEntries(
  tx: Prisma.TransactionClient,
  userId: string,
  category: RankCategory
) {
  return tx.userRankedEntry.findMany({
    where: { userId, category },
    orderBy: { position: "asc" },
  });
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

  const { entryId, bucketEntries } = await prisma.$transaction(async (tx) => {
    const existing = await tx.userRankedEntry.findFirst({
      where: refWhere(userId, ref),
    });

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

    let row: UserRankedEntry;
    if (existing) {
      row = await tx.userRankedEntry.update({
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
    } else {
      row = await tx.userRankedEntry.create({
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
    }

    const ordered = [
      ...current.slice(0, insertAt),
      { id: row.id, sentiment, position: -1, score: -1 },
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

    return { entryId: row.id, bucketEntries: opponents };
  });

  // Status + bridge star through the existing path — this also handles
  // markDirty, live re-rank, and Place.pulseRating* recompute.
  await upsertFeedback({
    userId,
    ref,
    status: "DONE",
    source,
    rating: bridgeRating(sentiment),
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

  // beginPlacement already dirtied via upsertFeedback; the placement changes
  // ordering (and therefore loved/disliked weighting), so dirty again. The
  // 45s rerank coalesce window absorbs the begin→place double-trigger.
  try {
    await markDirty(userId);
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

type EntryWithContent = Prisma.UserRankedEntryGetPayload<{
  include: {
    event: { select: { id: true; title: true; imageUrl: true; townName: true; neighborhood: true } };
    place: { select: { id: true; name: true; primaryImageUrl: true; townName: true; neighborhood: true } };
    discovery: { select: { id: true; title: true; townName: true } };
  };
}>;

function toView(e: EntryWithContent, rank: number): RankedEntryView {
  const title =
    e.event?.title ?? e.place?.name ?? e.discovery?.title ?? e.titleSnapshot ?? "Untitled";
  const imageUrl =
    e.event?.imageUrl ?? e.place?.primaryImageUrl ?? e.imageSnapshot;
  const town =
    e.event?.townName ?? e.event?.neighborhood ??
    e.place?.townName ?? e.place?.neighborhood ??
    e.discovery?.townName ?? null;
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

const CONTENT_INCLUDE = {
  event: { select: { id: true, title: true, imageUrl: true, townName: true, neighborhood: true } },
  place: { select: { id: true, name: true, primaryImageUrl: true, townName: true, neighborhood: true } },
  discovery: { select: { id: true, title: true, townName: true } },
} as const;

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
