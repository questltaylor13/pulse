# PRD 2: Regional Expansion

**Owner:** Quest
**Status:** Ready for implementation (ships after PRD 1 is stable and producing reliable daily runs)
**Prior context:** PRD 1 (`data-refresh-and-reliability.md`) shipped — Denver event and place pipelines are live, daily cron is reliable, admin observability is in place.
**Companion docs (later):** PRD 3 (`hidden-gems-engine.md`), PRD 4 (`matching-engine.md`)

---

## Context

PRD 1 built a solid Denver-centric event and place pipeline. But Pulse's most emotionally compelling product surface isn't "what's happening in Denver tonight" — it's "I had no idea that was happening in Nederland / Fort Collins / Breckenridge." The latter rewards curiosity and triggers the core Pulse feeling: *how did Pulse know about that?*

Regional content is structurally different from local content in three ways the existing pipeline doesn't handle:

1. **Coverage geography is wider and more fragmented.** A 2-hour radius from Denver spans 15+ distinct towns (Boulder, Fort Collins, Colorado Springs, Estes Park, Nederland, Idaho Springs, Georgetown, Breckenridge, Keystone, Winter Park, Glenwood area) plus destination mountain towns (Vail, Steamboat, Crested Butte, Aspen, Telluride). No single aggregator covers all of these well. Each town has its own event ecosystem.

2. **User framing is different.** Denver events = "show up." Regional events = "is it worth the drive?" The card UI, sort logic, and metadata requirements are genuinely different.

3. **Cadence and expectations differ.** Regional events are often planned further in advance (festivals, races, seasonal openings). A weekly scrape is usually sufficient; daily is overkill for most regional sources.

**User's travel profile (confirmed):** Day trip or occasional overnight, ~2-hour radius, with separate treatment for mountain towns as weekend destinations. All content categories in scope — the point is discovery, not category specialization.

---

## Goals

1. Add structured event + place coverage for a defined 2-hour radius from Denver across all Pulse categories
2. Add separate, clearly-tagged coverage for mountain town weekend destinations (beyond the 2-hour radius but high emotional/travel value)
3. Surface regional content in the app with distinct framing that signals "this is outside Denver" and communicates drive-time + worth-the-drive context
4. Integrate regional content into existing category filters without walling it off — a regional art festival should be findable under "Art," not hidden in a separate tab
5. Respect the weekly cadence for most regional sources (daily only where the source genuinely changes daily)
6. End state: when Quest opens Pulse on a Friday, the feed surfaces 5–10 compelling regional options alongside Denver events, clearly distinguishable and filterable

## Non-goals

- Building a separate "Regional" tab as the primary surfacing mechanism (integration is the goal, not segregation)
- Hotel/lodging recommendations or booking integration (out of scope — Pulse is discovery, not OTA)
- Drive-time calculation via Google Maps API in real time (use static approximations; real-time routing is future work)
- Expanding beyond the defined geography (no Salt Lake City, Santa Fe, Wyoming — stay in scope)
- Weather integration (useful for mountain content, but ships in a later PRD)
- Transportation logistics (parking, shuttles, etc.) — surface destination info only

---

## Geography & tiering

Regional coverage is **tiered by town size and source quality**, not scraped uniformly. Three tiers:

### Tier 1 — Front Range hubs (dedicated scrapers, weekly cadence)
Significant event ecosystems, well-structured local calendars, high volume:
- **Boulder** — boulderdowntown.com, Boulder Theater, Fox Theatre, Chautauqua events
- **Fort Collins** — downtownfortcollins.com, Lincoln Center, Mishawaka concerts, Old Town events
- **Colorado Springs** — visitcos.com, Pikes Peak Center, Broadmoor events

### Tier 2 — Mountain gateway + near towns (lighter scrapers, weekly cadence)
Smaller ecosystems but still high-value for day trips:
- **Estes Park** — visitestespark.com events calendar
- **Nederland** — nederlandchamber.org or community events
- **Idaho Springs / Georgetown / Winter Park** — grouped; chamber or visitor bureau sites
- **Golden** — visitgolden.com, Miners Alley Playhouse

