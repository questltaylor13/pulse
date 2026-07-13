# Wave 5 — Trust & Social Surfacing (Design)

Date: 2026-07-13
Branch: `feature/overhaul-wave-5`
Predecessor: Wave 4 (Rate & Rank engine) — shipped & live, `RATE_RANK_ENABLED=true`
Vision plan: `~/.claude/plans/can-you-review-this-cached-cook.md`

## Context

The north star is TikTok-for-things-to-do × Beli ranked lists × **trusted human curation** —
follow people whose taste you trust, and their lists auto-update. Wave 4 shipped the ranked
lists. Wave 5 makes taste *legible to other people*: it emits what you rank, gives it a place
to land, and lets the people you trust nudge your feed.

Pulse currently has one real user (solo dogfooding). That constrains what is worth building.
Wave 5 therefore optimizes for **shareable artifacts** — surfaces that pay off with an audience
of one and switch on automatically as users arrive — rather than for social density we cannot
yet observe or evaluate.

### What reconnaissance found (verified 2026-07-13)

The handoff claimed "social infrastructure is already built, only surfacing is missing." That is
half true, and the false half determines the design.

**Built and working:** `UserFollow`, `Friendship`, `List`/`ListItem` (with `isPublic`,
`saveCount`, `shareSlug`), `/api/users/follow` (toggle), `/api/feed/following` (complete,
cursor-paginated), `/api/lists/featured`, public profiles at `/u/[username]`, and Wave 4's
`UserRankedEntry` + public rankings pages.

**The three findings that reshape the wave:**

1. **The following feed is empty by construction, not merely by lack of follows.** `ActivityType`
   has six values; only three are ever written in production (`CREATED_LIST`, `ADDED_TO_LIST`,
   `FOLLOWED_USER`). `SAVED_EVENT` and `ATTENDED_EVENT` have zero writers. `RATED_PLACE` has
   **zero writers** — the Wave 4 rate/rank engine, the app's strongest trust signal, emits nothing
   into the feed. Wiring the page without an emission layer ships an empty timeline.

2. **The featured-lists surface is orphaned, not merely unsurfaced.** `/api/lists/featured`'s only
   caller is `components/feed/FeaturedListsSection.tsx`, which **nothing imports**. The entire
   `components/feed/` directory (`FeaturedListsSection`, `FeedSidebar`, `NewThisMonthSection`,
   `WeekendPicksHero`, `WelcomeBanner`) is dead code stranded by the old `/feed` → `/` migration.
   Separately, `/api/lists/featured` has a live bug: it includes only `event` on preview items, so
   place-backed `ListItem`s render as the literal string `"Unknown"`.

3. **The ranking cache cannot see other people's activity.** `maybeSkip` (`lib/ranking/precompute.ts`)
   gates freshness on the *viewer's own* `userItemStatus` count, profile version, and dirty flag.
   When someone you follow rates something, none of those change for you — so a social signal would
   silently never recompute. `/api/users/follow` fires no ranking invalidation at all.

`/api/feed/route.ts` was also confirmed to have **zero callers** (all apparent hits are
`/api/feedback` or `/api/feed/why`, different routes).

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Shareable artifacts first.** Social surfaces built correct and dark-launch-safe, not richly designed for a population that doesn't exist. | One real user. Design effort aimed at unobservable states is waste. |
| D2 | **Taste events only** in the feed: ranking/rating and public-list creation. No `SAVED_EVENT`. | A save is an intention; a rank is a verdict. A feed of "Quest saved 40 events" buries the signal it exists to carry. |
| D3 | **Pointer rows + live hydration** (not snapshot rows, not a fully derived feed). | See "Feed architecture" below. This is the load-bearing decision of the wave. |
| D4 | **Social ranking signal built now, thin.** Cap `0.20`. | Inert at zero follows; switches on the moment a follow exists. Cheap now while the ranking code is in context, expensive to bolt on later. |
| D5 | **Read-time privacy evaluation.** | A write-time snapshot of `rankingsArePublic` leaks: flipping rankings private must retroactively pull rows from every feed. |
| D6 | **`/api/feed` is deleted, not rewritten.** | Zero callers. Wave 4's PR5 assumed a rewrite; recon says deletion. |

