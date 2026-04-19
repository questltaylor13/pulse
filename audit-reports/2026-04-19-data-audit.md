# Pulse Data Audit — 2026-04-19

Phase 0 deliverable for `PRD/data-refresh-and-reliability.md`. Read-only audit (Section B writes only if `AUDIT_CONFIRM=1`).

## Summary

- Scrapers returning 0 silently: **0** (none)
- Scrapers erroring: **0** (none)
- Scrapers not configured: **2** (ticketmaster, eventbrite)
- Future events in DB: **380**
- Places in DB: **460** (localFav=268, isNew=15, opened<45d=0)
- Events with qualityScore persisted: **1296** (expected 0 — see Section F)

## A. Scraper health

| Source                  | Status         | Raw count | Errors | Duration (ms) | Notes                                                     |
| ----------------------- | -------------- | --------- | ------ | ------------- | --------------------------------------------------------- |
| do303                   | ok             | 25        | -      | 851           | e.g. "Wiz Khalifa"                                        |
| westword                | ok             | 12        | -      | 222           | e.g. "First Round: Los Angeles Kings at Colorado Avalanc" |
| red-rocks               | ok             | 171       | -      | 2231          | e.g. "Wiz Khalifa"                                        |
| visit-denver            | ok             | 18        | -      | 461           | e.g. "'Round the Clock"                                   |
| chautauqua              | ok             | 56        | -      | 2869          | e.g. "Colorado Chautauqua History Tour"                   |
| pikes-peak-center       | ok             | 34        | -      | 345           | e.g. "Southern Colorado In Harmony Festival"              |
| visit-estes-park        | ok             | 22        | -      | 1904          | e.g. ""Reflections on Light and color""                   |
| visit-golden            | ok             | 15        | -      | 275           | e.g. "2026 Members’ Show"                                 |
| visit-steamboat-chamber | ok             | 10        | -      | 438           | e.g. "Patio Days Sale"                                    |
| ticketmaster            | not configured | 0         | -      | 0             | env var TICKETMASTER_API_KEY not set                      |
| eventbrite              | not configured | 0         | -      | 0             | env var EVENTBRITE_TOKEN not set                          |

Sum of raw events across sources: **363**

### Sample titles (sanity check)

- **do303**: "Wiz Khalifa", "Shayfer James", "Phoneboy with Heart Attack Man, Slow Joy, Pony"
- **westword**: "First Round: Los Angeles Kings at Colorado Avalanche Rd 1 Hm Gm 1", "First Round – Avs Alley: LA Kings At Colorado Avalanche Rd 1 Hm Gm 1", "Colorado Rockies vs. Los Angeles Dodgers"
- **red-rocks**: "Wiz Khalifa", "Ice Cube & Snoop Dogg", "Ethel Cain"
- **visit-denver**: "'Round the Clock", "2026 Staff & Volunteer Showcase", "2026 Staff & Volunteer Showcase"
- **chautauqua**: "Colorado Chautauqua History Tour", "Qigong For Everyone", "Reed Foehl with Andy Mann – SOLD OUT!"
- **pikes-peak-center**: "Southern Colorado In Harmony Festival", "Marsalis / Rachmaninoff", "Mrs. Doubtfire"
- **visit-estes-park**: ""Reflections on Light and color"", "Haunted Ghost Tours @ The Historic Park Theatre", "Macdonald Book Shop Storytimes - Mondays @9:30am"
- **visit-golden**: "2026 Members’ Show", "Book Fair for Adults!", "dadweed"
- **visit-steamboat-chamber**: "Patio Days Sale", "Game Nite", "OPEN MIC NIGHT"

## B. Pipeline full run

_AUDIT_CONFIRM not set — Section B skipped._ To run: `AUDIT_CONFIRM=1 npm run audit` (or invoke the script directly).

## C. Database state

### Events

| Metric                  | Value                    |
| ----------------------- | ------------------------ |
| Total events            | 2085                     |
| Future events (active)  | 380                      |
| Archived                | 1701                     |
| Published (status)      | 2085                     |
| With qualityScore       | 1296                     |
| With oneLiner           | 1296                     |
| With noveltyScore       | 1296                     |
| Oldest future startTime | 2026-04-19T14:45:00.000Z |
| Newest future startTime | 2027-06-16T00:00:00.000Z |

**Future events by category:**

