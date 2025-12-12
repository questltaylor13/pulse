import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all influencers with their follower count and latest pick sets
  const influencers = await prisma.influencer.findMany({
    where: { citySlug: "denver" },
    include: {
      _count: {
        select: { followers: true },
      },
      pickSets: {
        where: {
          expiresAt: { gt: new Date() },
        },
        orderBy: { generatedAt: "desc" },
        take: 1,
        include: {
          picks: {
            orderBy: { rank: "asc" },
            take: 3,
            include: {
              item: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  category: true,
                  venueName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { displayName: "asc" },
  });

  // Check which influencers the user follows
  const userFollows = await prisma.userInfluencerFollow.findMany({
    where: { userId: session.user.id },
    select: { influencerId: true },
  });

  const followedIds = new Set(userFollows.map((f) => f.influencerId));

  // Format response
  const formatted = influencers.map((inf) => ({
    id: inf.id,
    handle: inf.handle,
    displayName: inf.displayName,
    bio: inf.bio,
    profileImageUrl: inf.profileImageUrl,
    profileColor: inf.profileColor,
    isFounder: inf.isFounder,
    isDenverNative: inf.isDenverNative,
    yearsInDenver: inf.yearsInDenver,
    specialties: inf.specialties,
    followerCount: inf._count.followers,
    isFollowed: followedIds.has(inf.id),
    latestPicks: inf.pickSets[0]?.picks.map((p) => ({
      id: p.item.id,
      title: p.item.title,
      type: p.item.type,
      category: p.item.category,
      venueName: p.item.venueName,
      reason: p.reason,
    })) || [],
  }));

  return NextResponse.json({ influencers: formatted });
}

// Toggle follow status
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { influencerId } = await request.json();

  if (!influencerId) {
    return NextResponse.json({ error: "Missing influencerId" }, { status: 400 });
  }

  // Check if already following
  const existing = await prisma.userInfluencerFollow.findUnique({
    where: {
      userId_influencerId: {
        userId: session.user.id,
        influencerId,
      },
    },
  });

  if (existing) {
    // Unfollow
    await prisma.userInfluencerFollow.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ followed: false });
  } else {
    // Follow
    await prisma.userInfluencerFollow.create({
      data: {
        userId: session.user.id,
        influencerId,
      },
    });
    return NextResponse.json({ followed: true });
  }
}
