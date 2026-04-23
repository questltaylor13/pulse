/**
 * Phase 1 smoke tests for the home-feed pure libs (ranking + category filters).
 * Run: npx tsx scripts/verify-home-libs.ts
 *
 * We don't add a test framework in Phase 1 — scope guardrail. A future
 * phase can migrate these assertions into Vitest or Jest.
 */

import assert from "node:assert/strict";
import { editorialRank, sortByEditorialRank, __internals } from "../lib/ranking";
import {
  RAIL_CATEGORIES,
  eventWhereForCategory,
  placeWhereForCategory,
  isRailCategory,
} from "../lib/home/category-filters";
import {
  activeEventsWhere,
  endOfTodayLocal,
  upcomingWeekendRange,
  OUTSIDE_DENVER_REGIONS,
} from "../lib/queries/events";

const now = new Date("2026-04-16T12:00:00-06:00");

// ---- Ranking ----
{
  const { decayExp, normalizeLog } = __internals;

  assert.equal(decayExp(0, 14), 1, "decay at age 0 is 1");
  assert.ok(decayExp(14, 14) - 0.5 < 1e-9, "half-life decay hits 0.5 at t=14");
  assert.ok(decayExp(28, 14) < 0.3, "decay keeps dropping");
  assert.equal(normalizeLog(0), 0);
  assert.equal(Math.round(normalizeLog(1000) * 100) / 100, 1);
  assert.ok(normalizeLog(10) < 1);

  const picks = {
    id: "1",
    isEditorsPick: true,
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    viewCount: 200,
    saveCount: 50,
  };
  const anon = {
    id: "2",
    isEditorsPick: false,
    createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
    viewCount: 5,
    saveCount: 0,
  };
  assert.ok(
    editorialRank(picks, { now }) > editorialRank(anon, { now }),
    "editor's pick outranks anonymous stale"
  );

  const ranked = sortByEditorialRank([anon, picks], { now });
  assert.equal(ranked[0]?.id, "1", "sort places pick first");

  console.log("✓ ranking.ts");
}

// ---- Category filters ----
{
  assert.deepEqual(RAIL_CATEGORIES.length, 9, "9 rail categories");
  assert.ok(isRailCategory("weird"));
  assert.ok(!isRailCategory("bogus"));
  assert.ok(!isRailCategory(null));

  const all = eventWhereForCategory("all");
  assert.deepEqual(all, {}, "all returns {}");

  const music = eventWhereForCategory("music");
  assert.equal((music as any).category, "LIVE_MUSIC");

  const food = eventWhereForCategory("food");
  assert.deepEqual((food as any).category.in, ["FOOD", "RESTAURANT", "BARS", "COFFEE"]);

  const weird = eventWhereForCategory("weird") as any;
  assert.ok(Array.isArray(weird.OR), "weird uses OR");
  assert.equal(weird.OR[1].noveltyScore.gte, 7, "weird uses >=7 threshold (Int schema)");

  // Places variant
  const pFood = placeWhereForCategory("food") as any;
  assert.deepEqual(pFood.category.in, ["FOOD", "RESTAURANT", "BARS", "COFFEE"]);

  console.log("✓ category-filters.ts");
}

// ---- Event queries ----
{
  const where = activeEventsWhere(now) as any;
  assert.equal(where.isArchived, false);
  assert.equal(where.status, "PUBLISHED");
  assert.ok(Array.isArray(where.OR));

  const eod = endOfTodayLocal(now);
  assert.equal(eod.getHours(), 23);

  const { start, end } = upcomingWeekendRange(now); // Thursday input
  assert.equal(start.getDay(), 5, "weekend starts Friday");
  assert.ok(end > start);
  assert.equal((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) > 2, true);

  // Saturday input should collapse to the same weekend
  const saturday = new Date("2026-04-18T14:00:00-06:00");
  const { start: s2 } = upcomingWeekendRange(saturday);
  assert.equal(s2.getDate(), 17, "from saturday we still anchor to friday");

  assert.ok(OUTSIDE_DENVER_REGIONS.includes("Boulder"));
  assert.ok(OUTSIDE_DENVER_REGIONS.includes("Idaho Springs"));

  console.log("✓ queries/events.ts");
}

console.log("\nAll Phase 1 home-lib assertions passed.");
