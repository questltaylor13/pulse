import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  eventWhereForCategory,
  isRailCategory,
  placeWhereForCategory,
  type RailCategory,
} from "@/lib/home/category-filters";
import {
  activeEventsWhere,
  endOfTodayLocal,
  outsideDenverPlaceWhere,
  outsideDenverWhere,
  upcomingWeekendRange,
} from "@/lib/queries/events";
import { sortByEditorialRank } from "@/lib/ranking";
import { SEED_GUIDES } from "@/lib/home/seed-guides";
import type {
  EventCompact,
  HomeFeedResponse,
  PlaceCompact,
} from "@/lib/home/types";

// Tag used by /api/cron/scrape-and-revalidate to bust this endpoint's cache.
export const dynamic = "force-dynamic";
export const revalidate = 60;

function toEventCompact(e: {
  id: string;
  title: string;
  category: any;
  imageUrl: string | null;
  venueName: string;
  neighborhood: string | null;
  startTime: Date;
  priceRange: string;
  isEditorsPick: boolean;
  isRecurring: boolean;
  noveltyScore: number | null;
  driveTimeFromDenver: number | null;
  tags: string[];
  oneLiner: string | null;
}): EventCompact {
  return {
    id: e.id,
    title: e.title,
    category: e.category,
    imageUrl: e.imageUrl,
    venueName: e.venueName,
    neighborhood: e.neighborhood,
    startTime: e.startTime.toISOString(),
    priceRange: e.priceRange,
    isEditorsPick: e.isEditorsPick,
    isRecurring: e.isRecurring,
    noveltyScore: e.noveltyScore,
    driveTimeFromDenver: e.driveTimeFromDenver,
    tags: e.tags,
    oneLiner: e.oneLiner,
  };
}

function toPlaceCompact(p: {
  id: string;
  name: string;
  category: any;
  primaryImageUrl: string | null;
  neighborhood: string | null;
  address: string;
  priceLevel: number | null;
  vibeTags: string[];
  tags: string[];
  openedDate: Date | null;
  isNew: boolean;
  isFeatured: boolean;
}): PlaceCompact {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    imageUrl: p.primaryImageUrl,
    neighborhood: p.neighborhood,
    address: p.address,
    priceLevel: p.priceLevel,
    vibeTags: p.vibeTags,
    tags: p.tags,
    openedDate: p.openedDate ? p.openedDate.toISOString() : null,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
  };
}

const EVENT_SELECT = {
  id: true,
  title: true,
  category: true,
  imageUrl: true,
  venueName: true,
  neighborhood: true,
  startTime: true,
  priceRange: true,
  isEditorsPick: true,
  isRecurring: true,
  noveltyScore: true,
  driveTimeFromDenver: true,
  tags: true,
  oneLiner: true,
  createdAt: true,
} as const;

const PLACE_SELECT = {
  id: true,
  name: true,
  category: true,
  primaryImageUrl: true,
  neighborhood: true,
  address: true,
  priceLevel: true,
  vibeTags: true,
  tags: true,
  openedDate: true,
  isNew: true,
  isFeatured: true,
  createdAt: true,
} as const;

export async function GET(req: NextRequest) {
  const catParam = req.nextUrl.searchParams.get("cat");
  const cat: RailCategory = isRailCategory(catParam) ? catParam : "all";

  const now = new Date();
  const eodToday = endOfTodayLocal(now);
  const { start: weekendStart, end: weekendEnd } = upcomingWeekendRange(now);
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

  const eventCat = eventWhereForCategory(cat);
  const placeCat = placeWhereForCategory(cat);

  // Parallel fetch of all four section queries.
  const [today, weekend, newPlaces, outsideEvents, outsidePlaces] = await Promise.all([
    prisma.event.findMany({
      where: {
        AND: [
          activeEventsWhere(now),
          eventCat,
          { startTime: { gte: now, lte: eodToday } },
        ],
      },
      select: EVENT_SELECT,
      orderBy: { startTime: "asc" },
      take: 10,
    }),
    prisma.event.findMany({
      where: {
        AND: [
          activeEventsWhere(now),
          eventCat,
          { startTime: { gte: weekendStart, lte: weekendEnd } },
        ],
      },
      select: EVENT_SELECT,
      take: 40,
    }),
    prisma.place.findMany({
      where: {
        AND: [
          placeCat,
          {
            OR: [
              { isNew: true },
              { openedDate: { gte: fortyFiveDaysAgo } },
            ],
          },
        ],
      },
      select: PLACE_SELECT,
      orderBy: [{ openedDate: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
    prisma.event.findMany({
      where: {
        AND: [
          activeEventsWhere(now),
          eventCat,
          outsideDenverWhere(),
        ],
      },
      select: EVENT_SELECT,
      orderBy: { startTime: "asc" },
      take: 6,
    }),
    prisma.place.findMany({
      where: {
        AND: [placeCat, outsideDenverPlaceWhere()],
      },
      select: PLACE_SELECT,
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  // "This weekend's picks" sorted by editorial rank. Keep top 10.
  const weekendRanked = sortByEditorialRank(
    weekend.map((e) => ({
      ...e,
      // rank inputs
      viewCount: 0,
      saveCount: 0,
    })),
    { now }
  ).slice(0, 10);

  const outsideTheCity: HomeFeedResponse["outsideTheCity"] = [
    ...outsideEvents.map((e) => ({ kind: "event" as const, ...toEventCompact(e) })),
    ...outsidePlaces.map((p) => ({ kind: "place" as const, ...toPlaceCompact(p) })),
  ].slice(0, 10);

  const body: HomeFeedResponse = {
    today: today.map(toEventCompact),
    weekendPicks: weekendRanked.map(toEventCompact),
    newInDenver: newPlaces.map(toPlaceCompact),
    outsideTheCity,
    guidesFromCreators: SEED_GUIDES,
    lastUpdatedAt: now.toISOString(),
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
