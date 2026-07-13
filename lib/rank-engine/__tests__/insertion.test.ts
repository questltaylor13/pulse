/**
 * Wave 4 Rate & Rank — binary-search insertion state machine.
 *
 * Pure and shared between the client duel flow (components/rank/RankFlow)
 * and server validation. Bucket is ordered best-first; the state narrows a
 * window [lo, hi) of candidate insertion indexes. Outcomes are from the
 * placed (subject) item's perspective: WON → subject is better than the
 * opponent; LOST → worse; SKIPPED ("too close to call") → terminal, slots
 * directly below the opponent.
 */

import { describe, it, expect } from "vitest";
import {
  MAX_COMPARISONS,
  initialState,
  isResolved,
  opponentIndex,
  applyOutcome,
  resolveIndex,
  expectedComparisons,
  type InsertionState,
} from "@/lib/rank-engine/insertion";

function runAll(
  bucketSize: number,
  outcome: "WON" | "LOST"
): { index: number; duels: number } {
  let state = initialState(bucketSize);
  let duels = 0;
  while (!isResolved(state)) {
    state = applyOutcome(state, outcome);
    duels++;
  }
  return { index: resolveIndex(state), duels };
}

describe("insertion state machine", () => {
  it("resolves an empty bucket immediately at #1 with zero duels", () => {
    const state = initialState(0);
    expect(isResolved(state)).toBe(true);
    expect(resolveIndex(state)).toBe(0);
  });

  it("takes exactly one duel against a single existing item", () => {
    expect(runAll(1, "WON")).toEqual({ index: 0, duels: 1 });
    expect(runAll(1, "LOST")).toEqual({ index: 1, duels: 1 });
  });

  it("win-all lands at the top, lose-all at the bottom", () => {
    for (const n of [2, 3, 5, 8, 15]) {
      expect(runAll(n, "WON").index).toBe(0);
      expect(runAll(n, "LOST").index).toBe(n);
    }
  });

  it("skip is terminal and slots directly below the opponent", () => {
    // n=5: first opponent is floor((0+5)/2) = 2; skip → index 3.
    let state = initialState(5);
    expect(opponentIndex(state)).toBe(2);
    state = applyOutcome(state, "SKIPPED");
    expect(isResolved(state)).toBe(true);
    expect(resolveIndex(state)).toBe(3);
  });

  it("fully resolves buckets up to 15 within the comparison cap", () => {
    // Binary search over n+1 slots needs ceil(log2(n+1)) duels.
    expect(runAll(15, "LOST").duels).toBeLessThanOrEqual(MAX_COMPARISONS);
    expect(runAll(15, "WON").duels).toBeLessThanOrEqual(MAX_COMPARISONS);
  });

  it("caps at MAX_COMPARISONS and falls back to the window midpoint", () => {
    // n=100, always WON: windows [0,100)→[0,50)→[0,25)→[0,12)→[0,6);
    // 4 duels used, unresolved → midpoint of [0,6) = 3.
    let state = initialState(100);
    let duels = 0;
    while (!isResolved(state)) {
      state = applyOutcome(state, "WON");
      duels++;
    }
    expect(duels).toBe(MAX_COMPARISONS);
    expect(resolveIndex(state)).toBe(3);
  });

  it("binary search narrows correctly on mixed outcomes", () => {
    // n=8: [0,8) mid=4 LOST → [5,8) mid=6 WON → [5,6) mid=5 LOST → [6,6)
    let state = initialState(8);
    expect(opponentIndex(state)).toBe(4);
    state = applyOutcome(state, "LOST") as InsertionState;
    expect(opponentIndex(state)).toBe(6);
    state = applyOutcome(state, "WON") as InsertionState;
    expect(opponentIndex(state)).toBe(5);
    state = applyOutcome(state, "LOST") as InsertionState;
    expect(isResolved(state)).toBe(true);
    expect(resolveIndex(state)).toBe(6);
  });
});

describe("expectedComparisons", () => {
  it("matches ceil(log2(n+1)) capped at MAX_COMPARISONS", () => {
    expect(expectedComparisons(0)).toBe(0);
    expect(expectedComparisons(1)).toBe(1);
    expect(expectedComparisons(2)).toBe(2);
    expect(expectedComparisons(3)).toBe(2);
    expect(expectedComparisons(7)).toBe(3);
    expect(expectedComparisons(15)).toBe(4);
    expect(expectedComparisons(16)).toBe(4);
    expect(expectedComparisons(1000)).toBe(4);
  });
});
