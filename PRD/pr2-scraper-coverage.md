# PR 2 — Scraper Coverage Fix (Westword + VisitDenver)

**Priority:** Ship within 2–3 days of PR 1.
**Estimated scope:** 4–6 hours
**Out of scope:** Adding new source sites, changing enrichment, regional expansion (PRD 2), Hidden Gems engine (PRD 3).

---

## Context

Diagnostic ran 04-24. Two of our existing scrapers are silently underperforming:

- **Westword:** public page lists ~47 events for today. Our scraper pulls 12. Coverage ~25%.
- **VisitDenver:** our scraper currently targets a page where the earliest event is May 2 — no short-window events at all. There's a dense daily calendar at a different URL we're not hitting.

These are both "scraper worked when it was built, source page changed, nobody noticed" problems. The scraper runs still report "success" with low counts, so nothing alerts. Fixing them plus adding a coverage anomaly check should roughly double the raw event count without adding any new sources.

---

## Tasks

### 1. Westword scraper fix

**Diagnose first.**
- Open the current Westword scraper (`lib/scrapers/westword.ts` or equivalent). Report which URL(s) it's fetching and which selectors it's using.
- Load the live Westword events page in a headless fetch. Compare what's in the HTML to what the scraper selectors are matching against. Identify the gap — is it pagination, a changed class name, a different event container, a "show more" button that requires JS, or something else?
- Spot check: count events visible on the public page for "today" and "this week". Compare to what the scraper returns for the same window. Report both numbers.

**Then fix.**
- Retarget URL and/or selectors to capture the full listing.
- If the source has pagination, walk all pages up to some reasonable cap (e.g., next 30 days of events or 10 pages, whichever comes first).
- If the source requires JS rendering that the current scraper can't do, flag it but don't switch to Playwright in this PR — note it in PULSE_STATUS.md as follow-up work.

**Verify.**
- Re-run the scraper. Raw count should be ≥ 80% of what's visible on the public page for the same time window. If it's still materially below that, report why before declaring done.
- Spot-check 5 random events from the scraper output against the live page. Confirm title, date, time, and link are correct.

### 2. VisitDenver scraper fix

**Retarget the URL.**

The correct endpoint for dense daily listings is:

```
https://www.visitdenver.com/events/calendar/
```

The current scraper is hitting a page that only exposes longer-horizon events (earliest May 2 as of 04-24). The `/calendar/` page appears to expose the short-window stuff.

**Diagnose the page structure.**
- Fetch `https://www.visitdenver.com/events/calendar/` and inspect the HTML.
- Identify the event container, title, date, time, location, and detail-link selectors.
- Check whether the calendar is date-filtered via URL params (e.g., `?date=2026-04-24`) or requires JS-driven navigation. If URL params work, use them to walk the next N days. If JS-driven, see the "JS rendering" note below.

**Rebuild the scraper.**
- Write (or rewrite) `lib/scrapers/visit-denver.ts` against the new page structure.
- Walk the next 30 days of the calendar. Daily granularity is fine; you don't need sub-day pagination.
- Preserve the existing output shape (same `RawEvent` interface) so the downstream enrichment and dedup logic don't need changes.

**Verify.**
- Raw count from VisitDenver should jump from ~4 events in the next 7 days (current) to a materially higher number. Report exact numbers before and after.
- Spot-check 5 events against the live calendar.

### 3. Add coverage anomaly detection

The reason these two scrapers silently decayed is that a "successful run with low counts" looks identical to a "successful run on a slow day." Add a simple anomaly signal so the next decay is visible.

**Implementation:**
- In the `ScraperRun` table, add a column `coverageAnomaly: Boolean @default(false)`.
- At the end of each scraper run, compute the source's rolling 14-day median raw count. If today's raw count is less than 50% of the median AND the median is ≥ 5 (don't trigger on sources that are genuinely low-volume), set `coverageAnomaly: true`.
- Surface the flag in the `/api/admin/scraper-status` endpoint response. The admin page (if it exists) should render anomaly-flagged rows with a visual warning.
- Don't add email/SMS alerts. Quest checks the status endpoint manually — that's fine for beta.

### 4. Handle the lacrosse-as-live-music miscategorization

Minor, but the diagnostic flagged it: the Westword event "First Round: TBD vs Colorado Mammoth" was categorized as `LIVE_MUSIC` when it's lacrosse. This is an enrichment miss, not a scraper problem, but while you're in the scraper code consider:

- If the raw event has `sports`, `vs`, `game`, or team-league keywords in the title, and the source didn't explicitly categorize it as music, skip the default `LIVE_MUSIC` fallback. Let enrichment decide.
- Don't over-engineer this — a small keyword check in the category fallback is fine. A proper fix is an enrichment-layer concern that can wait.

Also: this is a reminder that per the product decision, pro sports don't belong in the feed at all (no discovery value). If the event is identifiably pro sports (Mammoth, Nuggets, Avalanche, Broncos, Rockies, Rapids), drop it at ingest. Participatory / rec / community sports stay — those have discovery value. Make the filter list an easily-editable array at the top of the file.

### 5. Run a full pipeline and report numbers

After all changes:
- Trigger a manual scraper run across all sources.
- Report per-source counts: raw, enriched, inserted, updated.
- Confirm Westword and VisitDenver counts are materially higher than the pre-fix numbers (12 raw Westword → target 40+; 17 raw VisitDenver with only 4 in the next-7d window → target 40+ raw with 20+ in the next-7d window).
- Re-run the original diagnostic queries and report how many events the Today rail now has available to choose from.

### 6. Update PULSE_STATUS.md

Add a section `## 2026-04-2X — Scraper Coverage Fix (PR 2)` summarizing:
- Westword before/after numbers and what was wrong
- VisitDenver before/after numbers and what URL / selectors were rebuilt
- Coverage anomaly detection added to ScraperRun
- Pro sports filter added
- Any sources flagged as needing JS rendering for follow-up

---

## Testing checklist

- [ ] Westword scraper returns ≥ 80% coverage vs. public page (spot check)
- [ ] VisitDenver scraper returns events in the next 7 days (was 0, target 20+)
- [ ] 5 spot-checked events per source have correct title, date, time, link
- [ ] `coverageAnomaly` column added, populated, and surfaced in admin endpoint
- [ ] Pro sports events no longer appear in scraper output
- [ ] Full pipeline run reports materially higher raw counts than pre-fix
- [ ] PULSE_STATUS.md updated with before/after numbers

---

## Out of scope (do NOT do in this PR)

- Adding new source sites (Do303 if not already in, Reddit, Instagram, etc.) — those belong in PRD 3
- Switching to a JS-rendering scraper (Playwright, Puppeteer) — flag it, don't build it
- Touching the enrichment pipeline beyond the sports-miscategorization nudge
- Regional expansion (Boulder, Fort Collins, mountain towns — that's PRD 2)
- UI changes to the admin status page beyond rendering the anomaly flag
- Changing dedup logic (that was PR 1)
