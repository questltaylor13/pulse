import { describe, it, expect } from "vitest";
import { filterAndSortByDistance } from "@/lib/browse/distance";

const ORIGIN = { lat: 39.7392, lng: -104.9903 };
type Item = { id: string; lat: number | null; lng: number | null };
const ITEMS: Item[] = [
  { id: "near", lat: 39.7407, lng: -104.9902 }, // ~0.1 mi
  { id: "mid", lat: 39.7592, lng: -104.9903 },  // ~1.4 mi
  { id: "far", lat: 39.9000, lng: -104.9903 },  // ~11 mi
  { id: "nocoord", lat: null, lng: null },
];

describe("filterAndSortByDistance", () => {
  it("drops items outside the radius and coordless items", () => {
    const out = filterAndSortByDistance(ITEMS, ORIGIN, 3, false).map((i) => i.id);
    expect(out).toContain("near");
    expect(out).toContain("mid");
    expect(out).not.toContain("far");
    expect(out).not.toContain("nocoord");
  });

  it("sorts ascending by distance, sinking coordless items to the end", () => {
    const out = filterAndSortByDistance(ITEMS, ORIGIN, null, true).map((i) => i.id);
    expect(out.slice(0, 3)).toEqual(["near", "mid", "far"]);
    expect(out[3]).toBe("nocoord");
  });

  it("returns items unchanged when no radius and no distance sort", () => {
    expect(filterAndSortByDistance(ITEMS, ORIGIN, null, false)).toEqual(ITEMS);
  });
});
