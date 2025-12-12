import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Toggle follow status for a user
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Can't follow yourself
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  // Check if target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if already following
  const existing = await prisma.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: userId,
      },
    },
  });

  if (existing) {
    // Unfollow
    await prisma.userFollow.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ following: false });
  } else {
    // Follow
    await prisma.userFollow.create({
      data: {
        followerId: session.user.id,
        followingId: userId,
      },
    });

    // Create activity record
    await prisma.userActivity.create({
      data: {
        userId: session.user.id,
        type: "FOLLOWED_USER",
        targetUserId: userId,
      },
    });

    return NextResponse.json({ following: true });
  }
}

// Get users the current user is following
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "following"; // "following" or "followers"

  if (type === "following") {
    const following = await prisma.userFollow.findMany({
      where: { followerId: session.user.id },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            name: true,
            bio: true,
            profileImageUrl: true,
            isInfluencer: true,
            _count: {
              select: { followers: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      users: following.map((f) => ({
        ...f.following,
        followerCount: f.following._count.followers,
        followedAt: f.createdAt,
      })),
    });
  } else {
    const followers = await prisma.userFollow.findMany({
      where: { followingId: session.user.id },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            name: true,
            bio: true,
            profileImageUrl: true,
            isInfluencer: true,
            _count: {
              select: { followers: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Check which followers the current user follows back
    const followingIds = await prisma.userFollow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    });
    const followingSet = new Set(followingIds.map((f) => f.followingId));

    return NextResponse.json({
      users: followers.map((f) => ({
        ...f.follower,
        followerCount: f.follower._count.followers,
        followedAt: f.createdAt,
        isFollowingBack: followingSet.has(f.follower.id),
      })),
    });
  }
}