### Feed architecture (D3)

`UserActivity` is a denormalized log that has already rotted: half its enum is unwritten, `itemId`
is a bare string with no Prisma relation, and unfollowing does not delete the `FOLLOWED_USER` row
it created. Three options were weighed:

- **A — Snapshot rows.** Write the rank into the activity row; render directly. Cheapest, smallest
  diff. But the Beli mechanic *constantly reorders lists*, so every re-rank, note edit, or deletion
  strands a false claim in the feed forever. Retraction logic would be needed on every mutation
  path — a new bug class, invisible until it is embarrassing. Rejected: its failure mode is "your
  shareable artifact tells people something untrue," which is the exact thing this wave exists to
  prevent.
- **B — Fully derived.** No write path; read-time merge of followed users' `UserRankedEntry` + `List`
  rows. Always truthful, works retroactively on existing data. Rejected: cursor pagination across a
  multi-table merge is fiddly, and it discards a built, indexed, cursor-paginated API.
- **C — Pointer rows + live hydration (CHOSEN).** The activity row records *that* user U ranked
  entry E at time T; the feed joins to `UserRankedEntry` at read time for *current* content (rank,
  score, title, image) and drops rows whose entry is gone. Keeps the log's cheap indexed cursor
  pagination and stable ordering; gains the derived feed's self-healing truthfulness. Re-rank and
  the feed reflects it; delete and the row vanishes — enforced by `onDelete: Cascade`, i.e. by the
  database, not by application code someone must remember to write.

## Schema

Migration `add_social_activity` (hand-written via `prisma migrate diff` — **never** `migrate dev`;
all env files point at the prod Neon DB):

```prisma
enum ActivityType {
  SAVED_EVENT      // no writer (legacy)
  ATTENDED_EVENT   // no writer (legacy)
  CREATED_LIST
  ADDED_TO_LIST
  FOLLOWED_USER
  RATED_PLACE      // no writer (legacy; superseded by RANKED_ITEM)
  RANKED_ITEM      // NEW — Wave 5
}

model UserActivity {
  // ... existing fields ...
  rankedEntryId String?          // NEW
  rankedEntry   UserRankedEntry? @relation(fields: [rankedEntryId], references: [id], onDelete: Cascade)

  @@unique([rankedEntryId])      // NEW — one feed row per ranked entry
  // existing indexes retained
}

model UserRankedEntry {
  // ... existing fields ...
  activities UserActivity[]      // NEW back-relation
}
```

`@@unique([rankedEntryId])` is safe alongside other activity types: Postgres permits multiple NULLs
in a unique index. It guarantees the duel loop cannot spam followers — one row per entry, created on
first confirmed placement; subsequent re-ranks change what the feed *shows* (via hydration) without
creating a new row, and deliberately do **not** bump `createdAt`.

## Components

### 1. Activity emission
`lib/rank-engine/service.ts:confirmPlacement` emits one `RANKED_ITEM` pointer row per entry
(idempotent upsert on `rankedEntryId`). Public-list creation already emits `CREATED_LIST`; retained.

### 2. Feed API — `/api/feed/following`
Cursor contract (`cursor`, `limit`, `nextCursor`, `hasMore`) preserved. Rewritten to hydrate
`RANKED_ITEM` rows from `UserRankedEntry` at read time, filter on the author's **current**
`User.rankingsArePublic` (D5), and drop rows whose entry no longer resolves.

### 3. Feed page — `/feed/following`
Replaces the `redirect("/")` stub. Client infinite-scroll over the existing API. `/feed` remains a
redirect to `/` (protects external links).