### Tier 3 — Mountain weekend destinations (LLM research + seasonal scrapers)
Too far for daily, but high-signal destinations. These don't need comprehensive coverage — they need the *big ticket items* that are worth driving for:
- Breckenridge, Keystone, Vail, Beaver Creek, Steamboat, Winter Park, Crested Butte, Aspen/Snowmass, Telluride
- Source strategy: town visitor bureau calendars (gobreck.com, visitvail.com, etc.) for big events; LLM research pass to catch festivals, races, and seasonal happenings that don't show up on structured calendars

### The 2-hour radius rule
For Tiers 1 and 2, geographic qualification is straightforward. For Tier 3, content is always tagged `isWeekendTrip: true` to distinguish it from day-trip content — regardless of actual drive time. This matches user mental model, not raw mileage.

---

## Work is phased. After each phase, report back and wait for approval.

---

## PHASE 0 — SCHEMA & METADATA

### 0.1 Event schema additions

Add the following fields to the existing `Event` model (via Prisma migration):

```prisma
model Event {
  // ... existing fields

  // Regional metadata
  region          EventRegion @default(DENVER_METRO)
  townName        String?     // "Boulder", "Breckenridge", "Fort Collins", null for Denver metro
  isDayTrip       Boolean     @default(false)
  isWeekendTrip   Boolean     @default(false)
  driveTimeMin    Int?        // Approximate minutes from downtown Denver, static
  driveNote       String?     // "Easy drive up I-70", "Can be bad in ski traffic", null
  worthTheDriveScore Int?     // 1-10, set by enrichment — only populated for non-Denver events
}

enum EventRegion {
  DENVER_METRO
  FRONT_RANGE       // Boulder, Fort Collins, Colorado Springs, etc.
  MOUNTAIN_GATEWAY  // Estes, Nederland, Idaho Springs, Georgetown, Winter Park
  MOUNTAIN_DEST     // Breck, Vail, Aspen, Steamboat, Crested Butte, etc.
}
```

### 0.2 Place schema additions

Apply the same regional metadata to the `Place` model (minus `worthTheDriveScore`, which is event-specific). Places in Tier 2/3 towns are sparse but meaningful — a legendary bar in Nederland or a brewery in Fort Collins should be a discoverable Place.

### 0.3 Static drive-time table

Instead of calling Google Maps API per event, maintain a static `lib/regional/drive-times.ts` lookup:

```typescript
export const DRIVE_TIMES_FROM_DENVER: Record<string, {
  minutes: number
  driveNote: string
  region: EventRegion
  isDayTrip: boolean
  isWeekendTrip: boolean
}> = {
  "Boulder":           { minutes: 45, driveNote: "Easy drive up US-36", region: "FRONT_RANGE", isDayTrip: true, isWeekendTrip: false },
  "Golden":            { minutes: 25, driveNote: "Quick hop west", region: "FRONT_RANGE", isDayTrip: true, isWeekendTrip: false },
  "Fort Collins":      { minutes: 75, driveNote: "Straight shot up I-25", region: "FRONT_RANGE", isDayTrip: true, isWeekendTrip: false },
  "Colorado Springs":  { minutes: 75, driveNote: "Down I-25, easy drive", region: "FRONT_RANGE", isDayTrip: true, isWeekendTrip: false },
  "Estes Park":        { minutes: 90, driveNote: "Scenic — allow extra time summer weekends", region: "MOUNTAIN_GATEWAY", isDayTrip: true, isWeekendTrip: false },
  "Nederland":         { minutes: 55, driveNote: "Canyon drive from Boulder", region: "MOUNTAIN_GATEWAY", isDayTrip: true, isWeekendTrip: false },
  "Idaho Springs":     { minutes: 45, driveNote: "I-70 west, watch weekend traffic", region: "MOUNTAIN_GATEWAY", isDayTrip: true, isWeekendTrip: false },
  "Georgetown":        { minutes: 55, driveNote: "I-70 west, worth the stop", region: "MOUNTAIN_GATEWAY", isDayTrip: true, isWeekendTrip: false },
  "Winter Park":       { minutes: 90, driveNote: "Over Berthoud Pass, winter driving in season", region: "MOUNTAIN_GATEWAY", isDayTrip: true, isWeekendTrip: false },
  "Breckenridge":      { minutes: 105, driveNote: "I-70 can be brutal on ski weekends", region: "MOUNTAIN_DEST", isDayTrip: false, isWeekendTrip: true },
  "Keystone":          { minutes: 100, driveNote: "I-70, same ski traffic caveat", region: "MOUNTAIN_DEST", isDayTrip: false, isWeekendTrip: true },
  "Vail":              { minutes: 115, driveNote: "Worth the drive, watch for I-70 closures", region: "MOUNTAIN_DEST", isDayTrip: false, isWeekendTrip: true },
  "Beaver Creek":      { minutes: 125, driveNote: "Just past Vail", region: "MOUNTAIN_DEST", isDayTrip: false, isWeekendTrip: true },
  "Steamboat Springs": { minutes: 180, driveNote: "Worth it for a weekend, not a day", region: "MOUNTAIN_DEST", isDayTrip: false, isWeekendTrip: true },
  "Crested Butte":     { minutes: 240, driveNote: "Full weekend commitment — remote and magical", region: "MOUNTAIN_DEST", isDayTrip: false, isWeekendTrip: true },
  "Aspen":             { minutes: 210, driveNote: "Long drive, worth it for the right event", region: "MOUNTAIN_DEST", isDayTrip: false, isWeekendTrip: true },
  "Telluride":         { minutes: 360, driveNote: "Basically a flight — plan a real weekend", region: "MOUNTAIN_DEST", isDayTrip: false, isWeekendTrip: true },
  // ...add as needed
}
```

