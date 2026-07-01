/**
 * PRD 6 — live re-rank (Wave 2).
 *
 * PURE helpers for applying real-time feedback to an already-ranked baseline
 * without waiting for the (daily, on Hobby) precompute cron. The DB-backed
 * orchestration lives in ./rerank-trigger.ts; this file stays side-effect-free
 * so it can be unit-tested with hand-built fixtures like formula.ts.
 */

import { score } from "./formula";
import type { RankableItem, RankedItem, RankingContext } from "./types";

/**
 * Re-score a baseline ranked list against a fresh RankingContext and re-sort
 * descending. Items whose scoring attributes couldn't be hydrated (missing
 * from `rankables`) keep their prior score and reasons. Per-item flags such as
 * `isSerendipity` are preserved. Stable: equal scores keep baseline order.
 */
export function reorderByFreshScore(
  ctx: RankingContext,
  rankables: Map<string, RankableItem>,
  baseline: RankedItem[],
): RankedItem[] {
  const rescored = baseline.map((it) => {
    const rankable = rankables.get(`${it.itemType}:${it.itemId}`);
    if (!rankable) return it;
    const { score: s, reasons } = score(ctx, rankable);
    return { ...it, score: s, reasons };
  });

  return rescored
    .map((it, idx) => ({ it, idx }))
    .sort((a, b) => b.it.score - a.it.score || a.idx - b.idx)
    .map((x) => x.it);
}

/**
 * Coalescing guard for on-demand force re-ranks. Returns true when the cache
 * was (re)computed recently enough that another forced recompute can be
 * skipped. The triggering write has already flagged the cache dirty, so a
 * skipped force is never a lost signal — the next eligible write (or the daily
 * cron) still picks it up. A never-computed cache (`null`) is never skipped.
 */
export function withinCoalesceWindow(
  computedAtMs: number | null,
  nowMs: number,
  windowMs: number,
): boolean {
  if (computedAtMs == null) return false;
  return nowMs - computedAtMs < windowMs;
}
