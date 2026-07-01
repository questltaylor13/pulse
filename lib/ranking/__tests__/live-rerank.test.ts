/**
 * Wave 2 — live re-rank pure-core tests.
 */

import { describe, it, expect } from "vitest";
import {
  reorderByFreshScore,
  withinCoalesceWindow,
} from "@/lib/ranking/live-rerank";
import type {
  RankableItem,
  RankedItem,
  RankingContext,
} from "@/lib/ranking/types";

const LONG_AGO = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);

function makeRankable(overrides: Partial<RankableItem> = {}): RankableItem {
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
    totalFeedbackCount: 50, // warm — no cold-start dampening
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

describe("reorderByFreshScore", () => {
  it("promotes an item that now matches a fresh WANT signal above a higher-baseline item", () => {
    // A shares 2 tags with a WANT item → +want boost; B shares none, despite
    // slightly higher base quality.
    const rankables = new Map<string, RankableItem>([
      ["event:A", makeRankable({ itemId: "A", tags: ["jazz", "live-music", "intimate"], normalizedQuality: 0.7 })],
      ["event:B", makeRankable({ itemId: "B", tags: ["sports"], category: "SPORTS", normalizedQuality: 0.75 })],
    ]);
    const ctx = makeCtx({
      wantItems: [{ itemId: "other", tags: ["jazz", "live-music", "cozy"] }],
    });

    // Baseline has B ranked ABOVE A (stale order).
    const baseline: RankedItem[] = [
      { itemType: "event", itemId: "B", score: 0.9, reasons: [] },
      { itemType: "event", itemId: "A", score: 0.1, reasons: [] },
    ];

    const out = reorderByFreshScore(ctx, rankables, baseline);
    expect(out.map((x) => x.itemId)).toEqual(["A", "B"]);
    // Scores were replaced with fresh values (not the stale 0.9 / 0.1).
    expect(out[0].score).not.toBe(0.1);
  });

  it("keeps prior score + serendipity flag for items missing from the rankables map", () => {
    const rankables = new Map<string, RankableItem>([
      ["event:A", makeRankable({ itemId: "A", normalizedQuality: 0.9 })],
    ]);
    const ctx = makeCtx();
    const baseline: RankedItem[] = [
      { itemType: "event", itemId: "A", score: 0.2, reasons: [] },
      { itemType: "place", itemId: "C", score: 0.5, reasons: [], isSerendipity: true },
    ];

    const out = reorderByFreshScore(ctx, rankables, baseline);
    const c = out.find((x) => x.itemId === "C");
    expect(c?.score).toBe(0.5); // untouched — not hydrated
    expect(c?.isSerendipity).toBe(true); // flag preserved
  });

  it("is a stable sort when scores tie", () => {
    const ctx = makeCtx();
    const baseline: RankedItem[] = [
      { itemType: "event", itemId: "X", score: 0.4, reasons: [] },
      { itemType: "event", itemId: "Y", score: 0.4, reasons: [] },
    ];
    // Empty rankables → all keep their score → order preserved.
    const out = reorderByFreshScore(ctx, new Map(), baseline);
    expect(out.map((x) => x.itemId)).toEqual(["X", "Y"]);
  });
});

describe("withinCoalesceWindow", () => {
  const WINDOW = 45_000;
  it("never skips when the cache has never been computed", () => {
    expect(withinCoalesceWindow(null, 1_000_000, WINDOW)).toBe(false);
  });
  it("skips when a compute happened inside the window", () => {
    const now = 1_000_000;
    expect(withinCoalesceWindow(now - 10_000, now, WINDOW)).toBe(true);
  });
  it("does not skip once the window has elapsed", () => {
    const now = 1_000_000;
    expect(withinCoalesceWindow(now - 60_000, now, WINDOW)).toBe(false);
  });
});
