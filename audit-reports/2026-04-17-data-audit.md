# Pulse Data Audit — 2026-04-17

Phase 0 deliverable for `PRD/data-refresh-and-reliability.md`. Read-only audit (Section B writes only if `AUDIT_CONFIRM=1`).

## Summary

- Scrapers returning 0 silently: **0** (none)
- Scrapers erroring: **1** (303magazine)
- Scrapers not configured: **2** (ticketmaster, eventbrite)
- Future events in DB: **258**
- Places in DB: **460** (localFav=0, isNew=15, opened<45d=0)
- Events with qualityScore persisted: **1290** (expected 0 — see Section F)

## A. Scraper health

| Source       | Status         | Raw count | Errors                                                   | Duration (ms) | Notes                                                     |
| ------------ | -------------- | --------- | -------------------------------------------------------- | ------------- | --------------------------------------------------------- |
| 303magazine  | error          | 0         | 303 Magazine: no events found via JSON-LD or DOM parsing | 173           | -                                                         |
| do303        | ok             | 25        | -                                                        | 707           | e.g. "Drew and Ellie Holcomb Never Gonna Let You Go Tour" |
| westword     | ok             | 12        | -                                                        | 218           | e.g. "BKFC 88 Denver"                                     |
| red-rocks    | ok             | 173       | -                                                        | 2186          | e.g. "Sublime"                                            |
| visit-denver | ok             | 13        | -                                                        | 405           | e.g. "$5 | $8 | $12 Happy Hour"                           |
| ticketmaster | not configured | 0         | -                                                        | 0             | env var TICKETMASTER_API_KEY not set                      |
| eventbrite   | not configured | 0         | -                                                        | 0             | env var EVENTBRITE_TOKEN not set                          |

Sum of raw events across sources: **223**

### Sample titles (sanity check)

- **do303**: "Drew and Ellie Holcomb Never Gonna Let You Go Tour", "Bilmuri, The Home Team, GANG!", "Sublime"
- **westword**: "BKFC 88 Denver", "Colorado Rockies vs. Los Angeles Dodgers", "Come from Away"
- **red-rocks**: "Sublime", "Sublime", "Wiz Khalifa"
- **visit-denver**: "$5 | $8 | $12 Happy Hour", "'Round the Clock", "2026 Staff & Volunteer Showcase"

## B. Pipeline full run

_AUDIT_CONFIRM not set — Section B skipped._ To run: `AUDIT_CONFIRM=1 npm run audit` (or invoke the script directly).

## C. Database state

### Events

| Metric                  | Value                    |
| ----------------------- | ------------------------ |
| Total events            | 1879                     |
| Future events (active)  | 258                      |
| Archived                | 1590                     |
| Published (status)      | 1879                     |
| With qualityScore       | 1290                     |
| With oneLiner           | 1290                     |
| With noveltyScore       | 1290                     |
| Oldest future startTime | 2026-04-18T00:00:00.000Z |
| Newest future startTime | 2027-06-16T00:00:00.000Z |

**Future events by category:**

| Category       | Count |
| -------------- | ----- |
| LIVE_MUSIC     | 193   |
| ART            | 14    |
| ACTIVITY_VENUE | 12    |
| SOCIAL         | 9     |
| OUTDOORS       | 8     |
| OTHER          | 6     |
| FITNESS        | 5     |
| BARS           | 4     |
| FOOD           | 3     |
| SEASONAL       | 2     |
| COMEDY         | 2     |

**Future events by source:**

| Source        | Count |
| ------------- | ----- |
| red-rocks     | 172   |
| pulse-curated | 44    |
| do303         | 22    |
| visit-denver  | 12    |
| westword      | 7     |
| 303magazine   | 1     |

### Places

| Metric                     | Value                    |
| -------------------------- | ------------------------ |
| Total places               | 460                      |
| Local favorites            | 0                        |
| isNew = true               | 15                       |
| openedDate >= 45d ago      | 0                        |
| Last updated (most recent) | 2026-02-22T18:40:54.683Z |
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
| all      | 28    | 34      | 15                     | 172            | 0              |
| music    | 19    | 22      | 0                      | 172            | 0              |
| food     | 1     | 1       | 9                      | 0              | 0              |
| weird    | 1     | 2       | 0                      | 0              | 0              |
| offbeat  | 0     | 0       | 6                      | 0              | 0              |
| art      | 3     | 4       | 1                      | 0              | 0              |
| outdoors | 1     | 2       | 0                      | 0              | 0              |
| comedy   | 0     | 0       | 0                      | 0              | 0              |
| popup    | 0     | 0       | 0                      | 0              | 0              |

