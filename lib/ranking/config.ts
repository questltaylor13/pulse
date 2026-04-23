/**
 * PRD 6 — Ranking engine configuration.
 *
 * The tunable knobs. Editing this file and redeploying changes ranking
 * behavior globally — no admin UI, no DB toggles. Per-variant overrides
 * live in RANKING_VARIANTS below.
 *
 * Source of truth for the weights lives in PRD/signal-map.md; changes
 * here should stay in sync with that doc (it's the contract).
 */

import type { ContextSegment, RankingVariantKey } from "./types";

export const RANKING_CONFIG = {
  /** Base formula weights. See formula.ts for how each is applied. */
  weights: {
    /** Multiplier on the normalized quality baseline (per PRD defaults). */
    baseQuality: 1.0,
    /** Max boost from Q2 social-style match. */
    socialBoost: 0.15,
    /** Max boost from Q3 vibe pairs — 4 pairs × 0.08 each. */
    vibeBoost: 0.32,
    /** Max boost from Q5 aspiration chips — 2 chips × 0.20. */
    aspirationBoost: 0.4,
    /** Max penalty for budget mismatch. */
    budgetPenalty: 0.25,
    /** Boost for items created in the last 48h. */
    recencyBoost: 0.05,
    /** Max boost from WANT tag similarity — capped at +0.40. */
    interestedSimilarity: 0.4,
    /** Max penalty from PASS tag similarity — capped at -0.50. */
    notInterestedSimilarity: 0.5,
  },

  /**
   * Strategy presets per Q1 context segment. Each preset tweaks the shape
   * of the score without rewriting the formula.
   *
   * - qualityMultiplier: scales the normalized quality baseline.
   * - novelty: how strongly unfamiliar categories are boosted. >1 means
   *   unfamiliar gets boosted; =1 is neutral; <1 dampens unfamiliar.
   * - regional: scaling for regional items (Front Range / Mountain Gateway).
   */
  strategyPresets: {
    NEW_TO_CITY: { qualityMultiplier: 1.1, novelty: 1.0, regional: 0.9 },
    IN_A_RUT: { qualityMultiplier: 1.0, novelty: 1.3, regional: 1.1 },
    LOCAL_EXPLORER: { qualityMultiplier: 1.0, novelty: 1.2, regional: 1.15 },
    VISITING: { qualityMultiplier: 1.15, novelty: 0.8, regional: 0.85 },
  } satisfies Record<ContextSegment, { qualityMultiplier: number; novelty: number; regional: number }>,

  /**
   * Cold-start soft-rank. Both conditions must fail for a user to exit
   * cold-start. The VISITING segment short-circuits soft-rank (see formula).
   */
  coldStart: {
    softRankDays: 7,
    softRankFeedbackThreshold: 15,
    /** Profile-derived boosts multiplied by this in cold-start mode. */
    softRankMultiplier: 0.6,
  },

  /** Serendipity injection (Phase 3). */
  serendipity: {
    /** Every Nth slot becomes a serendipity pick. */
    mixedInInterval: 5,
    /** Target percent of total feed that's serendipity (sanity check). */
    targetPercent: 0.15,
    /** Prefer Hidden Gems (Discovery subtype HIDDEN_GEM) for serendipity slots. */
    preferHiddenGems: true,
    /** Minimum feedback count before the "Outside your usual" rail shows. */
    outsideUsualMinFeedback: 5,
  },

  /** Candidate pool construction. */
  candidatePool: {
    /** Cap the pool at this many items per user (safety valve, not routine). */
    maxPoolSize: 500,
    /** Items below this normalized quality never enter the pool. */
    minQualityScore: 0.5,
  },

  /** Pre-compute cron scheduling. */
  precompute: {
    /** How often the background cron runs. */
    cadenceMinutes: 60,
    /** Cache TTL before on-demand fallback kicks in. */
    maxStaleHours: 4,
    /** Skip re-rank if cache is fresher than this AND feedback/profile haven't changed. */
    skipIfFresherThanMinutes: 30,
    /** Total elapsed budget per cron run. Bail with a partial-completion warning after this. */
    runBudgetMs: 45_000,
  },

  /** Fallback behavior. */
  fallback: {
    /** If ranking errors, sort by quality alone. User never sees an error. */
    onErrorUseQualityOnly: true,
    /** Log fallback incidents to the admin dashboard. */
    logFallbackToAdmin: true,
  },
} as const;

export type RankingConfig = typeof RANKING_CONFIG;

/**
 * A/B variants. Each key is a RankingVariantKey value; the value is a
 * partial override merged onto RANKING_CONFIG by lib/ranking/variants.ts.
 *
 * V1 ships with no real variants — just the control. Quest defines the
 * first real variant when there's enough user volume to observe effects.
 */
export const RANKING_VARIANTS = {
  control: {},
} as const satisfies Record<RankingVariantKey, DeepPartial<RankingConfig>>;

// ---------------------------------------------------------------------------
// DeepPartial helper — permit variant overrides on nested config keys.
// ---------------------------------------------------------------------------

export type DeepPartial<T> = T extends object
  ? T extends readonly unknown[]
    ? T
    : { [K in keyof T]?: DeepPartial<T[K]> }
  : T;
