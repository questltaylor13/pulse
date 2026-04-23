# PRD 6 Matching Engine — Verification Checklist

**Date:** 2026-04-23
**Branch:** prd6-matching-engine
**Status:** Phases 0–8 shipped on branch; awaiting merge + prod rollout.

---

## Merge order

All 9 phases stack on a single branch (`prd6-matching-engine`). One
umbrella PR → `main` with rebase-merge to preserve per-phase commits,
matching the PRD 5 merge pattern.

Commits (pre-rebase SHAs):

1. `bf778cc` — `PRD 6: add matching-engine.md spec`
2. `6119b99` — `PRD 6 Pre-Phase 0: vitest test infrastructure`
3. `cd9b9ee` — `PRD 6 Phase 0: schema + lib/ranking/ scaffolding`
4. `078b3b2` — `PRD 6 Phase 1: pure formula + normalizers + candidate pool + tests`
5. `885b3e0` — `PRD 6 Phase 2: precompute cron + cache + home-rail rewire`
6. `a2f2738` — `PRD 6 Phase 3: serendipity injection`
7. `8c7054e` — `PRD 6 Phase 4: "Why am I seeing this?" surface`
8. `db084ad` — `PRD 6 Phase 5: "Outside your usual" rail`
9. `fab9b33` — `PRD 6 Phase 6: A/B variant plumbing`
10. `9679ad9` — `PRD 6 Phase 7: fallback + observability`
11. (this commit) — `PRD 6 Phase 8: verification docs + bench`

---

## Pre-merge — automated checks

Run locally before opening the PR:

- [ ] `npx tsc --noEmit` — clean
- [ ] `npm run test` — vitest 40/40 passing
- [ ] `npm run build` — next build clean, no warnings about circular imports
- [ ] `git diff main..HEAD --stat` — surface any surprises

---

## Post-merge — infrastructure

Once the PR lands and main deploys:

- [ ] `npx prisma migrate deploy` — `20260423150000_prd6_ranking_cache`
      applies cleanly. Verify via `SELECT column_name FROM
      information_schema.columns WHERE table_name = 'RankedFeedCache';`
      that all 6 columns + the userId FK exist.
- [ ] Existing users backfilled to `rankingVariant = 'control'` by
      default via the column default. Spot-check 3 random users.
- [ ] `UserProfile.version = 1` on all existing rows (default).

---

## Cron smoke tests

Each ranking cron requires `CRON_SECRET` bearer auth and should
return `{success: true}` with a reasonable body.

- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/ranking/precompute`
      → `{success, queued, processed, skipped, errored, partialCompletion,
      durationMs}` within 60s.
- [ ] After the first run, `SELECT COUNT(*) FROM "RankedFeedCache";`
      returns > 0.
- [ ] `SELECT COUNT(*) FROM "RankingRun";` returns > 0.
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/ranking/sanity`
      → `{success, cachesChecked, warnings, serendipity, segmentOverlap}`.
      First run expected to report `cachesChecked=0` or similar warning
      until precompute populates data.
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/cleanup-ranking-runs`
      → `{success, deleted}`. First run: `deleted=0` (no 14-day-old rows yet).
- [ ] Hit the precompute endpoint without a bearer token → 401. Confirms
      auth gate works.

---

## Cache coverage

After the precompute cron has run at least 4 times (4 hours):

- [ ] `/admin/ranking` shows >95% of users with fresh cache.
- [ ] "Oldest cache" tile shows <4h.
- [ ] No fallback incidents in the 7d tile.

---

## Smoke tests — user-facing (with `RANKING_V2_ENABLED=true`)

Requires dogfood flag on for Quest's user ID.

### Home rail personalization

- [ ] Log in as a user with >15 feedback items. Load `/`.
  - [ ] Page renders within 300ms (p95 target 200ms).
  - [ ] "This weekend's picks" items are NOT in `editorialRank` order
        but in a user-specific order. Diff vs `RANKING_V2_ENABLED=false`
        should be visible.
  - [ ] "Outside the city" items re-ordered too.
- [ ] Load `/` as a different user with a different profile. Top items
      differ.
- [ ] Log out. Load `/`. Rails fall back to universal order (no
      personalization). Verify by comparing to legacy SHA.

### "Outside your usual" rail

- [ ] With `OUTSIDE_USUAL_ENABLED=true` and user has ≥5 feedback:
  - [ ] Rail renders between "Just added on Pulse" and "Outside the
        city" on Events tab.
  - [ ] Each card shows a "Stretch" pill.
  - [ ] Items are tagged as serendipity in the cache (check
        `/admin/ranking` last-run sample's `serendipityCount > 0`).
- [ ] With user <5 feedback items: rail does not render.
- [ ] With `OUTSIDE_USUAL_ENABLED=false`: rail does not render.

### "Why am I seeing this?"

- [ ] Tap ⋯ on a ranked feed card. Indigo "💡 Why am I seeing this?"
      row appears between Share and Cancel.
- [ ] Tap the row. Modal opens with:
  - [ ] "Ranked #N in your feed today" header.
  - [ ] 3-5 positive reasons with magnitude bars.
  - [ ] Serendipity callout on serendipity picks.
  - [ ] "Not matching? Tell us why" CTA returns to the feedback sheet.
- [ ] Tap ⋯ while logged out. Why row is hidden (no session).
- [ ] Attempt `GET /api/feed/why?itemType=event&itemId=<user-B-item>`
      as user A → 200 with `{present: false}` (user A's cache doesn't
      contain user B's items), never leaks user B's reasons.
- [ ] Attempt `GET /api/feed/why` with no session → 401.

### Feedback + cache invalidation

- [ ] Mark an item WANT via the action sheet.
  - [ ] `SELECT isDirty FROM "RankedFeedCache" WHERE userId = '<you>';`
        → `true`.
  - [ ] Wait for next precompute run (or force with a
        `/api/ranking/precompute` curl). `isDirty` → `false`,
        `feedbackCount` bumped.
  - [ ] Reload `/`. Items similar to the WANT'd one appear higher.
- [ ] Mark an item DONE.
  - [ ] Item disappears from feed immediately (PASS/DONE filter in
        `/app/(home)/page.tsx`).
  - [ ] On next precompute run, item is absent from the cache.
- [ ] Complete onboarding (or update profile). `UserProfile.version`
      increments; cache marked dirty; next precompute re-ranks.

---

## Fallback verification

Deliberately break the formula and confirm no user-visible error:

- [ ] Set env `RANKING_V2_ENABLED=true` in preview.
- [ ] In a branch, throw a deliberate error inside
      `lib/ranking/formula.ts` → `score()` (e.g., `throw new Error('boom')`).
- [ ] Deploy. Load `/` as a logged-in user.
- [ ] Page still renders. Items appear in legacy order.
      `/admin/ranking` fallback-incident count ticks up.
- [ ] Revert the deliberate error.

---

## Performance verification

- [ ] `npx tsx scripts/bench-feed.ts` — prints p50 / p95 / p99. Targets:
  - p95 < 200ms (PRD 6 Phase 8.4 target)
  - p99 < 500ms
- [ ] If the cache-miss rate is >5% during the bench, precompute isn't
      keeping up — investigate the queue on `/admin/ranking`.

---

## A/B plumbing (no variants defined in V1)

- [ ] All existing users have `rankingVariant = 'control'`.
- [ ] New users are assigned `control` on signup (V1 RANKING_VARIANTS
      only has control).
- [ ] `RankingRun.variant = 'control'` on all rows.
- [ ] When a variant is added later, deterministic hashing means a
      given user always gets the same bucket (verified in the variants
      test).

---

## DB sanity queries

For post-merge spot-checks against prod:

```sql
-- Cache coverage
SELECT
  (SELECT COUNT(*) FROM "User") AS total_users,
  (SELECT COUNT(*) FROM "RankedFeedCache") AS cached,
  (SELECT COUNT(*) FROM "RankedFeedCache" WHERE "computedAt" > now() - interval '4 hours') AS fresh;

-- Recent runs
SELECT "createdAt", "variant", "poolSize", "rankedCount", "serendipityCount",
       "durationMs", "error"
FROM "RankingRun"
ORDER BY "createdAt" DESC
LIMIT 20;

-- Errored runs in last 7d
SELECT COUNT(*) FROM "RankingRun"
WHERE "createdAt" > now() - interval '7 days' AND "error" IS NOT NULL;

-- Variant cohorts
SELECT "rankingVariant", COUNT(*)
FROM "User"
GROUP BY "rankingVariant";
```

---

## Legacy deletion (Phase 8.5 — NOT in this PR)

Deferred until `RANKING_V2_ENABLED=true` has run green for a week in
prod. When that lands:

- [ ] Audit imports of the deprecated modules:
  `git grep 'lib/scoring\|lib/recommendations-v2\|lib/ranking\.ts'`
- [ ] Retarget remaining callers at `lib/ranking/`.
- [ ] Delete `lib/scoring.ts`, `lib/ranking.ts`,
      `lib/recommendations-v2.ts`.
- [ ] Run `tsc` + `build` + manual smoke of home page.
- [ ] Remove `RANKING_V2_ENABLED` flag reads (flag becomes always-on
      end state).

---

## Outstanding follow-ups (not gating this PR)

- [ ] Analytics vendor wire-up once a provider is picked. Ranking events
      already flow through `lib/feedback/analytics.ts` `track()` stub.
- [ ] Real A/B variant definition + assignment ramp (Quest, post-launch).
- [ ] `aspirationText` LLM extraction PRD once 200+ responses are
      collected.
- [ ] Live-location PRD when app supports geo permissions.
- [ ] Per-request latency collector for `/api/feed` p50/p95/p99 (Phase
      7 dashboard currently has no collector wired; Vercel Analytics
      or Axiom recommended).