| Category       | Count |
| -------------- | ----- |
| LIVE_MUSIC     | 201   |
| ART            | 61    |
| OTHER          | 52    |
| OUTDOORS       | 15    |
| ACTIVITY_VENUE | 13    |
| FOOD           | 10    |
| SOCIAL         | 10    |
| FITNESS        | 7     |
| BARS           | 5     |
| SEASONAL       | 4     |
| COMEDY         | 2     |

**Future events by source:**

| Source            | Count |
| ----------------- | ----- |
| red-rocks         | 171   |
| chautauqua        | 56    |
| pulse-curated     | 41    |
| pikes-peak-center | 34    |
| do303             | 23    |
| visit-estes-park  | 13    |
| llm-research-mtn  | 12    |
| visit-denver      | 11    |
| visit-golden      | 10    |
| westword          | 8     |
| 303magazine       | 1     |

### Places

| Metric                     | Value                    |
| -------------------------- | ------------------------ |
| Total places               | 460                      |
| Local favorites            | 268                      |
| isNew = true               | 15                       |
| openedDate >= 45d ago      | 0                        |
| Last updated (most recent) | 2026-04-18T11:39:37.340Z |
| Oldest updatedAt           | 2026-02-22T18:16:06.316Z |

**Places by category:**

| Category       | Count |
| -------------- | ----- |
| BARS           | 88    |
| FITNESS        | 82    |
| RESTAURANT     | 66    |
| COFFEE         | 56    |
| ACTIVITY_VENUE | 55    |
| ART            | 54    |
| OUTDOORS       | 32    |
| LIVE_MUSIC     | 23    |
| FOOD           | 4     |

**Places by openingStatus:**

| openingStatus | Count |
| ------------- | ----- |
| OPEN          | 444   |
| COMING_SOON   | 11    |
| SOFT_OPEN     | 5     |

### Neighborhoods

| Metric   | Value |
| -------- | ----- |
| Total    | 12    |
| Featured | 12    |

## D. Feed-surface coverage

### Events tab — counts per rail category

| Rail     | Today | Weekend | New in Denver (places) | Outside events | Outside places |
| -------- | ----- | ------- | ---------------------- | -------------- | -------------- |
| all      | 34    | 34      | 15                     | 296            | 0              |
| music    | 21    | 21      | 0                      | 180            | 0              |
| food     | 2     | 2       | 9                      | 9              | 0              |
| weird    | 0     | 0       | 0                      | 0              | 0              |
| offbeat  | 0     | 0       | 6                      | 0              | 0              |
| art      | 5     | 5       | 1                      | 46             | 0              |
| outdoors | 0     | 0       | 0                      | 9              | 0              |
| comedy   | 0     | 0       | 0                      | 0              | 0              |
| popup    | 0     | 0       | 0                      | 0              | 0              |

### Places tab — counts per rail category

| Rail        | New in Denver | Neighborhoods | Local favs | Date night | Groups | Work-friendly |
| ----------- | ------------- | ------------- | ---------- | ---------- | ------ | ------------- |
| all         | 15            | 12            | 268        | 0          | 0      | 0             |
| restaurants | 4             | 12            | 34         | 0          | 0      | 0             |
| bars        | 3             | 12            | 61         | 0          | 0      | 0             |
| coffee      | 2             | 12            | 48         | 0          | 0      | 0             |
| outdoors    | 0             | 12            | 20         | 0          | 0      | 0             |
| venues      | 3             | 12            | 10         | 0          | 0      | 0             |
| nightlife   | 3             | 12            | 73         | 0          | 0      | 0             |

_Outside-the-city scope: events/places whose `neighborhood` matches one of: Idaho Springs, Morrison, Boulder, Golden, Evergreen, Estes Park, Fort Collins, Colorado Springs, Palisade, Breckenridge, Vail, Aspen._

## E. Cron health (manual)

Run `vercel logs --since=14d` (or inspect the Vercel dashboard) and fill in the table below.

