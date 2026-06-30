/**
 * PRD 6 — ranked-feed hydration primitive.
 *
 * Reads a user's RankedFeedCache (written by the precompute cron) as the
 * PRIMARY ordering and hydrates the top picks into the compact card shapes
 * the home page renders, preserving cache-rank order. This is what lets the
 * "For You" feed do true candidate SELECTION (which items show) rather than
 * the shallow re-sort of a chronological window that fetch-home-feed does.
 *
 * Returns `null` on cache miss so callers can fall back to quality/window
 * queries. Returns `[]` when the cache exists but has no items of the
 * requested type(s). Models the id→row Map hydration in ./outside-usual.ts.
 */

import "server-only";
import prisma from "@/lib/prisma";
import { readCache } from "./cache";
import type { RankedItemType, ScoreReason } from "./types";
import type { EventCompact, PlaceCompact } from "@/lib/home/types";

export type RankedFeedItem =
  | ({ kind: "event"; score: number; reasons: ScoreReason[] } & EventCompact)
  | ({ kind: "place"; score: number; reasons: ScoreReason[] } & PlaceCompact);

export interface RankedFeedOptions {
  /** Which item types to hydrate. Default: events + places. */
  types?: RankedItemType[];
  /** Max cache picks to hydrate (after type filter). Default 120. */
  limit?: number;
  /** "near" drops Mountain-Destination items, matching the home scope filter. */
  scope?: "near" | "all";
}

export const EVENT_SELECT = {
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

export const PLACE_SELECT = {
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

// Param typed `any` to match the project's existing compact mappers
// (fetch-home-feed.ts / outside-usual.ts) and the Prisma select inference.
export function rowToEventCompact(e: any): EventCompact {
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

export function rowToPlaceCompact(p: any): PlaceCompact {
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

/**
 * Hydrate a user's ranked feed in cache-rank order. `null` = cache miss
 * (caller should fall back to a quality/window query).
 */
export async function getRankedFeedHydrated(
  userId: string,
  opts: RankedFeedOptions = {},
): Promise<RankedFeedItem[] | null> {
  const types = opts.types ?? ["event", "place"];
  const limit = opts.limit ?? 120;

  const cache = await readCache(userId);
  if (!cache) return null;

  const picks = cache.rankedItems
    .filter((it) => types.includes(it.itemType))
    .slice(0, limit);
  if (picks.length === 0) return [];

  const eventIds = picks.filter((p) => p.itemType === "event").map((p) => p.itemId);
  const placeIds = picks.filter((p) => p.itemType === "place").map((p) => p.itemId);

  const scopeFilter =
    opts.scope === "near" ? { region: { not: "MOUNTAIN_DEST" as const } } : {};

  const [events, places] = await Promise.all([
    eventIds.length
      ? prisma.event.findMany({
          where: { id: { in: eventIds }, isArchived: false, ...scopeFilter },
          select: EVENT_SELECT,
        })
      : Promise.resolve([]),
    placeIds.length
      ? prisma.place.findMany({
          where: { id: { in: placeIds }, openingStatus: "OPEN", ...scopeFilter },
          select: PLACE_SELECT,
        })
      : Promise.resolve([]),
  ]);

  const eventMap = new Map(events.map((e) => [e.id, e]));
  const placeMap = new Map(places.map((p) => [p.id, p]));

  // Walk the cache order so the output is ranked, not DB-ordered.
  const out: RankedFeedItem[] = [];
  for (const pick of picks) {
    if (pick.itemType === "event") {
      const e = eventMap.get(pick.itemId);
      if (e) out.push({ kind: "event", score: pick.score, reasons: pick.reasons, ...rowToEventCompact(e) });
    } else if (pick.itemType === "place") {
      const p = placeMap.get(pick.itemId);
      if (p) out.push({ kind: "place", score: pick.score, reasons: pick.reasons, ...rowToPlaceCompact(p) });
    }
  }
  return out;
}
