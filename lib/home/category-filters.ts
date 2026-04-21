import type { Prisma } from "@prisma/client";

export const RAIL_CATEGORIES = [
  "all",
  "music",
  "food",
  "weird",
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
  art: "Art",
  outdoors: "Outdoors",
  comedy: "Comedy",
  popup: "Pop-ups",
};

// "Weird" now absorbs the off-beat bucket — both chips surfaced overlapping
// content and created a pick-one dilemma. Unified match: synthetic tags,
// novelty score, editor's-pick signal, and the old off-beat tag list.
const WEIRD_TAGS = [
  "weird",
  "unusual",
  "unique",
  "novelty",
  "off-beat",
  "offbeat",
  "hidden-gem",
  "underground",
];
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
      return {
        OR: [
          { tags: { hasSome: WEIRD_TAGS } },
          { isFeatured: true },
        ],
      };
  }
}
