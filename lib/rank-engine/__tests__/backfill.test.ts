/**
 * Wave 4 Rate & Rank — pure planning logic for the stars→entries backfill
 * (scripts/backfill-ranked-entries.ts, decision D9). Existing 1–5 star
 * ratings seed the ranked lists: 4–5 LIKED, 3 FINE, 1–2 DISLIKED; within a
 * bucket, higher stars first, then earlier updatedAt (earlier rating wins
 * ties — it's been on the list longer).
 */

import { describe, it, expect } from "vitest";
import {
  starsToSentiment,
  planBackfill,
  type BackfillInput,
} from "@/lib/rank-engine/backfill";

describe("starsToSentiment", () => {
  it("maps 4–5 to LIKED, 3 to FINE, 1–2 to DISLIKED", () => {
    expect(starsToSentiment(5)).toBe("LIKED");
    expect(starsToSentiment(4)).toBe("LIKED");
    expect(starsToSentiment(3)).toBe("FINE");
    expect(starsToSentiment(2)).toBe("DISLIKED");
    expect(starsToSentiment(1)).toBe("DISLIKED");
  });
});

function row(overrides: Partial<BackfillInput>): BackfillInput {
  return {
    refKind: "place",
    refId: "p1",
    rating: 5,
    updatedAt: new Date("2026-01-01"),
    contentCategory: "RESTAURANT",
    title: "Test Place",
    imageUrl: null,
    town: null,
    ...overrides,
  };
}

describe("planBackfill", () => {
  it("groups by rank category and orders rating desc, updatedAt asc", () => {
    const plan = planBackfill([
      row({ refId: "a", rating: 3, updatedAt: new Date("2026-02-01") }),
      row({ refId: "b", rating: 5, updatedAt: new Date("2026-03-01") }),
      row({ refId: "c", rating: 5, updatedAt: new Date("2026-01-01") }),
      row({ refId: "d", rating: 1, updatedAt: new Date("2026-01-15") }),
    ]);

    expect(plan).toHaveLength(1);
    const restaurants = plan[0];
    expect(restaurants.category).toBe("RESTAURANTS");
    // c (5★, earlier) before b (5★, later), then a (3★), then d (1★)
    expect(restaurants.entries.map((e) => e.refId)).toEqual([
      "c",
      "b",
      "a",
      "d",
    ]);
    expect(restaurants.entries.map((e) => e.sentiment)).toEqual([
      "LIKED",
      "LIKED",
      "FINE",
      "DISLIKED",
    ]);
    // Dense positions and strictly decreasing scores
    expect(restaurants.entries.map((e) => e.position)).toEqual([0, 1, 2, 3]);
    for (let i = 1; i < restaurants.entries.length; i++) {
      expect(restaurants.entries[i].score).toBeLessThan(
        restaurants.entries[i - 1].score
      );
    }
  });

  it("splits different content categories into their rank buckets", () => {
    const plan = planBackfill([
      row({ refId: "rest", contentCategory: "RESTAURANT" }),
      row({ refId: "gym", contentCategory: "FITNESS", refKind: "event" }),
      row({ refId: "mystery", contentCategory: null }),
    ]);
    const categories = plan.map((c) => c.category).sort();
    expect(categories).toEqual(["ACTIVE", "EXPERIENCES", "RESTAURANTS"]);
  });
});
