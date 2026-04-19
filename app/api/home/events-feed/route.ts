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

function toEventCompact(e: any): EventCompact {
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
    region: e.region,
    townName: e.townName,
    isDayTrip: e.isDayTrip,
    isWeekendTrip: e.isWeekendTrip,
    driveNote: e.driveNote,
    worthTheDriveScore: e.worthTheDriveScore,
  };
}

function toPlaceCompact(p: any): PlaceCompact {
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
    region: p.region,
    townName: p.townName,
    isDayTrip: p.isDayTrip,
    isWeekendTrip: p.isWeekendTrip,
    driveTimeFromDenver: p.driveTimeFromDenver,
    driveNote: p.driveNote,
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
  region: true,
  townName: true,
  isDayTrip: true,
  isWeekendTrip: true,
  driveNote: true,
  worthTheDriveScore: true,
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
  region: true,
  townName: true,
  isDayTrip: true,
  isWeekendTrip: true,
  driveTimeFromDenver: true,
  driveNote: true,
} as const;

export async function GET(req: NextRequest) {
  const catParam = req.nextUrl.searchParams.get("cat");
  const cat: RailCategory = isRailCategory(catParam) ? catParam : "all";

  const now = new Date();
  const eodToday = endOfTodayLocal(now);
  const { start: weekendStart, end: weekendEnd } = upcomingWeekendRange(now);
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
    // "Just added on Pulse" — curator-flagged (isNew OR isFeatured) picks.
    // See components/home/fetch-home-feed.ts for rationale.
    prisma.place.findMany({
      where: {
        AND: [
          placeCat,
          { openingStatus: "OPEN" },
          { OR: [{ isNew: true }, { isFeatured: true }] },
        ],
      },
      select: PLACE_SELECT,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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

  // Simpler API surface — Worth-a-weekend / scope filter lives in the
  // server component path; this unauthenticated JSON endpoint keeps the
  // pre-Phase-5 shape for callers that already consume it.
  const body: HomeFeedResponse = {
    today: today.map(toEventCompact),
    weekendPicks: weekendRanked.map(toEventCompact),
    newInDenver: newPlaces.map(toPlaceCompact),
    outsideTheCity,
    worthAWeekend: [],
    guidesFromCreators: SEED_GUIDES,
    lastUpdatedAt: now.toISOString(),
    regionalScope: "near",
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
