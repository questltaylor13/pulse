/**
 * PRD 6 — Build a RankingContext for a user by querying the DB.
 *
 * Consolidates the fan-out queries (profile, feedback, familiarity) into
 * one place so the precompute cron and any on-demand fallback use an
 * identical input shape.
 */

import { prisma } from "@/lib/prisma";
import type {
  RankingContext,
  RankingVariantKey,
  RatedItemSignal,
  SocialLovedSignal,
  VibePair,
} from "./types";
import { isRateRankEnabled, isSocialV1Enabled } from "./flags";

/**
 * Fetches the user + profile + feedback summary and assembles a
 * RankingContext. Null profile / missing user are both acceptable — the
 * formula handles them (null profile → quality-only).
 */
export async function buildRankingContext(userId: string): Promise<RankingContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      createdAt: true,
      rankingVariant: true,
      profile: {
        select: {
          contextSegment: true,
          socialStyle: true,
          budgetTier: true,
          vibePreferences: true,
          aspirationCategories: true,
          version: true,
        },
      },
    },
  });

  if (!user) return null;

  // Pull all feedback rows — small table per user, one round-trip is fine.
  const feedback = await prisma.userItemStatus.findMany({
    where: { userId },
    select: {
      status: true,
      eventId: true,
      placeId: true,
      discoveryId: true,
      seriesId: true,
      itemId: true,
      event: { select: { id: true, category: true, tags: true, vibeTags: true, companionTags: true, occasionTags: true } },
      place: { select: { id: true, category: true, tags: true, vibeTags: true, companionTags: true, goodForTags: true } },
      discovery: { select: { id: true, category: true, tags: true } },
      series: { select: { id: true, category: true, tags: true } },
      itemCategorySnapshot: true,
    },
  });

  const doneItemIds = new Set<string>();
  const wantItems: { itemId: string; tags: string[] }[] = [];
  const passItems: { itemId: string; tags: string[] }[] = [];
  const categoryCounts = new Map<string, number>();
  const engagedCategories = new Map<string, number>();
  let totalFeedbackCount = 0;

  for (const row of feedback) {
    totalFeedbackCount += 1;
    // Wave 6A — a series-grain row must count. Skipping it (as `?? row.itemId`
    // alone did) meant a rated weekly contributed no tags and no doneId, while
    // still incrementing totalFeedbackCount — so it silently DILUTED every
    // familiarity ratio instead of informing them.
    const itemId =
      row.eventId ?? row.placeId ?? row.discoveryId ?? row.seriesId ?? row.itemId;
    if (!itemId) continue;

    const tags = extractTags(row);
    const category =
      row.event?.category ??
      row.place?.category ??
      row.discovery?.category ??
      row.itemCategorySnapshot ??
      null;

    if (category) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      if (row.status === "WANT" || row.status === "DONE") {
        engagedCategories.set(category, (engagedCategories.get(category) ?? 0) + 1);
      }
    }

    if (row.status === "DONE") {
      doneItemIds.add(itemId);
    } else if (row.status === "WANT") {
      wantItems.push({ itemId, tags });
    } else if (row.status === "PASS") {
      passItems.push({ itemId, tags });
    }
  }

  const familiarity: Record<string, number> = {};
  if (totalFeedbackCount > 0) {
    for (const [category, engagedCount] of engagedCategories.entries()) {
      familiarity[category] = engagedCount / totalFeedbackCount;
    }
  }

  // Wave 4 Rate & Rank — rated-entry signals (decision D8). Gated on the
  // flag so flag-off yields empty signals and provably unchanged scores.
  // Loved/disliked come from DONE rows, so they never double-count with
  // wantItems (WANT only). Recomputed per build; per-user entry counts are
  // tiny (hundreds max), so this is one cheap indexed query.
  const lovedItems: RatedItemSignal[] = [];
  const dislikedItems: RatedItemSignal[] = [];
  const ratedCategoryAffinity: Record<string, number> = {};
  if (isRateRankEnabled()) {
    const entries = await prisma.userRankedEntry.findMany({
      where: { userId },
      select: {
        sentiment: true,
        score: true,
        titleSnapshot: true,
        categorySnapshot: true,
        eventId: true,
        placeId: true,
        discoveryId: true,
        seriesId: true,
        event: { select: { category: true, tags: true, vibeTags: true, companionTags: true, occasionTags: true } },
        place: { select: { category: true, tags: true, vibeTags: true, companionTags: true, goodForTags: true } },
        discovery: { select: { category: true, tags: true } },
        series: { select: { category: true, tags: true } },
      },
    });

    const perCategory = new Map<string, { liked: number; disliked: number; rated: number }>();
    for (const entry of entries) {
      // Wave 6A — include the series grain, or a ranked weekly produces itemId ""
      // and drops out of lovedItems/dislikedItems entirely: Wave 4's "rank signals
      // feed For-You" would simply not apply to series.
      const itemId =
        entry.eventId ?? entry.placeId ?? entry.discoveryId ?? entry.seriesId;
      const tags = extractTags(entry);
      const signal: RatedItemSignal = {
        itemId: itemId ?? "",
        tags,
        score: entry.score,
        title: entry.titleSnapshot,
      };
      if (itemId) {
        if (entry.sentiment === "LIKED") lovedItems.push(signal);
        else if (entry.sentiment === "DISLIKED") dislikedItems.push(signal);
      }

      const category =
        entry.event?.category ??
        entry.place?.category ??
        entry.discovery?.category ??
        entry.series?.category ??
        entry.categorySnapshot ??
        null;
      if (category) {
        const counts = perCategory.get(category) ?? { liked: 0, disliked: 0, rated: 0 };
        counts.rated += 1; // FINE counts in the denominator only
        if (entry.sentiment === "LIKED") counts.liked += 1;
        else if (entry.sentiment === "DISLIKED") counts.disliked += 1;
        perCategory.set(category, counts);
      }
    }
    for (const [category, counts] of perCategory) {
      const raw = (counts.liked - counts.disliked) / Math.max(counts.rated, 3);
      ratedCategoryAffinity[category] = Math.max(-1, Math.min(1, raw));
    }
  }

  // -- Wave 5: what the people you follow loved ------------------------------
  //
  // Gated on the flag so flag-off yields an empty set and provably unchanged
  // scores. Failure-tolerant: on error this stays empty, which is identical to
  // flag-off — a social-graph hiccup must never degrade someone's whole feed.
  const followedLovedItems: SocialLovedSignal[] = [];
  if (isSocialV1Enabled()) {
    try {
      followedLovedItems.push(...(await loadFollowedLovedSignals(userId)));
    } catch (err) {
      console.warn("[ranking.context] social signal load failed:", err);
    }
  }

  const msInDay = 24 * 60 * 60 * 1000;
  const accountAgeDays = Math.max(
    0,
    Math.floor((Date.now() - user.createdAt.getTime()) / msInDay),
  );

  return {
    userId: user.id,
    accountAgeDays,
    totalFeedbackCount,
    profile: user.profile
      ? {
          contextSegment: user.profile.contextSegment,
          socialStyle: user.profile.socialStyle,
          budgetTier: user.profile.budgetTier,
          vibePreferences: normalizeVibePreferences(user.profile.vibePreferences),
          aspirationCategories: user.profile.aspirationCategories,
          version: user.profile.version,
        }
      : null,
    wantItems,
    passItems,
    doneItemIds,
    familiarity,
    variant: (user.rankingVariant ?? "control") as RankingVariantKey,
    lovedItems,
    dislikedItems,
    ratedCategoryAffinity,
    followedLovedItems,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** At most this many follows feed the signal, most recently followed first. */
const MAX_FOLLOWS_SCANNED = 100;
/** Total entry budget across all followed users. */
const MAX_SOCIAL_ENTRIES = 300;
/** Floor per followee, so someone with one great pick is never shut out. */
const MIN_ENTRIES_PER_FOLLOWEE = 5;

/**
 * Wave 5 — the two-hop load: who you follow → what they LIKED.
 *
 * Both bounds are mandatory, not decorative. This runs on the READ path
 * (rerank-trigger.ts → rails.ts inline re-rank on dirty), not just the nightly
 * cron, and the fan-out is unbounded in *both* directions — follow count and
 * entries-per-followed-user. An unbounded version is a latency bomb that only
 * goes off once someone popular exists.
 *
 * The budget is spent PER FOLLOWEE, not as one global top-N. UserRankedEntry
 * .score is a within-user, within-category rank percentile (see scores.ts), so
 * it is NOT comparable across people: someone with 500 LIKED entries has
 * hundreds scoring ≥9, while someone with exactly one — the single favourite
 * that made you follow them — scores it 8.35. A global `orderBy score desc,
 * take 300` fills every slot with the prolific user and drops the sparse one
 * entirely, so "Bea loved this" could never fire. Per-followee slices keep the
 * fan-out bounded AND give everyone representation.
 *
 * Served by @@index([userId, sentiment, isPlacementConfirmed, score]) — without
 * it, sentiment/isPlacementConfirmed are heap filters and the score sort is
 * unindexed, so `take` would bound the output but not the work.
 */
async function loadFollowedLovedSignals(
  userId: string,
): Promise<SocialLovedSignal[]> {
  const follows = await prisma.userFollow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: "desc" },
    take: MAX_FOLLOWS_SCANNED,
    select: {
      followingId: true,
      following: {
        select: { name: true, username: true, rankingsArePublic: true },
      },
    },
  });

  // Only people whose rankings are public: a private ranking must not leak into
  // a follower's feed, not even as an unattributed nudge to the ordering.
  const visible = follows.filter((f) => f.following.rankingsArePublic);
  if (visible.length === 0) return [];

  const nameById = new Map(
    visible.map((f) => [
      f.followingId,
      f.following.name ?? (f.following.username ? `@${f.following.username}` : null),
    ]),
  );

  const perFollowee = Math.max(
    MIN_ENTRIES_PER_FOLLOWEE,
    Math.ceil(MAX_SOCIAL_ENTRIES / visible.length),
  );

  const batches = await Promise.all(
    visible.map((f) =>
      prisma.userRankedEntry.findMany({
        where: {
          userId: f.followingId,
          sentiment: "LIKED",
          isPlacementConfirmed: true,
        },
        orderBy: { score: "desc" },
        take: perFollowee,
        select: {
          userId: true,
          score: true,
          eventId: true,
          placeId: true,
          discoveryId: true,
          event: { select: { category: true, tags: true, vibeTags: true, companionTags: true, occasionTags: true } },
          place: { select: { category: true, tags: true, vibeTags: true, companionTags: true, goodForTags: true } },
          discovery: { select: { category: true, tags: true } },
        },
      }),
    ),
  );

  const signals: SocialLovedSignal[] = [];
  for (const entry of batches.flat()) {
    const itemId = entry.eventId ?? entry.placeId ?? entry.discoveryId;
    if (!itemId) continue;
    signals.push({
      itemId,
      tags: extractTags(entry),
      score: entry.score,
      followerName: nameById.get(entry.userId) ?? null,
    });
  }
  return signals;
}

