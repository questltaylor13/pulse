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
}

export interface PlacesResponse {
  places: PlaceItem[];
  statuses: Record<string, ItemStatus>;
  total: number;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const categoryFilter = searchParams.get("category") as Category | null;
  const subcategoryFilter = searchParams.get("subcategories")?.split(",").filter(Boolean) || [];

  // Get Denver city
  const denver = await prisma.city.findUnique({
    where: { slug: "denver" },
  });

  if (!denver) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  // Build the query for places
  const whereClause = {
    cityId: denver.id,
    type: "PLACE" as const,
    ...(categoryFilter && { category: categoryFilter }),
    // Filter by subcategories using tags array
    ...(subcategoryFilter.length > 0 && {
      tags: { hasSome: subcategoryFilter },
    }),
  };

  // Get places and user statuses in parallel
  const [places, userStatuses] = await Promise.all([
    prisma.item.findMany({
      where: whereClause,
      orderBy: { title: "asc" },
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
  }));

  const response: PlacesResponse = {
    places: formattedPlaces,
    statuses,
    total: places.length,
  };

  return NextResponse.json(response);
}
