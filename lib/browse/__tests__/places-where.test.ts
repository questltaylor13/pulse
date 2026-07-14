import { describe, it, expect } from "vitest";
import { buildPlacesWhere, PLACE_FLAG_COLUMNS, HELPER_FLAGS } from "@/lib/browse/places-where";
import { BROWSE_CONFIGS, type BrowseConfig } from "@/lib/browse/browse-configs";
import type { BrowseFilters } from "@/lib/browse/filters";

const NO_FILTERS: BrowseFilters = {
  categories: [], price: null, distance: null, vibes: [], timeOfDay: [],
  when: null, sort: "top", day: null, lat: null, lng: null,
};

const config = (defaults: Record<string, string>): BrowseConfig => ({
  title: "t", source: "places", defaults,
});

const NOW = new Date("2026-07-14T12:00:00Z");

// Everything is composed into an AND array. The old code merged clauses onto one
// object with Object.assign + plain assignment, so later keys silently destroyed
// earlier ones — a whole class of "the filter did nothing" bugs.
const clauses = (w: { AND?: unknown }) => (w.AND ?? []) as Record<string, unknown>[];

describe("buildPlacesWhere — composition, not clobbering", () => {
  it("a user category filter does NOT destroy the config's category gate", () => {
    // localFavoritesWhere() gates on category notIn FITNESS. The old code then
    // ran `where.category = { in: [...] }`, wiping it out.
    const w = buildPlacesWhere(config({ flag: "isLocalFavorite" }), { ...NO_FILTERS, categories: ["BARS"] }, NOW);
    const all = JSON.stringify(clauses(w));
    expect(all).toContain("isLocalFavorite");
    expect(all).toContain("FITNESS");
    expect(all).toContain("BARS");
  });

  it("a user vibe filter does NOT destroy the config's vibeTag gate", () => {
    // fetch-browse.ts:156 overwrote the config default with the user's pick.
    const w = buildPlacesWhere(config({ vibeTag: "cozy" }), { ...NO_FILTERS, vibes: ["lively"] }, NOW);
    const all = JSON.stringify(clauses(w));
    expect(all).toContain("cozy");
    expect(all).toContain("lively");
  });

  it("the 'new' OR clause does NOT collide with a helper's OR clause", () => {
    const w = buildPlacesWhere(config({ filter: "new", flag: "groupFriendly" }), NO_FILTERS, NOW);
    // Two independent ORs must both survive as separate AND members.
    const withOr = clauses(w).filter((c) => "OR" in c);
    expect(withOr.length).toBe(2);
  });

  it("always constrains to OPEN places", () => {
    const w = buildPlacesWhere(config({}), NO_FILTERS, NOW);
    expect(JSON.stringify(clauses(w))).toContain("OPEN");
  });
});

describe("buildPlacesWhere — placeFlag (the data-driven situational default)", () => {
  it("maps a placeFlag to a boolean column gate", () => {
    const w = buildPlacesWhere(config({ placeFlag: "goodForWatchingSports" }), NO_FILTERS, NOW);
    expect(clauses(w)).toContainEqual({ goodForWatchingSports: true });
  });

  it("supports each of the three situational browse columns", () => {
    for (const col of PLACE_FLAG_COLUMNS) {
      const w = buildPlacesWhere(config({ placeFlag: col }), NO_FILTERS, NOW);
      expect(clauses(w)).toContainEqual({ [col]: true });
    }
  });

  it("REFUSES a column outside the allowlist", () => {
    // placeFlag interpolates a column name. The allowlist is the only thing
    // between a config typo (or worse) and an arbitrary column predicate.
    expect(() =>
      buildPlacesWhere(config({ placeFlag: "isAdmin" }), NO_FILTERS, NOW),
    ).toThrow(/placeFlag/i);
  });

  it("refuses a valid-but-unindexed column", () => {
    // The invariant: placeFlag only queries indexed columns. hasIndoorSeating
    // exists on the model but has no index, so it is not browsable.
    expect(() =>
      buildPlacesWhere(config({ placeFlag: "hasIndoorSeating" }), NO_FILTERS, NOW),
    ).toThrow(/placeFlag/i);
  });
});

