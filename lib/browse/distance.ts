import { haversineDistance, type LatLng } from "@/lib/geo";

/**
 * Pure distance filter + sort for browse items. When `radiusMiles` is set,
 * items outside the radius (and coordless items) are dropped. When
 * `sortByDistance` is set, results are sorted ascending by haversine distance,
 * with coordless items sinking to the end. Generic over any item carrying
 * nullable lat/lng so it stays decoupled from BrowseItem (no import cycle).
 */
export function filterAndSortByDistance<T extends { lat: number | null; lng: number | null }>(
  items: T[],
  origin: LatLng,
  radiusMiles: number | null,
  sortByDistance: boolean,
): T[] {
  const dist = (it: T): number =>
    it.lat == null || it.lng == null
      ? Number.POSITIVE_INFINITY
      : haversineDistance(origin, { lat: it.lat, lng: it.lng });

  let out = items;
  if (radiusMiles != null) {
    out = out.filter((it) => dist(it) <= radiusMiles);
  }
  if (sortByDistance) {
    out = [...out].sort((a, b) => dist(a) - dist(b));
  }
  return out;
}
