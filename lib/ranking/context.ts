/**
 * PRD 6 — Build a RankingContext for a user by querying the DB.
 *
 * Consolidates the fan-out queries (profile, feedback, familiarity) into
 * one place so the precompute cron and any on-demand fallback use an
 * identical input shape.
 */

import { prisma } from "@/lib/prisma";
import type { RankingContext, RankingVariantKey, VibePair } from "./types";

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
      itemId: true,
      event: { select: { id: true, category: true, tags: true, vibeTags: true, companionTags: true, occasionTags: true } },
      place: { select: { id: true, category: true, tags: true, vibeTags: true, companionTags: true, goodForTags: true } },
      discovery: { select: { id: true, category: true, tags: true } },
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
    const itemId = row.eventId ?? row.placeId ?? row.discoveryId ?? row.itemId;
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
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FeedbackRow = {
  event: { tags: string[]; vibeTags: string[]; companionTags: string[]; occasionTags: string[] } | null;
  place: { tags: string[]; vibeTags: string[]; companionTags: string[]; goodForTags: string[] } | null;
  discovery: { tags: string[] } | null;
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
