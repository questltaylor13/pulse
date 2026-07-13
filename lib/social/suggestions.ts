/**
 * Wave 5 — who to follow.
 *
 * This exists for the following feed's empty state, which is the load-bearing
 * element of the page at Pulse's current scale: with one real user, a feed you
 * can't populate is not a feed, it's a dead end. Turning the empty state into a
 * discovery surface is what makes the page worth shipping today.
 *
 * A suggestion is someone whose taste you can actually *see*: rankings public,
 * at least one confirmed entry. Anyone else is an empty profile, and following
 * them teaches the feed nothing.
 */

import { prisma } from "@/lib/prisma";
import { RANK_CATEGORY_LABELS } from "@/lib/rank-engine/categories";

export interface SuggestedTastemaker {
  id: string;
  username: string;
  name: string | null;
  profileImageUrl: string | null;
  isInfluencer: boolean;
  /** Confirmed ranked entries — the "why follow them" number. */
  rankedCount: number;
  /** Their current #1 in their largest category, as a taste sample. */
  topPick: { title: string; categoryLabel: string } | null;
}

const DEFAULT_LIMIT = 12;

export async function fetchSuggestedTastemakers(
  viewerId: string,
  limit: number = DEFAULT_LIMIT
): Promise<SuggestedTastemaker[]> {
  const following = await prisma.userFollow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });

  // Don't suggest yourself, or anyone you already follow.
  const excluded = [viewerId, ...following.map((f) => f.followingId)];

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: excluded },
      rankingsArePublic: true,
      username: { not: null },
      rankedEntries: { some: { isPlacementConfirmed: true } },
    },
    select: {
      id: true,
      username: true,
      name: true,
      profileImageUrl: true,
      isInfluencer: true,
      _count: {
        select: { rankedEntries: { where: { isPlacementConfirmed: true } } },
      },
      // Their #1: position 0 is the top of the first bucket by construction
      // (positions are dense and bucket-ordered), so this is the strongest
      // verdict they've published.
      rankedEntries: {
        where: { isPlacementConfirmed: true, position: 0 },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          category: true,
          titleSnapshot: true,
          event: { select: { title: true } },
          place: { select: { name: true } },
          discovery: { select: { title: true } },
        },
      },
    },
    take: limit,
  });

  return users
    .map((u) => {
      const top = u.rankedEntries[0];
      const title =
        top?.event?.title ??
        top?.place?.name ??
        top?.discovery?.title ??
        top?.titleSnapshot ??
        null;
      return {
        id: u.id,
        username: u.username!,
        name: u.name,
        profileImageUrl: u.profileImageUrl,
        isInfluencer: u.isInfluencer,
        rankedCount: u._count.rankedEntries,
        topPick:
          top && title
            ? { title, categoryLabel: RANK_CATEGORY_LABELS[top.category] }
            : null,
      };
    })
    // Most-ranked first: the people with the most published taste are the most
    // useful to follow. Sorted here rather than in SQL because Prisma can't
    // order by a filtered relation count.
    .sort((a, b) => b.rankedCount - a.rankedCount);
}