Drive times are approximate and honest. The `driveNote` is Pulse-voice — it sets expectations without being precious.

---

## PHASE 1 — TIER 1 SCRAPERS (Front Range hubs)

Build dedicated scrapers for the three Front Range hubs. These behave like the Denver scrapers (PRD 1) — scrape, enrich, upsert — but tag region/town metadata on insert.

### 1.1 Boulder
- `lib/scrapers/regional/boulder-downtown.ts` — boulderdowntown.com events
- `lib/scrapers/regional/boulder-theater.ts` — bouldertheater.com / Fox Theatre combined
- `lib/scrapers/regional/chautauqua.ts` — chautauqua.com (summer-heavy, runs year-round)

### 1.2 Fort Collins
- `lib/scrapers/regional/downtown-fort-collins.ts` — downtownfortcollins.com
- `lib/scrapers/regional/lincoln-center.ts` — lctix.com (performing arts)

### 1.3 Colorado Springs
- `lib/scrapers/regional/visit-cos.ts` — visitcos.com events
- `lib/scrapers/regional/pikes-peak-center.ts` — pikespeakcenter.com

### 1.4 Integration with existing pipeline
- Each scraper emits events in the same shape as Denver scrapers
- Events flow through the same enrichment pass (quality score, category, tags, one_liner)
- On upsert: look up town in `DRIVE_TIMES_FROM_DENVER`, populate region/driveTime/driveNote/isDayTrip automatically
- Dedup across sources (title + venue + date) — already handled by orchestrator

### 1.5 Cadence
Tier 1 runs **weekly on Monday**, not daily. These calendars change much slower than Eventbrite/Do303. Add a new cron entry in `vercel.json`:

```json
{
  "path": "/api/events/scrape-regional",
  "schedule": "0 7 * * 1"
}
```

The `/api/events/scrape-regional` endpoint runs Tier 1 + Tier 2 scrapers sequentially.

---

## PHASE 2 — TIER 2 SCRAPERS (Mountain gateway towns)

Lighter-touch — these towns have smaller event ecosystems. One scraper per town, pulling from the most-trafficked local source.

### 2.1 Town sources (verify each exists and is scrapeable before wiring up)
- **Estes Park** — visitestespark.com events
- **Nederland** — check for nederlandchamber.org or community event calendar
- **Idaho Springs / Georgetown / Winter Park** — each town's visitor bureau or chamber site
- **Golden** — visitgolden.com (already noted in PRD 1 Phase 2.3 — check if this is already built; if yes, just add regional metadata tagging)

### 2.2 Implementation pattern
Each Tier 2 town scraper is simple: ~20 lines of code, one HTTP fetch, one selector pass, wrap in try/catch. If a town's site is JS-rendered or ToS-hostile, skip it and flag.

### 2.3 Expected volume
Tier 2 contributes low volume — maybe 5–15 events per town per run. That's fine. The goal is coverage of the good stuff, not volume.

---

## PHASE 3 — TIER 3 (Mountain destinations — hybrid approach)

Mountain destination towns don't warrant dedicated scrapers for each one — too many towns, too variable, too much custom work. Use a hybrid approach:

### 3.1 Town visitor bureau pass
A single pipeline (`lib/scrapers/regional/mountain-destinations.ts`) hits a small config list of visitor bureau event calendars:

