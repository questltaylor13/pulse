import { describe, it, expect } from "vitest";
import { placeAttributeChips, type PlaceAttributes } from "@/lib/places/attributes";

const NONE: PlaceAttributes = {
  goodForWatchingSports: false,
  isKidFriendly: false,
  hasOutdoorSeating: false,
  hasIndoorSeating: true,
  fitsLargeGroups: false,
  isDogFriendly: false,
  isDrinkingOptional: false,
  hasMocktailMenu: false,
};

const labels = (a: Partial<PlaceAttributes>) =>
  placeAttributeChips({ ...NONE, ...a }).map((c) => c.label);

describe("placeAttributeChips", () => {
  it("renders nothing for a place with no notable attributes", () => {
    // An un-enriched place (every boolean false) must show an empty chip row,
    // not a row of "no"s.
    expect(placeAttributeChips(NONE)).toEqual([]);
  });

  it("surfaces each situational attribute that is true", () => {
    expect(labels({ goodForWatchingSports: true })).toContain("Shows the game");
    expect(labels({ isKidFriendly: true })).toContain("Kid-friendly");
    expect(labels({ hasOutdoorSeating: true })).toContain("Patio");
    expect(labels({ fitsLargeGroups: true })).toContain("Fits big groups");
  });

  it("surfaces the attributes that already existed on the model and were rendered nowhere", () => {
    expect(labels({ isDogFriendly: true })).toContain("Dog-friendly");
    expect(labels({ isDrinkingOptional: true })).toContain("Drinking optional");
    expect(labels({ hasMocktailMenu: true })).toContain("Mocktails");
  });

  it("does NOT chip indoor seating when true — that is the unremarkable default", () => {
    // Nearly every place has it. A chip saying so is noise.
    expect(labels({ hasIndoorSeating: true })).not.toContain("Indoor seating");
    expect(labels({ hasIndoorSeating: true })).toEqual([]);
  });

  it("DOES call out an outdoor-only place, which is genuinely worth knowing", () => {
    expect(labels({ hasIndoorSeating: false, hasOutdoorSeating: true })).toContain(
      "Outdoor only",
    );
  });

  it("says 'Outdoor only' instead of 'Patio' — not both", () => {
    const l = labels({ hasIndoorSeating: false, hasOutdoorSeating: true });
    expect(l).toContain("Outdoor only");
    expect(l).not.toContain("Patio");
  });

  it("keeps a stable order regardless of input key order", () => {
    const a = labels({ isDogFriendly: true, goodForWatchingSports: true });
    const b = labels({ goodForWatchingSports: true, isDogFriendly: true });
    expect(a).toEqual(b);
    expect(a[0]).toBe("Shows the game");
  });

  it("gives every chip a stable key for React", () => {
    const chips = placeAttributeChips({ ...NONE, isKidFriendly: true, isDogFriendly: true });
    const keys = chips.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
