export interface BrowseFilters {
  categories: string[];
  price: string | null;       // "any" | "free" | "$" | "$$" | "$$$"
  distance: string | null;    // "any" | "2mi" | "5mi" | "10mi" | "outside"
  vibes: string[];
  timeOfDay: string[];        // "morning" | "afternoon" | "evening" | "late-night"
  when: string | null;        // "today" | "this-weekend" | "next-7" | custom range
  sort: string;               // "top-picks" | "soonest" | "price-low" | "distance"
  day: string | null;         // "all" | "fri" | "sat" | "sun"
}

export function filtersFromParams(params: URLSearchParams): BrowseFilters {
  return {
    categories: params.get("categories")?.split(",").filter(Boolean) ?? [],
    price: params.get("price") || null,
    distance: params.get("distance") || null,
    vibes: params.get("vibes")?.split(",").filter(Boolean) ?? [],
    timeOfDay: params.get("time")?.split(",").filter(Boolean) ?? [],
    when: params.get("when") || null,
    sort: params.get("sort") || "top-picks",
    day: params.get("day") || null,
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
  if (filters.sort !== "top-picks") p.set("sort", filters.sort);
  if (filters.day) p.set("day", filters.day);
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
