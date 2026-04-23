/**
 * PRD 6 — Static tag/category mappings consumed by formula.ts.
 *
 * These are the vocabulary bridges between the structured onboarding
 * answers (Q2/Q3/Q5) and the free-form tag/category fields on items.
 * Authoritative copy lives in PRD/signal-map.md; changes here should
 * stay in sync with that doc.
 */

import type { SocialStyleType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Q2 — socialStyle → item tags
// ---------------------------------------------------------------------------

/**
 * Each social style maps to a set of positive tags (boost when item
 * carries any of them) and optionally negative tags (penalty).
 *
 * PASSIVE_SAVER has NO ranking effect per signal-map — it drives
 * notification strategy, not the feed.
 */
export const SOCIAL_STYLE_TAGS: Record<
  SocialStyleType,
  { positive: string[]; negative: string[] }
> = {
  SOCIAL_CONNECTOR: {
    positive: ["group-friendly", "shared", "party", "festival"],
    negative: [],
  },
  SOLO_EXPLORER: {
    positive: ["solo-friendly", "quiet", "contemplative"],
    negative: ["group-required"],
  },
  DIRECT_SHARER: {
    positive: ["date-worthy", "couple-friendly", "shareable", "romantic"],
    negative: [],
  },
  PASSIVE_SAVER: {
    positive: [],
    negative: [],
  },
};

// ---------------------------------------------------------------------------
// Q3 — vibePreferences → item tags (4 pairs, +0.08 per match, max 0.32)
// ---------------------------------------------------------------------------

/**
 * Per-pair tag bundles for A vs B selection. Indexed by pair number (1-4).
 * A user's UserProfile.vibePreferences Json is an array of
 * { pair: number; selected: "A" | "B" }; we count item-tag overlap against
 * the chosen side.
 */
export const VIBE_PAIR_TAGS: Record<number, { A: string[]; B: string[] }> = {
  1: {
    A: ["polished", "upscale", "scenic", "cocktail"],
    B: ["authentic", "unpretentious", "dive", "local-favorite"],
  },
  2: {
    A: ["accessible", "established", "scenic", "moderate-effort"],
    B: ["adventurous", "off-the-beaten-path", "high-effort", "secluded"],
  },
  3: {
    A: ["traditional", "acoustic", "mellow", "live-music"],
    B: ["electronic", "late-night", "high-energy", "underground"],
  },
  4: {
    A: ["morning", "calm", "local-producer", "daytime"],
    B: ["late-night", "high-energy", "street-food", "urban-buzz"],
  },
};

// ---------------------------------------------------------------------------
// Q5 — aspirationCategories (chip labels) → Category enum values
// ---------------------------------------------------------------------------

/**
 * Chip label → list of Category enum values. Each matching chip
 * contributes +0.20 to the score when item.category is in the list.
 *
 * Special trigger: "Hidden local spots" returns the sentinel
 * `__HIDDEN_GEMS__` which formula.ts treats as "+0.15 on every Discovery
 * with subtype=HIDDEN_GEM" rather than a category match.
 *
 * Note: signal-map.md references lib/onboarding/chip-mapping.ts as the
 * home for this; PRD 6 consolidates under lib/ranking/mappings.ts so the
 * formula has one import path. Keep the two in sync until/unless we move
 * onboarding logic into ranking wholesale.
 */
export const CHIP_TO_CATEGORY: Record<string, string[]> = {
  "Try new restaurants": ["RESTAURANT", "FOOD"],
  "More artsy things": ["ART"],
  "Live music": ["LIVE_MUSIC"],
  "Outdoor adventures": ["OUTDOORS"],
  "Date-night spots": ["BARS", "RESTAURANT"],
  "Classes / learning": ["ACTIVITY_VENUE"],
  Nightlife: ["BARS", "LIVE_MUSIC"],
  "Hidden local spots": ["__HIDDEN_GEMS__"],
};

export const HIDDEN_GEMS_SENTINEL = "__HIDDEN_GEMS__";
