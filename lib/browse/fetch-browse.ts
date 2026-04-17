import prisma from "@/lib/prisma";
import { activeEventsWhere, upcomingWeekendRange, endOfTodayLocal, outsideDenverWhere, OUTSIDE_DENVER_REGIONS } from "@/lib/queries/events";
import { localFavoritesWhere, groupFriendlyPlacesWhere, workFriendlyPlacesWhere, dateNightPlacesWhere } from "@/lib/home/places-section-filters";
import type { BrowseConfig } from "./browse-configs";
import type { BrowseFilters } from "./filters";

export interface BrowseItem {
  id: string;
  kind: "event" | "place" | "guide";
  title: string;
  imageUrl: string | null;
  category: string | null;
  neighborhood: string | null;
  subtitle: string;
  meta: string;
  lat: number | null;
  lng: number | null;
  startTime: string | null;
  priceRange: string | null;
  tags: string[];
}

export interface BrowseResult {
  items: BrowseItem[];
  total: number;
}

export async function fetchBrowse(config: BrowseConfig, filters: BrowseFilters): Promise<BrowseResult> {
  const now = new Date();

  if (config.source === "events" || config.source === "mixed") {
    const where: any = { ...activeEventsWhere(now) };

    if (config.defaults.when === "today") {
      where.startTime = { gte: now, lte: endOfTodayLocal(now) };
    } else if (config.defaults.when === "weekend") {
      const { start, end } = upcomingWeekendRange(now);
      where.startTime = { gte: start, lte: end };
    }
    if (config.defaults.location === "outside") {
      Object.assign(where, outsideDenverWhere());
    }

    if (filters.categories.length) {
      where.category = { in: filters.categories };
    }
    if (filters.price === "free") {
      where.priceRange = { in: ["Free", "$0", "Free entry"] };
    }
    if (filters.day) {
      // Apply day filter for weekend view
      if (filters.day !== "all") {
        const { start } = upcomingWeekendRange(now);
        const dayOffset = { fri: 0, sat: 1, sun: 2 }[filters.day] ?? 0;
        const dayStart = new Date(start);
        dayStart.setDate(start.getDate() + dayOffset);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        where.startTime = { gte: dayStart, lte: dayEnd };
      }
    }

    let orderBy: any = { startTime: "asc" };
    if (filters.sort === "price-low") orderBy = { priceRange: "asc" };

    const events = await prisma.event.findMany({
      where,
      select: {
        id: true, title: true, imageUrl: true, category: true, neighborhood: true,
        venueName: true, startTime: true, priceRange: true, tags: true, lat: true, lng: true,
        place: { select: { lat: true, lng: true } },
      },
      orderBy,
      take: 50,
    });

    const items: BrowseItem[] = events.map((e) => ({
      id: e.id,
      kind: "event" as const,
      title: e.title,
      imageUrl: e.imageUrl,
      category: e.category,
      neighborhood: e.neighborhood,
      subtitle: e.venueName,
      meta: e.startTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
      lat: e.lat ?? e.place?.lat ?? null,
      lng: e.lng ?? e.place?.lng ?? null,
      startTime: e.startTime.toISOString(),
      priceRange: e.priceRange,
      tags: e.tags,
    }));

    return { items, total: items.length };
  }

  if (config.source === "places") {
    const where: any = { openingStatus: "OPEN" };

    if (config.defaults.filter === "new") {
      where.OR = [{ isNew: true }, { openedDate: { gte: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) } }];
    }
    if (config.defaults.flag === "isLocalFavorite") Object.assign(where, localFavoritesWhere());
    if (config.defaults.flag === "goodForWorking") Object.assign(where, workFriendlyPlacesWhere());
    if (config.defaults.vibeTag) {
      where.vibeTags = { hasSome: [config.defaults.vibeTag] };
    }

    if (filters.categories.length) where.category = { in: filters.categories };

    const places = await prisma.place.findMany({
      where,
      select: {
        id: true, name: true, primaryImageUrl: true, category: true, neighborhood: true,
        address: true, priceLevel: true, vibeTags: true, tags: true, lat: true, lng: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    const items: BrowseItem[] = places.map((p) => ({
      id: p.id,
      kind: "place" as const,
      title: p.name,
      imageUrl: p.primaryImageUrl,
      category: p.category,
      neighborhood: p.neighborhood,
      subtitle: p.address,
      meta: p.vibeTags.slice(0, 2).join(" · "),
      lat: p.lat,
      lng: p.lng,
      startTime: null,
      priceRange: p.priceLevel ? "$".repeat(p.priceLevel) : null,
      tags: [...p.vibeTags, ...p.tags],
    }));

    return { items, total: items.length };
  }

  // Guides source
  const guideWhere: any = { isPublished: true };
  if (config.defaults.occasion && config.defaults.occasion !== "all") {
    guideWhere.occasionTags = { has: config.defaults.occasion };
  }
  const guides = await prisma.guide.findMany({
    where: guideWhere,
    include: { creator: true, _count: { select: { stops: true } } },
    orderBy: { saveCount: "desc" },
    take: 20,
  });
  const items: BrowseItem[] = guides.map((g) => ({
    id: g.id,
    kind: "guide" as const,
    title: g.title,
    imageUrl: g.coverImageUrl,
    category: null,
    neighborhood: g.neighborhoodHub,
    subtitle: `${g._count.stops} stops · ${g.durationLabel} · ${g.costRangeLabel}`,
    meta: g.creator.displayName,
    lat: null, lng: null,
    startTime: null,
    priceRange: g.costRangeLabel,
    tags: [...g.occasionTags, ...g.vibeTags],
  }));

  return { items, total: items.length };
}
