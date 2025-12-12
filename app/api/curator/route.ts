import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/curator - Get curator dashboard data
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is a creator/influencer
  const influencer = await prisma.influencer.findFirst({
    where: { userId: session.user.id },
  });

  if (!influencer) {
    return NextResponse.json({ error: "Not a creator", isCreator: false }, { status: 403 });
  }

  // Get stats
  const [
    eventsCreated,
    totalSaves,
    followerCount,
    recentEvents,
  ] = await Promise.all([
    // Events created by this influencer
    prisma.event.count({
      where: { createdById: influencer.id },
    }),
    // Total saves on events created by this influencer
    prisma.eventUserStatus.count({
      where: {
        event: { createdById: influencer.id },
        status: "WANT",
      },
    }),
    // Follower count
    prisma.userInfluencerFollow.count({
      where: { influencerId: influencer.id },
    }),
    // Recent events with save counts
    prisma.event.findMany({
      where: { createdById: influencer.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: {
          select: {
            userStatuses: { where: { status: "WANT" } },
          },
        },
      },
    }),
  ]);

  // Get recent activity (saves on their events)
  const recentSaves = await prisma.eventUserStatus.findMany({
    where: {
      event: { createdById: influencer.id },
      status: "WANT",
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      event: { select: { title: true } },
    },
  });

  return NextResponse.json({
    isCreator: true,
    influencer: {
      id: influencer.id,
      handle: influencer.handle,
      displayName: influencer.displayName,
      profileImageUrl: influencer.profileImageUrl,
      profileColor: influencer.profileColor,
    },
    stats: {
      eventsCreated,
      totalSaves,
      followerCount,
    },
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      title: e.title,
      startTime: e.startTime,
      status: e.status,
      saves: e._count.userStatuses,
    })),
    recentActivity: recentSaves.map((s) => ({
      type: "save",
      eventTitle: s.event.title,
      createdAt: s.createdAt,
    })),
  });
}
