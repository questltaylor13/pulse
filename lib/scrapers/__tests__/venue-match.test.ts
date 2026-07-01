import { describe, it, expect } from "vitest";
import {
  normalizeVenueName,
  buildPlaceIndex,
  resolvePlaceId,
  type VenueCandidate,
} from "@/lib/scrapers/venue-match";

describe("normalizeVenueName", () => {
  it("lowercases, strips punctuation, and a single leading 'the'", () => {
    expect(normalizeVenueName("The Ogden Theatre")).toBe("ogden theatre");
    expect(normalizeVenueName("Mission Ballroom!")).toBe("mission ballroom");
  });
  it("normalizes & to 'and' and collapses whitespace", () => {
    expect(normalizeVenueName("Cheesman  &   Park")).toBe("cheesman and park");
  });
  it("keeps venue-type words (does NOT collapse distinct venues)", () => {
    // The dedup normalizer would strip 'theatre'/'ballroom'; we must not.
    expect(normalizeVenueName("Ogden Theatre")).not.toBe(normalizeVenueName("Ogden Ballroom"));
  });
  it("returns empty string for null/blank", () => {
    expect(normalizeVenueName(null)).toBe("");
    expect(normalizeVenueName("   ")).toBe("");
  });
});

const PLACES: VenueCandidate[] = [
  { id: "p_ogden", name: "Ogden Theatre", neighborhood: "City Park West", townName: "Denver" },
  { id: "p_mission", name: "Mission Ballroom", neighborhood: "RiNo", townName: "Denver" },
  // Two same-named venues in different neighborhoods (ambiguity).
  { id: "p_larimer_rino", name: "Larimer Lounge", neighborhood: "RiNo", townName: "Denver" },
  { id: "p_larimer_lodo", name: "Larimer Lounge", neighborhood: "LoDo", townName: "Denver" },
];

describe("resolvePlaceId", () => {
  const index = buildPlaceIndex(PLACES);

  it("links an exact normalized-name match", () => {
    expect(resolvePlaceId({ venueName: "The Ogden Theatre" }, index)).toBe("p_ogden");
    expect(resolvePlaceId({ venueName: "mission ballroom" }, index)).toBe("p_mission");
  });

  it("returns null when there's no match", () => {
    expect(resolvePlaceId({ venueName: "Some Random Bar" }, index)).toBeNull();
    expect(resolvePlaceId({ venueName: null }, index)).toBeNull();
  });

  it("breaks same-name ambiguity by neighborhood", () => {
    expect(
      resolvePlaceId({ venueName: "Larimer Lounge", neighborhood: "RiNo" }, index),
    ).toBe("p_larimer_rino");
    expect(
      resolvePlaceId({ venueName: "Larimer Lounge", neighborhood: "LoDo" }, index),
    ).toBe("p_larimer_lodo");
  });

  it("returns null for unresolvable ambiguity (no disambiguating signal)", () => {
    expect(resolvePlaceId({ venueName: "Larimer Lounge" }, index)).toBeNull();
    expect(
      resolvePlaceId({ venueName: "Larimer Lounge", neighborhood: "Capitol Hill" }, index),
    ).toBeNull();
  });
});
