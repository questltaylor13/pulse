import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/places/upcoming - Get coming soon places
 * Query params:
 * - category: filter by category
 * - neighborhood: filter by neighborhood
 * - limit: max results (default 20)
 * - includeSoftOpen: include soft open places (default true)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const neighborhood = searchParams.get("neighborhood");
    const limit = parseInt(searchParams.get("limit") || "20");
    const includeSoftOpen = searchParams.get("includeSoftOpen") !== "false";

    const statuses: any[] = ["COMING_SOON"];
    if (includeSoftOpen) {
      statuses.push("SOFT_OPEN");
    }

    const places = await prisma.place.findMany({
      where: {
        OR: [
          { openingStatus: { in: statuses } },
          { isUpcoming: true },
        ],
        ...(category ? { category: category as any } : {}),
        ...(neighborhood ? { neighborhood } : {}),
      },
      orderBy: [
        { openingStatus: "asc" }, // SOFT_OPEN comes first (S before C)
        { expectedOpenDate: "asc" },
        { announcedDate: "desc" },
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        address: true,
        neighborhood: true,
        category: true,
        openingStatus: true,
        expectedOpenDate: true,
        announcedDate: true,
        isUpcoming: true,
        isFeatured: true,
        expectedPriceLevel: true,
        primaryImageUrl: true,
        conceptDescription: true,
        sneakPeekInfo: true,
        socialLinks: true,
        newsSource: true,
        newsSourceUrl: true,
        buzzScore: true,
        preOpeningSaves: true,
        vibeTags: true,
      },
    });

    // Calculate days until opening for each place
    const now = new Date();
    const placesWithMeta = places.map((place) => {
      let daysUntil: number | null = null;
      if (place.expectedOpenDate) {
        daysUntil = Math.ceil(
          (new Date(place.expectedOpenDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Calculate days since announced
      let daysSinceAnnounced: number | null = null;
      if (place.announcedDate) {
        daysSinceAnnounced = Math.ceil(
          (now.getTime() - new Date(place.announcedDate).getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      return {
        ...place,
        daysUntil,
        daysSinceAnnounced,
      };
    });

    // Group by status
    const softOpen = placesWithMeta.filter((p) => p.openingStatus === "SOFT_OPEN");
    const comingSoon = placesWithMeta.filter((p) => p.openingStatus === "COMING_SOON");

    return NextResponse.json({
      places: placesWithMeta,
      softOpen,
      comingSoon,
      count: placesWithMeta.length,
    });
  } catch (error) {
    console.error("Error fetching upcoming places:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming places" },
      { status: 500 }
    );
  }
}