### Places tab — counts per rail category

| Rail        | New in Denver | Neighborhoods | Local favs | Date night | Groups | Work-friendly |
| ----------- | ------------- | ------------- | ---------- | ---------- | ------ | ------------- |
| all         | 15            | 12            | 0          | 0          | 0      | 0             |
| restaurants | 4             | 12            | 0          | 0          | 0      | 0             |
| bars        | 3             | 12            | 0          | 0          | 0      | 0             |
| coffee      | 2             | 12            | 0          | 0          | 0      | 0             |
| outdoors    | 0             | 12            | 0          | 0          | 0      | 0             |
| venues      | 3             | 12            | 0          | 0          | 0      | 0             |
| nightlife   | 3             | 12            | 0          | 0          | 0      | 0             |

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
3. **Dedup key is `title + date`, not `title + venue + date`** (`lib/scrapers/index.ts` `deduplicateEvents`). Phase 2.4 assumption is off — dedup is looser than the PRD describes and will collapse same-title events at different venues on the same day.
4. **No quality_score drop filter.** PRD §1.3 says "anything scored < 5 gets dropped." No such filter exists today; every scraped+deduped event is persisted. Expect `eventsWithQualityScore=0` in Section C.
5. **Inline-scrape enrichment drops scores.** `lib/scrapers/index.ts` line ~188 persists only `description, tags, vibeTags, companionTags, isDogFriendly, isDrinkingOptional, isAlcoholFree`. The GPT call returns `qualityScore`, `noveltyScore`, `oneLiner`, and a category override — all **dropped** on the nightly-cron path. (Backfill via `scripts/enrich-all-events.ts` lines 87–90 *does* persist them, which is why 1290 existing events have scores.) This still blocks the quality<5 filter for new events and is a prerequisite for Phase 1.
6. **"New in Denver" is not arbitrarily lying.** It already queries `isNew: true OR openedDate >= 45daysAgo` (`components/home/fetch-home-feed.ts` + `lib/home/places-section-filters.ts`). If Rosetta Hall/Retrograde show as "new," their seed rows have `isNew=true` set. PRD §3.3 fix should be: unset `isNew` on stale seeds (or rename section to "Just added").
7. **No `isDayTrip` field on Event.** "Outside the city" is driven by a hardcoded `OUTSIDE_DENVER_REGIONS` neighborhood list in `lib/queries/events.ts`. Phase 2.2 proposes `isDayTrip` — decide whether to add that field or keep the neighborhood-list approach (cheaper, already working).
8. **No `ScraperRun` table.** Phase 4 work — every scrape currently logs only to stdout and the returned counts object. No historical observability.
9. **Places weekly cron already exists.** `/api/cron/refresh-places` runs Sundays with three chunked invocations (07:00, 07:10, 07:20 UTC). PRD §3.4 is already implemented.
10. **Facebook Events, pro sports, Meetup are explicit non-goals** per PRD. Honored.

## G. Recommended Phase 1 priorities

Ordered from highest-leverage to lowest, derived from A–F. Quest to approve before Phase 1 kickoff.

1. **Resolve erroring scrapers:** 303magazine. See errors column in Section A.
2. **Configure API scrapers:** set TICKETMASTER_API_KEY, EVENTBRITE_TOKEN in Vercel to enable ticketmaster, eventbrite. Currently returning 0.
3. **Persist AI enrichment outputs (Section F #5).** Add `qualityScore`, `noveltyScore`, `oneLiner`, and GPT's category override to the update block in `lib/scrapers/index.ts`. This is a prerequisite for the quality filter.
4. **Implement the quality<5 drop (Section F #4).** After #5 persists scores, drop events scoring <5 at upsert time. Put the threshold behind an env var for easy tuning.
5. **Tighten dedup to `title + venue + date` (Section F #3).** Prevents same-title-different-venue events (common across AEG venues + Eventbrite) from collapsing.
6. **Correct "New in Denver" seeds (Section F #6).** Either clear `isNew=true` on pre-existing seeds or rename the section UI to "Just added on Pulse."
7. **Defer `ScraperRun` table to Phase 4** as scoped. Add structured stdout logs in Phase 1 as a bridge (per-source raw/inserted/updated/duration).

---

Report generated at 2026-04-17T23:27:43.869Z against `postgresql://***@ep-dry-haze-ahu9d7li-pooler.c-3.us-east-1.aws.neon.tech/neondb`.
