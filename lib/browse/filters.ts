export interface BrowseFilters {
  categories: string[];
  price: string | null;       // "any" | "free" | "under-25" | "under-50" | "50-plus"
  distance: string | null;    // radius in miles as a string ("1"|"3"|"5"), or null
  vibes: string[];
  timeOfDay: string[];        // "morning" | "afternoon" | "evening" | "late-night"
  when: string | null;        // "today" | "this-weekend" | "next-7" | custom range
  sort: string;               // "top" | "soonest" | "price" | "distance"
  day: string | null;         // "all" | "fri" | "sat" | "sun"
  lat: number | null;         // geolocation origin (rounded ~3dp), or null
  lng: number | null;
}

function toFinite(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function filtersFromParams(params: URLSearchParams): BrowseFilters {
  return {
    categories: params.get("categories")?.split(",").filter(Boolean) ?? [],
    price: params.get("price") || null,
    distance: params.get("distance") || null,
    vibes: params.get("vibes")?.split(",").filter(Boolean) ?? [],
    timeOfDay: params.get("time")?.split(",").filter(Boolean) ?? [],
    when: params.get("when") || null,
    sort: params.get("sort") || "top",
    day: params.get("day") || null,
    lat: toFinite(params.get("lat")),
    lng: toFinite(params.get("lng")),
  };
}

export function filtersToParams(filters: BrowseFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.categories.length) p.set("categories", filters.categories.join(","));
  if (filters.price) p.set("price", filters.price);
  if (filters.distance) p.set("distance", filters.distance);
  if (filters.vibes.length) p.set("vibes", filters.vibes.join(","));
  if (filters.timeOfDay.length) p.set("time", filters.timeOfDay.join(","));
  if (filters.when) p.set("when", filters.when);
  if (filters.sort !== "top") p.set("sort", filters.sort);
  if (filters.day) p.set("day", filters.day);
  if (filters.lat != null) p.set("lat", String(filters.lat));
  if (filters.lng != null) p.set("lng", String(filters.lng));
  return p;
}

export function activeFilterCount(filters: BrowseFilters): number {
  let count = 0;
  if (filters.categories.length) count++;
  if (filters.price && filters.price !== "any") count++;
  if (filters.distance && filters.distance !== "any") count++;
  if (filters.vibes.length) count++;
  if (filters.timeOfDay.length) count++;
  if (filters.when) count++;
  return count;
}
