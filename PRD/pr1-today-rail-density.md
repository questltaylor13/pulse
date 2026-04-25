# PR 1 — Today Rail & Home Section Density Fix

**Priority:** Ship today. This is blocking Quest's daily usage test of the app.
**Estimated scope:** 2–3 hours
**Out of scope:** Scraper changes (handled in PR 2), ranking algorithm changes, UI redesign.

---

## Context

Diagnostic ran 04-24. DB has **43 events matching "Today"** but the rail only shows **10**. Quest is opening the app and feeling the feed is thin when the actual data layer is 4× richer than what's surfacing. Raising caps + fixing dedup + handling bad timestamps should ~3× perceived density with zero scraper work.

Key numbers from diagnostic:
- 43 events with `startDate` matching today; 10 shown
- At least 1 known dedup leak today (Subtronics appears twice: red-rocks + do303)
- ~15 events per day have `startTime = 01:00` — fallback value when the scraper couldn't parse a real time, and these sort to the top of the chronological feed
- No quality threshold currently filters events — nothing is being rejected by score

---

## Tasks

### 1. Audit every home-page section for hardcoded caps

Find every section that renders a horizontal card rail or grid on the home page and report back:
- The file + component name
- The current LIMIT / slice value
- Whether it's a DB LIMIT, a `.slice()` in the component, or a query-level cap

Sections to cover (from the current home layout):
- Today
- This weekend's picks
- Just added on Pulse
- Outside the city
- Guides from local creators
- Any category-filtered sections that appear when a chip is selected (Coffee, Bars, etc.)

**Don't change anything yet in step 1.** Just produce the audit so we see the shape of the problem before editing.

### 2. Raise the caps

After reporting, apply these defaults:
- **Today rail:** cap at 25 events. Add a "See all" link that routes to `/events?scope=today` if count > 25.
- **This weekend's picks:** cap at 20.
- **Just added on Pulse:** cap at 15.
- **Outside the city:** cap at 15.
- **Guides from local creators:** leave as-is (this section is manually curated and won't have a volume problem).

Where a section uses `.slice(0, N)` in the component, change the component. Where it's a DB-level LIMIT, change the query. Whichever layer it's at, keep it there — don't refactor the data flow for this PR.

### 3. Fix the dedup leak

Events that appear under multiple sources (e.g., Subtronics from both `red-rocks` and `do303` scrapers) are eating feed slots. Implement a dedup pass at query time (NOT at scrape time — we want to keep both source records in case one goes stale):

**Dedup rule:** collapse events that share:
- Same normalized title (lowercase, strip punctuation, strip leading "The/A/An")
- AND same `startDate` (date, not datetime)
- AND start times within a 2-hour window of each other

**Which record wins:** prefer the source in this priority order: `do303` > `red-rocks` > `westword` > `visit-denver` > `visit-golden` > `chautauqua` > `pikes-peak-center` > `visit-estes-park`. Rationale: do303 tends to have the richest metadata; venue-first sources (red-rocks, chautauqua) have reliable times but thin copy; destination marketing sites (visit-*) have marketing copy but often loose times.

Make the priority order configurable via a constant at the top of the file so Quest can reorder without digging.

### 4. Handle the 1:00 AM fallback-timestamp problem

A meaningful slice of events have `startTime` set to `01:00` because the source page didn't include a parseable time and the scraper fell back to midnight/1am. These currently sort to the top of the Today rail, which is both wrong and makes the feed look junky.

Two-part fix:

**Part A — detect the fallback.** At scrape time (or in a one-off migration, your call on the cleaner path), flag these events with `hasParsedTime: false` on the Event model. Add the field to the Prisma schema, run the migration, and backfill by flagging every event whose startTime is exactly `01:00:00` or `00:00:00` and whose source page didn't include an explicit time. If you can't reliably detect "source page had no time" after the fact, flagging all events with startTime in `{00:00, 01:00}` is acceptable — false positives here are low-cost.

**Part B — sort them separately.** In the Today rail, events with `hasParsedTime: false` should sort to the bottom of the rail, not the top. Label them with "Time TBA" in the card's time field instead of "1:00 AM". This is a better lie than the current lie.

### 5. Verify end-to-end

After all changes:
- Load the home page as a logged-in user. Confirm the Today rail shows up to 25 events (or the actual count if less).
- Confirm no duplicate events appear in the Today rail — spot-check by searching for any event title that appears twice.
- Confirm no event in the Today rail shows "1:00 AM" as its start time. Events with unparseable times should appear at the bottom with "Time TBA".
- Re-run the diagnostic queries from the last audit and confirm the gap between DB count and surfaced count has closed.

### 6. Update PULSE_STATUS.md

Add a section `## 2026-04-24 — Today Rail Density Fix` summarizing:
- What the diagnostic found (gap between 43 DB events and 10 surfaced)
- What was changed (section caps, dedup rule, hasParsedTime handling)
- Any surprises encountered
- Verification numbers (final event counts per section after the fix)

---

## Testing checklist

- [ ] Home page loads without errors
- [ ] Today rail shows > 10 events when DB has > 10 matching events
- [ ] No visible duplicates in any section
- [ ] No "1:00 AM" timestamps visible in the Today rail
- [ ] "See all" link on Today rail works if count > 25
- [ ] Dedup priority is configurable (change the constant, reload, confirm the winning source changes)
- [ ] PULSE_STATUS.md updated

---

## Out of scope (do NOT do in this PR)

- Fixing the Westword / VisitDenver scraper coverage (that's PR 2)
- Changing the enrichment pipeline or quality scoring
- Adding new scraper sources
- Redesigning the card UI
- Adding new sections to the home page
- Touching the Hidden Gems / Discoveries engine
