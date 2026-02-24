import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Category, ItemStatus } from "@prisma/client";

interface PlaceItem {
  id: string;
  placeId: string;
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
  isNew: boolean;
  isDogFriendly: boolean;
  dogFriendlyNotes: string | null;
  isDrinkingOptional: boolean;
  isAlcoholFree: boolean;
  hasMocktailMenu: boolean;
  soberFriendlyNotes: string | null;
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

/**
 * Format openingHours JSON to a readable string.
 * The JSON is typically { weekday_text: ["Monday: 11:00 AM - 10:00 PM", ...] }
 */
function formatOpeningHours(openingHours: unknown): string | null {
  if (!openingHours || typeof openingHours !== "object") return null;

  const hours = openingHours as Record<string, unknown>;

  // Handle weekday_text array format from Google
  if (Array.isArray(hours.weekday_text) && hours.weekday_text.length > 0) {
    return hours.weekday_text.join("; ");
  }

  // Handle weekdayText alias
  if (Array.isArray(hours.weekdayText) && hours.weekdayText.length > 0) {
    return hours.weekdayText.join("; ");
  }

  return null;
}

/**
 * Convert priceLevel integer (0-4) to dollar sign string.
 */
function formatPriceLevel(priceLevel: number | null): string {
  if (priceLevel == null || priceLevel === 0) return "";
  return "$".repeat(priceLevel);
}

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

  // Build the where clause for Place model
  const whereClause: Record<string, unknown> = {
    citySlug: "denver",
    openingStatus: "OPEN",
  };

  // Filter by main tab category
  if (mainTab && CATEGORY_MAPPING[mainTab]) {
    whereClause.category = { in: CATEGORY_MAPPING[mainTab] };
  }

  // Filter by experience subcategory - search vibeTags and types
  if (mainTab === "experiences" && subcategory && EXPERIENCE_TAGS[subcategory]) {
    const tags = EXPERIENCE_TAGS[subcategory];
    whereClause.OR = [
      { vibeTags: { hasSome: tags } },
      { types: { hasSome: tags } },
    ];
  }

  // Legacy category filter
  if (categoryFilter) {
    whereClause.category = categoryFilter;
  }

  // Legacy subcategory filter using vibeTags + types
  if (subcategoryFilter.length > 0) {
    whereClause.OR = [
      { vibeTags: { hasSome: subcategoryFilter } },
      { types: { hasSome: subcategoryFilter } },
    ];
  }

  // Vibe filter (date-night, group, solo, family)
  if (vibeFilter) {
    // Search in companionTags or vibeTags
    // If OR already set by subcategory filter, we need to use AND
    const vibeCondition = [
      { companionTags: { has: vibeFilter } },
      { vibeTags: { has: vibeFilter } },
    ];

    if (whereClause.OR) {
      // Combine with existing OR using AND
      whereClause.AND = [
        { OR: whereClause.OR as Record<string, unknown>[] },
        { OR: vibeCondition },
      ];
      delete whereClause.OR;
    } else {
      whereClause.OR = vibeCondition;
    }
  }

  // New & Trending filter - use isNew boolean
  if (isNew || mainTab === "new") {
    whereClause.isNew = true;
  }

  // Get places from Place model
  const places = await prisma.place.findMany({
    where: whereClause,
    orderBy: [
      { googleRating: "desc" },
      { name: "asc" },
    ],
    take: 50,
  });

  // Get statuses for these places via bridging Items
  // Find Items that match the places by venueName to build the status map
  let statuses: Record<string, ItemStatus> = {};

  if (excludeDone || true) {
    // Always load statuses so the UI can show current state
    const placeNames = places.map((p) => p.name);

    const bridgingItems = await prisma.item.findMany({
      where: {
        type: "PLACE",
        venueName: { in: placeNames },
        userStatuses: {
          some: { userId: session.user.id },
        },
      },
      include: {
        userStatuses: {
          where: { userId: session.user.id },
        },
      },
    });

    // Build a map from venueName -> status, then map to Place ID
    const nameToStatus = new Map<string, ItemStatus>();
    for (const item of bridgingItems) {
      if (item.userStatuses[0]) {
        nameToStatus.set(item.venueName, item.userStatuses[0].status);
      }
    }

    // Map statuses using Place.id as key (by matching Place.name to Item.venueName)
    for (const place of places) {
      const s = nameToStatus.get(place.name);
      if (s) {
        statuses[place.id] = s;
      }
    }

    // Filter out DONE/PASS places if excludeDone is true
    if (excludeDone) {
      const excludedPlaceIds = new Set(
        Object.entries(statuses)
          .filter(([, s]) => s === "DONE" || s === "PASS")
          .map(([id]) => id)
      );

      if (excludedPlaceIds.size > 0) {
        const filteredPlaces = places.filter((p) => !excludedPlaceIds.has(p.id));
        // Re-assign places for formatting below
        return formatAndRespond(filteredPlaces, statuses);
      }
    }
  }

  return formatAndRespond(places, statuses);
}

type PlaceRecord = Awaited<ReturnType<typeof prisma.place.findMany>>[number];

function formatAndRespond(
  places: PlaceRecord[],
  statuses: Record<string, ItemStatus>
) {
  const formattedPlaces: PlaceItem[] = places.map((place) => ({
    id: place.id,
    placeId: place.id,
    type: "PLACE" as const,
    title: place.name,
    description: place.pulseDescription || "",
    category: place.category || ("RESTAURANT" as Category),
    tags: [...(place.vibeTags || []), ...(place.companionTags || [])],
    venueName: place.name,
    address: place.address,
    priceRange: formatPriceLevel(place.priceLevel),
    source: "google-places",
    sourceUrl: place.website || null,
    neighborhood: place.neighborhood,
    hours: formatOpeningHours(place.openingHours),
    imageUrl: place.primaryImageUrl,
    googleRating: place.googleRating,
    googleReviewCount: place.googleReviewCount,
    vibeTags: place.vibeTags || [],
    companionTags: place.companionTags || [],
    isNew: place.isNew,
    isDogFriendly: place.isDogFriendly,
    dogFriendlyNotes: place.dogFriendlyNotes,
    isDrinkingOptional: place.isDrinkingOptional,
    isAlcoholFree: place.isAlcoholFree,
    hasMocktailMenu: place.hasMocktailMenu,
    soberFriendlyNotes: place.soberFriendlyNotes,
  }));

  const response: PlacesResponse = {
    places: formattedPlaces,
    statuses,
    total: formattedPlaces.length,
  };

  return NextResponse.json(response);
}
