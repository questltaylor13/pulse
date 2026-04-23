/**
 * PRD 6 — Ranking engine public API.
 *
 * Callers outside lib/ranking/ should only import from this file. Everything
 * else is an implementation detail.
 *
 * Phase 0 ships type + config stubs. Phases 1-7 fill in real implementations.
 * Stubs throw NotImplemented so accidental wiring during transition fails
 * loudly rather than silently returning empty data.
 */

export type {
  RankedItem,
  RankedItemType,
  ScoreReason,
  RankableItem,
  RankingContext,
  RankingVariantKey,
  PriceTier,
  VibePair,
} from "./types";

export { RANKING_CONFIG, RANKING_VARIANTS } from "./config";
export type { RankingConfig } from "./config";

import type { RankedItem } from "./types";

class NotImplementedError extends Error {
  constructor(name: string) {
    super(`lib/ranking/${name} is not implemented yet. See PRD/matching-engine.md.`);
    this.name = "NotImplementedError";
  }
}

/**
 * Returns the current precomputed ranked feed for a user. Populated by
 * the hourly precompute cron; on cache miss, falls through to on-demand
 * ranking (Phase 2) or quality-only fallback (Phase 7).
 */
export async function getRankedFeed(_userId: string): Promise<RankedItem[]> {
  throw new NotImplementedError("getRankedFeed");
}

/**
 * Applies real-time adjustments on top of a baseline precomputed ranking.
 * Used for "just-given-feedback" tweaks without waiting for the next cron.
 */
export async function rerankLive(
  _userId: string,
  _baseline: RankedItem[],
): Promise<RankedItem[]> {
  throw new NotImplementedError("rerankLive");
}

/**
 * Returns a section of the ranked feed partitioned by rail key (Phase 2).
 * The Home page calls this once per rail; cache-miss behavior falls
 * through to fetchHomeFeed's legacy sort via the RANKING_V2_ENABLED flag.
 */
export async function getFeedSection(
  _userId: string,
  _rail: string,
  _scope: "near" | "all",
): Promise<RankedItem[]> {
  throw new NotImplementedError("getFeedSection");
}
