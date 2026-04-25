# Pulse Status

Living doc for session handoff. Last rebuilt 2026-04-19 after PRD 2 Phase 7 verification.

## Pipeline at a glance

### Active scrapers (registered in `lib/scrapers/index.ts`)

**Denver core** (daily, via `/api/cron/scrape-and-revalidate` @ 11:00 UTC):
- `do303` — denver-events.ts (HTML)
- `westword` — westword.ts (HTML)
- `red-rocks` — red-rocks.ts (DOM card parser)
- `visit-denver` — visit-denver.ts (Simpleview RSS)

**Regional** (same daily cron as core; the per-tier cadence in PRD 2 §1.5 is a future refinement):
- `chautauqua` — regional/chautauqua.ts (Tribe DOM, Boulder)
- `pikes-peak-center` — regional/pikes-peak-center.ts (RSS with `<ev:startdate>`, Colorado Springs)
- `visit-estes-park` — regional/visit-estes-park.ts (Simpleview RSS)
- `visit-golden` — regional/visit-golden.ts (Simpleview RSS)
- `visit-steamboat-chamber` — regional/visit-steamboat-chamber.ts (Simpleview RSS)

**API-gated** (not configured):
- `ticketmaster` — requires `TICKETMASTER_API_KEY`
- `eventbrite` — requires `EVENTBRITE_TOKEN`

**Disabled but kept for reference:**
- `303magazine` — site migrated to JS-rendered Tribe Events widget; yield was ~1 event/scrape. Removed from orchestrator 2026-04-18.

### LLM research (PRD 2 Phase 3)

- `scripts/research-mountain-events.ts` — CLI, OpenAI Responses API + `web_search` tool (gpt-5)
- `/api/cron/research-mountain-events` — weekly Tuesdays 08:00 UTC
- `lib/llm-research/mountain-events.ts` — core module
- Source tag: `llm-research-mtn`
- Covers: Breck, Vail, Aspen, Steamboat, Crested Butte, Telluride, Winter Park, Beaver Creek, Keystone

