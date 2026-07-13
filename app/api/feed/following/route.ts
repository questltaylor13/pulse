import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSocialV1Enabled } from "@/lib/ranking/flags";
import { hydrateRankedEntriesForFeed } from "@/lib/rank-engine/service";
import { toFeedItems } from "@/lib/social/feed";
import type { Prisma } from "@prisma/client";

/**
 * Activity feed from followed users.
 *
 * RANKED_ITEM rows are pointers (Wave 5): they carry no snapshot of rank or
 * title, and are hydrated from UserRankedEntry here, at read time. That is what
 * keeps the feed honest — the Beli mechanic reorders lists on every duel, so a
 * rank written into the row at emission time would be stale almost immediately.
 *
 * Privacy is likewise evaluated at read time against the author's *current*
 * `rankingsArePublic`. Snapshotting it at write time would mean flipping your
 * rankings private left your ranks stranded in every follower's timeline.
 *
 * Both of those filters run in SQL rather than over the fetched page: this
 * endpoint pages with `take: limit + 1`, so dropping rows in JS afterwards
 * would silently under-fill pages and corrupt `hasMore`.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  // Get IDs of users we follow
  const following = await prisma.userFollow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });

  const followingIds = following.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return NextResponse.json({
      activities: [],
      nextCursor: null,
      hasMore: false,
    });
  }

  // Flag off ⇒ ranked rows stay out of the feed even if some were emitted
  // while it was on, so a rollback is a clean rollback.
  const social = isSocialV1Enabled();
  const visibility: Prisma.UserActivityWhereInput = social
    ? {
        OR: [
          { type: { not: "RANKED_ITEM" } },
          // A ranked row is visible only while its author's rankings are public
          // and its entry still resolves.
          {
            type: "RANKED_ITEM",
            user: { rankingsArePublic: true },
            rankedEntry: { isNot: null },
          },
        ],
      }
    : { type: { not: "RANKED_ITEM" } };

  const activities = await prisma.userActivity.findMany({
    where: {
      userId: { in: followingIds },
      isPublic: true,
      ...visibility,
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          profileImageUrl: true,
          isInfluencer: true,
        },
      },
      event: {
        select: {
          id: true,
          title: true,
          category: true,
          venueName: true,
          startTime: true,
        },
      },
      list: {
        select: {
          id: true,
          name: true,
        },
      },
      targetUser: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
  });

  const hasMore = activities.length > limit;
  const results = hasMore ? activities.slice(0, -1) : activities;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  // One hydration query for the whole page.
  const entries = await hydrateRankedEntriesForFeed(
    results
      .map((a) => a.rankedEntryId)
      .filter((id): id is string => id !== null)
  );

  return NextResponse.json({
    activities: toFeedItems(results, entries),
    nextCursor,
    hasMore,
  });
}
