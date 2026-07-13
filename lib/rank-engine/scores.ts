/**
 * Wave 4 Rate & Rank — derived score math (plan decision D2/D3).
 *
 * `score` is a pure function of the category's sentiment ordering:
 * midpoint-of-slice within fixed, non-overlapping bucket ranges. Item at
 * 0-based index i within a bucket of size n scores
 *
 *   hi − (hi − lo) × (i + 0.5) / n
 *
 * so a lone LIKED item lands at 8.35 (not a silly 10.0) and #1
 * asymptotically approaches 10 as the list grows. The whole category is
 * rescored on every placement — positions shift anyway, and a pure
 * derivation makes repair (`recomputeCategory`) trivial.
 */

import type { RankSentiment } from "@prisma/client";

export const BUCKET_RANGES: Record<RankSentiment, { lo: number; hi: number }> =
  {
    LIKED: { lo: 6.7, hi: 10.0 },
    FINE: { lo: 3.4, hi: 6.6 },
    DISLIKED: { lo: 0.0, hi: 3.3 },
  };

/** Bucket order, best first — the position invariant follows this order. */
export const SENTIMENT_ORDER: RankSentiment[] = ["LIKED", "FINE", "DISLIKED"];

/**
 * Derive scores for a category's entries given their sentiments in position
 * order (best first). Input must satisfy the bucket invariant.
 */
export function deriveScores(sentiments: RankSentiment[]): number[] {
  const counts: Record<RankSentiment, number> = {
    LIKED: 0,
    FINE: 0,
    DISLIKED: 0,
  };
  for (const s of sentiments) counts[s]++;

  const seen: Record<RankSentiment, number> = {
    LIKED: 0,
    FINE: 0,
    DISLIKED: 0,
  };
  return sentiments.map((s) => {
    const { lo, hi } = BUCKET_RANGES[s];
    const n = counts[s];
    const i = seen[s]++;
    return hi - ((hi - lo) * (i + 0.5)) / n;
  });
}

/** Round for display — the DB keeps full precision. */
export function displayScore(score: number): string {
  return score.toFixed(1);
}

/**
 * Assert the hard ordering invariant: all LIKED above all FINE above all
 * DISLIKED. Called before persisting a re-ordered category.
 */
export function assertBucketInvariant(sentiments: RankSentiment[]): void {
  const rank = (s: RankSentiment) => SENTIMENT_ORDER.indexOf(s);
  for (let i = 1; i < sentiments.length; i++) {
    if (rank(sentiments[i]) < rank(sentiments[i - 1])) {
      throw new Error(
        `Bucket invariant violated at position ${i}: ${sentiments[i]} after ${sentiments[i - 1]}`
      );
    }
  }
}