### Cron schedule (`vercel.json`)

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/refresh-neighborhood-counts` | `0 9 * * *` | Daily neighborhood place-count refresh |
| `/api/cron/archive-stale-events` | `0 10 * * *` | Daily past-event archiver |
| `/api/cron/scrape-and-revalidate` | `0 11 * * *` | Daily scrape orchestrator |
| `/api/cron/cleanup-cache` | `0 4 * * *` | Cache cleanup |
| `/api/cron/refresh-places?chunk=0..2` | `0,10,20 7 * * 0` | Sunday chunked Google Places refresh |
| `/api/cron/refresh-guide-counts` | `30 9 * * *` | Daily guide counts |
| `/api/cron/backfill-walk-times` | `0 12 * * *` | Daily walk-time backfill |
| `/api/cron/research-mountain-events` | `0 8 * * 2` | **Weekly mountain LLM research** |
| `/api/cron/cleanup-scraper-runs` | `30 4 * * *` | **Daily 30-day ScraperRun retention** |

## Regional metadata (PRD 2)

### EventRegion enum
- `DENVER_METRO` — default; Denver neighborhoods
- `FRONT_RANGE` — Boulder, Fort Collins, Colorado Springs, Golden, Morrison
- `MOUNTAIN_GATEWAY` — Estes Park, Nederland, Idaho Springs, Georgetown, Winter Park, Evergreen
- `MOUNTAIN_DEST` — Breckenridge, Vail, Aspen, Steamboat, Crested Butte, Telluride, Beaver Creek, Keystone, Palisade

### Schema fields (Event + Place)
- `region: EventRegion` (default `DENVER_METRO`)
- `townName: String?`
- `isDayTrip: Boolean`
- `isWeekendTrip: Boolean`
- `driveTimeFromDenver: Int?`
- `driveNote: String?`
- `worthTheDriveScore: Int?` (Event only; populated by enrichment for region != DENVER_METRO)

### Canonical drive-time table
`lib/regional/drive-times.ts` — 19 towns. Extend here when adding new regional scrapers. `lib/regional/metadata.ts:deriveRegionalFields()` is called on every upsert to auto-tag region/driveTime/driveNote/isDayTrip/isWeekendTrip from the `neighborhood` string.

### Query helpers (`lib/queries/events.ts`)
- `activeEventsWhere(now)` — excludes stale / archived / non-published
- `outsideDenverWhere()` / `outsideDenverPlaceWhere()` — region enum first, neighborhood-whitelist fallback
- `regionalScopeWhere("near"|"all")` — "near" excludes MOUNTAIN_DEST for the "Near Denver" filter

## Quality + worth-the-drive gates

Both applied at enrichment time in `lib/scrapers/index.ts`. Events that fail either gate are marked `isArchived=true` (retained for analytics; excluded from the feed).

- `PULSE_QUALITY_CUTOFF` (default 5) — applies to every event
- `PULSE_REGIONAL_CUTOFF` (default 6) — applies only to `region != DENVER_METRO` events, via `worthTheDriveScore`

Internal enrichment time budget raised to 270s (was 60s), matching cron `maxDuration=300`. Big insert runs now get their scores persisted inline instead of needing a separate `npm run events:enrich` backfill.

## Home-feed UI (PRD 2 Phase 5)

### Sections (events tab)
1. Today
2. This weekend's picks
3. Just added on Pulse (curator-flagged places — `isNew OR isFeatured`)
4. Outside the city (day-trip events, sorted by `worthTheDriveScore` desc)
5. **Worth a weekend** — MOUNTAIN_DEST events with `worthTheDriveScore >= 8`, 8-week window, hides below 3 events (PRD §5.4)
6. Guides from local creators (seed data)

### Filter chip
- **Near Denver** / **All** toggle at top (`components/home/RegionalScopeFilter.tsx`)
- Default: `near` (hides MOUNTAIN_DEST) per PRD Open Q#1
- Writes `?scope=all` URL param when user opts in

### Card meta (`lib/home/event-view.ts`)
- Regional events lead with town + drive-time instead of neighborhood
- `isWeekendTrip=true` events get "Weekend trip · {townName}" prefix
- Denver events keep existing neighborhood framing

## Observability (PRD 2 Phase 6)

- `ScraperRun` Prisma model — one row per source per run
- `/admin/scrapers` — green/yellow/red coverage dashboard, 7-day window, degraded flag after 2 consecutive empty runs, "Refresh now" button
- `/api/admin/scraper-status` — JSON feed
- `/api/admin/scrape-now` — auth-gated manual trigger
- `/api/cron/cleanup-scraper-runs` — 30-day retention (daily 04:30 UTC)

## Current data state (2026-04-19)

| Metric | Value |
|---|---|
| Future events total | 379 |
| DENVER_METRO | 83 |
| FRONT_RANGE | 271 |
| MOUNTAIN_GATEWAY | 14 |
| MOUNTAIN_DEST | 11 |
| Distinct non-Denver towns with content | 12 |
| Places total | 460 |
| Places `isLocalFavorite` | 268 |

Top sources (future events): red-rocks 171, chautauqua 56, pulse-curated 41, pikes-peak-center 34, do303 22, visit-estes-park 13, llm-research-mtn 12, visit-denver 11, visit-golden 10, westword 8.

`worthTheDriveScore` populated on **0 events** as of Phase 7 — the field was added in Phase 4 but no scrape has fired since the schema change. Next nightly cron will start populating it; `npm run events:enrich` can backfill retroactively.

## Known issues + deferred work

- **JS-rendered regional sources** (Boulder Downtown, Boulder Theater, Fox Theatre, Downtown Fort Collins, Lincoln Center event listings, Visit Colorado Springs, Nederland, Georgetown, Winter Park local, Evergreen, Breckenridge visitor-bureau, Vail, Telluride, Aspen direct scrapers) — all need Puppeteer or partnership outreach. LLM research covers their major events.
- **Simpleview RSS helper refactor** — 5 near-identical scrapers (Visit Denver, Estes, Golden, Steamboat, and the dropped Crested Butte). Good candidate for a shared `simpleview-rss.ts` helper.
- **Sort-weight tune** (PRD 2 §5.5) — 10% boost for `worthTheDriveScore >= 8`, 15% penalty for `isWeekendTrip`. Current ordering prioritizes worth-the-drive via SQL `orderBy`; a ranking-layer boost is a follow-up after a week of real usage.
- **Ticketmaster + Eventbrite API keys** — not set in Vercel env; those scrapers silently no-op today.
- **ScraperRun-based alerting** — email/Slack webhook when a source goes Red for N consecutive runs. Board exists; alerts don't.
- **303magazine** — disabled. Site migrated to JS-rendered Tribe widget. Would require Puppeteer for ~1 event/scrape.

## Reference

- **PRDs**: `PRD/data-refresh-and-reliability.md` (PRD 1), `PRD/regional-expansion.md` (PRD 2), `PRD/discoveries-engine.md` (PRD 3, not started).
- **Audit reports**: `audit-reports/YYYY-MM-DD-data-audit.md`. Regenerate: `TS_NODE_PROJECT=scripts/tsconfig.json npx ts-node -r tsconfig-paths/register scripts/audit-data.ts`. Gate on `AUDIT_CONFIRM=1` to run the write pass.
- **Drive-time table**: `lib/regional/drive-times.ts` — extend this first when adding a new regional scraper so `deriveRegionalFields()` can tag it.
- **Probe scripts**: `scripts/probe-regional.ts`, `scripts/probe-red-rocks.ts`, `scripts/probe-visit-denver.ts`.


## PRD 3: Hidden Gems Engine (2026-04-20)

Third content type alongside Events and Places. Discoveries are curated local
content that doesn't fit the dated-event or permanent-place taxonomy: hidden
spots, rec leagues, seasonal rituals. Refresh is weekly, not daily.

### Schema
- `Discovery` model + enums `DiscoverySubtype` (HIDDEN_GEM / NICHE_ACTIVITY /
  SEASONAL_TIP), `DiscoverySource` (REDDIT / LLM_RESEARCH / NICHE_SITE /
  EDITORIAL / COMMUNITY), `DiscoveryStatus` (ACTIVE / ARCHIVED / UNVERIFIED /
  FLAGGED). Reuses existing `Category` + `EventRegion` enums.
- `LLMResearchRun` — per-query debug rows (prompt, raw response, structured
  candidates, duration). Reused by both LLM research and Reddit extraction.
- `DiscoveryRun` — per-pipeline observability (rawCount, rejectedAsEvent,
  droppedForQuality, unverified, upserted, updatedExisting, errors).

### Pipelines (all persist to LLMResearchRun; all feed the orchestrator)
- **LLM Research** (`lib/discoveries/pipelines/llm-research.ts`) — 6 scoped
  queries via OpenAI Responses API with `web_search_preview`. Structured JSON
  output validated with Zod. Model: `gpt-5.4-mini` (env
  `DISCOVERIES_OPENAI_MODEL`).
- **Reddit** (`lib/discoveries/pipelines/reddit.ts`) — 12 subreddits
  (Denver/Boulder/Fort Collins/Colorado Springs/Breckenridge/Vail/Steamboat/
  CO-wide), public JSON endpoints, 1.1s rate-limit, per-post LLM extraction.
  No raw Reddit text persisted — licensing posture locked.
- **Niche Sites** (`lib/discoveries/pipelines/niche-sites.ts`) — 6 curated
  sites with per-site cheerio extractors, robots.txt compliance, 1.2s delay
  between sites, no LLM calls.

### Enrichment flow (Phase 4, orchestrator per candidate)
1. Event-vs-Gem classifier (OpenAI) — DATED_EVENT with confidence > 0.7 rejected
2. Pulse-voice enrichment (OpenAI) — title/description/category/tags/quality
3. Quality threshold ≥ 6 (stricter than events' ≥ 5)
4. Regional metadata via `DRIVE_TIMES_FROM_DENVER`
5. Google Places verification — no location match → status=UNVERIFIED
6. Fuzzy dedup — same subtype + normalized-title Levenshtein ≤ 3 + ≤100m geo

### Cron + observability
- Weekly cron: Sunday 3am UTC → `/api/discoveries/refresh` (vercel.json)
- Manual endpoints: `/api/discoveries/refresh-llm`, `/api/discoveries/refresh-reddit`,
  `/api/discoveries/refresh-niche-sites` (all CRON_SECRET auth)
- CLI: `npm run discoveries:research`, `discoveries:reddit`, `discoveries:niche`,
  `discoveries:seed` (editorial)

### UI
- `/discoveries` — Hidden Gems tab with subtype chips (All / Spots / Clubs &
  Leagues / Seasonal) + scope toggle (Near Me / All of Colorado). Deep-linkable.
- `/discoveries/[id]` — detail page with per-source attribution
- `components/HiddenGemsSection.tsx` — horizontal rail for cross-surfacing
  (consumes `/api/hidden-gems`)
- `components/DiscoveryCard.tsx` + `components/HiddenGemsFilters.tsx`
- Desktop nav (`NavLinks.tsx`) adds Hidden Gems link

### Admin
- `/admin/scrapers` — dashboard: active Discovery count, UNVERIFIED queue size
  (warns >20), 28-day rejected-as-event total (warns >30), per-pipeline last
  30 runs with counts + duration + error counts
- `/admin/discoveries/review` — UNVERIFIED triage with Server Actions:
  Approve / Reject / inline Edit

### Editorial seed (Phase 0)
- 13 hand-curated Discoveries in `scripts/seed-discoveries.ts` covering all
  subtypes and 3 regions. Idempotent (title+EDITORIAL guard). Quality pinned
  at 9 so editorial always outranks pipeline output at equal quality.

### Pending for first live run
- `OPENAI_API_KEY` + `GOOGLE_PLACES_API_KEY` + `CRON_SECRET` set in Vercel
- Smoke test recommended: `npm run discoveries:reddit -- --max=2` first to
  validate voice/output before burning a full weekly pass
- First Sunday run will populate `DiscoveryRun` — admin dashboard is blank
  until then
- Niche-site selectors are best-guess; zero-candidate sites flag as errors
  and need per-site tuning after first run

### Known deferred
- Cross-surfacing of Discoveries into Events/Places tabs (PRD §5.2)
- Mobile bottom-nav entry for Hidden Gems (kept at 3 items to avoid crowding)
- Auto-ingest of dated-event rejections into the Event pipeline (PRD open
  question — for now they just log to DiscoveryRun.rejectedAsEventCount)

---

## PRD 5: Feedback System (2026-04-23)

Behavioral signal layer for the future ranking engine (PRD 6). Three
surfaces write the same `UserItemStatus` rows under a shared UI vocabulary:
"Interested" → `WANT`, "Not for me" → `PASS`, "I've been there" → `DONE`.

### Schema (extends the existing UserItemStatus model from PRD 1)

- Direct FKs to Event + Place + Discovery alongside the legacy Item bridge;
  `itemId` is now nullable.
- `onDelete: SetNull` on every ref so denormalized snapshot columns survive
  item deletion.
- `FeedbackSource` enum (FEED_CARD / PROFILE_SWIPER / DETAIL_PAGE /
  LEGACY) populated at write time; pre-PRD-5 rows auto-backfill as LEGACY.
- `itemTitleSnapshot` / `itemCategorySnapshot` / `itemTownSnapshot` TEXT
  columns captured at write time from the joined source row.
- Polymorphic integrity enforced by SQL CHECK: exactly one of the four FK
  columns must be non-null.
- `User.profileStripDismissedAt DateTime?` for the Phase 2 48h cooldown.

### Three feedback surfaces

| Surface | Entry point | FeedbackSource |
|---|---|---|
| In-feed card | ⋯ button top-left on every compact card (Event/Place/Discovery) | `FEED_CARD` |
| Profile taste-calibration | Completion strip → Continue → `/?swiper=1` overlay | `PROFILE_SWIPER` |
| Detail page | ⋯ button + status pill on event/place/discovery detail pages | `DETAIL_PAGE` |

All three route through `POST /api/feedback` with a polymorphic
`{eventId|placeId|discoveryId|itemId}` ref. Optimistic UI via
`useFeedback` hook; rollback + inline error on failure; no loading spinners
in the feedback flow by design.

### Profile completion strip + taste swiper

- Strip renders between the Scope toggle and the Today section in the home
  feed when `completion < 80% AND (never dismissed OR dismissed > 48h ago)`.
- Completion formula (40% onboarding + 3% per feedback capped at 60%) hits
  100% at 20 feedback items. Lives in `lib/feedback/profile-completion.ts`.
- Swiper opens via `?swiper=1` URL param. 12 items, 4 each from Events /
  Places / Discoveries, diversity-biased (one per category where possible),
  excludes items the user already has any UserItemStatus on. Fisher-Yates
  shuffled before return.
- "Done for now" visible from item 3 onward. Fresh re-roll per launch — no
  session resume.

### Your Denver history

`/your-denver` — grid of DONE items with per-kind counts, URL-driven filter
chips (All / Events / Places / Hidden Gems), empty-state CTA routes into
the swiper. Falls back to snapshot columns when the live Event/Place/
Discovery row has been deleted (FK went NULL). Not yet promoted to
top-level nav — PRD §4.1 gates promotion on usage data showing 10+ entries
from a cohort.

### Admin observability

`/admin/feedback` — total rows by status + source, median feedback per
user, top 10 WANT items, top 10 PASS items (content quality flag), data
quality flag for users with >50 PASS and <5 WANT (profile mismatch
signal). Admin-gated via session + isAdmin check.

### Analytics

Event signatures declared in `lib/feedback/analytics.ts`. `track()`
currently console.debugs in dev; vendor wire-up is a one-line change
when a provider is chosen. Call-site instrumentation intentionally
deferred so we don't ship dead code paths to a vendor that doesn't exist
yet.

### Signal map

PRD 5 behavior documented in `PRD/signal-map.md` §Behavioral signals:
- WANT → +0.25 per similar-tagged item, capped +0.40 total
- PASS → -0.30 per similar-tagged item, capped -0.50 total
- DONE → hard filter (pre-ranking; item never reappears)
- Behavioral signal overrides stated preferences on conflict; transition
  is automatic as feedback count grows.
- Cold-start unchanged: zero UserItemStatus rows → stated prefs dominate.

### Known deferred
- Analytics vendor selection + call-site instrumentation
- Client offline queue (IndexedDB) for feedback — acknowledged in PRD §7.3
  as "promote to its own sub-phase"
- Your Denver promotion to top-level nav (gated on usage cohort threshold)
- Removing the Item-polymorphic bridge entirely — 438 legacy rows still
  live through it; new writes all go direct.

---

## PRD 6: Matching Engine

Everything upstream produced inputs; PRD 6 is where they converge into
a ranked per-user feed. In-process `lib/ranking/` module — no separate
service — backed by an hourly precompute cron and a per-user
RankedFeedCache row. Formula is a pure function; caller helpers handle
all DB + async.

### Architecture

**Precomputed with real-time rails.** Background cron runs hourly per
user and writes `RankedFeedCache.rankedItems` as Json. Home rails
(`fetchHomeFeed`) read the cache at render time and re-sort each
rail's raw items by the user's personalized score via
`sortByCacheScore`. Cache miss or legacy user → rails keep their
current universal sort. Formula in `lib/ranking/formula.ts` is pure
so `npm run test` can lock scoring behavior without a DB.

**Formula (per `PRD/signal-map.md` §Updated formula):**
```
inner = base_quality × strategy.qualityMultiplier
      + softRank × (vibe_boost + aspiration_boost + social_boost)
      + want_similarity − pass_similarity
      − budget_penalty
      + recency_boost
