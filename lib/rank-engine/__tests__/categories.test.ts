/**
 * Wave 4 Rate & Rank — content Category → RankCategory mapping.
 *
 * The mapping must be exhaustive over the Prisma Category enum: adding a new
 * content category without deciding its rank bucket should fail these tests
 * (the `Object.values(Category)` sweep), not silently fall through.
 */

import { describe, it, expect } from "vitest";
import { Category, RankCategory } from "@prisma/client";
import {
  toRankCategory,
  RANK_CATEGORY_LABELS,
  rankCategorySlug,
  rankCategoryFromSlug,
} from "@/lib/rank-engine/categories";

describe("toRankCategory", () => {
  const expected: Record<Category, RankCategory> = {
    RESTAURANT: "RESTAURANTS",
    FOOD: "RESTAURANTS",
    BARS: "BARS",
    COFFEE: "COFFEE",
    ACTIVITY_VENUE: "ACTIVE",
    FITNESS: "ACTIVE",
    OUTDOORS: "ACTIVE",
    WELLNESS: "ACTIVE",
    ART: "ARTS",
    LIVE_MUSIC: "ARTS",
    COMEDY: "ARTS",
    SEASONAL: "EXPERIENCES",
    POPUP: "EXPERIENCES",
    SOCIAL: "EXPERIENCES",
    OTHER: "EXPERIENCES",
  };

  it("maps every content category to its rank bucket", () => {
    for (const category of Object.values(Category)) {
      expect(toRankCategory(category), `mapping for ${category}`).toBe(
        expected[category]
      );
    }
  });

  it("falls back to EXPERIENCES for null / unknown input", () => {
    expect(toRankCategory(null)).toBe("EXPERIENCES");
    expect(toRankCategory(undefined)).toBe("EXPERIENCES");
    expect(toRankCategory("NOT_A_CATEGORY")).toBe("EXPERIENCES");
    expect(toRankCategory("")).toBe("EXPERIENCES");
  });
});

describe("labels and slugs", () => {
  it("has a human label for every rank category", () => {
    for (const rc of Object.values(RankCategory)) {
      expect(RANK_CATEGORY_LABELS[rc], `label for ${rc}`).toBeTruthy();
    }
  });

  it("slugs round-trip for every rank category", () => {
    for (const rc of Object.values(RankCategory)) {
      const slug = rankCategorySlug(rc);
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(rankCategoryFromSlug(slug)).toBe(rc);
    }
  });

  it("returns null for unknown slugs", () => {
    expect(rankCategoryFromSlug("not-a-slug")).toBeNull();
    expect(rankCategoryFromSlug("")).toBeNull();
    // Enum values are not slugs (case-sensitive URL space)
    expect(rankCategoryFromSlug("RESTAURANTS")).toBeNull();
  });
});
