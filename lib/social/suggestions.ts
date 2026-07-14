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

import "server-only";
import { prisma } from "@/lib/prisma";
import { RANK_CATEGORY_LABELS } from "@/lib/rank-engine/categories";
import { resolveContent } from "@/lib/content/snapshot";

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
/**
 * Rows considered before ranking by entry count. Prisma can't order by a
 * filtered relation count, so the choice is: sort in JS, or don't sort at all.
 * Sorting in JS means the DB slice must be WIDER than the result — taking 12
 * unordered rows and sorting *those* returns an arbitrary 12, not the top 12,
 * which is what the code did before and what its comment denied.
 */
const CANDIDATE_POOL = 100;

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
    // Bounded pool, then rank in JS. See CANDIDATE_POOL.
    take: CANDIDATE_POOL,
  });

  return users
    // The Prisma filter guarantees a username, but the type doesn't know that.
    // A type-predicate filter is the repo's idiom for this narrowing (see
    // featured-lists.ts); a non-null assertion would be the first in the codebase.
    .filter((u): u is typeof u & { username: string } => u.username !== null)
    .map((u) => {
      const top = u.rankedEntries[0];
      // Shared mapper rather than a fourth copy of "a Place's title is `name`".
      const title = top ? resolveContent(top).title : null;
      return {
        id: u.id,
        username: u.username,
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
    // order by a filtered relation count — hence the wider CANDIDATE_POOL above,
    // so this actually sorts the field rather than an arbitrary slice of it.
    .sort((a, b) => b.rankedCount - a.rankedCount)
    .slice(0, limit);
}
