import prisma from "@/lib/prisma";
import { activeEventsWhere, upcomingWeekendRange, endOfTodayLocal, outsideDenverWhere, OUTSIDE_DENVER_REGIONS } from "@/lib/queries/events";
import { addDaysDenver, denverHour, startOfTodayDenver, endOfTodayDenver } from "@/lib/time/denver";
import { boundingBox } from "@/lib/geo";
import { filterAndSortByDistance } from "./distance";
import { matchesTimeOfDay } from "./filter-logic";
import { buildPlacesWhere } from "./places-where";
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

  const origin =
    filters.lat != null && filters.lng != null ? { lat: filters.lat, lng: filters.lng } : null;
  const radiusMiles =
    filters.distance && Number.isFinite(Number(filters.distance)) ? Number(filters.distance) : null;
  const distanceActive = !!origin && radiusMiles != null;
  const sortByDistance = filters.sort === "distance" && !!origin;

  if (config.source === "events" || config.source === "mixed") {
    // Build the where as an AND array so each concern is an independent clause.
    // (Plain property assignment collided: activeEventsWhere + outsideDenverWhere
    // + a vibe filter all wanted `OR`, and later assignments clobbered earlier
    // ones — dropping the active/upcoming guard and region scoping.)
    const and: any[] = [activeEventsWhere(now)];

    // The user's When filter overrides the config default (both were dead for
    // filters.when before Wave 2 — only config.defaults.when was ever read).
    const effectiveWhen = filters.when ?? config.defaults.when ?? null;
    const isWeekendView = effectiveWhen === "weekend" || effectiveWhen === "this-weekend";
    const dayNarrowed = isWeekendView && !!filters.day && filters.day !== "all";

    if (dayNarrowed) {
      // A single weekend day (Fri/Sat/Sun) replaces the full-weekend window.
      // Use DST-correct Denver wall-clock boundaries — the previous
      // server-local setHours offset the day by the UTC offset (6–7h).
      const { start } = upcomingWeekendRange(now);
      const dayOffset = { fri: 0, sat: 1, sun: 2 }[filters.day!] ?? 0;
      const dayStart = addDaysDenver(startOfTodayDenver(start), dayOffset);
      and.push({ startTime: { gte: dayStart, lte: endOfTodayDenver(dayStart) } });
    } else if (effectiveWhen === "today") {
      and.push({ startTime: { gte: now, lte: endOfTodayLocal(now) } });
    } else if (isWeekendView) {
      const { start, end } = upcomingWeekendRange(now);
      and.push({ startTime: { gte: start, lte: end } });
    } else if (effectiveWhen === "next-7") {
      and.push({ startTime: { gte: now, lte: endOfTodayLocal(addDaysDenver(now, 6)) } });
    }

    if (config.defaults.location === "outside") and.push(outsideDenverWhere());
    if (filters.categories.length) and.push({ category: { in: filters.categories } });
    if (filters.price === "free") and.push({ priceRange: { in: ["Free", "$0", "Free entry"] } });
    if (filters.vibes.length) {
      // Vibe can live in either the vibe-specific or general tag array.
      and.push({ OR: [{ vibeTags: { hasSome: filters.vibes } }, { tags: { hasSome: filters.vibes } }] });
    }

    if (distanceActive) {
      const bb = boundingBox(origin!, radiusMiles!);
      // Event may carry its own coords OR inherit its place's — accept either.
      and.push({
        OR: [
          { lat: { gte: bb.minLat, lte: bb.maxLat }, lng: { gte: bb.minLng, lte: bb.maxLng } },
          { place: { lat: { gte: bb.minLat, lte: bb.maxLat }, lng: { gte: bb.minLng, lte: bb.maxLng } } },
        ],
      });
    }

    const where: any = { AND: and };

    let orderBy: any = { startTime: "asc" };
    // Canonical sort value is "price" (Task 8); tolerate the legacy "price-low".
    // Distance sort can't be expressed in SQL — post-sort by haversine instead.
    if ((filters.sort === "price" || filters.sort === "price-low") && !sortByDistance) {
      orderBy = { priceRange: "asc" };
    }

    // Over-fetch when we post-filter in memory (time-of-day or distance) so the
    // final slice(0,50) isn't starved.
    const timeFiltered = filters.timeOfDay.length > 0;
    const overFetch = timeFiltered || distanceActive || sortByDistance;
    const events = await prisma.event.findMany({
      where,
      select: {
        id: true, title: true, imageUrl: true, category: true, neighborhood: true,
        venueName: true, startTime: true, priceRange: true, tags: true, lat: true, lng: true,
        place: { select: { lat: true, lng: true } },
      },
      orderBy,
      take: overFetch ? 200 : 50,
    });

    const windowed = timeFiltered
      ? events.filter((e) => matchesTimeOfDay(denverHour(e.startTime), filters.timeOfDay))
      : events;

    let items: BrowseItem[] = windowed.map((e) => ({
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

    if (origin && (distanceActive || sortByDistance)) {
      items = filterAndSortByDistance(items, origin, distanceActive ? radiusMiles : null, sortByDistance);
    }
    items = items.slice(0, 50);

    return { items, total: items.length };
  }

  if (config.source === "places") {
    // Composed as an AND array in lib/browse/places-where.ts. The clauses used to
    // be merged onto one object, where each silently overwrote the last.
    const where: any = buildPlacesWhere(config, filters, now);

    if (distanceActive) {
      const bb = boundingBox(origin!, radiusMiles!);
      where.lat = { gte: bb.minLat, lte: bb.maxLat };
      where.lng = { gte: bb.minLng, lte: bb.maxLng };
    }

    const places = await prisma.place.findMany({
      where,
      select: {
        id: true, name: true, primaryImageUrl: true, category: true, neighborhood: true,
        address: true, priceLevel: true, vibeTags: true, tags: true, lat: true, lng: true,
      },
      orderBy: { updatedAt: "desc" },
      take: distanceActive || sortByDistance ? 200 : 50,
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

    const ranked = origin && (distanceActive || sortByDistance)
      ? filterAndSortByDistance(items, origin, distanceActive ? radiusMiles : null, sortByDistance).slice(0, 50)
      : items;
    return { items: ranked, total: ranked.length };
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
