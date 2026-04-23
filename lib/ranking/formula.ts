/**
 * PRD 6 — The scoring formula.
 *
 * PURE FUNCTION. No DB calls, no side effects, no async. All inputs are
 * structured values; the function returns a score + reasons array.
 *
 * Formula shape (per locked decision §C — novelty wraps the whole sum):
 *
 *   inner = base_quality × strategy.qualityMultiplier
 *         + soft_rank × (vibe_boost + aspiration_boost + social_boost)
 *         + want_similarity − pass_similarity
 *         − budget_penalty
 *         + recency_boost
 *   final = inner × novelty_adjustment
 *
 * See PRD/signal-map.md §Updated formula for the authoritative contract.
 */

import { RANKING_CONFIG, type RankingConfig } from "./config";
import type { RankableItem, RankingContext, ScoreReason, VibePair, PriceTier } from "./types";
import {
  SOCIAL_STYLE_TAGS,
  VIBE_PAIR_TAGS,
  CHIP_TO_CATEGORY,
  HIDDEN_GEMS_SENTINEL,
} from "./mappings";
import { tagOverlap, clamp } from "./normalizers";
import { renderReason } from "./explanation";

export interface ScoreResult {
  score: number;
  reasons: ScoreReason[];
}

/**
 * Score a single item for a user. Returns the raw ranking score and an
 * array of ScoreReason entries the explanation surface can render.
 */
export function score(
  ctx: RankingContext,
  item: RankableItem,
  config: RankingConfig = RANKING_CONFIG,
): ScoreResult {
  const reasons: ScoreReason[] = [];

  // If the user has no profile at all, we fall back to quality-only.
  // This is the legacy-user path per signal-map §Contract guarantees.
  if (!ctx.profile) {
    const quality = item.normalizedQuality * config.weights.baseQuality;
    reasons.push(renderReason("unprofiled", quality));
    return { score: quality, reasons };
  }

  const profile = ctx.profile;
  const preset = config.strategyPresets[profile.contextSegment];
  const coldStart = isColdStart(ctx, config);
  const softRank = coldStart ? config.coldStart.softRankMultiplier : 1.0;

  // ---- base quality -------------------------------------------------------
  const base = item.normalizedQuality * preset.qualityMultiplier * config.weights.baseQuality;
  reasons.push(renderReason("base_quality", base));

  // ---- Q2 social-style tag match (additive) ------------------------------
  const socialBoost = computeSocialBoost(profile.socialStyle, item.tags, config);
  if (socialBoost.contribution !== 0) reasons.push(socialBoost.reason);

  // ---- Q3 vibe pair tag match (additive, cap 0.32) -----------------------
  const vibeBoost = computeVibeBoost(profile.vibePreferences, item.tags, config);
  if (vibeBoost.contribution !== 0) reasons.push(vibeBoost.reason);

  // ---- Q5 aspiration category match (additive, cap 0.40) -----------------
  const aspirationBoost = computeAspirationBoost(
    profile.aspirationCategories,
    item,
    config,
  );
  if (aspirationBoost.contribution !== 0) reasons.push(aspirationBoost.reason);

  // ---- Behavioral WANT similarity (additive, cap 0.40) -------------------
  const wantBoost = computeWantSimilarity(ctx, item, config);
  if (wantBoost.contribution !== 0) reasons.push(wantBoost.reason);

  // ---- Behavioral PASS similarity (penalty, cap 0.50) --------------------
  const passPenalty = computePassSimilarity(ctx, item, config);
  if (passPenalty.contribution !== 0) reasons.push(passPenalty.reason);

  // ---- Q4 budget penalty (additive penalty) ------------------------------
  const budgetPenalty = computeBudgetPenalty(profile.budgetTier, item.priceTier, config);
  if (budgetPenalty.contribution !== 0) reasons.push(budgetPenalty.reason);

  // ---- Recency boost (48h window) ----------------------------------------
  const recencyBoost = computeRecencyBoost(item, config);
  if (recencyBoost.contribution !== 0) reasons.push(recencyBoost.reason);

  // ---- Cold-start badge (shown in reasons but doesn't change math) ------
  if (coldStart) reasons.push(renderReason("cold_start", 0));

  // ---- Assemble inner sum (before novelty) -------------------------------
  const inner =
    base +
    softRank *
      (vibeBoost.contribution + aspirationBoost.contribution + socialBoost.contribution) +
    wantBoost.contribution +
    passPenalty.contribution + // already signed negative when present
    budgetPenalty.contribution +
    recencyBoost.contribution;

  // ---- Novelty adjustment (multiplier on entire sum, locked decision §C) -
  const novelty = computeNoveltyAdjustment(ctx, item, preset.novelty);
  if (Math.abs(novelty - 1) > 0.001) {
    reasons.push(renderReason("novelty", (novelty - 1) * Math.abs(inner)));
  }

  const finalScore = inner * novelty;
  return { score: finalScore, reasons };
}

