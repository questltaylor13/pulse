import { describe, it, expect } from "vitest";
import { filtersFromParams, filtersToParams } from "@/lib/browse/filters";

describe("browse filters — sort reconciliation + origin", () => {
  it("defaults sort to 'top' and round-trips without emitting it", () => {
    const f = filtersFromParams(new URLSearchParams(""));
    expect(f.sort).toBe("top");
    expect(filtersToParams(f).has("sort")).toBe(false);
  });

  it("keeps a non-default sort through the round trip", () => {
    const f = filtersFromParams(new URLSearchParams("sort=distance"));
    expect(f.sort).toBe("distance");
    expect(filtersToParams(f).get("sort")).toBe("distance");
  });

  it("parses numeric lat/lng and drops non-finite values", () => {
    const f = filtersFromParams(new URLSearchParams("lat=39.739&lng=-104.99"));
    expect(f.lat).toBeCloseTo(39.739);
    expect(f.lng).toBeCloseTo(-104.99);
    const bad = filtersFromParams(new URLSearchParams("lat=abc"));
    expect(bad.lat).toBeNull();
  });

  it("round-trips lat/lng and the distance radius", () => {
    const f = filtersFromParams(new URLSearchParams("lat=39.739&lng=-104.99&distance=3"));
    const p = filtersToParams(f);
    expect(p.get("lat")).toBe("39.739");
    expect(p.get("lng")).toBe("-104.99");
    expect(p.get("distance")).toBe("3");
  });
});
