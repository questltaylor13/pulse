import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/places/new - Get recently opened places
 * Query params:
 * - days: number of days to look back (default 30)
 * - category: filter by category
 * - neighborhood: filter by neighborhood
 * - limit: max results (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const category = searchParams.get("category");
    const neighborhood = searchParams.get("neighborhood");
    const limit = parseInt(searchParams.get("limit") || "20");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const places = await prisma.place.findMany({
      where: {
        openingStatus: "OPEN",
        OR: [
          { isNew: true },
          { openedDate: { gte: cutoffDate } },
        ],
        ...(category ? { category: category as any } : {}),
        ...(neighborhood ? { neighborhood } : {}),
      },
      orderBy: [
        { openedDate: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        address: true,
        neighborhood: true,
        category: true,
        openingStatus: true,
        openedDate: true,
        isNew: true,
        isFeatured: true,
        googleRating: true,
        googleReviewCount: true,
        priceLevel: true,
        primaryImageUrl: true,
        pulseDescription: true,
        vibeTags: true,
        companionTags: true,
        googleMapsUrl: true,
        conceptDescription: true,
        newsSource: true,
        buzzScore: true,
      },
    });

    // Calculate days since opening for each place
    const placesWithMeta = places.map((place) => ({
      ...place,
      daysOld: place.openedDate
        ? Math.ceil((Date.now() - new Date(place.openedDate).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    return NextResponse.json({
      places: placesWithMeta,
      count: placesWithMeta.length,
    });
  } catch (error) {
    console.error("Error fetching new places:", error);
    return NextResponse.json(
      { error: "Failed to fetch new places" },
      { status: 500 }
    );
  }
}
