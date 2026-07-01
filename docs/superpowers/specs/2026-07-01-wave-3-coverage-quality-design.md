# Wave 3 — Coverage & quality (seed-data + retention)

> Status: APPROVED design. Next: implementation plan (writing-plans).
> Branch: `feature/overhaul-wave-3`. Deploy is manual `vercel --prod` (Hobby plan → daily crons only).

## Strategic framing

Scrapers (do303, Westword, CVB feeds) are a **fragile bootstrap**, not the long-term supply. Wave 3 treats them as **seed data** to grow the initial catalog and improve product quality enough to acquire users. The durable supply model — **users and creators submitting events** — is deliberately a **later, dedicated wave**, not Wave 3.

So Wave 3 is scoped to **free, no-recurring-cost** levers that either (a) grow seed coverage cheaply or (b) raise product quality/retention. The paid headless-browser lever from the original roadmap is **explicitly deferred** (it can slot in later behind the same `fetchPage` contract).

Current catalog baseline (prod, 2026-07-01): **346 upcoming events**, **334 places** (all geocoded), **6/346** events name-matched to a place, **0/346** events with their own coordinates.

## Items (three independent workstreams)

### Item 1 — Event geocoding + map/distance activation  *(effort: L)*

**Goal.** Populate the never-set `Event.lat/lng` by geocoding distinct venue names, which (a) lights up the events map for free, (b) adds a geo path to venue-match, and (c) activates the dead distance filter/sort.

**Approach.**
- **Geocoding API.** `GET https://maps.googleapis.com/maps/api/geocode/json?address={q}&key={GOOGLE_PLACES_API_KEY}&region=us&components=country:US|administrative_area:CO&bounds={Denver-metro bbox}`. Build `q` as `"{venueName}, {address}"` with fallback `"{venueName}, {neighborhood||townName}, CO"`. Read `results[0].geometry.location.{lat,lng}` + `location_type` + `partial_match`. Reuse the existing `GOOGLE_PLACES_API_KEY` (no new service). **Owner action:** the Geocoding API is a separate Google Cloud library and must be enabled on that key's project (owner confirmed they'll enable it + verify the key is in Vercel prod). Mirror the graceful-fallback fetch pattern in `lib/guides/walk-time.ts` (`AbortSignal.timeout`).
- **Dedup + durable cache.** Geocode by **distinct `normalizeVenueName(venueName)`** (reuse the exporter in `lib/scrapers/venue-match.ts`). New `GeocodeCache` model keyed by normalized name (unique), storing lat/lng, formattedAddress, locationType, status (`ok`|`failed`), createdAt — **no expiry** (venue coords are stable; the `cleanup-cache` cron must not touch it) and **negative caching** so un-geocodable names aren't retried. In-run in-memory dedup too. (Rejected: reusing `GooglePlacesCache` — its cron deletes expired rows and it has no negative-cache semantics.)
- **Where it runs (both best-effort, time-budgeted, never break the scrape).** New `lib/geocode.ts`: `geocodeVenue(input, db)` (cache-first) + `geocodeEvents(db, eventIds, opts)` (batch). Call `geocodeEvents(prisma, newEventIds)` inside `runAllScrapers` after the insert loop so coords exist before the cron's `backfillEventPlaces` runs. New `scripts/backfill-event-geocodes.ts` (clone of `backfill-event-places.ts`) + npm `events:backfill-geocodes` for the ~40-venue backlog. In `scrape-and-revalidate` cron, ensure geocode runs before venue-match (no new cron slot).
- **Geo path in venue-match.** Add pure `resolvePlaceIdWithGeo(event {+lat/lng}, nameIndex, placesWithCoords)`: (a) tie-break same-name ambiguity by nearest place within ~0.5mi; (b) geo-match a place with NO name match only when exactly one place sits within a tight ~80m radius. **Precision-first:** name-match stays primary; skip geo-linking when the geocode is `APPROXIMATE`/`partial_match`. Thread event coords + coords-bearing places through `backfillEventPlaces`.
- **Distance filter/sort (the dead code).** Add an origin `LatLng` to the browse pipeline. `FilterSheet` gets a Distance radius section (`RADIUS_OPTIONS` from `lib/geo.ts`); selecting a radius/distance-sort requests `navigator.geolocation` and writes rounded `lat`/`lng`(+`distance`) into the URL so the server component re-renders — **Denver-center fallback** (`DENVER_CENTER`) on denial (owner-approved UX). In `fetchBrowse`, when distance is set: `boundingBox` pre-filter + `haversineDistance` post-filter; when `sort==='distance'`, sort ascending by haversine. Reconcile the pre-existing sort-value mismatch (`top`↔`top-picks`, `price`↔`price-low`) while wiring `distance`. The map needs **no** code change — it renders the newly-populated coords automatically.