**The empty state is the load-bearing element for an audience of one.** It is not an apology; it is
a discovery surface — "Follow people whose taste you trust," listing users who have public rankings.
This is what makes the page worth shipping today.

### 4. Lists surfacing
- Fix `/api/lists/featured` place bug (include `place`; title falls back `event ?? place`).
- Add `featuredLists` to the home feed as its own field + a `<ListsRail>` component, rendered on the
  **For You tab** (below the existing sections) via `ForYouFeedResponse`. Deliberately **not**
  widened into the `ForYouSection` item union, which is typed `event | place` and should stay that
  way. Rail is omitted entirely when the list is empty, matching the existing
  `sections.filter(s => s.items.length > 0)` convention.
- Add `generateMetadata` / OG to the public list page `/l/[slug]`, mirroring the Wave 4 rankings
  pages (confirmed absent today) — so a dropped link renders a card.
- Surface rank numbers and save counts in list UI.
- Delete the orphaned `components/feed/` directory.

### 5. Social ranking signal
- `lib/ranking/types.ts` — `followedLovedItems?: SocialLovedSignal[]` (`itemId`, `tags`, `score`,
  `followerName`).
- `lib/ranking/config.ts` — `followedLovedSimilarity: 0.20`. Deliberately **below** `wantSim`'s
  `0.40`: a friend's verdict is weaker evidence about *your* taste than your own stated interest.
  This follows the same epistemic argument the existing weight hierarchy already makes (Wave 4's
  `lovedSimilarity: 0.60` sits *above* `wantSim` because a confirmed personal visit is ground truth).
- `lib/ranking/context.ts` — gated, **bounded** two-hop load (`UserFollow` → `UserRankedEntry`
  where `sentiment: LIKED`). Concrete bounds: **at most 100 follows** (most recent first) and
  **`take: 300` ranked entries** total, ordered by `score` desc so the strongest verdicts survive
  truncation. Bounding is mandatory: this runs on the **read path** (`rerank-trigger.ts` →
  `rails.ts` inline re-rank on dirty), not just the cron, and the fan-out is otherwise unbounded in
  both follow-count and entries-per-followed-user. `UserRankedEntry` has no standalone `userId`
  index — the three `@@unique([userId, <ref>])` composites serve as a usable prefix for the `IN`
  scan, so no table scan; add a dedicated index only if measurement shows it is needed.
- `lib/ranking/formula.ts` — `computeFollowedLovedSimilarity`, **two-tiered**. The existing
  `lovedSimilarity` *skips* exact self-matches (you have already been there). For the social signal
  the exact match is the entire point: "Alex loved this place" is the headline. So a direct hit
  (a followed user loved this exact item) drives the boost and the why-line; tag overlap is the
  weaker fallback.
- `lib/ranking/explanation.ts` — `followed_loved_similarity` renderer (`` `${name} loved this` ``),
  kept **out** of `GENERIC_CARD_FACTORS` so it can win the card line.

### 6. Cache invalidation (the wave's principal technical risk)
- `markDirty` the rater's **followers** on `confirmPlacement` / `removeEntry`.
- `markDirty` self on follow/unfollow in `/api/users/follow` (today: no invalidation whatsoever).
- **`markDirty` only — never `triggerUserRerank`** on the follower fan-out. `triggerUserRerank`
  runs a full `precomputeUser` (context build + candidate pool + ~500 scored items + cache write)
  per follower, fire-and-forget, with no queue, backpressure, or dedupe. Fanning that out per
  rating per follower is an amplification bomb. `markDirty` is a cheap `updateMany`; the dirty flag
  is then picked up by the daily cron or by the existing dirty-triggered inline re-rank on the
  follower's next read. This is sufficient precisely because `maybeSkip` refuses to skip when
  `isDirty` is set.

### 7. Hygiene (five Wave 4 debts)
1. Shared `<BottomSheet>` shell — `components/rank/RankFlow.tsx` duplicates
   `components/feedback/ActionSheet.tsx` chrome (backdrop/grip/Esc/Cancel).
