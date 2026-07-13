/**
 * Wave 4 Rate & Rank — derived score math.
 *
 * Scores are a pure function of the category's sentiment ordering:
 * midpoint-of-slice within fixed bucket ranges (LIKED [6.7,10], FINE
 * [3.4,6.6], DISLIKED [0,3.3]). See plan decision D2/D3.
 */

import { describe, it, expect } from "vitest";
import type { RankSentiment } from "@prisma/client";
import {
  BUCKET_RANGES,
  deriveScores,
  assertBucketInvariant,
} from "@/lib/rank-engine/scores";

describe("deriveScores", () => {
  it("returns the bucket midpoint for a single item", () => {
    // LIKED [6.7, 10]: 10 − 3.3 × 0.5 = 8.35
    expect(deriveScores(["LIKED"])).toEqual([8.35]);
    // FINE [3.4, 6.6]: 6.6 − 3.2 × 0.5 = 5.0
    expect(deriveScores(["FINE"])).toEqual([5.0]);
    // DISLIKED [0, 3.3]: 3.3 − 3.3 × 0.5 = 1.65
    expect(deriveScores(["DISLIKED"])).toEqual([1.65]);
  });

  it("returns an empty array for an empty category", () => {
    expect(deriveScores([])).toEqual([]);
  });

  it("is strictly decreasing down the list", () => {
    const sentiments: RankSentiment[] = [
      "LIKED",
      "LIKED",
      "LIKED",
      "FINE",
      "FINE",
      "DISLIKED",
    ];
    const scores = deriveScores(sentiments);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThan(scores[i - 1]);
    }
  });

  it("keeps buckets in their ranges with no overlap", () => {
    const sentiments: RankSentiment[] = [
      ...Array<RankSentiment>(10).fill("LIKED"),
      ...Array<RankSentiment>(10).fill("FINE"),
      ...Array<RankSentiment>(10).fill("DISLIKED"),
    ];
    const scores = deriveScores(sentiments);
    const liked = scores.slice(0, 10);
    const fine = scores.slice(10, 20);
    const disliked = scores.slice(20);

    for (const s of liked) {
      expect(s).toBeGreaterThan(BUCKET_RANGES.LIKED.lo);
      expect(s).toBeLessThan(BUCKET_RANGES.LIKED.hi);
    }
    for (const s of fine) {
      expect(s).toBeGreaterThan(BUCKET_RANGES.FINE.lo);
      expect(s).toBeLessThan(BUCKET_RANGES.FINE.hi);
    }
    for (const s of disliked) {
      expect(s).toBeGreaterThan(BUCKET_RANGES.DISLIKED.lo);
      expect(s).toBeLessThan(BUCKET_RANGES.DISLIKED.hi);
    }
    // No cross-bucket overlap
    expect(Math.min(...liked)).toBeGreaterThan(Math.max(...fine));
    expect(Math.min(...fine)).toBeGreaterThan(Math.max(...disliked));
  });

  it("approaches 10 for #1 as the liked bucket grows (Beli feel)", () => {
    const top = (n: number) =>
      deriveScores(Array<RankSentiment>(n).fill("LIKED"))[0];
    expect(top(1)).toBeCloseTo(8.35, 5);
    expect(top(10)).toBeGreaterThan(9.5);
    expect(top(100)).toBeGreaterThan(9.9);
    expect(top(100)).toBeLessThan(10);
  });

  it("is deterministic (same input, same output)", () => {
    const sentiments: RankSentiment[] = ["LIKED", "FINE", "FINE", "DISLIKED"];
    expect(deriveScores(sentiments)).toEqual(deriveScores(sentiments));
  });
});

describe("assertBucketInvariant", () => {
  it("accepts LIKED ≥ FINE ≥ DISLIKED ordering", () => {
    expect(() =>
      assertBucketInvariant(["LIKED", "LIKED", "FINE", "DISLIKED"])
    ).not.toThrow();
    expect(() => assertBucketInvariant([])).not.toThrow();
    expect(() => assertBucketInvariant(["FINE"])).not.toThrow();
  });

  it("throws when a better bucket appears below a worse one", () => {
    expect(() => assertBucketInvariant(["FINE", "LIKED"])).toThrow();
    expect(() => assertBucketInvariant(["DISLIKED", "FINE"])).toThrow();
    expect(() =>
      assertBucketInvariant(["LIKED", "DISLIKED", "LIKED"])
    ).toThrow();
  });
});
