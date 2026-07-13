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

  // 5b. Graduated WANT similarity — a single shared tag now counts partially
  //     (Wave 2 cold-start softening), where before it was worth nothing.
  it("WANT similarity gives partial credit for exactly one shared tag", () => {
    const ctxOne = makeCtx({ wantItems: [{ itemId: "w1", tags: ["jazz", "mellow"] }] });
    const itemOne = makeItem({ tags: ["jazz", "loud"] }); // overlap 1 → half
    const wantOne = score(ctxOne, itemOne).reasons.find((r) => r.factor === "want_similarity");
    expect(wantOne?.contribution).toBeCloseTo(0.125); // 0.25 × 0.5

    const ctxTwo = makeCtx({ wantItems: [{ itemId: "w2", tags: ["jazz", "mellow"] }] });
    const itemTwo = makeItem({ tags: ["jazz", "mellow"] }); // overlap 2 → full
    const wantTwo = score(ctxTwo, itemTwo).reasons.find((r) => r.factor === "want_similarity");
    expect(wantTwo?.contribution).toBeCloseTo(0.25);
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

  // 7. Soft-rank toggle at the feedback threshold (threshold-agnostic — reads
  //    the configured value so Wave 2's softening didn't hardcode-break it).
  it("exiting cold-start when feedbackCount crosses the threshold removes soft-rank dampening", () => {
    const baseCtx = makeCtx({
      accountAgeDays: 10, // age gate is cleared (>= softRankDays)
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
    const threshold = RANKING_CONFIG.coldStart.softRankFeedbackThreshold;

    const { score: softScore } = score({ ...baseCtx, totalFeedbackCount: threshold - 2 }, item);
    const { score: normalScore } = score({ ...baseCtx, totalFeedbackCount: threshold + 2 }, item);

    // Crossing the threshold removes soft-rank dampening → score goes up
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

  // Wave 3: injected nowMs makes recency deterministic (no reliance on Date.now()).
  it("recency_boost is deterministic when nowMs is injected", () => {
    const ctx = makeCtx();
    const injectedNow = new Date("2026-06-01T12:00:00Z").getTime();
    const freshItem = makeItem({ createdAt: new Date(injectedNow - 60 * 60 * 1000) }); // 1h before
    const staleItem = makeItem({
      createdAt: new Date(injectedNow - 100 * 24 * 60 * 60 * 1000), // 100d before
    });

    const fresh = score(ctx, freshItem, undefined, injectedNow);
    const stale = score(ctx, staleItem, undefined, injectedNow);

    expect(fresh.reasons.some((r) => r.factor === "recency")).toBe(true);
    expect(stale.reasons.some((r) => r.factor === "recency")).toBe(false);
  });
});

describe("formula.score — starts-soon boost (Wave 3)", () => {
  const NOW = new Date("2026-06-01T12:00:00Z").getTime();
  const HOUR = 60 * 60 * 1000;
  const soonReason = (item: ReturnType<typeof makeItem>) =>
    score(makeCtx(), item, undefined, NOW).reasons.find((r) => r.factor === "starts_soon");

  it("gives full boost for an event within 24h", () => {
    const r = soonReason(makeItem({ startsAt: new Date(NOW + 2 * HOUR) }));
    expect(r?.contribution).toBeCloseTo(RANKING_CONFIG.weights.startsSoonBoost);
  });

  it("gives a partial boost at 48h (halfway through the 24–72h taper)", () => {
    const r = soonReason(makeItem({ startsAt: new Date(NOW + 48 * HOUR) }));
    // taper fraction = (72 - 48) / (72 - 24) = 0.5
    expect(r?.contribution).toBeCloseTo(RANKING_CONFIG.weights.startsSoonBoost * 0.5);
  });

  it("gives no boost beyond 72h and none when startsAt is null", () => {
    const far = makeItem({ startsAt: new Date(NOW + 10 * 24 * HOUR) });
    const place = makeItem({ startsAt: null });
    expect(score(makeCtx(), far, undefined, NOW).reasons.some((r) => r.factor === "starts_soon")).toBe(false);
    expect(score(makeCtx(), place, undefined, NOW).reasons.some((r) => r.factor === "starts_soon")).toBe(false);
  });

  it("decays monotonically across the taper window", () => {
    const c = (h: number) => soonReason(makeItem({ startsAt: new Date(NOW + h * HOUR) }))?.contribution ?? 0;
    expect(c(30)).toBeGreaterThan(c(48));
    expect(c(48)).toBeGreaterThan(c(60));
  });

  it("boosts the total score of a soon event over an identical far event", () => {
    const soon = makeItem({ startsAt: new Date(NOW + 2 * HOUR) });
    const far = makeItem({ startsAt: new Date(NOW + 10 * 24 * HOUR) });
    expect(score(makeCtx(), soon, undefined, NOW).score).toBeGreaterThan(
      score(makeCtx(), far, undefined, NOW).score,
    );
  });
});

// ---------------------------------------------------------------------------
// Wave 4 Rate & Rank — loved/disliked similarity + rated category affinity
// ---------------------------------------------------------------------------

describe("formula.score — Wave 4 rank-engine signals", () => {
  // Neutralize novelty (familiarity 1.0 → multiplier 1.0) so deltas read raw.
  const famCtx = { familiarity: { LIVE_MUSIC: 1 } };
  const ITEM_TAGS = ["jazz", "cocktail-bar"];

  it("regression guard: empty rank signals leave scores byte-identical", () => {
    const item = makeItem({ tags: ITEM_TAGS });
    const without = score(makeCtx(famCtx), item);
    const withEmpty = score(
      makeCtx({
        ...famCtx,
        lovedItems: [],
        dislikedItems: [],
        ratedCategoryAffinity: {},
      }),
      item,
    );
    expect(withEmpty.score).toBe(without.score);
    expect(withEmpty.reasons).toEqual(without.reasons);
  });

  it("loved similarity boosts tag-similar items, weighted by the loved score", () => {
    const item = makeItem({ tags: ITEM_TAGS });
    const baseline = score(makeCtx(famCtx), item).score;

    const loved9 = score(
      makeCtx({
        ...famCtx,
        lovedItems: [{ itemId: "pl_ratio", tags: ITEM_TAGS, score: 9, title: "Ratio" }],
      }),
      item,
    );
    // per-match 0.35 × overlapWeight(2 shared → 1) × (0.4 + 0.6×9/10)
    expect(loved9.score - baseline).toBeCloseTo(0.35 * 0.94, 5);
    expect(loved9.reasons.some((r) => r.factor === "loved_similarity")).toBe(true);

    const loved5 = score(
      makeCtx({
        ...famCtx,
        lovedItems: [{ itemId: "pl_meh", tags: ITEM_TAGS, score: 5, title: "Meh" }],
      }),
      item,
    );
    expect(loved9.score).toBeGreaterThan(loved5.score);
  });

  it("caps loved similarity at +0.60 (outranks wantSim's +0.40)", () => {
    const item = makeItem({ tags: ITEM_TAGS });
    const baseline = score(makeCtx(famCtx), item).score;
    const manyLoved = score(
      makeCtx({
        ...famCtx,
        lovedItems: [
          { itemId: "a", tags: ITEM_TAGS, score: 10, title: "A" },
          { itemId: "b", tags: ITEM_TAGS, score: 10, title: "B" },
          { itemId: "c", tags: ITEM_TAGS, score: 10, title: "C" },
        ],
      }),
      item,
    );
    expect(manyLoved.score - baseline).toBeCloseTo(0.6, 5);
  });

  it("ignores self-matches by itemId", () => {
    const item = makeItem({ itemId: "evt_self", tags: ITEM_TAGS });
    const baseline = score(makeCtx(famCtx), item).score;
    const withSelf = score(
      makeCtx({
        ...famCtx,
        lovedItems: [{ itemId: "evt_self", tags: ITEM_TAGS, score: 10, title: "Self" }],
      }),
      item,
    );
    expect(withSelf.score).toBe(baseline);
  });

  it("disliked similarity penalizes, weighted by inverse score, capped at −0.60", () => {
    const item = makeItem({ tags: ITEM_TAGS });
    const baseline = score(makeCtx(famCtx), item).score;
    const disliked = score(
      makeCtx({
        ...famCtx,
        dislikedItems: [{ itemId: "pl_bad", tags: ITEM_TAGS, score: 1, title: "Bad" }],
      }),
      item,
    );
    // 0.35 × 1 × (0.4 + 0.6×(10−1)/10) = 0.35 × 0.94, negative
    expect(disliked.score - baseline).toBeCloseTo(-0.35 * 0.94, 5);
    expect(disliked.reasons.some((r) => r.factor === "disliked_similarity")).toBe(true);

    const manyDisliked = score(
      makeCtx({
        ...famCtx,
        dislikedItems: [
          { itemId: "a", tags: ITEM_TAGS, score: 0.5, title: "A" },
          { itemId: "b", tags: ITEM_TAGS, score: 0.5, title: "B" },
          { itemId: "c", tags: ITEM_TAGS, score: 0.5, title: "C" },
        ],
      }),
      item,
    );
    expect(manyDisliked.score - baseline).toBeCloseTo(-0.6, 5);
  });

  it("applies signed rated-category affinity at ±0.25 weight", () => {
    const item = makeItem({ tags: ITEM_TAGS }); // category LIVE_MUSIC
    const baseline = score(makeCtx(famCtx), item).score;
    const positive = score(
      makeCtx({ ...famCtx, ratedCategoryAffinity: { LIVE_MUSIC: 1 } }),
      item,
    );
    expect(positive.score - baseline).toBeCloseTo(0.25, 5);

    const negative = score(
      makeCtx({ ...famCtx, ratedCategoryAffinity: { LIVE_MUSIC: -0.5 } }),
      item,
    );
    expect(negative.score - baseline).toBeCloseTo(-0.125, 5);
    expect(negative.reasons.some((r) => r.factor === "category_affinity")).toBe(true);
  });

  it("loved why-line names the loved item", () => {
    const item = makeItem({ tags: ITEM_TAGS });
    const result = score(
      makeCtx({
        ...famCtx,
        lovedItems: [{ itemId: "pl_ratio", tags: ITEM_TAGS, score: 9.4, title: "Ratio Beerworks" }],
      }),
      item,
    );
    const loved = result.reasons.find((r) => r.factor === "loved_similarity");
    expect(loved?.human_readable).toContain("Ratio Beerworks");
  });
});

describe("formula.score — Wave 5 social signal", () => {
  // Neutralize novelty (familiarity 1.0 → multiplier 1.0) so deltas read raw.
  const famCtx = { familiarity: { LIVE_MUSIC: 1 } };
  const ITEM_TAGS = ["jazz", "cocktail-bar"];

  it("regression guard: empty social signals leave scores byte-identical", () => {
    // This is what enforces the SOCIAL_V1_ENABLED flag-off invariant: with no
    // follows (or the flag off, which yields the same empty set), the formula
    // must produce exactly the pre-Wave-5 score AND the pre-Wave-5 reasons.
    const item = makeItem({ tags: ITEM_TAGS });
    const without = score(makeCtx(famCtx), item);
    const withEmpty = score(
      makeCtx({ ...famCtx, followedLovedItems: [] }),
      item,
    );
    expect(withEmpty.score).toBe(without.score);
    expect(withEmpty.reasons).toEqual(without.reasons);
  });

  it("a direct hit — someone you follow loved THIS item — drives the boost", () => {
    const item = makeItem({ itemId: "pl_tacos", tags: ITEM_TAGS });
    const baseline = score(makeCtx(famCtx), item).score;

    const direct = score(
      makeCtx({
        ...famCtx,
        followedLovedItems: [
          { itemId: "pl_tacos", tags: [], score: 9, followerName: "Alex" },
        ],
      }),
      item,
    );

    // Direct match 0.5 × ratedScoreWeight(9) = 0.5 × 0.94, capped at 0.20.
    expect(direct.score - baseline).toBeCloseTo(0.2, 5);
    expect(
      direct.reasons.some((r) => r.factor === "followed_loved_direct"),
    ).toBe(true);
  });

  it("tag overlap is the weaker fallback, and a direct hit beats it", () => {
    const item = makeItem({ itemId: "pl_target", tags: ITEM_TAGS });
    const baseline = score(makeCtx(famCtx), item).score;

    // Followed user loved a *different* item that shares tags.
    const overlap = score(
      makeCtx({
        ...famCtx,
        followedLovedItems: [
          { itemId: "pl_other", tags: ITEM_TAGS, score: 9, followerName: "Alex" },
        ],
      }),
      item,
    );
    const direct = score(
      makeCtx({
        ...famCtx,
        followedLovedItems: [
          { itemId: "pl_target", tags: [], score: 9, followerName: "Alex" },
        ],
      }),
      item,
    );

    expect(overlap.score).toBeGreaterThan(baseline);
    expect(direct.score).toBeGreaterThan(overlap.score);
  });

  it("caps at +0.20 — deliberately below wantSim's +0.40", () => {
    // A friend's verdict is weaker evidence about YOUR taste than your own
    // stated interest, so no number of follows can outweigh a WANT.
    const item = makeItem({ tags: ITEM_TAGS });
    const baseline = score(makeCtx(famCtx), item).score;

    const many = score(
      makeCtx({
        ...famCtx,
        followedLovedItems: Array.from({ length: 20 }, (_, i) => ({
          itemId: `pl_${i}`,
          tags: ITEM_TAGS,
          score: 10,
          followerName: `Friend ${i}`,
        })),
      }),
      item,
    );

    expect(many.score - baseline).toBeCloseTo(RANKING_CONFIG.weights.followedLovedSimilarity, 5);
    expect(many.score - baseline).toBeLessThan(RANKING_CONFIG.weights.interestedSimilarity);
  });

  it("weights a match by how strongly the follower rated it", () => {
    const item = makeItem({ itemId: "pl_x", tags: ITEM_TAGS });
    const strong = score(
      makeCtx({
        ...famCtx,
        followedLovedItems: [
          { itemId: "pl_other", tags: ITEM_TAGS, score: 10, followerName: "Alex" },
        ],
      }),
      item,
    ).score;
    const weak = score(
      makeCtx({
        ...famCtx,
        followedLovedItems: [
          { itemId: "pl_other", tags: ITEM_TAGS, score: 5, followerName: "Alex" },
        ],
      }),
      item,
    ).score;

    expect(strong).toBeGreaterThan(weak);
  });

  it("the why-line names the follower on a direct hit", () => {
    const item = makeItem({ itemId: "pl_tacos", tags: ITEM_TAGS });
    const result = score(
      makeCtx({
        ...famCtx,
        followedLovedItems: [
          { itemId: "pl_tacos", tags: [], score: 9.4, followerName: "Alex Rivera" },
        ],
      }),
      item,
    );
    const social = result.reasons.find((r) => r.factor === "followed_loved_direct");
    expect(social?.human_readable).toContain("Alex Rivera");
    expect(social?.human_readable).toContain("loved this");
  });

  it("never claims a follower loved THIS item when they only loved a similar one", () => {
    // The honesty constraint: "Alex loved this" on a tag-overlap match is a
    // false claim, and this wave exists to stop the feed making those.
    const item = makeItem({ itemId: "pl_target", tags: ITEM_TAGS });
    const result = score(
      makeCtx({
        ...famCtx,
        followedLovedItems: [
          { itemId: "pl_other", tags: ITEM_TAGS, score: 9, followerName: "Alex" },
        ],
      }),
      item,
    );

    expect(result.reasons.some((r) => r.factor === "followed_loved_direct")).toBe(false);
    const social = result.reasons.find((r) => r.factor === "followed_loved_similarity");
    expect(social).toBeDefined();
    expect(social?.human_readable).not.toContain("loved this");
  });
});
