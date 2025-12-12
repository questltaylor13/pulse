import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";

/**
 * GET /api/landing - Fetch all data for landing page
 * Public endpoint (no auth required)
 */
export async function GET() {
  try {
    const now = new Date();
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all data in parallel for performance
    const [
      featuredEvents,
      newPlaces,
      upcomingPlaces,
      creators,
      spotlightCreator,
      categoryCountsRaw,
      neighborhoodCountsRaw,
      totalEvents,
      totalPlaces,
      totalUsers,
    ] = await Promise.all([
      // Featured Events - Next 14 days, limit 6
      prisma.event.findMany({
        where: {
          startTime: { gte: now, lte: twoWeeks },
          city: { slug: "denver" },
        },
        orderBy: { startTime: "asc" },
        take: 6,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          venueName: true,
          address: true,
          neighborhood: true,
          startTime: true,
          priceRange: true,
          imageUrl: true,
        },
      }),

      // New Places - Opened within 30 days
      prisma.place.findMany({
        where: {
          openingStatus: "OPEN",
          OR: [
            { isNew: true },
            { openedDate: { gte: thirtyDaysAgo } },
          ],
        },
        orderBy: { openedDate: "desc" },
        take: 4,
        select: {
          id: true,
          name: true,
          address: true,
          neighborhood: true,
          category: true,
          openedDate: true,
          isNew: true,
          isFeatured: true,
          googleRating: true,
          priceLevel: true,
          primaryImageUrl: true,
          pulseDescription: true,
          vibeTags: true,
        },
      }),

      // Upcoming Places - Coming soon
      prisma.place.findMany({
        where: {
          OR: [
            { openingStatus: "COMING_SOON" },
            { openingStatus: "SOFT_OPEN" },
          ],
        },
        orderBy: { expectedOpenDate: "asc" },
        take: 2,
        select: {
          id: true,
          name: true,
          address: true,
          neighborhood: true,
          category: true,
          openingStatus: true,
          expectedOpenDate: true,
          isFeatured: true,
          primaryImageUrl: true,
          pulseDescription: true,
          conceptDescription: true,
        },
      }),

      // Featured Creators with picks (limit 3)
      prisma.influencer.findMany({
        where: { citySlug: "denver" },
        orderBy: [
          { isFounder: "desc" },
          { displayName: "asc" },
        ],
        take: 3,
        include: {
          _count: { select: { followers: true } },
          pickSets: {
            where: { expiresAt: { gt: now } },
            orderBy: { generatedAt: "desc" },
            take: 1,
            include: {
              picks: {
                orderBy: { rank: "asc" },
                take: 1,
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
      }),

      // Spotlight Creator (founder)
      prisma.influencer.findFirst({
        where: {
          citySlug: "denver",
          isFounder: true,
        },
        select: {
          id: true,
          handle: true,
          displayName: true,
          bio: true,
          profileImageUrl: true,
          profileColor: true,
          isFounder: true,
          isDenverNative: true,
          yearsInDenver: true,
          specialties: true,
          vibeDescription: true,
        },
      }),

      // Category counts for upcoming events
      prisma.event.groupBy({
        by: ["category"],
        where: {
          startTime: { gte: now },
          city: { slug: "denver" },
        },
        _count: true,
      }),

      // Neighborhood counts
      prisma.event.groupBy({
        by: ["neighborhood"],
        where: {
          startTime: { gte: now },
          city: { slug: "denver" },
          neighborhood: { not: null },
        },
        _count: true,
      }),

      // Stats: Total events
      prisma.event.count({
        where: {
          city: { slug: "denver" },
          startTime: { gte: now },
        },
      }),

      // Stats: Total places
      prisma.place.count({
        where: { openingStatus: "OPEN" },
      }),

      // Stats: Total users
      prisma.user.count({
        where: { onboardingComplete: true },
      }),
    ]);

    // Format category counts
    const categoryCounts: Record<string, number> = {};
    for (const item of categoryCountsRaw) {
      categoryCounts[item.category] = item._count;
    }

    // Format neighborhood counts (top 8)
    const neighborhoodCounts: Record<string, number> = {};
    const sortedNeighborhoods = neighborhoodCountsRaw
      .filter((n) => n.neighborhood)
      .sort((a, b) => b._count - a._count)
      .slice(0, 8);
    for (const item of sortedNeighborhoods) {
      if (item.neighborhood) {
        neighborhoodCounts[item.neighborhood] = item._count;
      }
    }

    // Format creators
    const formattedCreators = creators.map((creator) => ({
      id: creator.id,
      handle: creator.handle,
      displayName: creator.displayName,
      bio: creator.bio,
      profileImageUrl: creator.profileImageUrl,
      profileColor: creator.profileColor,
      isFounder: creator.isFounder,
      followerCount: creator._count.followers,
      topPick: creator.pickSets[0]?.picks[0]
        ? {
            id: creator.pickSets[0].picks[0].item.id,
            title: creator.pickSets[0].picks[0].item.title,
            type: creator.pickSets[0].picks[0].item.type,
            category: creator.pickSets[0].picks[0].item.category,
            venueName: creator.pickSets[0].picks[0].item.venueName,
            reason: creator.pickSets[0].picks[0].reason,
          }
        : null,
    }));

    // Format events with computed fields
    const formattedEvents = featuredEvents.map((event) => ({
      ...event,
      dayOfWeek: new Date(event.startTime).toLocaleDateString("en-US", { weekday: "short" }),
      formattedDate: new Date(event.startTime).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      formattedTime: new Date(event.startTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    }));

    // Format new places with days old
    const formattedNewPlaces = newPlaces.map((place) => ({
      ...place,
      daysOld: place.openedDate
        ? Math.ceil((Date.now() - new Date(place.openedDate).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    return NextResponse.json({
      featuredEvents: formattedEvents,
      newPlaces: formattedNewPlaces,
      upcomingPlaces,
      featuredCreators: formattedCreators,
      spotlightCreator,
      categoryCounts,
      neighborhoodCounts,
      stats: {
        events: totalEvents,
        places: totalPlaces,
        users: totalUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching landing page data:", error);
    return NextResponse.json(
      { error: "Failed to fetch landing page data" },
      { status: 500 }
    );
  }
}
