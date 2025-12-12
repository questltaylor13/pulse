import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";
import {
  scoreAndRankEvents,
  buildUserPreferences,
  buildDetailedPreferencesData,
  ScoredEvent,
  ScoringContext,
} from "@/lib/scoring";

export interface FeedResponse {
  events: ScoredEvent[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
  );
  const categoryFilter = searchParams.get("category") as Category | null;
  const neighborhoodFilter = searchParams.get("neighborhoods")?.split(",").filter(Boolean) || [];
  const subcategoryFilter = searchParams.get("subcategories")?.split(",").filter(Boolean) || [];

  // Get Denver city
  const denver = await prisma.city.findUnique({
    where: { slug: "denver" },
  });

  if (!denver) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  // Build the event query
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const whereClause = {
    cityId: denver.id,
    startTime: {
      gte: now,
      lte: twoWeeksFromNow,
    },
    ...(categoryFilter && { category: categoryFilter }),
    ...(neighborhoodFilter.length > 0 && { neighborhood: { in: neighborhoodFilter } }),
    // Filter by subcategories using tags array (case-insensitive matching)
    ...(subcategoryFilter.length > 0 && {
      tags: { hasSome: subcategoryFilter },
    }),
  };

  // Get total count and events with place data
  const [total, events] = await Promise.all([
    prisma.event.count({ where: whereClause }),
    prisma.event.findMany({
      where: whereClause,
      orderBy: { startTime: "asc" },
      include: {
        place: {
          select: {
            id: true,
            googleMapsUrl: true,
            googleRating: true,
            googleReviewCount: true,
            priceLevel: true,
            combinedScore: true,
            vibeTags: true,
            companionTags: true,
            pulseDescription: true,
            primaryImageUrl: true,
          },
        },
        creatorFeatures: {
          include: {
            influencer: {
              select: {
                id: true,
                handle: true,
                displayName: true,
                profileImageUrl: true,
                profileColor: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // Score events based on user preferences if logged in
  let scoredEvents: ScoredEvent[];

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        preferences: true,
        detailedPreferences: true,
      },
    });

    if (user) {
      const preferences = buildUserPreferences(
        user.preferences.map((p) => ({
          category: p.category,
          preferenceType: p.preferenceType,
          intensity: p.intensity,
        })),
        user.relationshipStatus
      );

      const detailedPreferences = buildDetailedPreferencesData(user.detailedPreferences);

      const context: ScoringContext = {
        preferences,
        detailedPreferences,
      };
      scoredEvents = scoreAndRankEvents(events, context);
    } else {
      // No user found, use neutral preferences
      const context: ScoringContext = { preferences: buildUserPreferences([], null) };
      scoredEvents = scoreAndRankEvents(events, context);
    }
  } else {
    // Anonymous user, use neutral preferences
    const context: ScoringContext = { preferences: buildUserPreferences([], null) };
    scoredEvents = scoreAndRankEvents(events, context);
  }

  // Paginate after scoring
  const startIndex = (page - 1) * pageSize;
  const paginatedEvents = scoredEvents.slice(startIndex, startIndex + pageSize);

  const response: FeedResponse = {
    events: paginatedEvents,
    total,
    page,
    pageSize,
    hasMore: startIndex + pageSize < total,
  };

  return NextResponse.json(response);
}
