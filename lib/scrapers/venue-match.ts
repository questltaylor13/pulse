/**
 * Wave 2 — Event ↔ Place venue resolution.
 *
 * Populates the never-set Event.placeId by matching an event's venue name to a
 * curated Place, which lights up the place-detail "Upcoming Events" block (and
 * the "Live tonight" badge). Scraped events have no lat/lng, so matching is
 * NAME-first — geo can't be a signal until event coords exist.
 *
 * Precision over recall: a wrong link shows the wrong events on a place page,
 * which is worse than no link. So we require an exact normalized-name match and
 * break same-name ambiguity by neighborhood/town, else leave it unlinked.
 *
 * The pure matchers below have no DB dependency (unit-tested); backfillEventPlaces
 * takes a Prisma client so the same code runs from the scrape cron (Next prisma)
 * and the standalone backfill script (its own PrismaClient).
 */

import type { PrismaClient } from "@prisma/client";
import { haversineDistance } from "@/lib/geo";

/**
 * Normalize a venue/place name for matching. Unlike the dedup normalizer in
 * ./index.ts, this KEEPS venue-type words (theatre/ballroom/hall/…) because
 * they distinguish venues — dropping them collapses distinct venues into
 * false-positive links.
 */
export function normalizeVenueName(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ") // drop punctuation
    .replace(/^\s*the\s+/, "") // drop a single leading "the"
    .replace(/\s+/g, " ")
    .trim();
}

export interface VenueCandidate {
  id: string;
  name: string;
  neighborhood: string | null;
  townName: string | null;
}

export interface EventVenue {
  venueName: string | null;
  neighborhood?: string | null;
  townName?: string | null;
}

/** Index candidate places by normalized name → the places sharing that name. */
export function buildPlaceIndex(
  places: VenueCandidate[],
): Map<string, VenueCandidate[]> {
  const index = new Map<string, VenueCandidate[]>();
  for (const p of places) {
    const key = normalizeVenueName(p.name);
    if (!key) continue;
    const bucket = index.get(key);
    if (bucket) bucket.push(p);
    else index.set(key, [p]);
  }
  return index;
}

/**
 * Resolve an event's venue to a Place id, or null if there's no confident
 * match. Exact normalized-name match; same-name ambiguity is broken by
 * matching normalized neighborhood or town, else null.
 */
export function resolvePlaceId(
  event: EventVenue,
  index: Map<string, VenueCandidate[]>,
): string | null {
  const key = normalizeVenueName(event.venueName);
  if (!key) return null;
  const matches = index.get(key);
  if (!matches || matches.length === 0) return null;
  if (matches.length === 1) return matches[0].id;

  // Ambiguous — same normalized name shared by multiple places. Break the tie
  // by neighborhood or town; if that doesn't leave exactly one, don't guess.
  const evNbhd = normalizeVenueName(event.neighborhood);
  const evTown = normalizeVenueName(event.townName);
  if (!evNbhd && !evTown) return null;
  const disambiguated = matches.filter(
    (p) =>
      (evNbhd && normalizeVenueName(p.neighborhood) === evNbhd) ||
      (evTown && normalizeVenueName(p.townName) === evTown),
  );
  return disambiguated.length === 1 ? disambiguated[0].id : null;
}

export interface EventWithGeo extends EventVenue {
  lat?: number | null;
  lng?: number | null;
}

export interface VenueCandidateGeo extends VenueCandidate {
  lat?: number | null;
  lng?: number | null;
}

const GEO_TIEBREAK_MILES = 0.5; // ambiguous same-name resolution radius
const GEO_MATCH_MILES = 80 / 1609.344; // ~0.0497mi tight radius for name-less geo-linking

/** Nearest place (by id) among `ids`, within `maxMiles`, requiring a unique closest. */
function nearestWithin(
  ids: Set<string>,
  coords: Map<string, { lat: number; lng: number }>,
  origin: { lat: number; lng: number },
  maxMiles: number,
): string | null {
  const ranked = [...ids]
    .map((id) => {
      const c = coords.get(id);
      return c ? { id, d: haversineDistance(origin, c) } : null;
    })
    .filter((x): x is { id: string; d: number } => x !== null && x.d <= maxMiles)
    .sort((a, b) => a.d - b.d);
  if (ranked.length === 0) return null;
  if (ranked.length > 1 && ranked[0].d === ranked[1].d) return null; // exact tie — don't guess
  return ranked[0].id;
}

/**
 * Precision-first resolution with an optional geo path. Name-match is primary
 * and is NEVER overridden by geo. Adds: (a) nearest-within-0.5mi tie-break for
 * same-name ambiguity, and (b) a single-nearest-within-80m link for events with
 * NO name match. The geo path is gated by `geoConfident` (false for APPROXIMATE
 * / partial_match geocodes) AND requires event coords.
 */