// ===========================================================================
// Sub-factor helpers
// ===========================================================================

function isColdStart(ctx: RankingContext, config: RankingConfig): boolean {
  // VISITING short-circuits soft-rank — their 5-day window forces tight
  // personalization regardless of account age. Any other segment enters
  // cold-start until BOTH gates (days + feedback) are cleared.
  if (ctx.profile?.contextSegment === "VISITING") return false;
  return (
    ctx.accountAgeDays < config.coldStart.softRankDays ||
    ctx.totalFeedbackCount < config.coldStart.softRankFeedbackThreshold
  );
}

function computeSocialBoost(
  style: RankingContext["profile"] extends null ? never : NonNullable<RankingContext["profile"]>["socialStyle"],
  itemTags: string[],
  config: RankingConfig,
): { contribution: number; reason: ScoreReason } {
  const { positive, negative } = SOCIAL_STYLE_TAGS[style];
  const positiveMatches = positive.filter((t) =>
    itemTags.some((it) => it.toLowerCase() === t.toLowerCase()),
  );
  const negativeMatches = negative.filter((t) =>
    itemTags.some((it) => it.toLowerCase() === t.toLowerCase()),
  );

  // Positive match fires the full socialBoost once (per signal-map —
  // "+0.15 on items tagged X" — it's a threshold, not per-tag).
  let contribution = 0;
  if (positiveMatches.length > 0) contribution += config.weights.socialBoost;
  if (negativeMatches.length > 0) contribution -= 0.1; // signal-map: -0.10 on group-required for SOLO_EXPLORER

  const reason = renderReason(
    "social_match",
    contribution,
    positiveMatches.length ? positiveMatches : undefined,
  );
  return { contribution, reason };
}

function computeVibeBoost(
  vibePreferences: VibePair[],
  itemTags: string[],
  config: RankingConfig,
): { contribution: number; reason: ScoreReason } {
  let total = 0;
  const matched: string[] = [];
  const perTagContribution = config.weights.vibeBoost / 4; // 0.32 / 4 pairs = 0.08

  for (const pref of vibePreferences) {
    const pairTags = VIBE_PAIR_TAGS[pref.pair];
    if (!pairTags) continue;
    const selectedTags = pref.selected === "A" ? pairTags.A : pairTags.B;
    const overlap = tagOverlap(selectedTags, itemTags);
    if (overlap > 0) {
      // Per pair: +perTagContribution for each matched tag, but cap per-pair
      // at perTagContribution (signal-map: "+0.08 per matching item tag" across all 4 pairs).
      // We cap TOTAL at config.weights.vibeBoost; per-pair we let all matching tags count.
      total += overlap * perTagContribution;
      for (const tag of selectedTags) {
        if (itemTags.some((it) => it.toLowerCase() === tag.toLowerCase())) {
          matched.push(tag);
        }
      }
    }
  }

  const contribution = clamp(total, 0, config.weights.vibeBoost);
  const reason = renderReason("vibe_match", contribution, matched);
  return { contribution, reason };
}

function computeAspirationBoost(
  chips: string[],
  item: RankableItem,
  config: RankingConfig,
): { contribution: number; reason: ScoreReason } {
  let total = 0;
  const matchedChips: string[] = [];

  const perChipBoost = config.weights.aspirationBoost / 2; // cap assumes up to 2 matching chips

  for (const chip of chips) {
    const categories = CHIP_TO_CATEGORY[chip];
    if (!categories) continue;

    // Hidden Gems sentinel: +0.15 on any Discovery tagged as a Hidden Gem.
    if (categories.includes(HIDDEN_GEMS_SENTINEL) && item.isHiddenGem) {
      total += 0.15;
      matchedChips.push(chip);
      continue;
    }

    // Standard category match.
    if (item.category && categories.includes(item.category)) {
      total += perChipBoost;
      matchedChips.push(chip);
    }
  }

  const contribution = clamp(total, 0, config.weights.aspirationBoost);
  const reason = renderReason("aspiration_match", contribution, matchedChips);
  return { contribution, reason };
}

