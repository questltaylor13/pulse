import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get trending events and places
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "6");

  const now = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  try {
    // Get trending events (most WANT saves in the last week, upcoming events only)
    const trendingEvents = await prisma.event.findMany({
      where: {
        startTime: { gte: now },
        city: { slug: "denver" },
      },
      include: {
        _count: {
          select: {
            userStatuses: true,
          },
        },
        place: {
          select: {
            id: true,
            googleRating: true,
            neighborhood: true,
          },
        },
      },
      orderBy: [
        { userStatuses: { _count: "desc" } },
        { startTime: "asc" },
      ],
      take: limit,
    });

    // Get trending/hot places (new openings, soft opens)
    const hotPlaces = await prisma.place.findMany({
      where: {
        OR: [
          { isNew: true },
          { isUpcoming: true },
          { openingStatus: "SOFT_OPEN" },
        ],
      },
      orderBy: [
        { openedDate: "desc" },
      ],
      take: limit,
    });

    // Format response
    const formattedEvents = trendingEvents.map((event) => ({
      id: event.id,
      title: event.title,
      category: event.category,
      venueName: event.venueName,
      neighborhood: event.neighborhood || event.place?.neighborhood,
      startTime: event.startTime,
      imageUrl: event.imageUrl,
      saveCount: event._count.userStatuses,
      googleRating: event.place?.googleRating,
    }));

    const formattedPlaces = hotPlaces.map((place) => ({
      id: place.id,
      title: place.name,
      category: place.category,
      neighborhood: place.neighborhood,
      imageUrl: place.primaryImageUrl,
      isNew: place.isNew,
      isUpcoming: place.isUpcoming,
      isSoftOpen: place.openingStatus === "SOFT_OPEN",
      openedDate: place.openedDate,
    }));

    return NextResponse.json({
      events: formattedEvents,
      places: formattedPlaces,
    });
  } catch (error) {
    console.error("Failed to fetch trending:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending" },
      { status: 500 }
    );
  }
}
