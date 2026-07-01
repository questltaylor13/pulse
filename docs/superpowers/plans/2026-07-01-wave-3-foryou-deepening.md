# For-You Feed Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Deepen the personalized "For You" feed with three additive, low-risk changes: an inline "why you're seeing this" line per card, a "Next week" horizon section, and a "starts soon" ranking boost driven by a deterministic `nowMs` threaded through the scoring formula.

**Architecture:** The ranking formula (`lib/ranking/formula.ts`) is a pure function that emits a score plus a `reasons: ScoreReason[]` array; those reasons already reach the client at runtime via `RankedFeedItem` but are erased by the `ForYouSection.items` type. We (a) widen that type so the client can read `reasons`, (b) add a pure `pickCardReason` selector + `computeStartsSoonBoost` term, and (c) extract horizon-bucketing into a pure, testable `bucketByHorizon` so the server `fetchForYouFeed` can add a "Next week" band. All scoring stays pure; `nowMs` is threaded in (default `Date.now()`) so the new time-sensitive boost is deterministic and unit-testable.

**Tech Stack:** Next.js 14.2.10 App Router, Prisma 5.22 + Postgres (Neon), vitest, TypeScript.

## Global Constraints
- TDD: write the failing test first; `tsc --noEmit` + `npm test` + `next build` must stay green.
- Prisma migrations are ADDITIVE + applied to prod MANUALLY via `prisma migrate deploy` (Vercel build only runs `prisma generate && next build`; the consolidated baseline breaks migrate dev's shadow DB — hand-write migration SQL like `prisma/migrations/20260630230000_add_beli_rating`). **This item ships NO schema change** — no migration.
- Hobby plan: daily crons only — no new cron slots; fold into existing crons.
- No new recurring paid services. Precision-first for any matching (a wrong link is worse than none).
- **Item-specific (from the approved design, verbatim):** "Three additive, low-risk changes; scoring stays pure; no new services." The ranking `reasons` **already reach the client at runtime** (`RankedFeedItem` carries `{score, reasons}`); only the `ForYouSection.items` *type* erases them. Widening `ForYouSection.items` ripples — `reasons` is optional so it's backward-compatible; **verify `tsc`**. Keep the `starts_soon` boost small (daily-cron staleness); the boost is **additive** folded into `inner` (consistent with recency — do NOT add a second outer multiplier). The top card reason must **de-prioritize generic factors** (`base_quality`, `unprofiled`, `recency`, `starts_soon`) so a real taste match wins.
- Testing reality: this repo has a client harness (vitest `environment: "happy-dom"`, `@testing-library/react` + `jest-dom` loaded via `vitest.setup.ts`) but **no DB test harness** (no Prisma-backed tests) and, before this work, **no `.test.tsx` files**. Test PURE functions in isolation; verify DB/server-integration parts (`fetchForYouFeed`) via `tsc --noEmit` + `next build` + a manual browser step. Do NOT invent a DB harness.

---

### Task 0: Branch setup

**Files:** none (git only).

- [ ] Confirm clean-ish tree and current branch: `git -C /Users/questtaylor/Documents/apps/pulse-app/pulse status -sb`
- [ ] Create/switch to the Wave 3 feature branch (spec branch is `feature/overhaul-wave-3`): `git -C /Users/questtaylor/Documents/apps/pulse-app/pulse checkout -b feature/overhaul-wave-3 2>/dev/null || git -C /Users/questtaylor/Documents/apps/pulse-app/pulse checkout feature/overhaul-wave-3`

---

### Task 1: Thread a deterministic `nowMs` through `score()` and `computeRecencyBoost`

Pure refactor, zero behavior change. Makes time-sensitive scoring deterministic/testable and unblocks Task 2's boost. `nowMs` is the **last** positional param on `score()` (default `Date.now()`) — no caller passes `configOverride` (verified: only `precompute.ts:76` and `live-rerank.ts:27` call `score`, both as `score(ctx, item)`), so the 4th-arg placement is non-breaking.

**Files:**
- Modify: `lib/ranking/formula.ts` — `score()` signature (~40-44), `computeRecencyBoost` (298-307), the recency call (~96) and the `inner` sum (103-110 unchanged this task).
- Modify: `lib/ranking/precompute.ts` — score call site (~76).
- Modify: `lib/ranking/live-rerank.ts` — `reorderByFreshScore` (19-35).
- Test: `lib/ranking/__tests__/formula.test.ts` (add one determinism test).

**Interfaces:**
- Consumes: `RankingContext`, `RankableItem`, `RankingConfig` (unchanged).
- Produces:
  - `export function score(ctx: RankingContext, item: RankableItem, configOverride?: RankingConfig, nowMs?: number): ScoreResult` (default `nowMs = Date.now()`).
  - `function computeRecencyBoost(item: RankableItem, config: RankingConfig, nowMs: number): { contribution: number; reason: ScoreReason }`.
  - `export function reorderByFreshScore(ctx: RankingContext, rankables: Map<string, RankableItem>, baseline: RankedItem[], nowMs?: number): RankedItem[]` (default `nowMs = Date.now()`).

Steps:

- [ ] **Write failing test.** In `lib/ranking/__tests__/formula.test.ts`, add this test at the end of the `describe("formula.score — 10 locked-decision fixtures", ...)` block (just before its closing `});`):
  ```ts
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
  ```
- [ ] **Run it expecting FAIL** (compile error — `score` currently takes 3 args): `npx vitest run lib/ranking/__tests__/formula.test.ts`
- [ ] **Implement — `score()` signature.** In `lib/ranking/formula.ts`, change the signature (lines ~40-44) from:
  ```ts
  export function score(
    ctx: RankingContext,
    item: RankableItem,
    configOverride?: RankingConfig,
  ): ScoreResult {
  ```
  to:
  ```ts
  export function score(
    ctx: RankingContext,
    item: RankableItem,
    configOverride?: RankingConfig,
    nowMs: number = Date.now(),
  ): ScoreResult {
  ```
- [ ] **Implement — recency call.** In `lib/ranking/formula.ts`, change the recency call (line ~96) from `const recencyBoost = computeRecencyBoost(item, config);` to:
  ```ts
  const recencyBoost = computeRecencyBoost(item, config, nowMs);
  ```
- [ ] **Implement — `computeRecencyBoost`.** Replace the whole function (lines ~298-307) with:
  ```ts
  function computeRecencyBoost(
    item: RankableItem,
    config: RankingConfig,
    nowMs: number,
  ): { contribution: number; reason: ScoreReason } {
    const ageMs = nowMs - item.createdAt.getTime();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    const contribution = ageMs < fortyEightHoursMs ? config.weights.recencyBoost : 0;
    const reason = renderReason("recency", contribution);
    return { contribution, reason };
  }
  ```
- [ ] **Implement — precompute call site.** In `lib/ranking/precompute.ts`, change line ~76 from `const { score: s, reasons } = score(ctx, item);` to (reusing the run-start snapshot `startedAt` as the per-run "now"):
  ```ts
        const { score: s, reasons } = score(ctx, item, undefined, startedAt);
  ```
- [ ] **Implement — live-rerank.** In `lib/ranking/live-rerank.ts`, change `reorderByFreshScore` (lines ~19-28) to accept a `nowMs` param and pass it through:
  ```ts
  export function reorderByFreshScore(
    ctx: RankingContext,
    rankables: Map<string, RankableItem>,
    baseline: RankedItem[],
    nowMs: number = Date.now(),
  ): RankedItem[] {
    const rescored = baseline.map((it) => {
      const rankable = rankables.get(`${it.itemType}:${it.itemId}`);
      if (!rankable) return it;
      const { score: s, reasons } = score(ctx, rankable, undefined, nowMs);
      return { ...it, score: s, reasons };
    });
  ```
  (Leave `lib/ranking/rerank-trigger.ts:36` — `reorderByFreshScore(ctx, rankables, baseline)` — unchanged; the default `Date.now()` supplies the snapshot.)
- [ ] **Run test expecting PASS** (new determinism test green; existing recency test at ~298 still green because the default `nowMs = Date.now()` preserves prior behavior): `npx vitest run lib/ranking/__tests__/formula.test.ts`
- [ ] **Typecheck:** `npx tsc --noEmit`
- [ ] **Commit:** `git -C /Users/questtaylor/Documents/apps/pulse-app/pulse commit -am "Wave 3: thread deterministic nowMs through score() + computeRecencyBoost"`

---

### Task 2: "Starts soon" additive boost (config + pure term + explanation surface)

Adds `weights.startsSoonBoost` (0.08) + a `startsSoon` window config, a pure `computeStartsSoonBoost(item, config, nowMs)`, folds it additively into `inner`, and surfaces the reason (`explanation.ts` renderer + `WhyThisSheet` ⏰ icon). Events only — `startsAt == null` (places/discoveries) contribute 0.

**Files:**
- Modify: `lib/ranking/config.ts` — `weights` block (16-33) + a new `startsSoon` block after it.
- Modify: `lib/ranking/formula.ts` — new `computeStartsSoonBoost` helper, its call (~97), and the `inner` sum (103-110).
- Modify: `lib/ranking/explanation.ts` — `RENDERERS` map (15-41).
- Modify: `components/feedback/WhyThisSheet.tsx` — `iconFor` switch (207-232).
- Test: `lib/ranking/__tests__/formula.test.ts`.

**Interfaces:**
- Consumes: `RankableItem` (`startsAt: Date | null`), `RankingConfig` (`config.weights.startsSoonBoost`, `config.startsSoon.{fullWithinHours, windowHours}`), `nowMs: number`.
- Produces: `function computeStartsSoonBoost(item: RankableItem, config: RankingConfig, nowMs: number): { contribution: number; reason: ScoreReason }`.

Steps:

- [ ] **Write failing test.** In `lib/ranking/__tests__/formula.test.ts`, add this new `describe` block AFTER the existing top-level `describe(...)` closes (end of file), and note it imports the already-present `score`, `makeCtx`, `makeItem`, `RANKING_CONFIG`:
  ```ts
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
  ```
- [ ] **Run it expecting FAIL** (`config.weights.startsSoonBoost` / `config.startsSoon` undefined, no `starts_soon` reason emitted): `npx vitest run lib/ranking/__tests__/formula.test.ts`
- [ ] **Implement — config weight.** In `lib/ranking/config.ts`, inside the `weights` object add after `recencyBoost: 0.05,` (line ~28):
  ```ts
      /** Wave 3 — max additive boost for events starting soon (folded into inner). */
      startsSoonBoost: 0.08,
  ```
- [ ] **Implement — config window.** In `lib/ranking/config.ts`, add a new block immediately after the `weights: { ... },` closing brace (after line ~33, before `strategyPresets`):
  ```ts
    /**
     * Wave 3 — "starts soon" event-timing boost. Full boost within
     * fullWithinHours; linear taper to 0 at windowHours; 0 for past/beyond
     * events and for items with no startsAt (places/discoveries). Kept small
     * because the Hobby daily cron means precomputed scores can be stale.
     */
    startsSoon: {
      fullWithinHours: 24,
      windowHours: 72,
    },
  ```
- [ ] **Implement — the pure helper.** In `lib/ranking/formula.ts`, add this function immediately after `computeRecencyBoost` (after line ~307):
  ```ts
  function computeStartsSoonBoost(
    item: RankableItem,
    config: RankingConfig,
    nowMs: number,
  ): { contribution: number; reason: ScoreReason } {
    if (item.startsAt == null) {
      return { contribution: 0, reason: renderReason("starts_soon", 0) };
    }
    const { fullWithinHours, windowHours } = config.startsSoon;
    const hoursUntil = (item.startsAt.getTime() - nowMs) / (60 * 60 * 1000);
    const max = config.weights.startsSoonBoost;

    let contribution: number;
    if (hoursUntil < 0 || hoursUntil >= windowHours) {
      contribution = 0; // past, or at/beyond the window edge
    } else if (hoursUntil <= fullWithinHours) {
      contribution = max; // full boost inside the "very soon" band
    } else {
      // linear taper: full at fullWithinHours → 0 at windowHours
      contribution = max * ((windowHours - hoursUntil) / (windowHours - fullWithinHours));
    }
    const reason = renderReason("starts_soon", contribution);
    return { contribution, reason };
  }
  ```
- [ ] **Implement — call + reason push.** In `lib/ranking/formula.ts`, immediately after the recency block (after line ~97 `if (recencyBoost.contribution !== 0) reasons.push(recencyBoost.reason);`) add:
  ```ts
    // ---- Starts-soon boost (Wave 3, additive; events only) -----------------
    const startsSoonBoost = computeStartsSoonBoost(item, config, nowMs);
    if (startsSoonBoost.contribution !== 0) reasons.push(startsSoonBoost.reason);
  ```
- [ ] **Implement — fold into `inner`.** In `lib/ranking/formula.ts`, extend the `inner` sum (lines ~103-110) by appending `startsSoonBoost.contribution` as the final additive term:
  ```ts
    const inner =
      base +
      softRank *
        (vibeBoost.contribution + aspirationBoost.contribution + socialBoost.contribution) +
      wantBoost.contribution +
      passPenalty.contribution + // already signed negative when present
      budgetPenalty.contribution +
      recencyBoost.contribution +
      startsSoonBoost.contribution;
  ```
- [ ] **Implement — explanation renderer.** In `lib/ranking/explanation.ts`, add to the `RENDERERS` map (near line ~35, alongside `recency`):
  ```ts
    starts_soon: () => "Happening soon",
  ```
- [ ] **Implement — WhyThisSheet icon.** In `components/feedback/WhyThisSheet.tsx`, add a case to the `iconFor` switch (before `default:` at line ~229):
  ```ts
      case "starts_soon":
        return "⏰";
  ```
- [ ] **Run test expecting PASS:** `npx vitest run lib/ranking/__tests__/formula.test.ts`
- [ ] **Full suite + typecheck** (widened union of reasons must not break other ranking tests): `npm test && npx tsc --noEmit`
- [ ] **Commit:** `git -C /Users/questtaylor/Documents/apps/pulse-app/pulse commit -am "Wave 3: additive starts-soon boost + reason surface (config, formula, explanation, WhyThisSheet)"`

---

### Task 3: `pickCardReason` — the one-line "why you're seeing this" selector

Pure function in `explanation.ts` that returns the single best positive reason for a card, de-prioritizing generic factors so a real taste match wins. Returns `null` when there are no positive reasons.

**Files:**
- Modify: `lib/ranking/explanation.ts` — add `pickCardReason` after `topNegativeReasons` (~74).
- Test: `lib/ranking/__tests__/explanation.test.ts` (new file).

**Interfaces:**
- Consumes: `ScoreReason[]` (`{ factor, contribution, human_readable }`).
- Produces: `export function pickCardReason(reasons: ScoreReason[]): string | null`.

Steps:

- [ ] **Write failing test.** Create `lib/ranking/__tests__/explanation.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { pickCardReason } from "@/lib/ranking/explanation";
  import type { ScoreReason } from "@/lib/ranking/types";

  function r(factor: string, contribution: number, human_readable: string): ScoreReason {
    return { factor, contribution, human_readable };
  }

  describe("pickCardReason", () => {
    it("prefers a real taste match over a higher-contribution generic factor", () => {
      const reasons = [
        r("base_quality", 0.9, "A Pulse favorite"),
        r("vibe_match", 0.24, 'Feels like "cozy"'),
      ];
      expect(pickCardReason(reasons)).toBe('Feels like "cozy"');
    });

    it("returns null when there are no positive reasons", () => {
      const reasons = [r("pass_similarity", -0.5, "Similar to things you've passed on")];
      expect(pickCardReason(reasons)).toBeNull();
    });

    it("falls back to the top generic factor when no taste factor is positive", () => {
      const reasons = [
        r("base_quality", 0.8, "A Pulse favorite"),
        r("recency", 0.05, "Just added — fresh this week"),
        r("starts_soon", 0.08, "Happening soon"),
      ];
      expect(pickCardReason(reasons)).toBe("A Pulse favorite");
    });

    it("among taste factors, picks the highest contribution", () => {
      const reasons = [
        r("vibe_match", 0.1, 'Feels like "cozy"'),
        r("want_similarity", 0.3, "Like a bunch of things you're into"),
        r("base_quality", 0.9, "A Pulse favorite"),
      ];
      expect(pickCardReason(reasons)).toBe("Like a bunch of things you're into");
    });
  });
  ```
- [ ] **Run it expecting FAIL** (`pickCardReason` not exported): `npx vitest run lib/ranking/__tests__/explanation.test.ts`
- [ ] **Implement.** In `lib/ranking/explanation.ts`, add after `topNegativeReasons` (after line ~74):
  ```ts
  /**
   * Wave 3 — the generic factors we de-prioritize when choosing a single
   * "why you're seeing this" card line. They're true but say nothing about
   * the user's taste, so a real match (vibe/aspiration/want/etc.) beats them.
   */
  const GENERIC_CARD_FACTORS = new Set(["base_quality", "unprofiled", "recency", "starts_soon"]);

  /**
   * Pick one card-level "why you're seeing this" line from a reasons array.
   * Returns the highest-contribution POSITIVE reason's human_readable,
   * pushing generic factors to the back so a taste match wins. Returns null
   * when there are no positive reasons (e.g. fallback/unpersonalized items).
   */
  export function pickCardReason(reasons: ScoreReason[]): string | null {
    const positives = reasons.filter((r) => r.contribution > 0);
    if (positives.length === 0) return null;
    const ranked = [...positives].sort((a, b) => {
      const aGeneric = GENERIC_CARD_FACTORS.has(a.factor) ? 1 : 0;
      const bGeneric = GENERIC_CARD_FACTORS.has(b.factor) ? 1 : 0;
      if (aGeneric !== bGeneric) return aGeneric - bGeneric; // taste factors first
      return b.contribution - a.contribution; // then highest contribution
    });
    return ranked[0].human_readable;
  }
  ```
- [ ] **Run test expecting PASS:** `npx vitest run lib/ranking/__tests__/explanation.test.ts`
- [ ] **Typecheck:** `npx tsc --noEmit`
- [ ] **Commit:** `git -C /Users/questtaylor/Documents/apps/pulse-app/pulse commit -am "Wave 3: pickCardReason — one-line why for For-You cards"`

---

### Task 4: `bucketByHorizon` pure helper + "Next week" section

Extract horizon-bucketing out of the `server-only` `fetch-for-you-feed.ts` into a pure, importable module using **half-open** `[lo, hi)` bands (no double-bucketing at boundaries), add a `nextWeek` band `[weekendEnd, weekendEnd+7d)`, extend the outer horizon 14→21d, then wire the `next-week` section into the server feed. The pure helper is unit-tested; the server rewire is verified by `tsc` + `next build` + a manual step.

`endOfTodayLocal` / `upcomingWeekendRange` (from `lib/queries/events.ts`, which only `import type`s Prisma — safe at runtime) and `addDaysDenver` (from `lib/time/denver.ts`, pure Intl) are import-safe in a vitest test.

**Files:**
- Create: `lib/home/for-you-buckets.ts` (pure; NO `server-only`).
- Modify: `components/home/fetch-for-you-feed.ts` — replace local `MixedItem`/`startMs`/inline bucketing (27-33, 49-56, 104-158) with `bucketByHorizon`; widen fallback query window 14→21d (55-56, 78); add `next-week` section (143-150).
- Test: `lib/home/__tests__/for-you-buckets.test.ts` (new file).

**Interfaces:**
- Produces:
  ```ts
  export type ForYouMixedItem =
    | ({ kind: "event"; reasons?: ScoreReason[] } & EventCompact)
    | ({ kind: "place"; reasons?: ScoreReason[] } & PlaceCompact);
  export interface HorizonBuckets {
    tonight: ForYouMixedItem[];
    weekend: ForYouMixedItem[];
    nextWeek: ForYouMixedItem[];
    comingUp: ForYouMixedItem[];
  }
  export function bucketByHorizon(items: ForYouMixedItem[], now: Date): HorizonBuckets;
  ```
- Consumes (in `bucketByHorizon`): `endOfTodayLocal`, `upcomingWeekendRange` from `@/lib/queries/events`; `addDaysDenver` from `@/lib/time/denver`.

Steps:

- [ ] **Write failing test.** Create `lib/home/__tests__/for-you-buckets.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { bucketByHorizon, type ForYouMixedItem } from "@/lib/home/for-you-buckets";
  import { endOfTodayLocal, upcomingWeekendRange } from "@/lib/queries/events";
  import { addDaysDenver } from "@/lib/time/denver";

  // Only kind + id + startTime are read by bucketByHorizon; cast a minimal shape.
  const ev = (id: string, startMs: number): ForYouMixedItem =>
    ({ kind: "event", id, startTime: new Date(startMs).toISOString() } as unknown as ForYouMixedItem);

  describe("bucketByHorizon — half-open bands", () => {
    const now = new Date("2026-06-01T18:00:00Z"); // Mon midday Denver (MDT = UTC-6)
    const eodMs = endOfTodayLocal(now).getTime();
    const { end: wkEnd } = upcomingWeekendRange(now);
    const wkEndMs = wkEnd.getTime();
    const nextWeekEndMs = addDaysDenver(wkEnd, 7).getTime();

    it("puts a tonight event in tonight only", () => {
      const b = bucketByHorizon([ev("t", now.getTime() + 60 * 60 * 1000)], now);
      expect(b.tonight.map((i) => i.id)).toContain("t");
      expect(b.weekend.map((i) => i.id)).not.toContain("t");
    });

    it("an event exactly at the weekend-end boundary lands in nextWeek, not weekend", () => {
      const b = bucketByHorizon([ev("boundary", wkEndMs)], now);
      expect(b.weekend.map((i) => i.id)).not.toContain("boundary");
      expect(b.nextWeek.map((i) => i.id)).toContain("boundary");
    });

    it("an event exactly at the nextWeek-end boundary lands in comingUp, not nextWeek", () => {
      const b = bucketByHorizon([ev("edge", nextWeekEndMs)], now);
      expect(b.nextWeek.map((i) => i.id)).not.toContain("edge");
      expect(b.comingUp.map((i) => i.id)).toContain("edge");
    });

    it("places (no startTime) never enter any event bucket", () => {
      const place = { kind: "place", id: "p1" } as unknown as ForYouMixedItem;
      const b = bucketByHorizon([place], now);
      expect(b.tonight.length + b.weekend.length + b.nextWeek.length + b.comingUp.length).toBe(0);
    });
  });
  ```
- [ ] **Run it expecting FAIL** (module `@/lib/home/for-you-buckets` does not exist): `npx vitest run lib/home/__tests__/for-you-buckets.test.ts`
- [ ] **Implement the pure module.** Create `lib/home/for-you-buckets.ts`:
  ```ts
  import { endOfTodayLocal, upcomingWeekendRange } from "@/lib/queries/events";
  import { addDaysDenver } from "@/lib/time/denver";
  import type { ScoreReason } from "@/lib/ranking/types";
  import type { EventCompact, PlaceCompact } from "./types";

  /**
   * The blended event+place item the For-You feed operates on. Structurally a
   * superset carried at runtime by RankedFeedItem; `reasons` is optional so
   * both the personalized (ranked) and fallback (quality) paths type-check.
   */
  export type ForYouMixedItem =
    | ({ kind: "event"; reasons?: ScoreReason[] } & EventCompact)
    | ({ kind: "place"; reasons?: ScoreReason[] } & PlaceCompact);

  export interface HorizonBuckets {
    tonight: ForYouMixedItem[];
    weekend: ForYouMixedItem[];
    nextWeek: ForYouMixedItem[];
    comingUp: ForYouMixedItem[];
  }

  /**
   * Bucket blended items into time horizons using HALF-OPEN [lo, hi) bands so
   * an event on a boundary lands in exactly one bucket:
   *   tonight  = [now, endOfToday)
   *   weekend  = [max(endOfToday, weekendStart), weekendEnd)
   *   nextWeek = [weekendEnd, weekendEnd + 7d)
   *   comingUp = [weekendEnd + 7d, now + 21d)
   * Places (no startTime) are excluded from all event buckets.
   */
  export function bucketByHorizon(items: ForYouMixedItem[], now: Date): HorizonBuckets {
    const nowMs = now.getTime();
    const eodMs = endOfTodayLocal(now).getTime();
    const { start: wkStart, end: wkEnd } = upcomingWeekendRange(now);
    const wkStartMs = wkStart.getTime();
    const wkEndMs = wkEnd.getTime();
    const nextWeekEndMs = addDaysDenver(wkEnd, 7).getTime();
    const comingUpEndMs = addDaysDenver(now, 21).getTime();

    const events = items.filter((i) => i.kind === "event");

    const startMs = (i: ForYouMixedItem): number | null =>
      i.kind === "event" ? new Date(i.startTime).getTime() : null;

    // half-open [lo, hi)
    const inBand = (i: ForYouMixedItem, lo: number, hi: number): boolean => {
      const t = startMs(i);
      return t !== null && t >= lo && t < hi;
    };

    return {
      tonight: events.filter((e) => inBand(e, nowMs, eodMs)),
      weekend: events.filter((e) => inBand(e, Math.max(eodMs, wkStartMs), wkEndMs)),
      nextWeek: events.filter((e) => inBand(e, wkEndMs, nextWeekEndMs)),
      comingUp: events.filter((e) => inBand(e, nextWeekEndMs, comingUpEndMs)),
    };
  }
  ```
- [ ] **Run test expecting PASS:** `npx vitest run lib/home/__tests__/for-you-buckets.test.ts`
- [ ] **Rewire the server feed — imports.** In `components/home/fetch-for-you-feed.ts`, replace the `@/lib/queries/events` import block (lines ~11-18) and the `addDaysDenver` line (19) so that `bucketByHorizon`/`ForYouMixedItem` are imported and the now-unused window helpers are dropped. New top-of-file imports (keep `activeEventsWhere`, `regionalScopeWhere`, `regionalScopePlaceWhere`, `RegionalScope`; drop `endOfTodayLocal`, `upcomingWeekendRange`):
  ```ts
  import {
    activeEventsWhere,
    regionalScopeWhere,
    regionalScopePlaceWhere,
    type RegionalScope,
  } from "@/lib/queries/events";
  import { addDaysDenver } from "@/lib/time/denver";
  import { bucketByHorizon, type ForYouMixedItem } from "@/lib/home/for-you-buckets";
  ```
  Then DELETE the local `type MixedItem = ...` (27-29) and the `function startMs(...)` (31-33) — they now live in the pure module.
- [ ] **Rewire — time setup + fallback window.** In `fetchForYouFeed`, replace the time-boundary block (lines ~49-56) with just what the server still needs (the fallback query window widens to 21d; bucketByHorizon computes its own bands):
  ```ts
    const now = new Date();
    const horizonEnd = addDaysDenver(now, 21);
  ```
  Change the local var type on line ~63 from `let allItems: MixedItem[];` to `let allItems: ForYouMixedItem[];`. In the fallback `prisma.event.findMany` where-clause (line ~78) change `{ startTime: { gte: now, lte: twoWeeksOut } }` to `{ startTime: { gte: now, lte: horizonEnd } }`.
- [ ] **Rewire — bucketing + sections.** Replace the block from `const events = allItems.filter(...)` through the `comingUp` section push (lines ~104-150) with:
  ```ts
    const { tonight, weekend, nextWeek, comingUp } = bucketByHorizon(allItems, now);
    const places = allItems.filter((i) => i.kind === "place");

    const sections: ForYouSection[] = [];

    if (tonight.length > 0) {
      sections.push({
        id: "tonight",
        title: personalized ? "Tonight, for you" : "Tonight in Denver",
        subtitle: personalized ? "Matched to your taste" : "Happening today",
        items: tonight.slice(0, 12),
      });
    } else {
      // No events tonight — lead with the top blended picks so it never opens empty.
      sections.push({
        id: "top",
        title: personalized ? "Top picks for you" : "Top picks in Denver",
        subtitle: "A mix of events and places to start with",
        items: allItems.slice(0, 12),
      });
    }

    if (weekend.length > 0) {
      sections.push({
        id: "weekend",
        title: "This weekend",
        subtitle: "Plans worth blocking off",
        items: weekend.slice(0, 12),
      });
    }
    if (nextWeek.length > 0) {
      sections.push({
        id: "next-week",
        title: "Next week",
        subtitle: "Get a head start",
        items: nextWeek.slice(0, 12),
      });
    }
    if (comingUp.length > 0) {
      sections.push({
        id: "coming-up",
        title: "Coming up",
        subtitle: "On the calendar soon",
        items: comingUp.slice(0, 12),
      });
    }
  ```
  (The existing `places` section push at ~151-158 and the final `return { sections: sections.filter((s) => s.items.length > 0), ... }` stay as-is — the empty-section filter already hides `next-week` when empty.)
- [ ] **Typecheck** (this is where the `ForYouMixedItem` → `ForYouSection.items` assignment is validated; if `tsc` flags that `ForYouSection.items` lacks `reasons?`, that widening lands in Task 5 — the assignment of a `reasons?`-bearing item into an items-array that doesn't declare `reasons` is still valid, but confirm no error): `npx tsc --noEmit`
- [ ] **Run the pure test again + full suite:** `npm test`
- [ ] **Build check** (server-only module compiles under Next): `npm run build`
- [ ] **Manual/integration verification** (no DB test harness): with a local dev DB that has events spread across the next 3 weeks, load `/` on the For-You tab and confirm a **"Next week"** rail appears between "This weekend" and "Coming up" when populated, and is absent when there are no events in `[weekendEnd, +7d)`.
- [ ] **Commit:** `git -C /Users/questtaylor/Documents/apps/pulse-app/pulse commit -am "Wave 3: pure bucketByHorizon + Next week section, horizon 14→21d"`

---

### Task 5: Widen `ForYouSection.items` with `reasons?`, thread `reasonLine` into the cards, render it

Widen the section-item type so the client can read the `reasons` that already arrive at runtime, compute the card line via `pickCardReason` in `ForYouTabBody` **gated on `data.personalized`**, add a `reasonLine?: string | null` prop to both compact cards, and render one muted `line-clamp-1` row (with a ✨). The RTL render assertion targets `EventCardCompact` (no server-module imports); the pure selection logic is already guaranteed by Task 3.

**Files:**
- Modify: `lib/home/types.ts` — `ForYouSection.items` union (159-167) + a `ScoreReason` type import.
- Modify: `components/home/ForYouTabBody.tsx` — import `pickCardReason`, compute+pass `reasonLine` (44-69).
- Modify: `components/home/EventCardCompact.tsx` — `Props` (16-21), destructure (26-31), render row (after ~87).
- Modify: `components/home/PlaceCardCompact.tsx` — `Props` (12-16), destructure (21-25), render row (after ~80).
- Test: `components/home/__tests__/EventCardCompact.test.tsx` (new file — first `.test.tsx` in the repo; harness already configured via `vitest.config.ts` `environment: "happy-dom"` + `vitest.setup.ts`).

**Interfaces:**
- `ForYouSection.items`: each union member gains `reasons?: ScoreReason[]`.
- `EventCardCompact` / `PlaceCardCompact` Props gain `reasonLine?: string | null`.
- `ForYouTabBody`: `const reasonLine = data.personalized && item.reasons ? pickCardReason(item.reasons) : null;`

Steps:

- [ ] **Write failing test.** Create `components/home/__tests__/EventCardCompact.test.tsx`:
  ```tsx
  import { describe, it, expect } from "vitest";
  import { render, screen } from "@testing-library/react";
  import EventCardCompact from "@/components/home/EventCardCompact";
  import type { EventCompact } from "@/lib/home/types";

  // Full EventCompact shape; enum-typed fields cast through unknown for the fixture.
  const baseEvent = {
    id: "evt_1",
    title: "Jazz at Nocturne",
    category: "LIVE_MUSIC",
    imageUrl: null,
    venueName: "Nocturne",
    neighborhood: "RiNo",
    startTime: new Date().toISOString(),
    priceRange: "$$",
    isEditorsPick: false,
    isRecurring: false,
    noveltyScore: null,
    driveTimeFromDenver: null,
    tags: [],
    oneLiner: null,
    region: "DENVER_METRO",
    townName: null,
    isDayTrip: false,
    isWeekendTrip: false,
    driveNote: null,
    worthTheDriveScore: null,
  } as unknown as EventCompact;

  describe("EventCardCompact reasonLine", () => {
    it("renders the reason line when reasonLine is provided", () => {
      render(<EventCardCompact event={baseEvent} reasonLine={'Feels like "cozy"'} />);
      expect(screen.getByText(/Feels like/)).toBeInTheDocument();
    });

    it("omits the reason line when reasonLine is null", () => {
      render(<EventCardCompact event={baseEvent} reasonLine={null} />);
      expect(screen.queryByText(/Feels like/)).not.toBeInTheDocument();
    });
  });
  ```
- [ ] **Run it expecting FAIL** (`reasonLine` not a prop yet → TS error / no matching text): `npx vitest run components/home/__tests__/EventCardCompact.test.tsx`
- [ ] **Implement — widen the section type.** In `lib/home/types.ts`, add a type import near the top (after line 2 `import type { SeedGuide } from "./seed-guides";`):
  ```ts
  import type { ScoreReason } from "@/lib/ranking/types";
  ```
  Then change `ForYouSection.items` (lines ~163-166) to carry optional reasons on each member:
  ```ts
    items: Array<
      | ({ kind: "event"; reasons?: ScoreReason[] } & EventCompact)
      | ({ kind: "place"; reasons?: ScoreReason[] } & PlaceCompact)
    >;
  ```
- [ ] **Implement — EventCardCompact prop + render.** In `components/home/EventCardCompact.tsx`, add to `Props` (after line ~20 `feedbackStatus?: ItemStatus | null;`):
  ```ts
    /** Wave 3 — one-line "why you're seeing this" (personalized For-You only). */
    reasonLine?: string | null;
  ```
  Add `reasonLine = null,` to the destructured params (after line ~30 `feedbackStatus = null,`). Then render the row in the text block — insert after the `eventSecondaryMeta` block (after line ~87, before the `feedbackStatus === "WANT"` block):
  ```tsx
          {reasonLine && (
            <p className="mt-1 line-clamp-1 text-[12px] text-mute">
              <span aria-hidden>✨ </span>
              {reasonLine}
            </p>
          )}
  ```
- [ ] **Run RTL test expecting PASS:** `npx vitest run components/home/__tests__/EventCardCompact.test.tsx`
- [ ] **Implement — PlaceCardCompact prop + render.** In `components/home/PlaceCardCompact.tsx`, add to `Props` (after line ~15 `feedbackStatus?: ItemStatus | null;`):
  ```ts
    /** Wave 3 — one-line "why you're seeing this" (personalized For-You only). */
    reasonLine?: string | null;
  ```
  Add `reasonLine = null,` to the destructured params (after line ~24 `feedbackStatus = null,`). Render the row after the `VibeTagPill` line (after line ~81, before the `feedbackStatus === "WANT"` block):
  ```tsx
          {reasonLine && (
            <p className="mt-1 line-clamp-1 text-[12px] text-mute">
              <span aria-hidden>✨ </span>
              {reasonLine}
            </p>
          )}
  ```
- [ ] **Implement — wire ForYouTabBody.** In `components/home/ForYouTabBody.tsx`, add the import (after line ~7 `import { type FeedbackMaps, isFilteredFromFeed } from "@/lib/feedback/server";`):
  ```ts
  import { pickCardReason } from "@/lib/ranking/explanation";
  ```
  Replace the `section.items.map(...)` body (lines ~50-66) so it computes `reasonLine` per item (gated on `data.personalized`; the fallback path has no reasons) and passes it to both cards:
  ```tsx
              {section.items.map((item) => {
                const reasonLine =
                  data.personalized && item.reasons ? pickCardReason(item.reasons) : null;
                return item.kind === "event" ? (
                  <EventCardCompact
                    key={`e-${item.id}`}
                    event={item}
                    variant="standard"
                    feedbackStatus={eventStatus(item.id)}
                    reasonLine={reasonLine}
                  />
                ) : (
                  <PlaceCardCompact
                    key={`p-${item.id}`}
                    place={item}
                    variant="standard"
                    feedbackStatus={placeStatus(item.id)}
                    reasonLine={reasonLine}
                  />
                );
              })}
  ```
- [ ] **Full suite + typecheck** (confirm the widened `ForYouSection.items` ripples cleanly — `reasons` is optional so all existing consumers still compile): `npm test && npx tsc --noEmit`
- [ ] **Build check:** `npm run build`
- [ ] **Manual/integration verification:** as a signed-in user with a computed `RankedFeedCache` (personalized feed), load the For-You tab and confirm each card shows one muted ✨ line reflecting a taste match (e.g. "Feels like…", "Like a bunch of things you're into"), and that the full breakdown is still reachable via the card's three-dot menu → "Why am I seeing this?" (`WhyThisSheet`), now including an ⏰ row for `starts_soon` when present. Then load anonymously (fallback path) and confirm NO reason line renders.
- [ ] **Commit:** `git -C /Users/questtaylor/Documents/apps/pulse-app/pulse commit -am "Wave 3: inline 'why you're seeing this' card line (types + cards + ForYouTabBody)"`

---

### Final verification (whole item)

- [ ] Run the full gate green: `npm test && npx tsc --noEmit && npm run build`
- [ ] Adversarial self-diff review before merge (as in Wave 2): `git -C /Users/questtaylor/Documents/apps/pulse-app/pulse diff main...feature/overhaul-wave-3` — confirm scoring stayed pure (no new I/O in `formula.ts`), `nowMs` default preserved backward-compat, `starts_soon` is a single additive `inner` term (no second outer multiplier), the `next-week` band is half-open, and the reason line is gated on `data.personalized`.
- [ ] This item ships as its own commits/PR (spec sequencing: For-You deepening lands first, independent of Items 1 and 3). No migration, no cron change, no new env var, no new service.