function computeWantSimilarity(
  ctx: RankingContext,
  item: RankableItem,
  config: RankingConfig,
): { contribution: number; reason: ScoreReason } {
  const perMatchBoost = 0.25; // signal-map
  const cap = config.weights.interestedSimilarity; // 0.40
  let total = 0;

  for (const want of ctx.wantItems) {
    if (want.itemId === item.itemId) continue; // don't boost the item from itself
    if (tagOverlap(want.tags, item.tags) >= 2) {
      total += perMatchBoost;
    }
  }

  const contribution = clamp(total, 0, cap);
  const reason = renderReason("want_similarity", contribution);
  return { contribution, reason };
}

function computePassSimilarity(
  ctx: RankingContext,
  item: RankableItem,
  config: RankingConfig,
): { contribution: number; reason: ScoreReason } {
  const perMatchPenalty = 0.3; // signal-map
  const cap = config.weights.notInterestedSimilarity; // 0.50
  let total = 0;

  for (const pass of ctx.passItems) {
    if (pass.itemId === item.itemId) continue;
    if (tagOverlap(pass.tags, item.tags) >= 2) {
      total += perMatchPenalty;
    }
  }

  const magnitude = clamp(total, 0, cap);
  const contribution = -magnitude;
  const reason = renderReason("pass_similarity", contribution);
  return { contribution, reason };
}

function computeBudgetPenalty(
  tier: RankingContext["profile"] extends null ? never : NonNullable<RankingContext["profile"]>["budgetTier"],
  priceTier: PriceTier,
  config: RankingConfig,
): { contribution: number; reason: ScoreReason } {
  // Signal-map table:
  //   FREE_FOCUSED:   drop $$$, -0.25 on $$,  +0.10 on free/$
  //   MODERATE:       drop $$$ below-median, -0.05 on $$$
  //   TREAT_YOURSELF: no penalty, +0.05 on $$$
  //
  // Hard drops are handled upstream in candidate-pool.ts; here we only
  // apply the score adjustments.
  let contribution = 0;

  if (tier === "FREE_FOCUSED") {
    if (priceTier === "FREE" || priceTier === "LOW") contribution = 0.1;
    else if (priceTier === "MID") contribution = -config.weights.budgetPenalty; // -0.25
    // HIGH dropped upstream
  } else if (tier === "MODERATE") {
    if (priceTier === "HIGH") contribution = -0.05;
  } else if (tier === "TREAT_YOURSELF") {
    if (priceTier === "HIGH") contribution = 0.05;
  }

  const reason = renderReason(contribution >= 0 ? "base_quality" : "budget_penalty", contribution);
  return { contribution, reason };
}

function computeRecencyBoost(
  item: RankableItem,
  config: RankingConfig,
): { contribution: number; reason: ScoreReason } {
  const ageMs = Date.now() - item.createdAt.getTime();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;
  const contribution = ageMs < fortyEightHoursMs ? config.weights.recencyBoost : 0;
  const reason = renderReason("recency", contribution);
  return { contribution, reason };
}

function computeNoveltyAdjustment(
  ctx: RankingContext,
  item: RankableItem,
  noveltyPreset: number,
): number {
  // If the user has no familiarity data (e.g. zero feedback), novelty
  // adjustment is neutral. Same if the preset is 1.0 (not novelty-biased).
  if (!item.category || noveltyPreset === 1.0) return 1.0;
  const fam = ctx.familiarity[item.category] ?? 0;
  // 1 + (preset - 1) × (1 - familiarity)
  // Unfamiliar (fam=0) → full preset multiplier (e.g. 1.30 for IN_A_RUT)
  // Familiar (fam=1)   → 1.0 (neutral)
  return 1 + (noveltyPreset - 1) * (1 - clamp(fam, 0, 1));
}