type FeedbackRow = {
  event: { tags: string[]; vibeTags: string[]; companionTags: string[]; occasionTags: string[] } | null;
  place: { tags: string[]; vibeTags: string[]; companionTags: string[]; goodForTags: string[] } | null;
  discovery: { tags: string[] } | null;
  // Wave 6A. Optional: the ranked-entry query selects it, the feedback query
  // selects it, but callers constructed elsewhere need not.
  series?: { tags: string[] } | null;
};

function extractTags(row: FeedbackRow): string[] {
  if (row.event) {
    return uniq([...row.event.tags, ...row.event.vibeTags, ...row.event.companionTags, ...row.event.occasionTags]);
  }
  if (row.place) {
    return uniq([...row.place.tags, ...row.place.vibeTags, ...row.place.companionTags, ...row.place.goodForTags]);
  }
  if (row.discovery) {
    return row.discovery.tags;
  }
  if (row.series) {
    return row.series.tags;
  }
  return [];
}

function uniq(xs: string[]): string[] {
  return Array.from(new Set(xs));
}

/**
 * UserProfile.vibePreferences is Json; normalize to the VibePair[] shape
 * the formula expects. Tolerate shape drift — bad data returns empty array.
 */
function normalizeVibePreferences(raw: unknown): VibePair[] {
  if (!Array.isArray(raw)) return [];
  const out: VibePair[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const obj = entry as Record<string, unknown>;
    const pair = typeof obj.pair === "number" ? obj.pair : null;
    const selected = obj.selected === "A" || obj.selected === "B" ? obj.selected : null;
    if (pair !== null && selected !== null) out.push({ pair, selected });
  }
  return out;
}
