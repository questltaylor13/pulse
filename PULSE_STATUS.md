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
