import { describe, it, expect } from "vitest";
import { injectSerendipity } from "@/lib/ranking/serendipity";
import type { RankableItem, RankedItem, RankingContext } from "@/lib/ranking/types";

function makeRanked(id: string, score = 0.9, category = "LIVE_MUSIC"): RankedItem {
  return { itemType: "event", itemId: id, score, reasons: [] };
}

function makePool(id: string, overrides: Partial<RankableItem> = {}): RankableItem {
  return {
    itemType: "event",
    itemId: id,
    normalizedQuality: 0.8,
    priceTier: "MID",
    tags: [],
    category: "LIVE_MUSIC",
    region: "DENVER_METRO",
    createdAt: new Date(),
    startsAt: null,
    isHiddenGem: false,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<RankingContext> = {}): RankingContext {
  return {
    userId: "u1",
    accountAgeDays: 30,
    totalFeedbackCount: 50,
    profile: null,
    wantItems: [],
    passItems: [],
    doneItemIds: new Set(),
    familiarity: {},
    variant: "control",
    ...overrides,
  };
}

describe("injectSerendipity", () => {
  it("returns input unchanged when pool has no serendipity candidates", () => {
    const ranked = [makeRanked("r1"), makeRanked("r2"), makeRanked("r3")];
    const pool = ranked.map((r) => makePool(r.itemId));
    const out = injectSerendipity(ranked, pool, makeCtx());
    expect(out).toHaveLength(ranked.length);
    expect(out.every((o) => !o.isSerendipity)).toBe(true);
  });

  it("injects serendipity at interval N starting from firstSlot", () => {
    const ranked = Array.from({ length: 20 }, (_, i) => makeRanked(`r${i}`));
    const pool = [
      ...ranked.map((r) => makePool(r.itemId)),
      makePool("s1", { category: "ART", isHiddenGem: true }),
      makePool("s2", { category: "OUTDOORS", isHiddenGem: true }),
      makePool("s3", { category: "FOOD", isHiddenGem: true }),
      makePool("s4", { category: "COFFEE", isHiddenGem: true }),
    ];
    const out = injectSerendipity(ranked, pool, makeCtx());
    // Default interval=5, firstSlot=4 → slots 4, 9, 14, 19 are serendipity
    expect(out[4].isSerendipity).toBe(true);
    expect(out[9].isSerendipity).toBe(true);
    expect(out[14].isSerendipity).toBe(true);
    // Non-serendipity slots should preserve original ranked order
    expect(out[0].itemId).toBe("r0");
    expect(out[1].itemId).toBe("r1");
  });

  it("prefers Hidden Gems when preferHiddenGems=true (at comparable quality)", () => {
    // Gem gets +0.3 fitness bonus; test uses equal base quality so the
    // bonus can actually tip the choice. The config is "prefer", not
    // "always override" — outsized quality differences should still win.
    const ranked = Array.from({ length: 5 }, (_, i) => makeRanked(`r${i}`));
    const pool = [
      ...ranked.map((r) => makePool(r.itemId)),
      makePool("plain", { category: "FOOD", normalizedQuality: 0.8 }),
      makePool("gem", { category: "ART", isHiddenGem: true, normalizedQuality: 0.8 }),
    ];
    const out = injectSerendipity(ranked, pool, makeCtx());
    const sLabel = out.find((o) => o.isSerendipity);
    expect(sLabel?.itemId).toBe("gem");
  });

  it("avoids placing two adjacent serendipity slots in the same category", () => {
    const ranked = Array.from({ length: 15 }, (_, i) => makeRanked(`r${i}`, 0.9, "LIVE_MUSIC"));
    const pool = [
      ...ranked.map((r) => makePool(r.itemId, { category: "LIVE_MUSIC" })),
      makePool("s_art_1", { category: "ART", isHiddenGem: true }),
      makePool("s_art_2", { category: "ART", isHiddenGem: true }),
      makePool("s_food", { category: "FOOD", isHiddenGem: true }),
    ];
    const out = injectSerendipity(ranked, pool, makeCtx());
    const sCats = out.filter((o) => o.isSerendipity).map((o) => {
      // find the pool item by id
      return pool.find((p) => p.itemId === o.itemId)?.category;
    });
    // Should not have two adjacent ART entries
    for (let i = 1; i < sCats.length; i++) {
      expect(sCats[i] === "ART" && sCats[i - 1] === "ART").toBe(false);
    }
  });

  it("boosts categories the user has engaged with least", () => {
    const ranked = Array.from({ length: 5 }, (_, i) => makeRanked(`r${i}`));
    const pool = [
      ...ranked.map((r) => makePool(r.itemId)),
      makePool("familiar", { category: "FOOD", isHiddenGem: false }),
      makePool("unfamiliar", { category: "ART", isHiddenGem: false }),
    ];
    // User has heavy familiarity with FOOD, none with ART
    const ctx = makeCtx({ familiarity: { FOOD: 0.9, ART: 0 } });
    const out = injectSerendipity(ranked, pool, ctx);
    const serendipity = out.find((o) => o.isSerendipity);
    expect(serendipity?.itemId).toBe("unfamiliar");
  });

  it("marks serendipity picks with isSerendipity=true and a 'serendipity' reason", () => {
    const ranked = Array.from({ length: 5 }, (_, i) => makeRanked(`r${i}`));
    const pool = [
      ...ranked.map((r) => makePool(r.itemId)),
      makePool("s1", { category: "ART", isHiddenGem: true }),
    ];
    const out = injectSerendipity(ranked, pool, makeCtx());
    const s = out.find((o) => o.isSerendipity);
    expect(s).toBeDefined();
    expect(s?.reasons.some((r) => r.factor === "serendipity")).toBe(true);
  });
});
