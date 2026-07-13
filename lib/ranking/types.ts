/**
 * PRD 6 — Ranking engine types.
 *
 * Shared type vocabulary for lib/ranking/. The formula is pure and operates
 * on these types; the cache stores RankedItem[] as Json; the explanation
 * endpoint reads ScoreReason[] back.
 */

import type { ContextSegment, SocialStyleType, BudgetTier, ItemStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Item identity
// ---------------------------------------------------------------------------

export type RankedItemType = "event" | "place" | "discovery";

/**
 * One ranked item inside RankedFeedCache.rankedItems. The outer Json blob
 * is an array of these. Keep this shape stable — it's persisted.
 */
export interface RankedItem {
  itemType: RankedItemType;
  itemId: string;
  score: number;
  reasons: ScoreReason[];
  /** True if the item occupies a serendipity slot (see Phase 3). */
  isSerendipity?: boolean;
}

/**
 * Human-readable contribution to a score. Rendered in "Why am I seeing this?"
 * via lib/ranking/explanation.ts mapping.
 */
export interface ScoreReason {
  /** Factor key, e.g. "vibe_match", "aspiration_food", "want_similarity". */
  factor: string;
  /** Signed contribution to the final score. Can be negative. */
  contribution: number;
  /** Pulse-voice copy shown to the user. Rendered, not inline. */
  human_readable: string;
  /** Which specific tags matched, when applicable. */
  tags_matched?: string[];
}

// ---------------------------------------------------------------------------
// Normalized item shape the formula consumes
// ---------------------------------------------------------------------------

export type PriceTier = "FREE" | "LOW" | "MID" | "HIGH";

/**
 * Item-type-agnostic shape the formula operates on. buildCandidatePool()
 * converts Events / Places / Discoveries into this shape so the formula
 * never has to branch on itemType.
 */
export interface RankableItem {
  itemType: RankedItemType;
  itemId: string;
  /** 0–1 normalized quality. Event/Discovery qualityScore/10; Place combinedScore rescaled. */
  normalizedQuality: number;
  priceTier: PriceTier;
  /** Union of all tag-ish fields (tags + vibeTags + companionTags + occasionTags + goodForTags). */
  tags: string[];
  category: string | null;
  region: string;
  /** Used for recency boost (48h). */
  createdAt: Date;
  /** Event startsAt, or null for Place/Discovery. */
  startsAt: Date | null;
  /** True when this is a Discovery with subtype HIDDEN_GEM and high qualityScore. */
  isHiddenGem: boolean;
}

// ---------------------------------------------------------------------------
// User profile shape the formula consumes
// ---------------------------------------------------------------------------

/**
 * Hydrated user profile + behavioral summary passed to the formula. Built
 * by lib/ranking/candidate-pool.ts or precompute.ts before scoring.
 */
export interface RankingContext {
  userId: string;
  /** Account age in days. Cold-start threshold is 7 days by default. */
  accountAgeDays: number;
  /** Total UserItemStatus rows for this user. Cold-start threshold is 15 by default. */
  totalFeedbackCount: number;
  /** PRD 4 profile. Null for legacy users — fallback to quality-only in formula. */
  profile: {
    contextSegment: ContextSegment;
    socialStyle: SocialStyleType;
    budgetTier: BudgetTier;
    vibePreferences: VibePair[];
    aspirationCategories: string[];
    version: number;
  } | null;
  /** All WANT items with their tag sets, for similarity scoring. */
  wantItems: { itemId: string; tags: string[] }[];
  /** All PASS items with their tag sets, for similarity penalty. */
  passItems: { itemId: string; tags: string[] }[];
  /** Item IDs the user has DONE'd — hard-filtered from the pool. */
  doneItemIds: Set<string>;
  /** Per-category engagement ratio for novelty adjustment. */
  familiarity: Record<string, number>;
  /** Ranking variant — used by variants.ts to pick config overrides. */
  variant: RankingVariantKey;
  // -- Wave 4 Rate & Rank signals (optional: absent/empty when
  //    RATE_RANK_ENABLED is off ⇒ scores are provably unchanged) ------------
  /** LIKED ranked entries with tags + derived 0–10 score + display title. */
  lovedItems?: RatedItemSignal[];
  /** DISLIKED ranked entries — the ground-truth negative signal. */
  dislikedItems?: RatedItemSignal[];
  /**
   * Per CONTENT category (the enum on RankableItem.category):
   * clamp((liked − disliked) / max(rated, 3), −1, 1). FINE counts only in
   * the denominator.
   */
  ratedCategoryAffinity?: Record<string, number>;
  // -- Wave 5 social signal (optional: absent/empty when SOCIAL_V1_ENABLED is
  //    off or the user follows nobody ⇒ scores are provably unchanged) -------
  /** LIKED ranked entries belonging to people this user follows. */
  followedLovedItems?: SocialLovedSignal[];
}

/** One rated item's contribution shape (Wave 4). */
export interface RatedItemSignal {
  itemId: string;
  tags: string[];
  /** Derived rank-engine score, 0–10. */
  score: number;
  /** Display title for "Because you loved {title}" why-lines. */
  title: string | null;
}

/**
 * One LIKED entry from someone the user follows (Wave 5).
 *
 * Unlike RatedItemSignal, the display string is the *follower's* name, not the
 * item's title: the headline this signal produces is "Alex loved this", so the
 * person is what the why-line needs to name.
 */
export interface SocialLovedSignal {
  itemId: string;
  tags: string[];
  /** The follower's derived rank-engine score for it, 0–10. */
  score: number;
  /** Display name of the person the viewer follows. */
  followerName: string | null;
}

/** Q3 vibe pair selections. Shape matches UserProfile.vibePreferences Json. */
export interface VibePair {
  pair: number;
  selected: "A" | "B";
}

// ---------------------------------------------------------------------------
// A/B variants
// ---------------------------------------------------------------------------

export type RankingVariantKey = "control" | string;

// ---------------------------------------------------------------------------
// Re-export useful Prisma enums so callers don't have to dual-import
// ---------------------------------------------------------------------------

export type { ContextSegment, SocialStyleType, BudgetTier, ItemStatus };