```typescript
const MOUNTAIN_DEST_SOURCES = [
  { town: "Breckenridge", url: "gobreck.com/events", selector: "..." },
  { town: "Vail", url: "visitvail.com/events", selector: "..." },
  { town: "Steamboat Springs", url: "steamboat.com/events", selector: "..." },
  { town: "Crested Butte", url: "gunnisoncrestedbutte.com/events", selector: "..." },
  { town: "Aspen", url: "aspenchamber.org/events", selector: "..." },
  { town: "Telluride", url: "visittelluride.com/events", selector: "..." },
  // extend as needed
]
```

Each source is a simple HTML fetch + parse. Failures on individual sources don't block others.

### 3.2 LLM research supplement
The visitor bureau calendars are reliable for big festivals and concerts but miss the unique stuff. Supplement with a weekly LLM research call:

```
Query: "What are the most compelling events, festivals, and unique experiences
       happening in Colorado mountain towns (Breckenridge, Vail, Aspen, Steamboat,
       Crested Butte, Telluride, Winter Park) in the next 8 weeks? Focus on
       festivals, races, seasonal events, concerts, and anything distinctive that
       would make a Denver-based 25-35 year old think 'that's worth a weekend trip.'
       Include source URLs. Return JSON."
```

Claude API with web search enabled. Results flow through the same enrichment + verification + quality gate as everything else. Candidates without source URLs get dropped.

### 3.3 Cadence
Tier 3 runs weekly on Tuesdays (separate day from Tier 1/2 to spread load). Visitor bureau calendars + LLM research together should produce 20–40 candidate events per run, filtering down to 10–20 quality-passed events after enrichment.

---

## PHASE 4 — ENRICHMENT UPDATES

The existing enrichment pass (OpenAI GPT-4o-nano, from PRD 1) needs one new concept for regional events: the **worth-the-drive score**.

### 4.1 New enrichment field
For any event where `region !== DENVER_METRO`, the enrichment pass also returns `worth_the_drive_score: 1-10`:

```
Prompt addition: "This event is in {townName}, approximately {driveTimeMin} minutes
from Denver. Rate 1-10: how compelling is this event for someone in Denver who
would need to drive {driveTimeMin} minutes each way? Consider uniqueness (is it
something Denver doesn't have?), scale (festival vs. small meetup), and whether
it's worth the time investment. 1 = not worth it, 10 = absolutely worth the drive."
```

### 4.2 Threshold
Regional events with `worth_the_drive_score < 6` get dropped entirely. The bar is higher for regional content because it asks more of the user.

### 4.3 Pulse-voice updates
The `one_liner` field for regional events should lean into the travel framing:
- Instead of: "Art festival with live music"
- Better: "Fort Collins art festival that's worth the I-25 drive"

Update the enrichment prompt to cue this voice for regional events.

---

## PHASE 5 — APP SURFACING

### 5.1 Feed integration (not segregation)
Regional events flow into the same main feed as Denver events. They are NOT walled off into a separate tab. The user should be able to open the app on a Friday and see a mix of Denver + regional options sorted by relevance.

### 5.2 Card visual treatment
Regional event cards get a distinct visual tell:
- A small pill/badge showing `{townName} · {driveTimeMin} min` (e.g., "Nederland · 55 min")
- The `driveNote` shown as a subtle subtitle on the card
- Mountain destination events (`isWeekendTrip: true`) get a slightly different badge: "Weekend Trip · Vail"

### 5.3 New filter/view
Add a filter chip on the Events tab: **"Near Denver"** (default on — Denver metro + Front Range + Mountain Gateway) vs. **"All"** (includes Mountain Destinations / weekend trips).

This lets the user choose whether they're in "tonight" mode or "exploring further" mode, without burying regional content.

### 5.4 "Outside the city" section refresh
PRD 1 included an "Outside the city" section on the Events tab (visible in app screenshots). That section should now be populated with Tier 1/2 events (Front Range + Mountain Gateway), sorted by `worthTheDriveScore` desc.

Add a parallel section: **"Worth a weekend"** — Tier 3 Mountain Destination events. Only shows when there's compelling content (minimum 3 events with `worthTheDriveScore >= 8`). If the bar isn't met, section hides.

### 5.5 Sort logic adjustment
The main feed sort should not treat all events equally. Regional events need a slight *boost* for their discovery value but a slight *penalty* for the effort they require. Proposed:

