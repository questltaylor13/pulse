/**
 * PRD 6 — Formula fixtures covering the 10 scenarios in the plan.
 *
 * These tests lock in the shape of the locked-decision formula:
 *   final = (base + boosts + recency - budget) × novelty_adjustment
 *
 * Each fixture constructs a minimal RankingContext + RankableItem so the
 * math is easy to read.
 */

import { describe, it, expect } from "vitest";
import { score } from "@/lib/ranking/formula";
import type { RankingContext, RankableItem } from "@/lib/ranking/types";
import { RANKING_CONFIG } from "@/lib/ranking/config";

// Reference point: we freeze recency to "old" by using a date 100 days ago
// so tests aren't time-sensitive. Tests that need the recency bump use "now".
const LONG_AGO = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
const FRESH_NOW = new Date(Date.now() - 1000); // 1 sec ago

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<RankableItem> = {}): RankableItem {
  return {
    itemType: "event",
    itemId: "evt_test",
    normalizedQuality: 0.8,
    priceTier: "MID",
    tags: [],
    category: "LIVE_MUSIC",
    region: "DENVER_METRO",
    createdAt: LONG_AGO,
    startsAt: null,
    isHiddenGem: false,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<RankingContext> = {}): RankingContext {
  return {
    userId: "usr_test",
    accountAgeDays: 30,
    totalFeedbackCount: 50,
    profile: {
      contextSegment: "LOCAL_EXPLORER",
      socialStyle: "SOLO_EXPLORER",
      budgetTier: "MODERATE",
      vibePreferences: [],
      aspirationCategories: [],
      version: 1,
    },
    wantItems: [],
    passItems: [],
    doneItemIds: new Set(),
    familiarity: {},
    variant: "control",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

describe("formula.score — 10 locked-decision fixtures", () => {
  // 1. NEW_TO_CITY cold-start: quality-heavy, profile boosts soft-ranked
  it("NEW_TO_CITY in cold-start applies 0.6x softRank to profile boosts", () => {
    const ctx = makeCtx({
      accountAgeDays: 3, // <7 → cold
      totalFeedbackCount: 2, // <15 → cold
      profile: {
        contextSegment: "NEW_TO_CITY",
        socialStyle: "SOCIAL_CONNECTOR",
        budgetTier: "MODERATE",
        vibePreferences: [{ pair: 1, selected: "A" }], // polished/upscale/scenic/cocktail
        aspirationCategories: [],
        version: 1,
      },
    });
    const item = makeItem({
      tags: ["group-friendly", "polished"], // Q2 + Q3 match
      normalizedQuality: 0.8,
    });
    const { score: withCold } = score(ctx, item);

    const warmCtx = makeCtx({
      accountAgeDays: 30,
      totalFeedbackCount: 50,
      profile: ctx.profile,
    });
    const { score: withWarm } = score(warmCtx, item);

    // Warm > Cold since soft-rank dampens the boosts
    expect(withWarm).toBeGreaterThan(withCold);
    // NEW_TO_CITY qualityMultiplier is 1.1 — so base alone is 0.88
    expect(withCold).toBeGreaterThan(0.8 * 1.1); // base alone, before anything
  });

  // 2. IN_A_RUT: unfamiliar category gets novelty boost ≈1.30x
  it("IN_A_RUT multiplies entire score by novelty when item category is unfamiliar", () => {
    const ctx = makeCtx({
      profile: {
        contextSegment: "IN_A_RUT",
        socialStyle: "PASSIVE_SAVER",
        budgetTier: "MODERATE",
        vibePreferences: [],
        aspirationCategories: [],
        version: 1,
      },
      // 10 food engagements, 0 art engagements → fam.ART = 0
      familiarity: { FOOD: 1, ART: 0 },
    });
    const artItem = makeItem({ category: "ART", normalizedQuality: 0.8 });
    const foodItem = makeItem({ category: "FOOD", normalizedQuality: 0.8 });

    const { score: artScore } = score(ctx, artItem);
    const { score: foodScore } = score(ctx, foodItem);

    // ART (unfamiliar) should be boosted ~30% above FOOD (familiar)
    expect(artScore).toBeGreaterThan(foodScore);
    // Specifically: novelty_adj for ART = 1 + (1.30 - 1) × (1 - 0) = 1.30
    //               novelty_adj for FOOD = 1 + (1.30 - 1) × (1 - 1) = 1.00
    expect(artScore / foodScore).toBeCloseTo(1.3, 2);
  });

  // 3. LOCAL_EXPLORER with Hidden Gem preference
  it("LOCAL_EXPLORER gets Hidden Gem bonus from 'Hidden local spots' chip", () => {
    const ctx = makeCtx({
      profile: {
        contextSegment: "LOCAL_EXPLORER",
        socialStyle: "SOLO_EXPLORER",
        budgetTier: "MODERATE",
        vibePreferences: [],
        aspirationCategories: ["Hidden local spots"],
        version: 1,
      },
    });
    const gemItem = makeItem({ itemType: "discovery", isHiddenGem: true });
    const nonGemItem = makeItem({ itemType: "event", isHiddenGem: false });

    const { score: gemScore, reasons: gemReasons } = score(ctx, gemItem);
    const { score: nonGemScore } = score(ctx, nonGemItem);

    expect(gemScore).toBeGreaterThan(nonGemScore);
    expect(gemReasons.some((r) => r.factor === "aspiration_match")).toBe(true);
  });

  // 4. VISITING short-circuits cold-start
  it("VISITING segment skips cold-start even with low feedback + young account", () => {
    const ctx = makeCtx({
      accountAgeDays: 1,
      totalFeedbackCount: 0,
      profile: {
        contextSegment: "VISITING",
        socialStyle: "DIRECT_SHARER",
        budgetTier: "TREAT_YOURSELF",
        vibePreferences: [],
        aspirationCategories: [],
        version: 1,
      },
    });
    const item = makeItem({ tags: ["date-worthy"] }); // Q2 match
    const { reasons } = score(ctx, item);

    // cold_start reason should NOT appear for VISITING
    expect(reasons.some((r) => r.factor === "cold_start")).toBe(false);
    // social_match WOULD have been dampened in cold-start; here it's full
    const social = reasons.find((r) => r.factor === "social_match");
    expect(social?.contribution).toBeCloseTo(RANKING_CONFIG.weights.socialBoost);
  });

  // 5. WANT similarity cap +0.40
  it("WANT similarity contribution caps at +0.40 across many similar items", () => {
    // 5 WANT items each sharing ≥2 tags → raw 5 × 0.25 = 1.25, should cap at 0.40
    const wantItems = Array.from({ length: 5 }, (_, i) => ({
      itemId: `want_${i}`,
      tags: ["jazz", "live-music", "mellow"],
    }));
    const ctx = makeCtx({ wantItems });
    const item = makeItem({ tags: ["jazz", "live-music"] });

    const { reasons } = score(ctx, item);
    const want = reasons.find((r) => r.factor === "want_similarity");
    expect(want?.contribution).toBeCloseTo(0.4);
  });

  // 6. PASS similarity cap -0.50
  it("PASS similarity penalty caps at -0.50", () => {
    const passItems = Array.from({ length: 5 }, (_, i) => ({
      itemId: `pass_${i}`,
      tags: ["sports", "loud", "crowded"],
    }));
    const ctx = makeCtx({ passItems });
    const item = makeItem({ tags: ["sports", "loud"] });

    const { reasons } = score(ctx, item);
    const pass = reasons.find((r) => r.factor === "pass_similarity");
    expect(pass?.contribution).toBeCloseTo(-0.5);
  });

  // 7. Soft-rank toggle at 15 feedback items
  it("exiting cold-start when feedbackCount crosses 15 removes soft-rank dampening", () => {
    const baseCtx = makeCtx({
      accountAgeDays: 10, // age gate is cleared
      profile: {
        contextSegment: "LOCAL_EXPLORER",
        socialStyle: "SOCIAL_CONNECTOR",
        budgetTier: "MODERATE",
        vibePreferences: [{ pair: 1, selected: "A" }],
        aspirationCategories: [],
        version: 1,
      },
    });
    const item = makeItem({ tags: ["group-friendly", "polished"] });

    const { score: softScore } = score({ ...baseCtx, totalFeedbackCount: 14 }, item);
    const { score: normalScore } = score({ ...baseCtx, totalFeedbackCount: 16 }, item);

    // Crossing 15 removes 0.6x dampening → score goes up
    expect(normalScore).toBeGreaterThan(softScore);
  });

  // 8. Zero-profile fallback (legacy user)
  it("null profile produces quality-only score with single 'unprofiled' reason", () => {
    const ctx = makeCtx({ profile: null });
    const item = makeItem({ normalizedQuality: 0.7, tags: ["anything"] });

    const { score: s, reasons } = score(ctx, item);
    expect(s).toBeCloseTo(0.7);
    expect(reasons).toHaveLength(1);
    expect(reasons[0].factor).toBe("unprofiled");
  });

  // 9. All-categories-engaged → novelty neutral
  it("full familiarity makes novelty_adjustment = 1.0 (no multiplier effect)", () => {
    const ctx = makeCtx({
      profile: {
        contextSegment: "IN_A_RUT",
        socialStyle: "SOCIAL_CONNECTOR",
        budgetTier: "MODERATE",
        vibePreferences: [],
        aspirationCategories: [],
        version: 1,
      },
      familiarity: { LIVE_MUSIC: 1.0 },
    });
    const item = makeItem({ category: "LIVE_MUSIC", normalizedQuality: 0.8 });

    const { score: s, reasons } = score(ctx, item);
    // Score should equal base (0.8 * IN_A_RUT's qualityMultiplier 1.0) since
    // no profile boosts match and novelty is neutral.
    expect(s).toBeCloseTo(0.8);
    // novelty reason should not appear when adjustment is 1.0
    expect(reasons.some((r) => r.factor === "novelty")).toBe(false);
  });

  // 10. PASSIVE_SAVER has no ranking effect
  it("PASSIVE_SAVER socialStyle contributes 0 regardless of item tags", () => {
    const ctx = makeCtx({
      profile: {
        contextSegment: "LOCAL_EXPLORER",
        socialStyle: "PASSIVE_SAVER",
        budgetTier: "MODERATE",
        vibePreferences: [],
        aspirationCategories: [],
        version: 1,
      },
    });
    const item = makeItem({
      tags: ["group-friendly", "party", "festival", "date-worthy"], // would fire other styles
    });

    const { reasons } = score(ctx, item);
    const social = reasons.find((r) => r.factor === "social_match");
    // Either absent (no-contribution short-circuit) or zero.
    expect(social?.contribution ?? 0).toBe(0);
  });

  // Bonus: recency boost (48h)
  it("recency_boost fires for items created <48h ago, not for older items", () => {
    const ctx = makeCtx();
    const freshItem = makeItem({ createdAt: FRESH_NOW });
    const oldItem = makeItem({ createdAt: LONG_AGO });

    const { reasons: freshReasons } = score(ctx, freshItem);
    const { reasons: oldReasons } = score(ctx, oldItem);

    expect(freshReasons.some((r) => r.factor === "recency")).toBe(true);
    expect(oldReasons.some((r) => r.factor === "recency")).toBe(false);
  });

  // Bonus: budget filter score adjustments (drop is upstream)
  it("FREE_FOCUSED penalizes MID and boosts FREE/LOW", () => {
    const ctx = makeCtx({
      profile: {
        contextSegment: "LOCAL_EXPLORER",
        socialStyle: "PASSIVE_SAVER",
        budgetTier: "FREE_FOCUSED",
        vibePreferences: [],
        aspirationCategories: [],
        version: 1,
      },
    });
    const freeItem = makeItem({ priceTier: "FREE" });
    const midItem = makeItem({ priceTier: "MID" });
    const { score: freeScore } = score(ctx, freeItem);
    const { score: midScore } = score(ctx, midItem);
    expect(freeScore).toBeGreaterThan(midScore);
  });
});