final = inner × novelty_adjustment
```

Locked decisions: novelty multiplies the whole inner sum (not just
recency). softRank (0.6x) dampens profile-derived boosts in
cold-start mode (first 7 days OR <15 feedback; VISITING short-circuits
the age gate). WANT similarity caps at +0.40; PASS at −0.50. DONE is
a hard pool filter, not a score adjustment.

### Schema (migration `20260423150000_prd6_ranking_cache`)

- `RankedFeedCache` — one row per user; Json `rankedItems`,
  `computedAt`, `profileVersion`, `feedbackCount`, `isDirty`.
- `RankingRun` — 14-day observability log (one row per precompute
  iteration). Daily cleanup cron trims rows older than that.
- `User.rankingVariant` — A/B bucket; default "control".
- `UserProfile.version` — scalar bumped on profile write to trigger
  cache invalidation without JSON-diffing.

### Module map

- `lib/ranking/config.ts` — weights, strategy presets, cold-start
  params, serendipity interval, candidate-pool limits, precompute
  schedule, fallback. All editable without admin UI. Variant overrides
  in `RANKING_VARIANTS` (V1 ships control-only).
- `lib/ranking/formula.ts` — pure `score()` function.
- `lib/ranking/normalizers.ts` — bridge Event/Place/Discovery into
  unified `RankableItem` (quality, price tier, tag union).
- `lib/ranking/candidate-pool.ts` — Prisma query layer; applies
  status/scope/budget-drop/DONE filters before scoring.
- `lib/ranking/serendipity.ts` — injects non-match picks at every Nth
  slot (default 5); prefers Hidden Gems; variety-constrained.
- `lib/ranking/precompute.ts` — per-user orchestrator called by cron.
- `lib/ranking/cache.ts` — read/write/markDirty + the helpers home
  rails use to re-sort by personalized score.
- `lib/ranking/context.ts` — builds `RankingContext` (profile +
  feedback + familiarity) in two round-trips.
- `lib/ranking/explanation.ts` — factor → Pulse-voice copy mapping.
- `lib/ranking/outside-usual.ts` — hydrates the serendipity-tagged
  items from cache into EventCompact/PlaceCompact for the rail.
- `lib/ranking/fallback.ts` — quality-only sort fallback.
- `lib/ranking/variants.ts` — A/B config merger + hash-bucket assigner.
- `lib/ranking/flags.ts` — `RANKING_V2_ENABLED` + `OUTSIDE_USUAL_ENABLED`
  env reads.

### Routes

- `GET /api/ranking/precompute` — hourly cron (`0 */1 * * *`).
  CRON_SECRET-gated. Iterates users dirty→uncached→stale, respects
  a 45s per-run budget.
- `GET /api/ranking/sanity` — weekly cron (Mondays 10:00 UTC). Logs
  warnings on top-10 homogeneity, serendipity hit rate, cross-segment
  top-10 overlap.
- `GET /api/cron/cleanup-ranking-runs` — daily (04:30 UTC). Trims
  RankingRun rows older than 14 days.
- `GET /api/feed/why?itemType=<>&itemId=<>` — session-gated; returns
  `{present, rank, reasons, isSerendipity, computedAt}` for a single
  item from the user's own cache.

### UI surfaces

- Home rails (`EventsTabBody`, `PlacesTabBody`): when
  `RANKING_V2_ENABLED=true` and the user is signed in, each rail's
  items re-sort by cache score. Items absent from the cache keep
  their legacy relative order at the tail.
- "Outside your usual" rail (`OutsideYourUsualRail`): renders between
  "Just added on Pulse" and "Outside the city" when
  `OUTSIDE_USUAL_ENABLED=true`, user has ≥5 feedback, and cache has
  serendipity-tagged items. Cards carry a "Stretch" pill.
- "Why am I seeing this?" (`WhyThisSheet`): new indigo row in the
  three-dot ActionSheet (CardMoreMenu + DetailFeedback). Modal with
  rank position, top 5 positive reasons with magnitude bars,
  serendipity callout, feedback CTA.

### Rollout

Clean-break end state per locked decision §A, but transition-gated.
Legacy modules (`lib/scoring.ts`, `lib/ranking.ts`,
`lib/recommendations-v2.ts`) are marked `@deprecated` and stay in tree
until `RANKING_V2_ENABLED` has run green for a week, then Phase 8.5
deletes them.

`RANKING_V2_ENABLED=false` initially → precompute cron still runs and
writes cache in the background, but `fetchHomeFeed` stays on legacy
sorts. Internal dogfood by flipping per-user. Cohort ramp via the
existing variant hash once dashboards are clean.

### Admin observability

`/admin/ranking` — isAdmin-gated. Tiles for users / cache coverage /
fresh (<4h) / stale counts. Precompute job detail (last run, duration,
pool size, serendipity count, error). Fallback-incident count (7d).
Variant cohort table. Last 20 RankingRun samples.

### Tests

`lib/ranking/__tests__/*.test.ts` — 40 passing via vitest. Formula
(12 fixtures covering all 4 context segments + cold-start + cap
behaviors + novelty precedence), normalizers (16), serendipity (6),
variants (4). Tests are locked via `npm run test` (vitest added in
Pre-Phase 0).

### Known deferred (PRD 6)
- Live user location — separate PRD once the app supports permissions.
- `aspirationText` free-text LLM extraction — gated on 200+ collected
  responses.
- Social graph signals (friend saves, aggregate counts).
- Real A/B variants (only "control" ships in V1; scaffolding ready).
- Legacy module deletion (Phase 8.5, after a week green).
- Analytics vendor wire-up still deferred; ranking events flow
  through the same `track()` stub.

## 2026-04-24 — Today Rail Density Fix

**Context.** 04-24 diagnostic found DB had **43 events for "today"** but the home Today rail was only surfacing **10**. Quest was opening the app and feeling the feed was thin despite rich underlying data. A known duplicate (Subtronics at Red Rocks) was appearing twice, and ~15 events/day displayed "1:00 AM" timestamps.

### What was changed

**1. Section cap raises (`components/home/fetch-home-feed.ts`, `app/api/home/events-feed/route.ts`).**
- Today rail: `take: 10` → `25` (+ new `prisma.event.count(...)` for `todayCount`).
- Weekend picks: raw `take: 40` → `60`, post-sort `.slice(0, 10)` → `.slice(0, 20)`.
- Just added on Pulse: `take: 10` → `15`.
- Outside the city: dual `take: 6` → `10` each, final slice `10` → `15`.
- Places-tab rails: Explore by neighborhood `6→10`, Where locals / First date / Groups / Work-from `8→12`.

**2. Scrape-time dedup strengthened (`lib/scrapers/index.ts`).**
- Date component of the dedup key changed from `startTime.toISOString().slice(0,10)` (UTC) to `denverDateKey(startTime)` (America/Denver). This was the Subtronics leak: red-rocks stored the event as `2026-04-25` UTC and do303 stored it as `2026-04-24` UTC, so the existing dedup never matched.
- Venue normalization now also strips "at", "and", "park".
- On collision, `prioritize()` (new `lib/scrapers/source-priority.ts`) picks the winner by the configurable `SOURCE_PRIORITY` list: `do303 > red-rocks > westword > visit-denver > visit-golden > chautauqua > pikes-peak-center > visit-estes-park > visit-steamboat-chamber > ticketmaster > eventbrite`. Ties break on metadata richness.

**3. Timezone bug fixed (the real "1:00 AM" culprit).** New `lib/time/denver.ts` provides `endOfTodayDenver`, `startOfTodayDenver`, `denverDateKey`, `formatTimeDenver`, `formatWeekdayDateDenver`, `addDaysDenver` — all via `Intl.DateTimeFormat` with `timeZone: "America/Denver"`, no new dependencies.
- `lib/queries/events.ts` → `endOfTodayLocal` now delegates to `endOfTodayDenver`.
- `lib/home/event-view.ts` → `formatEventTime` and `startsAfterPM` use Denver TZ for same-day comparisons and hour-of-day checks.
- `components/EventListCard.tsx` → `formatTime`/`formatDate` pass `timeZone: "America/Denver"`.

**4. Today "See all" conditional (`components/home/EventsTabBody.tsx`).** Link renders only when `todayCount > 25`.

**5. `source` added to `EVENT_SELECT`** for dedup observability (not displayed in UI yet).

**6. Diagnostic script** `scripts/diagnose-today-rail.ts` — prints the ladder `eventsInDb ≥ eventsAfterActiveWhere ≥ eventsAfterTodayWindow ≥ eventsAfterDedup ≥ eventsSurfaced`, lists any residual duplicate keys, and reports whether the "See all" link will be visible. Runs via `npx tsx scripts/diagnose-today-rail.ts`.

### Surprises

- **The "1:00 AM" reading was wrong.** Scrapers default to **19:00 MT**, not 01:00, when time parsing fails (`red-rocks.ts:54`, `chautauqua.ts:55`, `visit-denver.ts:67`). The UI was rendering `toLocaleTimeString()` in the server's local TZ (UTC on Vercel), which turned 7pm MT into 1–2am. No `hasParsedTime` flag / migration was needed — a TZ-aware formatter fixed it.
- **Scrape-time dedup already existed.** The PRD framed this as a new query-time layer, but the existing cross-scraper dedup in `lib/scrapers/index.ts:104-125` just needed a TZ-aware date key and a priority-aware winner.
- **`endOfTodayLocal` was also UTC.** The "today" window was shifted 6–7 hours on Vercel. Part of the 43→10 gap may have been window miscomputation rather than just the cap.

### Follow-ups not in this PR

- One-off `scripts/dedup-existing-events.ts` to collapse pre-existing duplicate rows (new dedup only applies to future scrape runs).
- Optional `hasParsedTime` flag for cases where visit-denver / chautauqua *intentionally* anchor at 19:00 (source page truly had no time) — would let those sort to the bottom with a "Time TBA" label.
- `home_rail_capped` analytics event when `surfacedCount < dbCount` for silent density-regression telemetry.

## 2026-04-25 — Scraper Coverage Fix (PR 2)

**Context.** 04-24 diagnostic (now part of PR 1 docs) showed Westword pulling 12 events when its public listing has ~47 (≈25% coverage), and VisitDenver hitting an RSS feed (`/event/rss/`) whose earliest entry was May 2 — **0 events in the next-7-day window**. Both scrapers reported `succeeded=true` with low `rawCount`, so nothing alerted. After PR 1 raised the Today rail cap to 25, the rail still felt sparse because the data layer itself was thin.

### What was changed

**1. VisitDenver — full rewrite (`lib/scrapers/visit-denver.ts`).**
- Old: hit `/event/rss/`, parse 17-ish items, regex out date from CDATA description, default 19:00 MT. Earliest event May 2 → 0 in next-7d.
- New: GET `/events/` (apex domain) → ~45 unique `/event/<slug>/<id>/` links inline. Cap at 30 detail-page fetches per run, fan out with `concurrency=5` and 150–300ms jitter between batches to stay polite + within `PER_SCRAPER_TIMEOUT` (10s).
- Each detail page has a clean schema.org ld+json `Event` with `name`, `startDate`, `endDate`, `image`, `location.{name,address}`. Date-only values anchor at 19:00 Mountain Time (DST-aware).
- Filters: skip past events (start > 24h ago and not ongoing); keep ongoing exhibits (start past, end future, anchored at `now`); skip `/conventions_NNNNN/` URLs and titles matching conference/seminar/training/summit/meeting/exposition.
- PRD recommended `/events/calendar/` — diagnosed as fully JS-rendered (0 inline event links). Useless for static fetch. Not used.
- ScrapedEvent shape preserved exactly so dedup, source-priority, enrichment, and quality gates need no changes.

**2. Westword — no code change; documented JS-render ceiling (`lib/scrapers/westword.ts`).**
- Diagnosed: `/things-to-do/` returns 12 `a.event-item` elements (10 unique events). Pages 2 through 8 all return the **same 10 events** — pagination is JS-driven. `/feed/` is a generic news RSS, not events.
- Static-fetch ceiling is ~10–12 events. Reaching the public ~47-event listing requires Playwright/Puppeteer.
- **Follow-up flagged:** Westword JS rendering. Not in this PR per Q1 in the PRD review.

**3. Pro-sports drop filter (new `lib/scrapers/exclusions.ts`).**
- Exports `PRO_SPORTS_TEAMS` array and `isProSportsEvent(title, description)`. Matches Nuggets / Avs / Avalanche / Broncos / Rockies / Rapids / Mammoth / Nuggs with `\b…\b` case-insensitive.
- False-positive guards: brewery/cafe/coffee/distillery names, "Hot Springs" / trail / hike, participatory races (5K, marathon).
- Wired into `runAllScrapers()` (`lib/scrapers/index.ts`) **before dedup**, so dropped events never reach the DB and don't displace higher-priority sources in dedup collisions. Per-source attribution feeds `ScraperRun.droppedCount`. First 5 dropped titles log per run for verification.

**4. Lacrosse-as-music classify nudge (`lib/scrapers/classify.ts`).**
- The diagnostic flagged "First Round: TBD vs Colorado Mammoth" miscategorized as `LIVE_MUSIC`. Root cause: Ball Arena routes to `LIVE_MUSIC` in `VENUE_MAP` because it hosts concerts. Fix: if a title contains sports-context keywords (`vs`, `tournament`, `playoff`, `finals`, `championship`) and lacks music-context keywords (`concert`, `tour`, `band`, `dj`, `album`, `live music`, `presents`), `classifyEvent` returns `OTHER` and lets enrichment categorize. Pro sports themselves are already dropped earlier; this nudge mostly catches rec/community tournaments at shared-use venues.

**5. Coverage anomaly observability (`prisma/schema.prisma` + `lib/scrapers/index.ts`).**
- New column: `ScraperRun.coverageAnomaly Boolean @default(false)`. Migration `20260425212832_scraper_coverage_anomaly` is additive and backwards-compatible.
- Compute (per source, per run): query the last 14 days of succeeded `ScraperRun` rows for the source. If ≥7 prior runs **and** median `rawCount` ≥ 5 **and** today's `rawCount` < 0.5 × median → `coverageAnomaly = true`. The 7-run / median-5 cold-start guards prevent the post-PR-2 volume jump on Westword/VisitDenver from generating 14 days of false-clean signals.
- Surfaced as `coverageAnomaly: boolean` on each source in `GET /api/admin/scraper-status` (latest-run flag). Rendered as a red **anomaly** badge in `app/(site)/admin/scrapers` (distinct from the amber **degraded** badge).

**6. Tests (new `lib/scrapers/__tests__/`).**
- `exclusions.test.ts` (12 tests): positive cases for every team + variants, false-positive guards (Mammoth Hot Springs, Avalanche Brewing, 5K races), perf guard against catastrophic regex backtracking.
- `visit-denver.test.ts` (13 tests): listing parser yields ≥40 unique canonical URLs from the saved fixture; ld+json extraction; `buildEventFromLdJson` round-trips, anchors date-only at 19:00 MDT correctly, filters past/convention/missing-name/unparseable-date.
- `westword.test.ts` (3 tests): selectors still match the live fixture; **regression guard** asserting the static page has no pagination links and no schema.org Event ld+json — if either flips true, the JS-render ceiling note is stale and the scraper can be expanded.
- HTML fixtures committed at `tests/fixtures/scrapers/` (westword listing, visit-denver listing, visit-denver detail page).
- Test count: 67 total (was 40).

### Before / after

| Source | Before (2026-04-24 diagnostic) | After (expected, first scrape post-deploy) |
|---|---|---|
| Westword | 12 raw / 10 unique | 12 raw / 10 unique (unchanged — JS-render ceiling, see follow-up) |
| VisitDenver | 17 raw via RSS, **0 in next-7d** | 25–30 raw via `/events/`, 8–15 in next-7d (depends on what's listed today) |
| Pro-sports events | unfiltered (Mammoth/Avs/etc. could land in feed) | dropped at ingest, logged per run |
| Coverage anomaly signal | none | red badge on `/admin/scrapers` when latest rawCount < 50% of 14-day median (≥7 runs / median≥5 guards) |

The first cron after deploy (or manual "Refresh now" via `/admin/scrapers`) will fill in the real after numbers — admin endpoint will surface them under `runsLast7Days` / `totalInserted`.

### Surprises during diagnosis

- **Westword pagination is theatrical.** `/things-to-do/page/N/` returns 200 OK for every N (tested 2 through 8) but always serves the same first page. The path looks like real pagination but is purely JS-driven. Catching this kind of fake pagination is what the new fixture-based regression test (`westword.test.ts`) is for.
- **PRD's recommended VisitDenver URL was a dead end.** `/events/calendar/` is fully JS-rendered (0 event links statically). The right URL was `/events/` — the same root we already had in `BASE`, but never used in the old RSS-only scraper.
- **Local `.env` DATABASE_URL is unmigrated.** Discovered while trying to capture before-numbers locally — the local DB has no `Event.isArchived` column and no `ScraperRun` table, meaning the prod schema has drifted ahead of whatever this DB was last seeded from. Not a PR-2 concern but worth flagging: anyone running scripts against this DATABASE_URL will hit P2022/P2021 errors. (Production migrations apply via `prisma migrate deploy` on Vercel build.)

### Follow-ups not in this PR

- **Westword Playwright/Puppeteer** to break the static ceiling and capture the full ~47-event listing.
- **Weekly fixture-refresh cron** that re-fetches the live HTML and asserts the parser still produces ≥N events; would actually close the silent-decay loop instead of just catching it after-the-fact.
- **Slack / push alert when `coverageAnomaly=true`.** Manual-check workflow is fine for beta but not durable.
- **Per-source target counts** in config; compute "% of expected" in addition to relative-to-median (catches gradual decay the median can't see).
- **Unit tests + fixtures for the other existing scrapers** (do303, red-rocks, regional Simpleview RSS feeds).