**Files.** New: `lib/geocode.ts`, `scripts/backfill-event-geocodes.ts`, `GeocodeCache` model (+ migration, next after `20260630230000_add_beli_rating`). Edit: `lib/scrapers/index.ts` (geocode hook), `lib/scrapers/venue-match.ts` (`resolvePlaceIdWithGeo` + thread coords), `app/api/cron/scrape-and-revalidate/route.ts` (ordering), `lib/browse/fetch-browse.ts` (origin + distance filter/sort), `lib/browse/filters.ts` (parse lat/lng, reconcile sort values), `app/(site)/browse/[category]/page.tsx` + `.../map/page.tsx` (origin pass-through), `components/browse/FilterSheet.tsx` + `BrowseSummaryRow.tsx` (Distance UI + geolocation + sort values), `package.json`, `.env.example`.

**Tests.** Unit: `geocodeVenue` cache hit/miss/negative (mocked fetch, assert one API call per distinct name); `resolvePlaceIdWithGeo` (nearest-resolves-ambiguity, single-nearest geo-match, reject on tie or APPROXIMATE, name precedence preserved); `fetchBrowse` distance (seeded coords → out-of-radius dropped, distance sort order). Integration: `events:backfill-geocodes` against a seeded DB → `Event.lat/lng` + `GeocodeCache` populated. Manual: markers appear on `/browse/today/map`; radius + geolocation narrow list/map; denial falls back to Denver.

**Risks.** Geocoding API not enabled → `REQUEST_DENIED` (owner enabling). Low-confidence geocodes (city centroid) — bias with bounds/components + address, skip geo-linking on APPROXIMATE/partial. Geo-match false positives — tight 80m + single-nearest. Adding lat/lng to the URL affects the browse route's cache key — verify re-render. Failed geocodes negative-cached (no retry storms).

### Item 2 — For-You feed deepening  *(effort: M)*

Three additive, low-risk changes; scoring stays pure; no new services.

- **Inline "why you're seeing this" line.** The ranking `reasons` **already reach the client at runtime** (`RankedFeedItem` carries `{score, reasons}`); only the `ForYouSection.items` *type* erases them. Widen that type with optional `reasons?: ScoreReason[]`. Add `pickCardReason(reasons): string | null` to `lib/ranking/explanation.ts` — returns the highest-contribution **positive** reason's `human_readable`, **de-prioritizing generic factors** (`base_quality`, `unprofiled`, `recency`, `starts_soon`) so it prefers a real taste match. `ForYouTabBody` computes it per item and passes `reasonLine?` to the cards, **gated on `data.personalized`** (fallback path has no reasons). Cards render one muted `line-clamp-1` row (optional ✨). Full breakdown stays reachable via the existing `CardMoreMenu → WhyThisSheet`.
- **"Next week" section.** In `fetch-for-you-feed.ts`, split the post-weekend horizon: `nextWeek = [wkEnd, addDaysDenver(wkEnd,7))`, `comingUp = [nextWeekEnd, +21d]`; extend the outer horizon 14→21d (and the fallback query `lte`). Use **half-open** band comparisons (no double-bucketing). Push a `{ id: "next-week", title: "Next week" }` section between weekend and coming-up; the existing empty-section filter hides it when empty. Personalized path needs no new query (re-bucket cached items); only the fallback window widens.
- **"Starts soon" boost.** Add `weights.startsSoonBoost` (~0.08) + `startsSoon: { fullWithinHours: 24, windowHours: 72 }` to `RANKING_CONFIG`. New pure `computeStartsSoonBoost(item, config, nowMs)`: `startsAt == null` → 0 (places/discoveries unaffected); else full boost within 24h, linear taper to 0 by 72h, 0 if past/beyond. **Additive** term folded into `inner` (consistent with recency; do NOT add a second outer multiplier). **Thread `nowMs` into `score()`** (default `Date.now()`) and refactor `computeRecencyBoost` to take it — makes both deterministic/testable; pass a per-run `now` snapshot from `precompute.ts` and `live-rerank.ts`. Add a `starts_soon` renderer to `explanation.ts` + a `⏰` icon case to `WhyThisSheet`.