```
feed_rank = match_score * (0.6) + quality_score * (0.25) + recency_boost * (0.15)

For regional events:
  If worthTheDriveScore >= 8: boost feed_rank by 10%
  If isWeekendTrip: penalty 15% (because it requires planning, not impulse)
```

These are starting weights. Tune after a week of real usage.

---

## PHASE 6 — OBSERVABILITY

Mirror the PRD 1 pattern.

### 6.1 Logging
Each regional scraper logs to the existing `ScraperRun` table with a `region` field so runs can be filtered by geography.

### 6.2 Admin dashboard extension
The existing `/admin/scrapers` page gets a new section: **Regional Coverage**. Shows:
- Runs per town over the last 4 weeks
- Current active event count per town (how many future events are in the DB from each source)
- Flags: any town with zero events for more than 2 weeks gets a `degraded` badge

### 6.3 "Coverage health" view
A simple at-a-glance view: a list of all tiered towns with a green/yellow/red indicator:
- Green: fresh events in the DB, scraper succeeded in last run
- Yellow: scraper succeeded but zero events (might be genuine low activity, might be selector drift)
- Red: scraper failed in last run

---

## PHASE 7 — END-TO-END VERIFICATION

After all phases:

### 7.1 Full pipeline run
Run all three tiers against production.

### 7.2 Final counts report
- Total regional events in DB (target: 150+ across all tiers)
- Breakdown by town (every Tier 1/2 town should have ≥ 5 future events, or flag)
- Breakdown by `worthTheDriveScore` distribution
- Tier 3 mountain destination coverage (target: 20+ future weekend-trip events)

### 7.3 Visual verification
Load the Events tab. Confirm:
- Regional events appear in the main feed, clearly badged with town + drive time
- "Outside the city" section is populated with Tier 1/2 content
- "Worth a weekend" section appears with Tier 3 content (if volume threshold met)
- "Near Denver" / "All" filter works as expected
- No regional events have `worth_the_drive_score < 6` leaked through

Screenshot: main feed, "Outside the city" section, a regional event detail card.

### 7.4 Quality spot-check
Quest reviews 20 regional events by hand. Key questions:
- Are the drive notes accurate and on-brand?
- Are the worth-the-drive scores reasonable?
- Do the one-liners lean into the travel framing appropriately?
- Any town showing as empty that shouldn't be?

If more than 3 of 20 feel off → enrichment prompt needs tuning.

### 7.5 Update PULSE_STATUS.md
- Regional schema fields
- Tiered source strategy + list of scrapers per tier
- Cron schedule for regional pipelines
- Drive-time table location + how to extend it
- Worth-the-drive scoring logic
- Admin coverage health view

---

## Ground rules

- Respect robots.txt + rate limits on every source (slower cadence makes this easier — regional scrapers are weekly, not daily)
- Drive-time table is static and maintained manually — do NOT add Google Maps API calls to enrich events at scrape time (too expensive, not worth the precision)
- `worthTheDriveScore` threshold (≥ 6) is strict — regional events should pass a higher bar than Denver events
- Quality over volume applies here even more than in PRD 1
- Do not add paid APIs or new infrastructure without approval
- Each phase pauses for Quest's review — do not chain phases without approval
- Ask clarifying questions before starting any phase if anything is ambiguous

---

## Open questions for Quest

1. **"Near Denver" filter default state:** ON (hides mountain destinations by default, surfaces them via explicit opt-in) or OFF (everything visible, user filters down)? Current PRD assumes ON — confirm.

2. **Mountain destination inclusion threshold:** the "Worth a weekend" section hides when there are fewer than 3 high-scoring events. Is 3 the right number? Could be 5 for a more curated surface, or 1 for more aggressive surfacing.

3. **Overlap with Hidden Gems (PRD 3):** a cool under-the-radar Nederland experience could plausibly be a regional Event OR a Hidden Gem Discovery. Rule of thumb for Claude Code: **if it has a specific date, it's an Event; if it's a permanent/recurring/seasonal thing without a ticket, it's a Discovery.** A Fort Collins art festival this weekend = Event. A legendary Nederland dive bar = Discovery. Confirm this rule works for Quest.

---

## Start with Phase 0 (schema + drive-time table). Produce the migration and config file, and wait for Quest's approval before implementing any scrapers.
