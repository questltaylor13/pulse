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
  // Clamp hard. An unguarded parseInt let ?limit=0 through as take:1, which
  // made hasMore true, sliced results to [], and then read results[-1].id —
  // a 500 from a query string. ?limit=-5 and ?limit=abc were equally unhappy.
  const rawLimit = parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 50)
    : 20;

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

  // D2 — taste events only. A rank is a verdict and a public list is a curated
  // argument; "Alex saved 40 events" and "Alex followed Bea" are neither, and a
  // feed full of them buries the signal it exists to carry. This is an
  // ALLOWLIST: the four legacy ActivityType values (SAVED_EVENT,
  // ATTENDED_EVENT, RATED_PLACE, FOLLOWED_USER) never render here.
  //
  // Flag off ⇒ RANKED_ITEM drops out entirely, leaving the pre-Wave-5 result
  // set, so a rollback is a clean rollback.
  const social = isSocialV1Enabled();
  const visibility: Prisma.UserActivityWhereInput = social
    ? {
        OR: [
          { type: "CREATED_LIST" },
          // A ranked row is visible only while its author's rankings are public
          // and its entry is still a confirmed verdict (a re-rate in progress
          // un-confirms the entry — see hydrateRankedEntriesForFeed).
          {
            type: "RANKED_ITEM",
            user: { rankingsArePublic: true },
            rankedEntry: { is: { isPlacementConfirmed: true } },
          },
        ],
      }
    : { type: "CREATED_LIST" };

  const activities = await prisma.userActivity.findMany({
    where: {
      userId: { in: followingIds },
      isPublic: true,
      ...visibility,
    },
    // createdAt is not unique (ms precision, and emissions batch). Cursor paging
    // over a non-unique sort key silently duplicates or skips rows at page
    // boundaries, so break the tie on id.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
      list: {
        select: {
          id: true,
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