**Files.** Edit: `lib/ranking/config.ts`, `lib/ranking/formula.ts`, `lib/ranking/explanation.ts`, `lib/ranking/precompute.ts`, `lib/ranking/live-rerank.ts`, `lib/home/types.ts` (widen `ForYouSection.items`), `components/home/fetch-for-you-feed.ts`, `components/home/ForYouTabBody.tsx`, `components/home/EventCardCompact.tsx`, `components/home/PlaceCardCompact.tsx`, `lib/ranking/__tests__/formula.test.ts`.

**Tests.** Extend `formula.test.ts` with starts-soon fixtures via injectable `nowMs` (now+2h full; now+48h partial; now+10d & `startsAt=null` → none; monotonic decay); confirm existing recency test still green (default arg). New `explanation` test for `pickCardReason` ordering (taste match beats `base_quality`; null when no positives). Extract window-bucketing into a pure `bucketByHorizon(items, now)` and unit-test half-open boundaries. RTL: `ForYouTabBody` renders the reason line when personalized+reason, omits otherwise.

**Risks.** Daily-cron staleness of `starts_soon` (keep boost small; horizon buckets already constrain; live-rerank recomputes with fresh `now` on dirty caches). Generic top reason (de-prioritized). Widening `ForYouSection.items` ripples — `reasons` is optional so backward-compatible; verify `tsc`.

### Item 3 — Simpleview RSS scraper factory  *(effort: M)*  — **Front Range only**

**Reality check.** Only **3** regional scrapers are actually Simpleview-RSS-shaped (`visit-estes-park`, `visit-golden`, `visit-steamboat-chamber`) — byte-for-byte identical except source/URL/town/price/category-keywords/labels. The other regional scrapers (`pikes-peak-center`, `chautauqua`, `visit-denver`) are bespoke and stay untouched. The mountain towns (Vail/Aspen/Breckenridge) are **already routed to the LLM research pipeline** in `index.ts` because their feeds are bot-protected/unstructured — so they are **out of Simpleview scope** (owner-approved).

**Approach.**
- New `lib/scrapers/regional/simpleview.ts`: `makeSimpleviewScraper(config): Scraper` reproducing the current per-item pipeline verbatim (`fetchPage` → cheerio `xmlMode` `parseItems` → shared convention/meeting skip regexes → `parseDateRange` MM/DD/YYYY from CDATA + DST-anchored 19:00 MT → `cleanDescription` → `categoryFromRssTag`), plus a `_internals` bag of the pure parsers for tests (mirrors `ics.ts`).
- Config interface: `{ source, feedUrl, town, venueName, descriptionFallback, priceRange, address?, extraCategoryKeywords? }`. Extract the shared category rules into `DEFAULT_CATEGORY_KEYWORDS`; each town appends town-specific words via `extraCategoryKeywords`. `neighborhood = town` (a `DRIVE_TIMES_FROM_DENVER` key) so `deriveRegionalFields` supplies region/drive-time automatically — **no drive-times change needed** (all target towns already exist as keys).
- `SIMPLEVIEW_FEEDS: SimpleviewScraperConfig[]` registry with the **3 existing feeds re-expressed verbatim** + **Fort Collins + Colorado Springs** added *only after* their `/event/rss/` endpoints are curl-verified to return future-dated items. `index.ts` replaces the 3 named imports + hand-written rows with a `for (const c of SIMPLEVIEW_FEEDS) scrapers.push(...)` loop (same pattern as `CIVIC_ICS_FEEDS`). Delete the 3 old scraper files. Add new sources to `SOURCE_PRIORITY`.