describe("buildPlacesWhere — /browse/groups, which returned zero places", () => {
  it("uses the groupFriendly helper rather than a vibeTag that nothing writes", () => {
    // The config asked for vibeTags hasSome ["group-friendly"], but enrichment
    // writes the group signal into companionTags as "Groups". Zero rows, always.
    // groupFriendlyPlacesWhere() was imported into fetch-browse and never called.
    const w = buildPlacesWhere(config({ flag: "groupFriendly" }), NO_FILTERS, NOW);
    const all = JSON.stringify(clauses(w));
    expect(all).toContain("Groups");
    expect(all).not.toContain("group-friendly");
  });

  it("wires the dateNight helper too (also imported and never called)", () => {
    const w = buildPlacesWhere(config({ flag: "dateNight" }), NO_FILTERS, NOW);
    expect(JSON.stringify(clauses(w))).toContain("Date Night");
  });
});

describe("every real BROWSE_CONFIGS entry resolves", () => {
  // Without this, a typo in browse-configs.ts is only discovered when a user
  // loads the live page: placeFlag THROWS (500) and flag used to fail OPEN
  // (silently showing every place in Denver). Neither surfaces in CI. Pin it.
  it("every configured placeFlag is an allowlisted indexed column", () => {
    for (const [key, cfg] of Object.entries(BROWSE_CONFIGS)) {
      if (cfg.defaults.placeFlag) {
        expect(PLACE_FLAG_COLUMNS, `config "${key}"`).toContain(cfg.defaults.placeFlag);
      }
    }
  });

  it("every configured flag resolves to a helper", () => {
    for (const [key, cfg] of Object.entries(BROWSE_CONFIGS)) {
      if (cfg.defaults.flag) {
        expect(Object.keys(HELPER_FLAGS), `config "${key}"`).toContain(cfg.defaults.flag);
      }
    }
  });

  it("builds a where for every places-source config without throwing", () => {
    for (const [key, cfg] of Object.entries(BROWSE_CONFIGS)) {
      if (cfg.source !== "places") continue;
      expect(() => buildPlacesWhere(cfg, NO_FILTERS, NOW), `config "${key}"`).not.toThrow();
    }
  });
});

describe("buildPlacesWhere — an unknown flag fails LOUD, not open", () => {
  it("throws on a typo'd flag rather than silently matching everything", () => {
    expect(() => buildPlacesWhere(config({ flag: "groupFriendy" }), NO_FILTERS, NOW)).toThrow(
      /unknown browse flag/i,
    );
  });
});

describe("buildPlacesWhere — vibe tokens that are really columns", () => {
  it("matches the isDogFriendly COLUMN, not just a tag nothing writes", () => {
    // "dog-friendly" is offered by FilterSheet and is in VIBE_TAGS, but
    // enrichment never writes it into vibeTags — Place.isDogFriendly holds it.
    const w = buildPlacesWhere(config({}), { ...NO_FILTERS, vibes: ["dog-friendly"] }, NOW);
    const all = JSON.stringify(clauses(w));
    expect(all).toContain("isDogFriendly");
    expect(all).toContain("dog-friendly");
  });

  it("still matches the tag array for a vibe with no backing column", () => {
    const w = buildPlacesWhere(config({}), { ...NO_FILTERS, vibes: ["cozy"] }, NOW);
    const all = JSON.stringify(clauses(w));
    expect(all).toContain("cozy");
    expect(all).not.toContain("isDogFriendly");
  });
});

describe("buildPlacesWhere — vibe filter tolerates both vocabularies", () => {
  it("queries the kebab tag AND its legacy Title-case spelling", () => {
    // The corpus migration and the code deploy are not atomic. Matching both
    // makes the ordering irrelevant.
    const w = buildPlacesWhere(config({}), { ...NO_FILTERS, vibes: ["cozy"] }, NOW);
    const all = JSON.stringify(clauses(w));
    expect(all).toContain("cozy");
    expect(all).toContain("Cozy");
  });

  it("normalizes a Title-case vibe arriving from a stale URL", () => {
    const w = buildPlacesWhere(config({}), { ...NO_FILTERS, vibes: ["Cozy"] }, NOW);
    expect(JSON.stringify(clauses(w))).toContain("cozy");
  });
});
