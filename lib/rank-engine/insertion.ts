/**
 * Wave 4 Rate & Rank — binary-search insertion state machine (decision D4/D5).
 *
 * Pure and dependency-free so the exact same logic drives the client duel UI
 * (components/rank/RankFlow) and server-side validation. The bucket is
 * ordered best-first; the state narrows a window [lo, hi) of candidate
 * insertion indexes. Outcomes are from the placed (subject) item's
 * perspective:
 *
 *   WON     → subject beats the opponent  → window above the opponent
 *   LOST    → subject loses               → window below the opponent
 *   SKIPPED → "too close to call"         → terminal, directly below opponent
 *
 * Capped at MAX_COMPARISONS duels — fully resolves buckets up to 15; larger
 * unresolved windows fall back to their midpoint (approximate placement is
 * fine; Beli does the same).
 */

export const MAX_COMPARISONS = 4;

export type DuelOutcome = "WON" | "LOST" | "SKIPPED";

export interface InsertionState {
  /** Candidate insertion window [lo, hi) over the bucket's 0-based slots. */
  lo: number;
  hi: number;
  /** Duels consumed so far. */
  duels: number;
  /** Set by SKIPPED — terminal insertion index. */
  terminal?: number;
}

export function initialState(bucketSize: number): InsertionState {
  return { lo: 0, hi: bucketSize, duels: 0 };
}

export function isResolved(state: InsertionState): boolean {
  return (
    state.terminal !== undefined ||
    state.lo >= state.hi ||
    state.duels >= MAX_COMPARISONS
  );
}

/** Index of the next opponent in the bucket. Only valid when !isResolved. */
export function opponentIndex(state: InsertionState): number {
  return Math.floor((state.lo + state.hi) / 2);
}

export function applyOutcome(
  state: InsertionState,
  outcome: DuelOutcome
): InsertionState {
  const mid = opponentIndex(state);
  const duels = state.duels + 1;
  switch (outcome) {
    case "WON":
      return { lo: state.lo, hi: mid, duels };
    case "LOST":
      return { lo: mid + 1, hi: state.hi, duels };
    case "SKIPPED":
      return { lo: state.lo, hi: state.hi, duels, terminal: mid + 1 };
  }
}

/** Final insertion index for a resolved state (window midpoint at the cap). */
export function resolveIndex(state: InsertionState): number {
  if (state.terminal !== undefined) return state.terminal;
  if (state.lo >= state.hi) return state.lo;
  return Math.floor((state.lo + state.hi) / 2);
}

/** How many duels a bucket of this size takes (UI progress dots). */
export function expectedComparisons(bucketSize: number): number {
  if (bucketSize <= 0) return 0;
  return Math.min(MAX_COMPARISONS, Math.ceil(Math.log2(bucketSize + 1)));
}
