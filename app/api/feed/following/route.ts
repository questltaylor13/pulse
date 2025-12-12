import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get activity feed from followed users
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

  // Fetch activities from followed users
  const activities = await prisma.userActivity.findMany({
    where: {
      userId: { in: followingIds },
      isPublic: true,
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

  return NextResponse.json({
    activities: results.map((activity) => ({
      id: activity.id,
      type: activity.type,
      user: {
        id: activity.user.id,
        username: activity.user.username,
        name: activity.user.name,
        profileImageUrl: activity.user.profileImageUrl,
        isInfluencer: activity.user.isInfluencer,
      },
      event: activity.event
        ? {
            id: activity.event.id,
            title: activity.event.title,
            category: activity.event.category,
            venueName: activity.event.venueName,
            startTime: activity.event.startTime,
          }
        : null,
      list: activity.list
        ? {
            id: activity.list.id,
            name: activity.list.name,
          }
        : null,
      targetUser: activity.targetUser
        ? {
            id: activity.targetUser.id,
            username: activity.targetUser.username,
            name: activity.targetUser.name,
          }
        : null,
      createdAt: activity.createdAt,
    })),
    nextCursor,
    hasMore,
  });
}
