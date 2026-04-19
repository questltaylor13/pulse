# PRD: Data Refresh & Reliability

**Owner:** Quest
**Status:** Ready for implementation
**Companion doc (next):** `discoveries-engine.md` — handles the unique/participatory/hidden-gem content layer. Do not scope-creep that into this PRD.

---

## Context

Pulse is deployed and demo-ready, but the feed is visibly thin. Current symptoms (confirmed via live app screenshots):

- The **Today** section on the Events tab is empty ("No events today. Check out this weekend →")
- The **This weekend's picks** section shows only 2 items
- The **New in Denver** places section on both Events and Places tabs still shows the original seed items (Rosetta Hall, Retrograde Coffee) — not actually "new"
- The **Outside the city** section appears empty
- Filter chips exist for Restaurants / Bars / Coffee / Outdoors / Venues but the underlying data coverage per category is unverified

Quest is about to start using the app daily this week for real, and needs the feed to feel **full, fresh, and high-quality** — not stale or empty. "More events" is the goal, but **not at the cost of quality.** Pulse's differentiator is curation, not volume. Quality score < 5 still gets dropped.

This PRD covers refreshing what exists, expanding the event source list to the highest-value additions, refreshing places data, and making the daily pipeline reliable. It explicitly **does not** cover the Discoveries engine — that's PRD 2 and handles the "unique/weird/community-validated" content layer separately.

---

## Goals

1. Diagnose what's actually broken vs. what's just stale in the existing pipeline
2. Fix broken scrapers and refresh all existing sources
3. Expand event sources to 4–6 high-value additions (concert venues, comedy, botanic gardens, etc.)
4. Refresh places: verify existing, archive closed, add 20–30 net-new venues
5. Make the daily cron reliable and observable (structured logs, admin status endpoint, manual refresh button)
6. End state: the feed looks full and high-quality when Quest opens the app on any random day this week

## Non-goals

- Adding the Discoveries content layer (PRD 2)
- Adding Meetup, Reddit, or niche club scraping (PRD 2)
- Adding Facebook Events (hostile to scraping, skip permanently)
- Adding pro sports schedules (no discovery value, available everywhere else)
- Adding a new SPORTS category (existing categories cover participatory/rec events fine)
- Building ambassador/partnership tooling
- Paid APIs beyond what's already in the stack (no SportRadar, no paid Eventbrite API tier without explicit approval)

---

## Work is phased. After each phase, report back and wait for approval before moving on.

---

## PHASE 0 — AUDIT (report only, no changes)

Before touching anything, produce a written audit report covering:

### 0.1 Scraper health
For each existing scraper (Do303, Eventbrite, Westword, Visit Denver):
- Run it once against production and capture: raw event count, count after AI quality filter, count actually upserted to DB
- Note whether HTML selectors still work, or if the site structure has changed
- Flag any scraper that returns 0 — almost certainly broken silently
- Note any anti-bot/rate-limiting responses (403, 429, captcha pages)

### 0.2 Database state
- Total events in DB
- Events with `startsAt >= today` (the actual useful count for the feed)
- Events per Category
- Events per source
- Oldest and newest `startsAt` dates
- Places: total count, breakdown by Category, last update timestamp

### 0.3 Cron health
- Check Vercel cron logs for the past 14 days: is `/api/events/scrape` actually firing? Succeeding? Failing silently?
- If failing, capture the error

### 0.4 Feed-surface coverage
For each surface visible in the app UI, report how many items are actually populated:
- Today (events with `startsAt` within today)
- This weekend's picks (Fri–Sun)
- New in Denver (places)
- Outside the city (events with venues outside Denver metro)
- Each filter chip on Events tab (Music, Food, Weird, Off-beat, All)
- Each filter chip on Places tab (Restaurants, Bars, Coffee, Outdoors, Venues, All)

This tells us exactly which sections are empty and why.

### 0.5 Report format
Markdown report committed to `audit-reports/YYYY-MM-DD-data-audit.md`. Wait for Quest's approval on priorities before starting Phase 1.

---

## PHASE 1 — FIX & REFRESH EXISTING SOURCES