2. Consolidate `lib/rank-engine/service.ts:loadContent` with the `lib/feedback/api.ts` snapshot
   loaders (same table→`{title, category, town}` mapping in two modules).
3. Shared DONE-interception hook — `CardMoreMenu.handleSelect` and `DetailFeedback.handleSelect`
   carry near-identical "route DONE through rank flow" blocks.
4. **Delete `/api/feed`** (zero callers — recon). `lib/scoring.ts` itself stays: it retains live
   importers (`lib/ranking.ts`, `lib/enrich-event.ts`, `lib/scrapers/classify.ts`).
5. `<InitialThumb>` extraction (gradient + initial image fallback, duplicated in `ComparisonDuel`,
   `RankedListRow`, and the public rankings page).

## Error handling

- Feed rows whose `UserRankedEntry` no longer resolves are **dropped at hydration**, not rendered as
  placeholders. `onDelete: Cascade` should make this unreachable; the drop is defence in depth.
- Activity emission is best-effort and must **never** fail a placement: a failed emit is logged, not
  thrown. Ranking your own list is the primary action; telling followers about it is secondary.
- The social context load is bounded and failure-tolerant — on error it yields an empty signal set,
  which by construction (`?? []`) leaves scores identical to flag-off.
- `/api/feed/following` retains its 401 for anonymous callers and its empty-array early return for
  users with zero follows.

## Testing

Baseline: 197 vitest green, `tsc --noEmit` + `next build` clean. Every commit gated on all three.

- **Regression guard first** (mirrors the Wave 4 pattern): with empty social signals, `score()` and
  its `reasons[]` are byte-identical to pre-Wave-5. This is what enforces the flag-off invariant.
- Formula: direct-hit boost, tag-overlap fallback, cap saturation at `0.20`, score-weighting, and
  the why-line naming the follower.
- Hydration: stale/deleted entries dropped; privacy flag honoured at read time (flip
  `rankingsArePublic` → rows disappear).
- Emission idempotence: N re-ranks of one entry produce exactly one activity row, with an unchanged
  `createdAt`.
- Invalidation: rating marks followers dirty; follow/unfollow marks self dirty; no
  `triggerUserRerank` fan-out.

## Rollout

New flag `SOCIAL_V1_ENABLED` (same `process.env.X === "true"` pattern as `RATE_RANK_ENABLED`,
`lib/ranking/flags.ts`). Flag off ⇒ provably unchanged app.

Five PR-sized commits, each independently gated:

| PR | Contents |
|----|----------|
| 1 | Schema + migration + activity emission + rewritten `/api/feed/following` hydration |
| 2 | `/feed/following` page + discovery empty state |
| 3 | Lists surfacing (featured rail, OG on `/l/[slug]`, place-bug fix, dead-code deletion) |
| 4 | Social ranking signal + invalidation + tests |
| 5 | Hygiene (five debts) |

Then: 8-angle multi-agent review → fix findings → `gh pr create` with runbook + UAT checklist →
merge → `npx prisma migrate deploy` → `vercel --prod` → `printf "true" | vercel env add
SOCIAL_V1_ENABLED production` (**`printf`, not `echo`** — echo's trailing newline corrupts the value
and silently fails the strict flag check) → redeploy → smoke-check with `/usr/bin/curl`.

## Out of scope

Seeded/demo social accounts; friend-graph unification (`UserFollow` and `Friendship` remain two
unconnected models); plan share pages; Elo/agreement-weighted social trust; anything in Wave 6
(new-openings detection, situational attributes, recurring-series).

## Accepted risks

- No unique constraint on `UserRankedEntry (userId, category, position)` — concurrent same-category
  placements can tear ordering. Carried over from Wave 4; `npm run rank:repair` re-derives
  idempotently.
- The social signal is unevaluable at one user. The cap (`0.20`) is argued from the existing weight
  hierarchy, not measured. Revisit with real follow data.
