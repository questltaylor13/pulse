import "server-only";
import prisma from "@/lib/prisma";
import {
  eventWhereForCategory,
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
import {
  placeWhereForPlacesRail,
  type PlacesRailCategory,
} from "@/lib/home/places-rail-filters";
import {
  localFavoritesWhere,
  dateNightPlacesWhere,
  groupFriendlyPlacesWhere,
  workFriendlyPlacesWhere,
} from "@/lib/home/places-section-filters";
import type {
  EventCompact,
  GuideCompact,
  GuidesFeedResponse,
  HomeFeedResponse,
  PlaceCompact,
  PlacesFeedResponse,
} from "@/lib/home/types";

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
  updatedAt: true,
} as const;

export async function fetchPlacesFeed(
  cat: PlacesRailCategory
): Promise<PlacesFeedResponse> {
  const now = new Date();
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
  const placeCat = placeWhereForPlacesRail(cat);

  const [newInDenver, neighborhoods, localFavorites, dateNight, goodForGroups, workFriendly] =
    await Promise.all([
      // 1. New in Denver
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
      // 2. Neighborhoods
      prisma.neighborhood.findMany({
        where: { isFeatured: true },
        orderBy: { displayOrder: "asc" },
        take: 6,
        select: {
          slug: true,
          name: true,
          coverImageUrl: true,
          placeCount: true,
        },
      }),
      // 3. Local favorites
      prisma.place.findMany({
        where: { AND: [localFavoritesWhere(), placeCat] },
        select: PLACE_SELECT,
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      // 4. Date night
      prisma.place.findMany({
        where: { AND: [dateNightPlacesWhere(), placeCat] },
        select: PLACE_SELECT,
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      // 5. Good for groups
      prisma.place.findMany({
        where: { AND: [groupFriendlyPlacesWhere(), placeCat] },
        select: PLACE_SELECT,
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      // 6. Work friendly
      prisma.place.findMany({
        where: { AND: [workFriendlyPlacesWhere(), placeCat] },
        select: PLACE_SELECT,
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);

  return {
    newInDenver: newInDenver.map(toPlaceCompact),
    neighborhoods,
    localFavorites: localFavorites.map(toPlaceCompact),
    dateNight: dateNight.map(toPlaceCompact),
    goodForGroups: goodForGroups.map(toPlaceCompact),
    workFriendly: workFriendly.map(toPlaceCompact),
    lastUpdatedAt: now.toISOString(),
  };
}

// ---------- Guide helpers ----------

function toGuideCompact(g: any): GuideCompact {
  return {
    id: g.id,
    slug: g.slug,
    title: g.title,
    tagline: g.tagline,
    coverImageUrl: g.coverImageUrl,
    durationLabel: g.durationLabel,
    durationMinutes: g.durationMinutes,
    costRangeLabel: g.costRangeLabel,
    occasionTags: g.occasionTags,
    vibeTags: g.vibeTags,
    stopsCount: g._count?.stops ?? 0,
    saveCount: g.saveCount,
    isFeatured: g.isFeatured,
    creator: {
      handle: g.creator.handle,
      displayName: g.creator.displayName,
      profileImageUrl: g.creator.profileImageUrl,
      label: g.creator.specialties?.[0] ?? "Creator",
    },
  };
}

const GUIDE_INCLUDE = {
  creator: {
    select: {
      handle: true,
      displayName: true,
      profileImageUrl: true,
      specialties: true,
    },
  },
  _count: { select: { stops: true } },
} as const;

export async function fetchGuidesFeed(
  occasion: string
): Promise<GuidesFeedResponse> {
  const now = new Date();
  const occasionFilter =
    occasion !== "all" ? { occasionTags: { has: occasion } } : {};

  const [featured, weekendReady, creators, dateNight, quickPlans] =
    await Promise.all([
      // 1. Featured guide
      prisma.guide.findFirst({
        where: { isPublished: true, isFeatured: true, ...occasionFilter },
        include: GUIDE_INCLUDE,
        orderBy: { updatedAt: "desc" },
      }),
      // 2. Weekend-ready (exclude rainy-day)
      prisma.guide.findMany({
        where: {
          isPublished: true,
          NOT: { occasionTags: { has: "rainy-day" } },
          ...occasionFilter,
        },
        include: GUIDE_INCLUDE,
        orderBy: { saveCount: "desc" },
        take: 10,
      }),
      // 3. Featured creators
      prisma.influencer.findMany({
        where: { isFeaturedCreator: true },
        select: {
          handle: true,
          displayName: true,
          profileImageUrl: true,
          specialties: true,
          guideCount: true,
        },
        take: 8,
      }),
      // 4. Date night
      prisma.guide.findMany({
        where: {
          isPublished: true,
          occasionTags: { has: "date-night" },
          ...occasionFilter,
        },
        include: GUIDE_INCLUDE,
        orderBy: { saveCount: "desc" },
        take: 8,
      }),
      // 5. Quick plans (3 hours or less)
      prisma.guide.findMany({
        where: {
          isPublished: true,
          durationMinutes: { lte: 180 },
          ...occasionFilter,
        },
        include: GUIDE_INCLUDE,
        orderBy: { saveCount: "desc" },
        take: 8,
      }),
    ]);

  return {
    featuredGuide: featured ? toGuideCompact(featured) : null,
    weekendReady: weekendReady.map(toGuideCompact),
    featuredCreators: creators.map((c) => ({
      handle: c.handle,
      displayName: c.displayName,
      profileImageUrl: c.profileImageUrl,
      label: c.specialties?.[0] ?? "Creator",
      guideCount: c.guideCount,
    })),
    dateNight: dateNight.map(toGuideCompact),
    quickPlans: quickPlans.map(toGuideCompact),
    lastUpdatedAt: now.toISOString(),
  };
}

export async function fetchHomeFeed(cat: RailCategory): Promise<HomeFeedResponse> {
  const now = new Date();
  const eodToday = endOfTodayLocal(now);
  const { start: weekendStart, end: weekendEnd } = upcomingWeekendRange(now);
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

  const eventCat = eventWhereForCategory(cat);
  const placeCat = placeWhereForCategory(cat);

  const [today, weekend, newPlaces, outsideEvents, outsidePlaces] = await Promise.all([
    prisma.event.findMany({
      where: {
        AND: [activeEventsWhere(now), eventCat, { startTime: { gte: now, lte: eodToday } }],
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
        AND: [activeEventsWhere(now), eventCat, outsideDenverWhere()],
      },
      select: EVENT_SELECT,
      orderBy: { startTime: "asc" },
      take: 6,
    }),
    prisma.place.findMany({
      where: { AND: [placeCat, outsideDenverPlaceWhere()] },
      select: PLACE_SELECT,
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  const weekendRanked = sortByEditorialRank(
    weekend.map((e) => ({ ...e, viewCount: 0, saveCount: 0 })),
    { now }
  ).slice(0, 10);

  const outsideTheCity: HomeFeedResponse["outsideTheCity"] = [
    ...outsideEvents.map((e) => ({ kind: "event" as const, ...toEventCompact(e) })),
    ...outsidePlaces.map((p) => ({ kind: "place" as const, ...toPlaceCompact(p) })),
  ].slice(0, 10);

  return {
    today: today.map(toEventCompact),
    weekendPicks: weekendRanked.map(toEventCompact),
    newInDenver: newPlaces.map(toPlaceCompact),
    outsideTheCity,
    guidesFromCreators: SEED_GUIDES,
    lastUpdatedAt: now.toISOString(),
  };
}
