import type { Prisma } from "@prisma/client";

export const RAIL_CATEGORIES = [
  "all",
  "music",
  "food",
  "weird",
  "offbeat",
  "art",
  "outdoors",
  "comedy",
  "popup",
] as const;

export type RailCategory = (typeof RAIL_CATEGORIES)[number];

export function isRailCategory(s: string | null | undefined): s is RailCategory {
  return !!s && (RAIL_CATEGORIES as readonly string[]).includes(s);
}

export const RAIL_LABELS: Record<RailCategory, string> = {
  all: "All",
  music: "Music",
  food: "Food",
  weird: "Weird",
  offbeat: "Off-beat",
  art: "Art",
  outdoors: "Outdoors",
  comedy: "Comedy",
  popup: "Pop-ups",
};

// Synthetic tags we look at for "Weird" and "Off-beat" filters.
const WEIRD_TAGS = ["weird", "unusual", "unique", "novelty"];
const OFFBEAT_TAGS = ["off-beat", "offbeat", "hidden-gem", "underground"];
const NOVELTY_WEIRD_THRESHOLD = 7; // Int 1-10 — honors existing schema (NOT 0.75 float)

export function eventWhereForCategory(cat: RailCategory): Prisma.EventWhereInput {
  switch (cat) {
    case "all":
      return {};
    case "music":
      return { category: "LIVE_MUSIC" };
    case "food":
      return { category: { in: ["FOOD", "RESTAURANT", "BARS", "COFFEE"] } };
    case "art":
      return { category: "ART" };
    case "outdoors":
      return { category: "OUTDOORS" };
    case "comedy":
      return { category: "COMEDY" };
    case "popup":
      return { category: "POPUP" };
    case "weird":
      return {
        OR: [
          { tags: { hasSome: WEIRD_TAGS } },
          { noveltyScore: { gte: NOVELTY_WEIRD_THRESHOLD } },
        ],
      };
    case "offbeat":
      return {
        OR: [
          { tags: { hasSome: OFFBEAT_TAGS } },
          {
            AND: [
              { isEditorsPick: true },
              { noveltyScore: { gte: 6 } },
            ],
          },
        ],
      };
  }
}

export function placeWhereForCategory(cat: RailCategory): Prisma.PlaceWhereInput {
  switch (cat) {
    case "all":
      return {};
    case "music":
      return { category: "LIVE_MUSIC" };
    case "food":
      return { category: { in: ["FOOD", "RESTAURANT", "BARS", "COFFEE"] } };
    case "art":
      return { category: "ART" };
    case "outdoors":
      return { category: "OUTDOORS" };
    case "comedy":
      return { category: "COMEDY" };
    case "popup":
      return { category: "POPUP" };
    case "weird":
      return { tags: { hasSome: WEIRD_TAGS } };
    case "offbeat":
      return {
        OR: [
          { tags: { hasSome: OFFBEAT_TAGS } },
          { isFeatured: true },
        ],
      };
  }
}
