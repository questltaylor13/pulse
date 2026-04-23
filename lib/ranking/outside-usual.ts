/**
 * PRD 6 Phase 5 — "Outside your usual" rail source.
 *
 * Pulls the isSerendipity items out of a user's RankedFeedCache and
 * hydrates them into the compact card shapes the home page already
 * knows how to render. No new ranking work — the serendipity selection
 * was already done by Phase 3 inside the precompute cron.
 *
 * Gated upstream on:
 *   - OUTSIDE_USUAL_ENABLED env flag (flags.ts)
 *   - userId present
 *   - Total feedback count ≥ serendipity.outsideUsualMinFeedback
 *   - Cache present
 *
 * Returns a mixed list (events + places + discoveries). Empty array when
 * the cache has no serendipity picks yet.
 */

import "server-only";
import prisma from "@/lib/prisma";
import { readCache } from "./cache";
import { RANKING_CONFIG } from "./config";
import type { EventCompact, PlaceCompact } from "@/lib/home/types";

export type OutsideUsualItem =
  | ({ kind: "event" } & EventCompact)
  | ({ kind: "place" } & PlaceCompact)
  | ({ kind: "discovery"; id: string; title: string; category: string; tags: string[]; imageUrl: string | null });

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
  region: true,
  townName: true,
  isDayTrip: true,
  isWeekendTrip: true,
  driveTimeFromDenver: true,
  driveNote: true,
} as const;

export interface FetchOutsideUsualOptions {
  scope?: "near" | "all";
  maxItems?: number;
}

/**
 * Load 'Outside your usual' items for a user. Returns [] on cache miss,
 * under-threshold feedback count, or when the flag is off upstream.
 */
export async function fetchOutsideUsual(
  userId: string,
  feedbackCount: number,
  opts: FetchOutsideUsualOptions = {},
): Promise<OutsideUsualItem[]> {
  const maxItems = opts.maxItems ?? 8;
  if (feedbackCount < RANKING_CONFIG.serendipity.outsideUsualMinFeedback) {
    return [];
  }

  const cache = await readCache(userId);
  if (!cache) return [];

  const serendipityPicks = cache.rankedItems
    .filter((item) => item.isSerendipity)
    .slice(0, maxItems);
  if (serendipityPicks.length === 0) return [];

  const eventIds = serendipityPicks.filter((p) => p.itemType === "event").map((p) => p.itemId);
  const placeIds = serendipityPicks.filter((p) => p.itemType === "place").map((p) => p.itemId);
  const discoveryIds = serendipityPicks
    .filter((p) => p.itemType === "discovery")
    .map((p) => p.itemId);

  const scopeFilter =
    opts.scope === "near" ? { region: { not: "MOUNTAIN_DEST" as const } } : {};

  const [events, places, discoveries] = await Promise.all([
    eventIds.length
      ? prisma.event.findMany({
          where: { id: { in: eventIds }, ...scopeFilter, isArchived: false },
          select: EVENT_SELECT,
        })
      : Promise.resolve([]),
    placeIds.length
      ? prisma.place.findMany({
          where: { id: { in: placeIds }, ...scopeFilter, openingStatus: "OPEN" },
          select: PLACE_SELECT,
        })
      : Promise.resolve([]),
    discoveryIds.length
      ? prisma.discovery.findMany({
          where: { id: { in: discoveryIds }, status: "ACTIVE", ...scopeFilter },
          select: {
            id: true,
            title: true,
            category: true,
            tags: true,
          },
        })
      : Promise.resolve([]),
  ]);

  // Build a lookup so we can preserve the order from the cache.
  const eventMap = new Map(events.map((e) => [e.id, e]));
  const placeMap = new Map(places.map((p) => [p.id, p]));
  const discoveryMap = new Map(discoveries.map((d) => [d.id, d]));

  const out: OutsideUsualItem[] = [];
  for (const pick of serendipityPicks) {
    if (pick.itemType === "event") {
      const e = eventMap.get(pick.itemId);
      if (e) {
        out.push({
          kind: "event",
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
        });
      }
    } else if (pick.itemType === "place") {
      const p = placeMap.get(pick.itemId);
      if (p) {
        out.push({
          kind: "place",
          id: p.id,
          name: p.name,
          category: p.category,
          imageUrl: p.primaryImageUrl,
          neighborhood: p.neighborhood,
          address: p.address,
          priceLevel: p.priceLevel,
          vibeTags: p.vibeTags,
          tags: p.tags,
          openedDate: p.openedDate?.toISOString() ?? null,
          isNew: p.isNew,
          isFeatured: p.isFeatured,
          region: p.region,
          townName: p.townName,
          isDayTrip: p.isDayTrip,
          isWeekendTrip: p.isWeekendTrip,
          driveTimeFromDenver: p.driveTimeFromDenver,
          driveNote: p.driveNote,
        });
      }
    } else {
      const d = discoveryMap.get(pick.itemId);
      if (d) {
        out.push({
          kind: "discovery",
          id: d.id,
          title: d.title,
          category: d.category,
          tags: d.tags,
          imageUrl: null,
        });
      }
    }
  }
  return out;
}