**Delivery in two safe steps:** (1) factory + re-express the 3 known feeds, **prove output parity** against captured fixtures before deleting the originals (pure refactor, zero behavior change); (2) add Fort Collins / Colorado Springs rows only if their feeds verify. An unverified/404 feed registers a zero-count source and trips the coverage-anomaly alert — so unverified towns stay OUT (same doctrine as the empty `CIVIC_ICS_FEEDS`).

**Files.** New: `lib/scrapers/regional/simpleview.ts`, `lib/scrapers/regional/simpleview-feeds.ts` (or inline), `lib/scrapers/__tests__/simpleview.test.ts`, `tests/fixtures/scrapers/simpleview-*.xml`. Delete: the 3 old scrapers. Edit: `lib/scrapers/index.ts`, `lib/scrapers/source-priority.ts`.

**Tests.** Fixture-driven unit tests the 3 originals never had (`_internals`: item parse, MM/DD/YYYY + DST, convention/meeting skip, category mapping incl. `extraCategoryKeywords` override, stable externalId). **Parity test:** run old vs new over the same fixture, diff the `ScrapedEvent[]` before deleting.

**Risks.** Feed existence is the central risk (verify each `/event/rss/` before adding). Colorado Springs town feed may duplicate `pikes-peak-center` (dedup won't collapse different venueNames — set SOURCE_PRIORITY so the real venue wins). Refactor parity — assert on fixtures before deleting.

## Cross-cutting

- **Migrations.** One new additive migration for `GeocodeCache` (nullable/defaulted, safe). Same manual `prisma migrate deploy` runbook as Beli.
- **Owner actions before deploy.** (1) Enable the **Geocoding API** on the `GOOGLE_PLACES_API_KEY` project + confirm the key is in Vercel prod. (2) Apply the `GeocodeCache` migration to prod. (3) Optionally curl-verify Fort Collins / Colorado Springs Simpleview feeds. (4) `vercel --prod`; run `events:backfill-geocodes` once.
- **Verification per item:** `npm test`, `tsc --noEmit`, `next build` clean; adversarial diff review before merge (as in Wave 2).
- **Sequencing.** Items are independent and can land as separate commits/PRs. Suggested order: For-You deepening (no external deps, fastest quality win) → Simpleview factory (pure refactor first) → geocoding (gated on the API being enabled).

## Out of scope (explicit)

Headless/hosted-browser rendering (paid); Places API (New) migration (the legacy wrapper stays); Yelp/OSM sources; **event submission / creator tools (the next dedicated wave)**; embeddings/pgvector (Wave 4).

## Success criteria

- Events carry coordinates: `Event.lat/lng` populated for the geocodable share of the 346-event backlog; markers render on the events map; distance filter + sort work with geolocation (Denver fallback).
- Venue-match `placeId` coverage rises above the name-only 6 via the geo path (no false-positive links).
- For-You cards show a one-line "why", a "Next week" section appears when populated, and sooner events edge up within a rail — all behind the personalized gate.
- The 3 Simpleview scrapers become one factory with parity-tested output; Front Range towns onboarded iff their feeds verify.
- No new recurring cost; no coverage-anomaly false alarms from unverified feeds.