export function resolvePlaceIdWithGeo(
  event: EventWithGeo,
  index: Map<string, VenueCandidate[]>,
  placesWithCoords: VenueCandidateGeo[],
  opts: { geoConfident?: boolean } = {},
): string | null {
  const useGeo =
    opts.geoConfident !== false &&
    typeof event.lat === "number" &&
    typeof event.lng === "number";
  const origin = useGeo ? { lat: event.lat as number, lng: event.lng as number } : null;

  const coords = new Map<string, { lat: number; lng: number }>();
  for (const p of placesWithCoords) {
    if (typeof p.lat === "number" && typeof p.lng === "number") coords.set(p.id, { lat: p.lat, lng: p.lng });
  }

  const key = normalizeVenueName(event.venueName);
  if (key) {
    const matches = index.get(key);
    if (matches && matches.length === 1) return matches[0].id; // name precedence
    if (matches && matches.length > 1) {
      // Neighborhood/town disambiguation first (same rule as resolvePlaceId).
      const evNbhd = normalizeVenueName(event.neighborhood);
      const evTown = normalizeVenueName(event.townName);
      if (evNbhd || evTown) {
        const disambiguated = matches.filter(
          (p) =>
            (evNbhd && normalizeVenueName(p.neighborhood) === evNbhd) ||
            (evTown && normalizeVenueName(p.townName) === evTown),
        );
        if (disambiguated.length === 1) return disambiguated[0].id;
      }
      // Then geo tie-break among the same-name candidates.
      if (origin) {
        const ids = new Set(matches.map((m) => m.id));
        const near = nearestWithin(ids, coords, origin, GEO_TIEBREAK_MILES);
        if (near) return near;
      }
      return null;
    }
  }

  // No name match — geo-only path: exactly one place within a tight radius.
  if (origin) {
    const allIds = new Set(coords.keys());
    return nearestWithin(allIds, coords, origin, GEO_MATCH_MILES);
  }
  return null;
}

/**
 * Given a set of place ids, return those that have at least one non-archived
 * event in the [from, to] window (i.e. "live tonight"). Powers the place-card
 * badge. Relies on Event.placeId, so coverage tracks the venue backfill above.
 */
export async function livePlaceIdSet(
  db: PrismaClient,
  placeIds: string[],
  from: Date,
  to: Date,
): Promise<Set<string>> {
  if (placeIds.length === 0) return new Set();
  const rows = await db.event.findMany({
    where: {
      placeId: { in: placeIds },
      isArchived: false,
      startTime: { gte: from, lte: to },
    },
    select: { placeId: true },
    distinct: ["placeId"],
  });
  const set = new Set<string>();
  for (const r of rows) if (r.placeId) set.add(r.placeId);
  return set;
}

export interface BackfillResult {
  scanned: number;
  matched: number;
  updated: number;
}

/**
 * Resolve Event.placeId for upcoming events that don't have one. Never touches
 * events already linked (e.g. by the curator UI). Idempotent + re-runnable.
 */
export async function backfillEventPlaces(
  db: PrismaClient,
  opts: { includeLinked?: boolean; limit?: number } = {},
): Promise<BackfillResult> {
  const places = await db.place.findMany({
    select: { id: true, name: true, neighborhood: true, townName: true, lat: true, lng: true },
  });
  const index = buildPlaceIndex(places);
  const placesWithCoords: VenueCandidateGeo[] = places.map((p) => ({
    id: p.id,
    name: p.name,
    neighborhood: p.neighborhood,
    townName: p.townName,
    lat: p.lat,
    lng: p.lng,
  }));

  const events = await db.event.findMany({
    where: {
      isArchived: false,
      startTime: { gte: new Date() }, // only upcoming powers "Upcoming Events"
      ...(opts.includeLinked ? {} : { placeId: null }),
    },
    select: {
      id: true,
      venueName: true,
      neighborhood: true,
      townName: true,
      placeId: true,
      lat: true,
      lng: true,
    },
    ...(opts.limit ? { take: opts.limit } : {}),
  });

  // Link-confidence per venue name from the geocode cache. APPROXIMATE /
  // partial_match geocodes (downgraded to "APPROXIMATE" at write time) are NOT
  // confident enough to drive a geo-link — precision over recall.
  const geoRows = await db.geocodeCache.findMany({
    where: { status: "ok" },
    select: { normalizedName: true, locationType: true },
  });
  const confident = new Set<string>();
  for (const g of geoRows) {
    if (g.locationType && g.locationType !== "APPROXIMATE") confident.add(g.normalizedName);
  }

  let matched = 0;
  let updated = 0;
  for (const ev of events) {
    const geoConfident = confident.has(normalizeVenueName(ev.venueName));
    const placeId = resolvePlaceIdWithGeo(ev, index, placesWithCoords, { geoConfident });
    if (!placeId) continue;
    matched += 1;
    if (ev.placeId !== placeId) {
      await db.event.update({ where: { id: ev.id }, data: { placeId } });
      updated += 1;
    }
  }
  return { scanned: events.length, matched, updated };
}