| Endpoint                              | Schedule   | Runs | OK | Failed | Most recent failure (truncate) |
| ------------------------------------- | ---------- | ---- | -- | ------ | ------------------------------ |
| /api/cron/scrape-and-revalidate       | 0 11 * * * |      |    |        |                                |
| /api/cron/archive-stale-events        | 0 10 * * * |      |    |        |                                |
| /api/cron/refresh-neighborhood-counts | 0 9 * * *  |      |    |        |                                |
| /api/cron/refresh-places?chunk=0      | 0 7 * * 0  |      |    |        |                                |
| /api/cron/refresh-places?chunk=1      | 10 7 * * 0 |      |    |        |                                |
| /api/cron/refresh-places?chunk=2      | 20 7 * * 0 |      |    |        |                                |
| /api/cron/refresh-guide-counts        | 30 9 * * * |      |    |        |                                |
| /api/cron/cleanup-cache               | 0 4 * * *  |      |    |        |                                |
| /api/cron/backfill-walk-times         | 0 12 * * * |      |    |        |                                |

Also confirm: `CRON_SECRET` env var is set in Vercel? **[y/n]**

## F. PRD vs reality — flagged gaps

Items where `PRD/data-refresh-and-reliability.md` assumptions diverge from current code. Phases 1–4 should be re-scoped against these.

1. **Stale-event filter already exists.** `lib/queries/events.ts:activeEventsWhere()` filters `startTime >= now` AND `isArchived = false` on every events-tab query. Phase 1.2 is mostly done; only recurring-event next-occurrence tracking remains.
2. **Archive cron already exists.** `/api/cron/archive-stale-events` runs daily at 10am UTC (see `vercel.json`).
3. ~~**Dedup key is `title + date`, not `title + venue + date`**~~ **Fixed 2026-04-18.** `deduplicateEvents` now keys on `normalizedTitle | normalizedVenue | YYYY-MM-DD`.
4. ~~**No quality_score drop filter.**~~ **Fixed 2026-04-18.** `runAllScrapers()` now flips `isArchived: true` on events with `qualityScore < PULSE_QUALITY_CUTOFF` (default 5, tunable via env). Archived events are excluded from the home feed by `activeEventsWhere()`. Return value gained a `dropped` counter.
5. ~~**Inline-scrape enrichment drops scores.**~~ **Fixed 2026-04-18.** `lib/scrapers/index.ts` now persists `qualityScore`, `noveltyScore`, `oneLiner`, and a validated category override on the nightly-cron path. Today's qualityScore count: 1296.
6. **"New in Denver" is not arbitrarily lying.** It already queries `isNew: true OR openedDate >= 45daysAgo` (`components/home/fetch-home-feed.ts` + `lib/home/places-section-filters.ts`). If Rosetta Hall/Retrograde show as "new," their seed rows have `isNew=true` set. PRD §3.3 fix: unset `isNew` on stale seeds (or rename section to "Just added").
7. ~~**No `isDayTrip` field on Event.**~~ **Resolved 2026-04-18** by PRD 2 Phase 0 migration. Event + Place now have `region` (enum) + `isDayTrip` + `isWeekendTrip` + `townName` + `driveNote`, and `outsideDenverWhere()` prefers the enum with the neighborhood whitelist as fallback.
8. **No `ScraperRun` table.** Phase 4 work — every scrape currently logs only to stdout and the returned counts object. No historical observability.
9. **Places weekly cron already exists.** `/api/cron/refresh-places` runs Sundays with three chunked invocations (07:00, 07:10, 07:20 UTC). PRD §3.4 is already implemented.
10. **Facebook Events, pro sports, Meetup are explicit non-goals** per PRD. Honored.

## G. Recommended Phase 1 priorities

Ordered from highest-leverage to lowest, derived from A–F. Quest to approve before Phase 1 kickoff.

1. **Configure API scrapers:** set TICKETMASTER_API_KEY, EVENTBRITE_TOKEN in Vercel to enable ticketmaster, eventbrite. Currently returning 0.
2. **Correct "New in Denver" seeds (Section F #6).** Either clear `isNew=true` on pre-existing seeds or rename the section UI to "Just added on Pulse."
3. **Backfill scores on older events (optional).** Run `npm run events:enrich` against the 600+ events still missing `qualityScore`. Only needed if the quality filter is flagging gaps on pre-2026-04-18 rows.
4. **Defer `ScraperRun` table to Phase 4** as scoped. Add structured stdout logs in Phase 1 as a bridge (per-source raw/inserted/updated/duration).

---

Report generated at 2026-04-19T14:19:07.550Z against `postgresql://***@ep-dry-haze-ahu9d7li-pooler.c-3.us-east-1.aws.neon.tech/neondb`.
