import { describe, it, expect } from "vitest";
import {
  normalizeQuality,
  normalizePriceTier,
  tagOverlap,
  sharesTags,
  clamp,
} from "@/lib/ranking/normalizers";

describe("normalizeQuality", () => {
  it("scales Event/Discovery qualityScore 1-10 to 0.1-1.0", () => {
    expect(normalizeQuality({ qualityScore: 8 })).toBeCloseTo(0.8);
    expect(normalizeQuality({ qualityScore: 10 })).toBeCloseTo(1.0);
    expect(normalizeQuality({ qualityScore: 1 })).toBeCloseTo(0.1);
  });

  it("scales Place combinedScore through the /15 cap", () => {
    expect(normalizeQuality({ combinedScore: 15 })).toBeCloseTo(1.0);
    expect(normalizeQuality({ combinedScore: 7.5 })).toBeCloseTo(0.5);
    // Above 15 clamps to 1.0
    expect(normalizeQuality({ combinedScore: 20 })).toBeCloseTo(1.0);
  });

  it("returns 0.5 neutral when no quality signal is present", () => {
    expect(normalizeQuality({})).toBeCloseTo(0.5);
    expect(normalizeQuality({ qualityScore: null })).toBeCloseTo(0.5);
    expect(normalizeQuality({ qualityScore: 0 })).toBeCloseTo(0.5);
  });

  it("prefers qualityScore over combinedScore when both present", () => {
    expect(normalizeQuality({ qualityScore: 9, combinedScore: 3 })).toBeCloseTo(0.9);
  });
});

describe("normalizePriceTier", () => {
  it("handles Discovery as FREE by default", () => {
    expect(normalizePriceTier({ itemType: "discovery" })).toBe("FREE");
  });

  it("maps Google priceLevel 0-4", () => {
    expect(normalizePriceTier({ priceLevel: 0 })).toBe("FREE");
    expect(normalizePriceTier({ priceLevel: 1 })).toBe("LOW");
    expect(normalizePriceTier({ priceLevel: 2 })).toBe("MID");
    expect(normalizePriceTier({ priceLevel: 3 })).toBe("HIGH");
    expect(normalizePriceTier({ priceLevel: 4 })).toBe("HIGH");
  });

  it("counts dollar signs in Event.priceRange", () => {
    expect(normalizePriceTier({ priceRange: "$" })).toBe("LOW");
    expect(normalizePriceTier({ priceRange: "$$" })).toBe("MID");
    expect(normalizePriceTier({ priceRange: "$$$" })).toBe("HIGH");
    expect(normalizePriceTier({ priceRange: "$$$$" })).toBe("HIGH");
  });

  it("recognizes FREE keyword and empty strings", () => {
    expect(normalizePriceTier({ priceRange: "free" })).toBe("FREE");
    expect(normalizePriceTier({ priceRange: "FREE" })).toBe("FREE");
    expect(normalizePriceTier({ priceRange: "" })).toBe("MID"); // empty → neutral
    expect(normalizePriceTier({ priceRange: "$0" })).toBe("FREE");
  });

  it("defaults to MID on unknown input rather than excluding the item", () => {
    expect(normalizePriceTier({ priceRange: "check website" })).toBe("MID");
    expect(normalizePriceTier({})).toBe("MID");
    expect(normalizePriceTier({ priceLevel: null, priceRange: null })).toBe("MID");
  });
});

describe("tagOverlap", () => {
  it("counts shared tags case-insensitively", () => {
    expect(tagOverlap(["Jazz", "mellow"], ["jazz", "acoustic"])).toBe(1);
    expect(tagOverlap(["jazz", "mellow", "acoustic"], ["jazz", "acoustic"])).toBe(2);
  });

  it("returns 0 on empty input", () => {
    expect(tagOverlap([], ["jazz"])).toBe(0);
    expect(tagOverlap(["jazz"], [])).toBe(0);
  });
});

describe("sharesTags", () => {
  it("respects threshold", () => {
    expect(sharesTags(["a", "b"], ["a", "b"], 2)).toBe(true);
    expect(sharesTags(["a", "b"], ["a", "c"], 2)).toBe(false);
  });
});

describe("clamp", () => {
  it("bounds within [min, max]", () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(clamp(-0.1, 0, 1)).toBe(0);
  });
  it("returns min on NaN rather than leaking NaN downstream", () => {
    expect(clamp(Number.NaN, 0, 1)).toBe(0);
  });
});
