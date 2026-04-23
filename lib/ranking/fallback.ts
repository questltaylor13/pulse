/**
 * PRD 6 Phase 7 — Fallback sort.
 *
 * When the ranking pipeline fails mid-flight (formula throw, DB hiccup,
 * cache miss at an unexpected moment), callers fall through to this
 * quality-only sort so the user never sees a broken feed.
 */

import type { RankableItem, RankedItem } from "./types";
import { renderReason } from "./explanation";

/**
 * Sort items by normalized quality descending, return as RankedItem[].
 * No personalization. No serendipity. Reasons array carries a single
 * "unprofiled" entry so the explanation surface has something to show.
 */
export function qualityOnlySort(items: RankableItem[]): RankedItem[] {
  return [...items]
    .sort((a, b) => b.normalizedQuality - a.normalizedQuality)
    .map((item) => ({
      itemType: item.itemType,
      itemId: item.itemId,
      score: item.normalizedQuality,
      reasons: [renderReason("unprofiled", item.normalizedQuality)],
    }));
}

/**
 * Log a fallback incident. Called by precompute and feed paths whenever
 * the personalized path errors out. Kept deliberately minimal — the
 * admin dashboard reads from RankingRun.error to surface incidents.
 */
export function logFallbackIncident(userId: string | null, err: unknown, where: string): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[ranking.fallback] ${where} failed for userId=${userId ?? "anon"}:`, message);
}
