import type { Category } from "@prisma/client";

export type BrowseSource = "events" | "places" | "mixed" | "guides";

export interface BrowseConfig {
  title: string;
  subtitle?: string;
  source: BrowseSource;
  defaults: Record<string, string>;
}

export const BROWSE_CONFIGS: Record<string, BrowseConfig> = {
  "today": { title: "Today", source: "events", defaults: { when: "today" } },
  "this-weekend": { title: "This weekend's picks", source: "events", defaults: { when: "weekend" } },
  "new-in-denver": { title: "New in Denver", source: "places", defaults: { filter: "new" } },
  "outside-the-city": { title: "Outside the city", source: "mixed", defaults: { location: "outside" } },
  "date-night": { title: "Date night plans", source: "guides", defaults: { occasion: "date-night" } },
  "locals": { title: "Where locals actually go", subtitle: "No tourist traps, no chains", source: "places", defaults: { flag: "isLocalFavorite" } },
  "groups": { title: "Good for groups", subtitle: "Big tables, shareable plates, loud enough", source: "places", defaults: { vibeTag: "group-friendly" } },
  "work": { title: "Where to work from", subtitle: "Wifi, outlets, quiet enough", source: "places", defaults: { flag: "goodForWorking" } },
  "quick-plans": { title: "Got 3 hours?", subtitle: "Quick plans you can squeeze in", source: "guides", defaults: { occasion: "quick" } },
  "weekend-guides": { title: "Ready for this weekend", source: "guides", defaults: { occasion: "all" } },
};

export function isValidBrowseCategory(s: string): boolean {
  return s in BROWSE_CONFIGS;
}
