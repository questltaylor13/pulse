import { isSituationsV1Enabled } from "@/lib/ranking/flags";

export type BrowseSource = "events" | "places" | "mixed" | "guides";

export interface BrowseConfig {
  title: string;
  subtitle?: string;
  source: BrowseSource;
  defaults: Record<string, string>;
}

/**
 * Wave 6B situational pages. Gated: the five Place booleans they query are false
 * for every row until the enrichment backfill runs, so shipping them unflagged
 * would ship three permanently empty pages.
 */
export const SITUATIONAL_CONFIG_KEYS = [
  "watch-the-game",
  "kid-friendly",
  "big-groups",
] as const;

export const BROWSE_CONFIGS: Record<string, BrowseConfig> = {
  "today": { title: "Today", source: "events", defaults: { when: "today" } },
  "this-weekend": { title: "This weekend's picks", source: "events", defaults: { when: "weekend" } },
  "new-in-denver": { title: "New in Denver", source: "places", defaults: { filter: "new" } },
  "outside-the-city": { title: "Outside the city", source: "mixed", defaults: { location: "outside" } },
  "date-night": { title: "Date night plans", source: "guides", defaults: { occasion: "date-night" } },
  "locals": { title: "Where locals actually go", subtitle: "No tourist traps, no chains", source: "places", defaults: { flag: "isLocalFavorite" } },
  // Was `vibeTag: "group-friendly"` — a tag NOTHING in the corpus writes (the
  // group signal lives in companionTags as "Groups"), so this page returned zero
  // places. groupFriendlyPlacesWhere() was imported into fetch-browse.ts and
  // never called. Now it is.
  "groups": { title: "Good for groups", subtitle: "Big tables, shareable plates, loud enough", source: "places", defaults: { flag: "groupFriendly" } },
  "work": { title: "Where to work from", subtitle: "Wifi, outlets, quiet enough", source: "places", defaults: { flag: "goodForWorking" } },
  "quick-plans": { title: "Got 3 hours?", subtitle: "Quick plans you can squeeze in", source: "guides", defaults: { occasion: "quick" } },
  "weekend-guides": { title: "Ready for this weekend", source: "guides", defaults: { occasion: "all" } },

  // Wave 6B — situational. Data-driven via `placeFlag`, which maps to an indexed
  // boolean column (allowlisted in lib/browse/places-where.ts).
  "watch-the-game": { title: "Where to watch the game", subtitle: "Screens on, sound up", source: "places", defaults: { placeFlag: "goodForWatchingSports" } },
  "kid-friendly": { title: "Good with kids", subtitle: "Nobody minds the noise", source: "places", defaults: { placeFlag: "isKidFriendly" } },
  "big-groups": { title: "Fits a big group", subtitle: "Six of you, no reservation", source: "places", defaults: { placeFlag: "fitsLargeGroups" } },
};

export function isValidBrowseCategory(s: string): boolean {
  if (!(s in BROWSE_CONFIGS)) return false;
  if ((SITUATIONAL_CONFIG_KEYS as readonly string[]).includes(s)) {
    return isSituationsV1Enabled();
  }
  return true;
}