### 1.1 Fix broken scrapers
Based on Phase 0 findings:
- Update HTML selectors for any scraper returning 0 or thin results
- If Eventbrite's HTML scraper is being blocked/thin, evaluate Eventbrite's free public API as a replacement. **Do not** pay for the premium tier without approval.
- Handle pagination properly — several of these sources paginate, and a single-page scrape only gets the top 20 or so events

### 1.2 Filter out stale events
- Events with `startsAt < now()` should not appear in the feed. Add a filter at the query layer — do not delete the rows (useful for analytics later)
- For recurring events, make sure the next occurrence is tracked, not the original date

### 1.3 Full re-scrape
- Run all fixed scrapers against production
- Target: events covering the next 90 days
- Every new event goes through the existing OpenAI GPT-4o-nano enrichment pass (quality_score, category, tags, one_liner)
- Anything scored < 5 gets dropped, not stored

### 1.4 Today-relevance guarantee
- After the scrape, verify the Today section has at least 3 events for today (if there are genuinely 0 real events today, the section should gracefully fall back to "Happening tonight" or "Tomorrow" instead of feeling empty)
- This is a UI/copy decision as much as a data one — flag to Quest if the empty-state copy needs tweaking

---

## PHASE 2 — EXPAND EVENT SOURCES

Add the following scrapers, each in its own file under `lib/scrapers/`. One broken source must not block the rest — wrap each in try/catch, log failures, continue.

### 2.1 High-value additions (in priority order)

**1. Red Rocks concert calendar** (`redrocksonline.com/events`)
- High-signal, iconic venue, fills the Music category

**2. Comedy Works schedule** (`comedyworks.com`)
- Fills the comedy gap; most comedy isn't on Eventbrite
- Denver and Landmark (Greenwood Village) locations

**3. Denver Botanic Gardens events** (`botanicgardens.org/events`)
- High-quality, seasonal, Outdoors + Art categories

**4. Meow Wolf Denver** (`meowwolf.com/visit/denver`)
- Concerts + immersive art events, unique to Denver

**5. Mission Ballroom + Ogden + Bluebird + Gothic Theatre**
- AEG Presents venues — consider checking if there's a unified AEG Denver calendar before scraping each individually
- If they render via JS, flag it and skip for now (no Puppeteer without approval)

**6. City of Denver official events calendar**
- Verify no overlap with Visit Denver before adding; if overlap is > 80%, skip

### 2.2 Day-trip content (addresses the empty "Outside the city" section)
Add a tagged scrape for:
- Boulder events (boulderdowntown.com or similar)
- Morrison / Red Rocks area (already covered above)
- Fort Collins, Golden, Estes Park — light-touch, pick the single best-curated source per town

Tag these events with a `isDayTrip: true` flag or equivalent so the "Outside the city" section has real data.

### 2.3 Pre-scrape check
Before writing each scraper, verify:
- robots.txt permits scraping
- Site doesn't require heavy JS rendering (no Puppeteer without approval)
- Reasonable HTML structure
- Not ToS-hostile (if yes, flag for a partnership/API conversation, skip for now)

### 2.4 Dedup verification
The orchestrator dedupes on (title + venue + date). Verify this still works across the expanded source set — Red Rocks shows will overlap heavily with Eventbrite and Do303. If dedup is imperfect, tighten the match logic.

---

## PHASE 3 — PLACES REFRESH

Places don't change daily, but the current data is stale and the "New in Denver" section is lying about its content.

### 3.1 Verify existing 52 seeded places
- For each place, call Google Places API and check `business_status`
- Anything `CLOSED_PERMANENTLY` or `CLOSED_TEMPORARILY`: move to archived state, remove from feed

### 3.2 Add 20–30 net-new high-quality places
- Use Google Places API to find venues in Denver matching Pulse categories (ART, OUTDOORS, FITNESS, ACTIVITY_VENUE, COFFEE, BARS, FOOD, RESTAURANT)
- Prioritize places with recent high review volume (proxy for "newly popular/opened")
- Run through the same AI enrichment pass so they have Pulse voice, not generic Google descriptions
- Each place needs: name, neighborhood, price tier, 3–4 vibe tags, Pulse one-liner

