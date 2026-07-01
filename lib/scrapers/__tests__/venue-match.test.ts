import { describe, it, expect } from "vitest";
import {
  normalizeVenueName,
  buildPlaceIndex,
  resolvePlaceId,
  resolvePlaceIdWithGeo,
  type VenueCandidate,
  type VenueCandidateGeo,
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

describe("resolvePlaceIdWithGeo", () => {
  // p_a and p_b share the name "Larimer Lounge" (ambiguous by name).
  const GEO_PLACES: VenueCandidateGeo[] = [
    { id: "p_a", name: "Larimer Lounge", neighborhood: "RiNo", townName: "Denver", lat: 39.7607, lng: -104.9819 },
    { id: "p_b", name: "Larimer Lounge", neighborhood: "LoDo", townName: "Denver", lat: 39.7530, lng: -105.0000 },
    { id: "p_solo", name: "Meow Wolf", neighborhood: "Sun Valley", townName: "Denver", lat: 39.7549, lng: -105.0210 },
  ];
  const index = buildPlaceIndex(GEO_PLACES);

  it("keeps a single name-match regardless of coords (name precedence)", () => {
    expect(resolvePlaceIdWithGeo({ venueName: "Meow Wolf", lat: 39.0, lng: -104.0 }, index, GEO_PLACES)).toBe("p_solo");
  });

  it("breaks same-name ambiguity by nearest place within ~0.5mi", () => {
    // Event coords right on top of p_a, far from p_b.
    expect(resolvePlaceIdWithGeo({ venueName: "Larimer Lounge", lat: 39.7607, lng: -104.9819 }, index, GEO_PLACES)).toBe("p_a");
  });

  it("still prefers neighborhood/town disambiguation over geo", () => {
    expect(resolvePlaceIdWithGeo({ venueName: "Larimer Lounge", neighborhood: "LoDo", lat: 39.7607, lng: -104.9819 }, index, GEO_PLACES)).toBe("p_b");
  });

  it("geo-matches a NO-name-match event to a single place within ~80m", () => {
    // ~55m north of p_solo, no name match.
    expect(resolvePlaceIdWithGeo({ venueName: "Unlisted Popup", lat: 39.7554, lng: -105.0210 }, index, GEO_PLACES)).toBe("p_solo");
  });

  it("rejects a geo-only match when the nearest place is beyond 80m", () => {
    expect(resolvePlaceIdWithGeo({ venueName: "Unlisted Popup", lat: 39.7600, lng: -105.0300 }, index, GEO_PLACES)).toBeNull();
  });

  it("rejects on APPROXIMATE geocode (geoConfident=false) — no geo tie-break or geo-only match", () => {
    // Ambiguous name + on-top-of-p_a coords, but low-confidence geocode ⇒ null.
    expect(resolvePlaceIdWithGeo({ venueName: "Larimer Lounge", lat: 39.7607, lng: -104.9819 }, index, GEO_PLACES, { geoConfident: false })).toBeNull();
    // And a no-name-match popup near p_solo also stays unlinked.
    expect(resolvePlaceIdWithGeo({ venueName: "Unlisted Popup", lat: 39.7554, lng: -105.0210 }, index, GEO_PLACES, { geoConfident: false })).toBeNull();
  });

  it("rejects a same-name tie-break when no candidate is within 0.5mi", () => {
    expect(resolvePlaceIdWithGeo({ venueName: "Larimer Lounge", lat: 39.9000, lng: -104.9000 }, index, GEO_PLACES)).toBeNull();
  });
});
