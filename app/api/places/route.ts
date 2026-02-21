import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Category, ItemStatus } from "@prisma/client";

interface PlaceItem {
  id: string;
  type: "PLACE";
  title: string;
  description: string;
  category: Category;
  tags: string[];
  venueName: string;
  address: string;
  priceRange: string;
  source: string;
  sourceUrl: string | null;
  neighborhood: string | null;
  hours: string | null;
  imageUrl: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  vibeTags: string[];
  companionTags: string[];
}

export interface PlacesResponse {
  places: PlaceItem[];
  statuses: Record<string, ItemStatus>;
  total: number;
}

// Main category tabs mapping
const CATEGORY_MAPPING: Record<string, Category[]> = {
  "food-drink": ["RESTAURANT", "BARS", "COFFEE", "FOOD"],
  "experiences": ["ACTIVITY_VENUE"],
  "entertainment": ["LIVE_MUSIC", "ART"],
  "outdoors": ["OUTDOORS", "FITNESS"],
};

// Experience subcategory tags
const EXPERIENCE_TAGS: Record<string, string[]> = {
  "creative": ["glass-blowing", "pottery", "paint-sip", "candle-making", "art-studio", "crafts", "creative"],
  "active": ["archery", "axe-throwing", "rock-climbing", "escape-room", "go-karts", "bowling", "mini-golf", "batting-cages", "active", "adventure"],
  "wellness": ["spa", "float-tank", "sauna", "yoga", "wellness", "meditation"],
  "entertainment": ["speakeasy", "board-game", "vr-arcade", "karaoke", "comedy", "jazz", "live-music", "theater", "arcade"],
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const mainTab = searchParams.get("tab"); // food-drink, experiences, entertainment, outdoors, new
  const subcategory = searchParams.get("subcategory"); // creative, active, wellness, etc.
  const categoryFilter = searchParams.get("category") as Category | null;
  const subcategoryFilter = searchParams.get("subcategories")?.split(",").filter(Boolean) || [];
  const vibeFilter = searchParams.get("vibe"); // date-night, group, solo, family
  const excludeDone = searchParams.get("excludeDone") !== "false"; // Default to excluding done/passed
  const isNew = searchParams.get("new") === "true";

  // Get Denver city
  const denver = await prisma.city.findUnique({
    where: { slug: "denver" },
  });

  if (!denver) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  // Get user's Done and Passed items to exclude
  let excludedItemIds: string[] = [];
  if (excludeDone) {
    const excludedStatuses = await prisma.userItemStatus.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["DONE", "PASS"] },
        item: {
          type: "PLACE",
          cityId: denver.id,
        },
      },
      select: { itemId: true },
    });
    excludedItemIds = excludedStatuses.map((s) => s.itemId);
  }

  // Build the query for places
  const whereClause: Record<string, unknown> = {
    cityId: denver.id,
    type: "PLACE" as const,
  };

  // Exclude Done/Passed places
  if (excludedItemIds.length > 0) {
    whereClause.id = { notIn: excludedItemIds };
  }

  // Filter by main tab category
  if (mainTab && CATEGORY_MAPPING[mainTab]) {
    whereClause.category = { in: CATEGORY_MAPPING[mainTab] };
  }

  // Filter by experience subcategory
  if (mainTab === "experiences" && subcategory && EXPERIENCE_TAGS[subcategory]) {
    whereClause.tags = { hasSome: EXPERIENCE_TAGS[subcategory] };
  }

  // Legacy category filter
  if (categoryFilter) {
    whereClause.category = categoryFilter;
  }

  // Legacy subcategory filter using tags
  if (subcategoryFilter.length > 0) {
    whereClause.tags = { hasSome: subcategoryFilter };
  }

  // Vibe filter (date-night, group, solo, family)
  if (vibeFilter) {
    // Search in companionTags or vibeTags
    whereClause.OR = [
      { companionTags: { has: vibeFilter } },
      { vibeTags: { has: vibeFilter } },
      { tags: { has: vibeFilter } },
    ];
  }

  // New & Trending filter - places opened in last 90 days
  if (isNew || mainTab === "new") {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    whereClause.createdAt = { gte: ninetyDaysAgo };
  }

  // Get places and user statuses in parallel
  const [places, userStatuses] = await Promise.all([
    prisma.item.findMany({
      where: whereClause,
      orderBy: [
        { createdAt: "desc" }, // Newest first
        { title: "asc" },
      ],
      take: 50, // Limit results
    }),
    prisma.userItemStatus.findMany({
      where: {
        userId: session.user.id,
        item: {
          type: "PLACE",
          cityId: denver.id,
        },
      },
    }),
  ]);

  // Build statuses map
  const statuses: Record<string, ItemStatus> = {};
  userStatuses.forEach((s) => {
    statuses[s.itemId] = s.status;
  });

  // Format response
  const formattedPlaces: PlaceItem[] = places.map((place) => ({
    id: place.id,
    type: "PLACE" as const,
    title: place.title,
    description: place.description,
    category: place.category,
    tags: place.tags,
    venueName: place.venueName,
    address: place.address,
    priceRange: place.priceRange,
    source: place.source,
    sourceUrl: place.sourceUrl,
    neighborhood: place.neighborhood,
    hours: place.hours,
    imageUrl: place.imageUrl,
    googleRating: place.googleRating,
    googleReviewCount: place.googleRatingCount,
    vibeTags: place.vibeTags || [],
    companionTags: place.companionTags || [],
  }));

  const response: PlacesResponse = {
    places: formattedPlaces,
    statuses,
    total: places.length,
  };

  return NextResponse.json(response);
}