### 3.3 "New in Denver" section truth
The section currently shows Rosetta Hall and Retrograde Coffee as "recently opened" — they're not. Either:
- Add a `createdAt` / `addedToPulseAt` filter so the section genuinely shows the most recently added places, OR
- If actual-opening-date data isn't available, rename the section to "Fresh on Pulse" or "Just added" — truthful copy instead of misleading copy

Quest to decide between options. Flag it in the report.

### 3.4 Cron cadence
Places refresh runs **weekly**, not daily. Add a separate cron entry in `vercel.json` — Sunday night is fine. Daily scraping of static places is wasteful and hits Google Places API quotas for no reason.

---

## PHASE 4 — DAILY RELIABILITY & OBSERVABILITY

### 4.1 Structured logging
Every scraper run logs, per source:
- Source name
- Raw event count
- Count after quality filter
- Count inserted / updated
- Duration (ms)
- Errors (stringified)

Persist these runs to a `ScraperRun` table in Prisma. Keep 30 days of history.

### 4.2 Admin status endpoint
Build `/api/admin/scraper-status`, auth-gated (Quest only — use existing NextAuth session + email allowlist).

Returns the last 7 days of runs per source: success/fail, counts, durations. JSON response is fine; no need to build a full dashboard UI yet. A simple admin page at `/admin/scrapers` that renders this would be nice-to-have, not required.

### 4.3 Failure signals
If a source returns 0 events two consecutive days, mark it `degraded: true` in the status endpoint response. This is Quest's signal to investigate.

No email/SMS alerts yet — just make the status endpoint easy to check.

### 4.4 Manual refresh button
Add a "Refresh now" button on the admin page (or as a POST endpoint Quest can curl) that triggers a full pipeline run on demand. Useful when Quest notices the feed feels stale mid-week.

### 4.5 Verify the existing cron actually fires
- Confirm `vercel.json` cron config is correct
- Confirm `CRON_SECRET` is set in Vercel env
- Check the last 14 days of Vercel cron execution logs
- If the cron has been silently failing, that explains a lot of the staleness — fix first

---

## PHASE 5 — END-TO-END VERIFICATION

After all phases complete:

### 5.1 Full pipeline run
Run the entire refresh — events + places — against production.

### 5.2 Final counts report
Report:
- Total future events (target: 300+)
- Events per Category (every category should have ≥ 5 future events, or flag it)
- Events per source (every source should have contributed, or flag as broken)
- Total active places (target: 70+ after additions and archives)
- Events tagged `isDayTrip: true` (target: 20+)

### 5.3 Visual verification
Load the app as a user. For each surface in the app UI, confirm it's populated:
- Today section has ≥ 3 events OR graceful fallback copy
- This weekend's picks has ≥ 5 events
- Each Events filter chip (Music, Food, Weird, Off-beat) returns results
- Each Places filter chip (Restaurants, Bars, Coffee, Outdoors, Venues) returns results
- New in Denver shows genuinely new-to-Pulse content (or section is renamed)
- Outside the city shows ≥ 5 day-trip events

Screenshot the Events tab and Places tab top-of-feed. Attach to the final report.

### 5.4 Update PULSE_STATUS.md
- New scraper sources
- New cron jobs (events daily, places weekly)
- New admin endpoints
- Any source that's known-fragile or on a watch-list
- Removed/archived places count

---

## Ground rules

- Respect robots.txt and reasonable rate limits (1 request/sec/source is a safe default)
- If a site's ToS explicitly prohibits scraping, flag it and skip — note it for a future partnership conversation
- Quality filter stays strict. Volume without quality defeats the product.
- Do not add paid APIs, paid services, or new infrastructure (queues, Redis, Puppeteer) without explicit approval
- Ask clarifying questions before starting any phase if anything is ambiguous
- Each phase ends with a report and a pause for Quest's review — do not chain phases without approval

---

## Start with Phase 0. Produce the audit report and wait for approval.
