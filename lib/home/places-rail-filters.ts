import type { Prisma } from "@prisma/client";

export const PLACES_RAIL_CATEGORIES = [
  "all", "restaurants", "bars", "coffee", "outdoors", "venues", "nightlife",
] as const;

export type PlacesRailCategory = (typeof PLACES_RAIL_CATEGORIES)[number];

export function isPlacesRailCategory(s: string | null | undefined): s is PlacesRailCategory {
  return !!s && (PLACES_RAIL_CATEGORIES as readonly string[]).includes(s);
}

export const PLACES_RAIL_LABELS: Record<PlacesRailCategory, string> = {
  all: "All",
  restaurants: "Restaurants",
  bars: "Bars",
  coffee: "Coffee",
  outdoors: "Outdoors",
  venues: "Venues",
  nightlife: "Nightlife",
};

export function placeWhereForPlacesRail(cat: PlacesRailCategory): Prisma.PlaceWhereInput {
  switch (cat) {
    case "all":         return {};
    case "restaurants": return { category: { in: ["FOOD", "RESTAURANT"] } };
    case "bars":        return { category: "BARS" };
    case "coffee":      return { category: "COFFEE" };
    case "outdoors":    return { category: "OUTDOORS" };
    case "venues":      return { category: "ACTIVITY_VENUE" };
    case "nightlife":   return { category: { in: ["BARS", "LIVE_MUSIC"] } };
  }
}
