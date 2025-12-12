import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentPeriod } from "@/lib/leaderboards";
import { LeaderboardType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ username: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { username } = await params;

  // Find user by username
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
      lists: {
        where: { isPublic: true },
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: { items: true },
          },
        },
      },
      eventStatuses: {
        where: { status: "DONE" },
        take: 50,
        include: {
          event: {
            select: { category: true, neighborhood: true },
          },
        },
      },
      itemStatuses: {
        where: { status: "DONE" },
        take: 50,
        include: {
          item: {
            select: { category: true, neighborhood: true },
          },
        },
      },
      badges: {
        where: { isEarned: true },
        include: { badge: true },
        orderBy: [{ isPinned: "desc" }, { earnedAt: "desc" }],
        take: 6,
      },
      groupMemberships: {
        include: {
          group: {
            include: {
              members: {
                include: {
                  user: {
                    select: { id: true, name: true, profileImageUrl: true },
                  },
                },
                take: 5,
              },
            },
          },
        },
        take: 4,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if current user follows this user
  const session = await getServerSession(authOptions);
  let isFollowing = false;
  let isOwnProfile = false;

  if (session?.user?.id) {
    isOwnProfile = session.user.id === user.id;

    if (!isOwnProfile) {
      const follow = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }
  }

  // Calculate stats
  const allCategories = [
    ...user.eventStatuses.map((s) => s.event.category),
    ...user.itemStatuses.map((s) => s.item.category),
  ];
  const allNeighborhoods = [
    ...user.eventStatuses.map((s) => s.event.neighborhood).filter(Boolean),
    ...user.itemStatuses.map((s) => s.item.neighborhood).filter(Boolean),
  ];

  // Count occurrences
  const categoryCounts: Record<string, number> = {};
  for (const cat of allCategories) {
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }
  const neighborhoodCounts: Record<string, number> = {};
  for (const hood of allNeighborhoods) {
    if (hood) neighborhoodCounts[hood] = (neighborhoodCounts[hood] || 0) + 1;
  }

  // Get top 5
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topNeighborhoods = Object.entries(neighborhoodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Get leaderboard rank
  const leaderboardEntry = await prisma.leaderboardEntry.findUnique({
    where: {
      userId_period_type_typeValue: {
        userId: user.id,
        period: getCurrentPeriod(),
        type: LeaderboardType.OVERALL,
        typeValue: "",
      },
    },
  });

  // Format response
  const profile = {
    id: user.id,
    username: user.username,
    name: user.name,
    bio: user.bio,
    profileImageUrl: user.profileImageUrl,
    isInfluencer: user.isInfluencer,
    createdAt: user.createdAt,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing,
    isOwnProfile,
    stats: {
      eventsSaved: user.eventStatuses.length,
      eventsAttended: user.totalEventsAttended || user.eventStatuses.filter((s) => s.status === "DONE").length,
      topCategories,
      topNeighborhoods,
    },
    // Community features
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    totalBadgesEarned: user.totalBadgesEarned,
    rank: leaderboardEntry?.rank || null,
    score: leaderboardEntry?.score || 0,
    badges: user.badges.map((ub) => ({
      id: ub.badge.id,
      slug: ub.badge.slug,
      name: ub.badge.name,
      emoji: ub.badge.emoji,
      tier: ub.badge.tier,
      colorHex: ub.badge.colorHex,
      earnedAt: ub.earnedAt,
      isPinned: ub.isPinned,
    })),
    groups: isOwnProfile
      ? user.groupMemberships.map((gm) => ({
          id: gm.group.id,
          name: gm.group.name,
          emoji: gm.group.emoji,
          memberCount: gm.group.memberCount,
          role: gm.role,
          members: gm.group.members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            profileImageUrl: m.user.profileImageUrl,
          })),
        }))
      : [],
    publicLists: user.lists.map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      coverImageUrl: list.coverImageUrl,
      itemCount: list._count.items,
      shareSlug: list.shareSlug,
      updatedAt: list.updatedAt,
    })),
  };

  return NextResponse.json(profile);
}

// Update own profile
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;

  // Verify this is the user's own profile
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || user.id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, bio, newUsername } = body;

  // Validate new username if provided
  if (newUsername && newUsername !== username) {
    // Check format
    if (!/^[a-z0-9_]{3,20}$/.test(newUsername)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters, lowercase letters, numbers, and underscores only" },
        { status: 400 }
      );
    }

    // Check availability
    const existing = await prisma.user.findUnique({
      where: { username: newUsername },
    });
    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name !== undefined ? name : undefined,
      bio: bio !== undefined ? bio : undefined,
      username: newUsername || undefined,
    },
  });

  return NextResponse.json({
    username: updated.username,
    name: updated.name,
    bio: updated.bio,
  });
}
