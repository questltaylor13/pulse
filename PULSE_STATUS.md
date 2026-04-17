# Pulse Project Status

> Last updated: 2026-04-16
> Live at: https://pulse-three-eta.vercel.app
> Repo: github.com/questltaylor13/pulse (branch: main)

## Phase 1: Foundation + Events Tab + Bug Fixes

- [x] Route architecture: `app/(home)/` + `app/(site)/` route groups, `/feed` → `/` redirect
- [x] New home page at `/` — server component, `?tab=`/`?cat=` URL sync
- [x] Prisma migration `20260416120000_phase1_home_redesign` applied
  - Event: `isEditorsPick`, `driveTimeFromDenver`, `isArchived` + indexes
  - Place: `tags` + GIN index
  - Backfill: past non-recurring events flipped to `isArchived: true`
- [x] Tailwind token pass (coral, teal, ink, mute palettes; card/pill/search radii; chrome z-index scale)
- [x] 15 hand-rolled SVG icons in `components/icons/`
- [x] Home chrome: `BrandHeader`, `SearchBar`, `TopTabs`, `CategoryRail`, `StickyChrome`, `BottomNav`
- [x] Sections + cards: `ScrollSection`, `EventCardCompact`, `PlaceCardCompact`, `GuideCard`, `EventsTabBody`, `LastUpdatedIndicator`, `SectionDivider`, `EmptyTab`, Badges
- [x] `SaveButton` with `SoftAuthModal` for anonymous users
- [x] `SearchOverlay` MVP (client-side filter on already-loaded events/places)
- [x] Aggregated data fetch: `components/home/fetch-home-feed.ts` + `/api/home/events-feed`
- [x] `lib/ranking.ts` — editorial rank formula (editors 0.4 + recency 0.2 + popularity 0.3 + personalFit 0.1)
- [x] `lib/home/category-filters.ts` — 9-category rail filters including synthetic Weird/Off-beat
- [x] `lib/queries/events.ts` — `activeEventsWhere`, weekend range, outside-Denver whitelist
- [x] Cron handlers: `/api/cron/archive-stale-events` (10 UTC), `/api/cron/scrape-and-revalidate` (11 UTC)
- [x] `vercel.json` updated with new cron schedule
- [x] Bug 1 (stale events): `activeEventsWhere` clause + daily archival cron + backfill
- [x] Bug 2 (broken links): `notFound()` error boundary on `/events/[eventId]` and `/places/[id]`, `NoticeToast` on home
- [x] Bug 3 (stale New in Denver): tag revalidation (`home-feed`) + `LastUpdatedIndicator`
- [x] Bug 4 (missing mobile nav): `BottomNav` renders unconditionally, hidden at `md:+`
- [x] Desktop `NavLinks.tsx` relabeled (Feed→Home, Lists→Saved)
- [x] `middleware.ts` annotates `/events/*` and `/places/*` paths for log observability
- [x] Seed: `lib/home/seed-guides.ts` (3 hardcoded placeholder guides)
- [x] Editorial admin CLI: `scripts/set-editors-pick.ts`
- [x] Smoke tests via `scripts/verify-home-libs.ts` (ranking + category filters + queries)
- [x] Typecheck clean (`npx tsc --noEmit`)
- [x] Dev server boots, home renders all 5 sections on live DB

### Phase 1 open items to verify in preview deploy
- [ ] Lighthouse mobile perf ≥ 75, a11y ≥ 90 (requires preview URL)
- [ ] Mobile viewport QA at 375/390/414 (iOS Safari + Chrome)
- [ ] Desktop QA at 1024/1280/1440
- [ ] Seed "Outside the city" — no places/events currently tagged with the whitelist regions
- [ ] Run `scripts/set-editors-pick.ts --auto-weekend` after each new weekend to populate picks
- [ ] Confirm scrape-and-revalidate cron fires on the live Vercel deploy

## Phase 2: Places Tab

- [x] Prisma migration `20260417120000_phase2_places` applied (isLocalFavorite, touristTrapScore, goodForWorking, Neighborhood model)
- [x] Closed vibe vocabulary (24 tags) in `lib/constants/vibe-tags.ts`
- [x] Places rail filters (7 categories) + section filters (locals, date, groups, work)
- [x] 12 neighborhoods seeded via `scripts/seed-neighborhoods.ts`
- [x] CategoryRail `railSet` prop for Events vs Places tabs
- [x] PlacesTabBody with 6 sections (New in Denver, Neighborhoods, Locals, Date, Groups, Work)
- [x] NeighborhoodCard, VibeTagPill, PlaceCardCompact updated
- [x] `/places/neighborhood/[slug]` route with detail page + filter chips
- [x] `/places` → `/?tab=places` redirect
- [x] NavLinks Places target updated
- [x] Cron: `refresh-neighborhood-counts` at 9 UTC
- [x] isLocalFavorite heuristic added to scrape cron
- [x] CLI: `scripts/set-local-favorite.ts`
- [x] Typecheck clean

## Phase 3: Guides Tab + Seed Content

- [x] Prisma migration `20260418120000_phase3_guides` applied (Guide, GuideStop, UserSavedGuide + Influencer additions)
- [x] Closed occasion vocabulary (8 tags) in `lib/constants/occasion-tags.ts`
- [x] Walk-time Google Directions util with fallback in `lib/guides/walk-time.ts`
- [x] Pulse Editors house account seeded
- [x] 12 guides seeded via `scripts/seed-guides.ts`
- [x] GuidesTabBody with 5 sections (featured, weekend, creators, date night, quick)
- [x] OccasionPillRail for Guides tab
- [x] FeaturedGuideCard, DB-backed GuideCardDB, CreatorSpotlightStrip
- [x] Guide detail page at `/guides/[slug]` with timeline
- [x] `/creators/[slug]` → `/influencers/[handle]` alias redirect
- [x] Guide save/unsave API at `/api/guides/save/[slug]`
- [x] Crons: `refresh-guide-counts` (9:30 UTC) + `backfill-walk-times` (12 UTC)
- [x] Typecheck clean

## Phase 4: See-all Views + Detail Pages + Map

- [x] Prisma migration `20260419120000_phase4_search_and_map` applied (Event lat/lng, UserSearchHistory, backfill)
- [x] Mapbox GL installed (`mapbox-gl`, `react-map-gl`, `supercluster`)
- [x] Browse configuration system in `lib/browse/browse-configs.ts` (9 browse categories)
- [x] URL-persisted filter system in `lib/browse/filters.ts`
- [x] `fetchBrowse()` supporting events, places, mixed, guides sources
- [x] `/browse/[category]` list page with DayPills, FilterChipRow, FilterSheet, ListCard, FloatingMapButton
- [x] `/browse/[category]/map` Mapbox view with category-colored pins
- [x] All "See all →" links rewired from Events/Places/Guides tabs
- [x] Full search overlay with server-side typeahead (`/api/search`)
- [x] Recent search history (`/api/search/recent`)
- [x] Fresh EventDetailPage (public, no auth gate)
- [x] Fresh PlaceDetailPage (public, no auth gate)
- [x] Similar items (category + neighborhood matching) via `lib/detail/similar.ts`
- [x] Typecheck clean
- [x] Dev server boots, all routes respond 200

### Phase 4 open items to verify in preview deploy
- [ ] Lighthouse mobile perf ≥ 75, a11y ≥ 90
- [ ] Mobile viewport QA at 375/390/414
- [ ] Desktop QA at 1024/1280/1440
- [ ] Set `NEXT_PUBLIC_MAPBOX_TOKEN` env var on Vercel for map to render
- [ ] Run `scripts/seed-neighborhoods.ts` and `scripts/seed-guides.ts` on production DB
- [ ] Confirm all search results link to working detail pages

### Notes / deviations from PRD
- `noveltyScore` remains Int 1-10; "Weird" filter uses `>= 7` (schema authoritative over PRD's 0.75 float suggestion).
- Inactive tab labels use `#666` (mute.DEFAULT) instead of PRD's `#999` — WCAG AA contrast at 11px.
- Admin UI for `isEditorsPick` deferred; use `scripts/set-editors-pick.ts` CLI.
- Section 5 uses 3 hardcoded placeholder guides; replaced by real guides in Phase 3.
- `isNewOpening` on Place skipped; existing `isNew` + `openedDate` are authoritative.
- Cron schedule is UTC (10/11 UTC), which drifts 1h across DST (≈ 3/4am MT MDT, 4/5am MT MST).



## What is Pulse?

Pulse is an AI-powered social discovery app for Denver. It scrapes events from local sources, enriches them with OpenAI, and scores/ranks them based on user preferences (vibe, companion type, budget, dog-friendly, sober-friendly, etc.). Think "Yelp meets Tinder for events" — personalized feed, swipe-to-save, plan builder, friend groups, curated creator picks.

**Business context:** Quest Taylor is the solo founder, actively looking for a co-founder. The app is live on Vercel with real users in Denver.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router, Server Components) |
| Language | TypeScript |
| Database | PostgreSQL on Neon (serverless) |
| ORM | Prisma 5 |
| Auth | NextAuth.js 4 (credentials provider, bcryptjs) |
| AI | OpenAI GPT-4o-mini (event/place enrichment) |
| Scraping | Cheerio (HTML), Ticketmaster API, Eventbrite API |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Hosting | Vercel (with cron jobs) |
| Storage | Vercel Blob (image uploads) |
| QR Codes | qrcode package |

**Key dependency notes:**
- Uses `bcryptjs` (not `bcrypt`) — pure JS, no native compilation needed for Vercel
- Prisma `binaryTargets` includes `"rhel-openssl-3.0.x"` for Vercel deployment
- DATABASE_URL must NOT include `channel_binding=require` — Neon changed this, causes connection failures

---

## Environment Variables

```
DATABASE_URL="postgresql://..."          # Neon PostgreSQL connection string
NEXTAUTH_SECRET="..."                    # Random secret for NextAuth sessions
NEXTAUTH_URL="http://localhost:3000"     # Base URL (set to Vercel URL in prod)
CRON_SECRET="pulse-cron-secret-2026"     # Auth token for cron endpoints
GOOGLE_PLACES_API_KEY="..."             # Google Places API for place data
OPENAI_API_KEY="..."                    # OpenAI for event/place AI enrichment
TICKETMASTER_API_KEY="..."              # Ticketmaster Discovery API (free from developer.ticketmaster.com)
EVENTBRITE_TOKEN="..."                  # Eventbrite private OAuth token (from eventbrite.com/platform/api-keys)
```

All of these must be set in Vercel Environment Variables for production. The Ticketmaster and Eventbrite vars are optional — scrapers gracefully skip if not set.

---

## Architecture Decisions & Data Model

### Two Place/Item Models (Important!)

The database has **two separate models** that represent "places":

1. **`Place` model** — The canonical source of truth for venues. Populated from Google Places API. Has ~460 records with rich data: lat/lng, googleRating, priceLevel, openingHours, vibeTags, companionTags, pulseDescription, openingStatus, etc. Place detail pages (`/places/[id]/`) read from this model.

2. **`Item` model** — A legacy unified model for events and places (type: "EVENT" | "PLACE"). The `UserItemStatus` (Want/Done/Pass) and `UserItemRating` tables are linked to Items, not Places.

**The bridge pattern:** Since `UserItemStatus` requires an `Item.id`, but the places UI now uses `Place.id`, we bridge the gap with `setPlaceStatus(placeId)` / `removePlaceStatus(placeId)` in `lib/actions/items.ts`. These functions find-or-create a lightweight Item record matching the Place (by name + address), then upsert the UserItemStatus on that Item. This avoids a schema migration while keeping the status system working.

**Critical: `/api/places/route.ts` queries `prisma.place.findMany()`** — NOT `prisma.item.findMany()`. The API returns Place IDs. PlaceCard links go to `/places/${place.id}` which correctly resolves via `prisma.place.findUnique()`. This was a major bug fix (previously returned Item IDs → 404).

### Event vs Place Status Flow

```
Events:
  EventCard → setItemStatus(item.id, status) → UserItemStatus (direct)

Places:
  PlaceCard → setPlaceStatus(place.id, status) → finds/creates Item bridge → UserItemStatus
  PlaceCard → removePlaceStatus(place.id) → finds Item bridge → deletes UserItemStatus
```

PlaceCard checks for the `placeId` prop. If present, uses place-aware actions. If absent (legacy), falls back to `setItemStatus`/`removeItemStatus`.

---

## Features Built & Working

### Core Feed & Scoring
- **Personalized event feed** (`app/feed/page.tsx`) — scored/ranked events based on user preferences
- **Scoring engine** (`lib/scoring.ts`) — 15+ scoring factors across ~200 points: category match, time relevance, price, companion fit (solo/date/friends/family), vibe match (chill/moderate/high-energy), social intent, dog-friendly, sober-friendly, trending, diversity enforcement
- **Score badge** (`components/ScoreBadge.tsx`) — shows match percentage on event cards
- **Recommendation reasons** — "Matches your love for live music", "Perfect for date night", etc.
- **Diversity rules** — max 3 per category, max 2 per venue, exploration picks, trending picks

### Event Scraping Pipeline (5 Sources)
- **Do303** (`lib/scrapers/denver-events.ts`) — schema.org microdata on do303.com/events
- **Westword** (`lib/scrapers/westword.ts`) — DOM parsing on westword.com/things-to-do/
- **303 Magazine** (`lib/scrapers/303magazine.ts`) — JSON-LD first, DOM fallback (currently returning 0 events — site structure may have changed)
- **Ticketmaster** (`lib/scrapers/ticketmaster.ts`) — Discovery API, structured JSON, paginated up to 5 pages. Covers concerts, sports, theater, comedy at major Denver venues (Ball Arena, Red Rocks, Paramount, etc.). Maps TM segments (Music → LIVE_MUSIC, Sports → FITNESS, Arts & Theatre → ART). Requires `TICKETMASTER_API_KEY` env var.
- **Eventbrite** (`lib/scrapers/eventbrite.ts`) — Events Search API with venue expansion. Covers community events, workshops, classes, meetups. Parallel venue fetching, paginated up to 5 pages. Requires `EVENTBRITE_TOKEN` env var.
- **Scraper orchestrator** (`lib/scrapers/index.ts`) — runs all scrapers with 10s timeout each, deduplicates by normalized title + date, conditionally includes API scrapers based on env var availability
- **Classifier** (`lib/scrapers/classify.ts`) — venue-based classification (65+ Denver venues) + keyword matching with word boundaries
- **Tag extraction** — regex-based tag extraction for scoring-compatible tags
- **OpenAI enrichment** (`lib/enrich-event.ts`) — generates descriptions, vibeTags, companionTags, isDogFriendly, isDrinkingOptional, isAlcoholFree
- **Inline enrichment** — new events enriched during scrape if time budget allows (15s reserved)
- **Daily cron** — runs at 6:00 AM UTC via Vercel cron (`vercel.json`)
- **Manual trigger:** `curl -H "Authorization: Bearer $CRON_SECRET" https://pulse-three-eta.vercel.app/api/events/scrape`

### Places System
- **460 places** ingested from Google Places API
- **All enriched** with AI-generated vibeTags, companionTags, occasionTags, goodForTags, pulseDescription
- **Places browse** (`app/places/page.tsx`) — tabbed UI (Food & Drink, Experiences, Entertainment, Outdoors, New & Trending) with vibe filters (Date Night, Group, Solo, Family)
- **Place detail pages** (`app/places/[id]/`) — full detail with similar places, nearby discovery
- **New/upcoming places** tracking with opening status, alerts, buzz scores
- **Want/Done/Pass** on places via bridge pattern (see Architecture section above)
- **Dog-friendly & sober-friendly badges** rendered on PlaceCards

### Automated Weekly Places Refresh (NEW — 2026-02-23)
- **Shared refresh logic** (`lib/places-refresh.ts`) — extracted from `scripts/ingest-places.ts`
- **12 categories** split into 3 chunks of 4: (0) restaurant/bar/coffee/brewery, (1) art/museum/park/music_venue, (2) bowling/theater/gym/yoga
- **Cron endpoint** (`app/api/cron/refresh-places/route.ts`) — `?chunk=0|1|2`, Bearer token auth, 60s max duration
- **Weekly schedule** — Sundays at 7:00, 7:10, 7:20 AM UTC (staggered to stay within 60s limit per function)
- **Quality filters** — min rating 4.0-4.3, min reviews 25-100 depending on category
- **Manual script** (`scripts/ingest-places.ts`) — imports shared logic, supports `--category`, `--limit`, `--dry-run`, `--verbose`

### User System
- **Auth** — signup/login with email/password (NextAuth credentials)
- **Onboarding** — category preferences, relationship status, Denver tenure, detailed preferences (companion, vibe, timing, budget, social intent, dog/sober preferences)
- **Profiles** — username, bio, profile image, public profiles at `/u/[username]`
- **Following** — user-to-user follows, following feed

### Social Features
- **Friends system** — friend requests, accept/decline, see friends going to events
- **Groups** — create groups, join codes, suggest events/places, voting (yes/no/maybe)
- **Lists** — custom event/place lists (public/private, shareable by slug, collaborative with VIEWER/EDITOR roles)
- **Want/Done/Pass** — swipe-style event/place status tracking
- **Calendar** — event calendar view, invitations from friends/groups
- **Referrals** — unique referral codes, tracking

### Community
- **Badges** — achievement system (Explorer, Category Fan, Social, Streak, Pioneer, Special, Milestone) with Bronze/Silver/Gold/Platinum tiers
- **Leaderboards** — overall, neighborhood, category rankings
- **Stats** — personal stats page (events attended, streaks, badges)

### Creator/Influencer System
- **Influencer profiles** — curated picks, bios, social links, specialties
- **Pick sets** — weekly/monthly curated event picks
- **Creator event features** — influencers can host/feature events
- **Followed creator picks** — section on feed showing picks from followed creators

### Pulse Labs
- **Builder community** — coworking sessions, startup events, builder meetups, workshops
- **RSVP system** — going/maybe/cancelled
- **Capacity tracking** — spots remaining

### Proximity-Aware Discovery (Added 2026-02-23)
- **"Plan Around This" section** on event and place detail pages when coordinates are available
- **From Your Lists tab** — items from owned/shared lists nearby, grouped by list with distance badges
- **Discover Nearby tab** — Google Places results (cached 24h), type filters (All / Restaurants / Bars / Coffee / Activities)
- **Radius selector** — 1 mi / 3 mi / 5 mi
- **Add to Plan / Save to List** — inline modals
- **Geo utilities** (`lib/geo.ts`) — haversine distance, bounding box for SQL pre-filtering
- **Proximity engine** (`lib/proximity.ts`) — `getListItemsNearby()` and `discoverNearby()`

### Other
- **Landing page** — hero, featured events, creator spotlight, neighborhood section, stats bar, co-founder CTA
- **Curator dashboard** — create/edit/publish events (admin only)
- **Admin panel** — event management
- **Image uploads** — Vercel Blob integration
- **Share modal** — QR codes, social sharing
- **Feedback system** — more/less/hide for recommendation tuning

---

## Scraping Pipeline Architecture

```
vercel.json cron (daily 6am UTC)
  → GET /api/events/scrape (with CRON_SECRET auth)
    → lib/scrapers/index.ts: runAllScrapers()
      → Run each scraper with 10s timeout:
        1. scrape303Magazine()     — JSON-LD first, DOM fallback (currently broken)
        2. scrapeDenverEvents()    — do303.com schema.org microdata
        3. scrapeWestword()        — westword.com DOM parsing
        4. scrapeTicketmaster()    — Ticketmaster Discovery API (if TICKETMASTER_API_KEY set)
        5. scrapeEventbrite()      — Eventbrite Search API (if EVENTBRITE_TOKEN set)
      → Deduplicate by normalized title + date key
        - Title normalization: lowercase, trim, strip "Presents: ", "Live: ", collapse whitespace
      → For each event:
        - classifyEvent(title, venueName) → Category
        - extractTags(title, venueName)   → string[]
        - Upsert to DB (insert new, update existing by externalId+source)
      → Inline enrichment for new events (if time budget allows):
        - enrichEvent() → OpenAI GPT-4o-mini
        - Writes vibeTags, companionTags, description, isDogFriendly, etc.
```

**Classifier architecture (`lib/scrapers/classify.ts`):**
1. **Venue map** (checked first, 65+ venues) — regex patterns for known Denver venues mapped to categories
2. **Keyword matching** (fallback) — weighted keywords with `\b` word-boundary regex to prevent substring false positives

**Enrichment (`lib/enrich-event.ts`):**
- OpenAI GPT-4o-mini with JSON response format
- Tags validated against allowed vocabularies matching `lib/scoring.ts`
- Returns: description, vibeTags, companionTags, isDogFriendly, isDrinkingOptional, isAlcoholFree

**Ticketmaster scraper (`lib/scrapers/ticketmaster.ts`):**
- Endpoint: `https://app.ticketmaster.com/discovery/v2/events.json`
- Params: city=Denver, stateCode=CO, startDateTime (now), endDateTime (+30 days), size=100
- Paginated up to 5 pages (500 events max)
- Maps TM classification segments to Category enum (Music→LIVE_MUSIC, Sports→FITNESS, Arts→ART)
- Picks best image (prefers 16:9 ratio, ~640px wide)
- Formats priceRanges as "$min-$max" or "Free"
- Gracefully returns empty if `TICKETMASTER_API_KEY` not set (no errors)

**Eventbrite scraper (`lib/scrapers/eventbrite.ts`):**
- Endpoint: `https://www.eventbriteapi.com/v3/events/search/`
- Auth: `Authorization: Bearer ${EVENTBRITE_TOKEN}` header
- Uses `expand=venue` when possible, otherwise parallel-fetches venues by ID
- Paginated up to 5 pages
- Gracefully returns empty if `EVENTBRITE_TOKEN` not set (no errors)

**Places refresh pipeline:**
```
vercel.json cron (Sundays 7:00/7:10/7:20 AM UTC)
  → GET /api/cron/refresh-places?chunk=0|1|2 (with CRON_SECRET auth)
    → lib/places-refresh.ts: refreshPlacesChunk(categoryKeys)
      → For each category:
        - searchPlacesAllPages() via Google Places API (up to 2 pages, 40 results)
        - Filter by quality (min rating, min reviews, not permanently closed)
        - Deduplicate by googlePlaceId
        - Sort by combined score (rating * log10(reviews))
        - For each place: upsert to Place model (create new or update ratings/hours)
```

---

## Database Schema Overview

**Core models:** User, City, Event, Place, Item (legacy unified events+places)

**Event fields:** title, description, category (enum), tags[], venueName, address, neighborhood, startTime, endTime, priceRange, source, sourceUrl, externalId, imageUrl, vibeTags[], companionTags[], isDogFriendly, isDrinkingOptional, isAlcoholFree, placeId (optional FK to Place)

**Place fields:** googlePlaceId, name, address, lat/lng, googleMapsUrl, googleRating, googleReviewCount, combinedScore, priceLevel (0-4), types[], phoneNumber, website, openingHours (JSON), primaryImageUrl, neighborhood, citySlug, category, vibeTags[], companionTags[], occasionTags[], goodForTags[], pulseDescription, isDogFriendly, dogFriendlyAreas[], dogAmenities[], isDrinkingOptional, isAlcoholFree, hasMocktailMenu, naOptions[], openingStatus (OPEN|COMING_SOON|SOFT_OPEN|TEMPORARILY_CLOSED|PERMANENTLY_CLOSED), isNew, isUpcoming, isFeatured, buzzScore

**Item fields (legacy):** type (EVENT|PLACE), title, description, category, tags[], venueName, address, priceRange, source, vibeTags[], companionTags[], googleRating, googleRatingCount

**User preference models:** Preference (category likes/dislikes), DetailedPreferences (companion, vibe, timing, budget, social, dog/sober), UserConstraints (days, times, neighborhoods, budget)

**Interaction models:** UserEventInteraction, EventUserStatus (legacy), UserItemStatus (WANT/DONE/PASS), UserItemRating (1-5), EventFeedView, UserFeedback, ItemView

**Social models:** UserFollow, Friendship, Group, GroupMember, GroupEvent, GroupPlace, EventInvitation, ListCollaborator

**List models:** List (public/private, templates, share slugs, view/save counts), ListItem (eventId or placeId)

**Community models:** Badge, UserBadge (with progress tracking), LeaderboardEntry

**Creator models:** Influencer, InfluencerPickSet, InfluencerPick, UserInfluencerFollow, CreatorEventFeature, EventSocialContent

**Labs models:** LabsItem, LabsRSVP, LabsSave

**Proximity/Cache models:** GooglePlacesCache (24h TTL)

**Categories enum:** ART, LIVE_MUSIC, BARS, FOOD, COFFEE, OUTDOORS, FITNESS, SEASONAL, POPUP, OTHER, RESTAURANT, ACTIVITY_VENUE

**Prisma notes:**
- `binaryTargets = ["native", "rhel-openssl-3.0.x"]` in generator — required for Vercel
- `@@unique([externalId, source])` on Event — prevents duplicate scrapes
- `ListItem.eventId` and `PlanEvent.eventId` are nullable (items can reference a Place instead)
- `@@index([lat, lng])` on Place for spatial queries
- Build script: `"build": "prisma generate && next build"`

---

## Known Bugs & Issues

### 1. Event Categorization (FIXED 2026-02-22)
**Was:** Almost all events tagged as "Food" because `text.includes("eat")` matched substring "eat" inside "theatre" (th-eat-re).

**Fix applied:** Word-boundary regex matching + 65+ venue mappings. FOOD went from 27 → 11 events, LIVE_MUSIC from 37 → 61, ART from 17 → 35.

**Edge cases remaining:** "Sunrise Yoga at Red Rocks" → LIVE_MUSIC (venue map), "Pilates by the Pool" at "The ART Hotel Pool" → ART (venue name contains "ART").

### 2. Places 404 (FIXED 2026-02-23)
**Was:** `/api/places/route.ts` queried `prisma.item.findMany()` → returned `Item.id` → PlaceCard linked to `/places/${Item.id}` → but detail page queried `prisma.place.findUnique({ where: { id } })` → 404 because Item.id ≠ Place.id.

**Fix applied:** Rewrote API to query `prisma.place.findMany()`, added `placeId` to response, added bridge actions for Want/Done/Pass status, updated PlaceCard to use place-aware actions.

### 3. Match Scoring May Appear Inflated
The scoring system has a theoretical max of ~200+ points but the UI shows match as a percentage. If the percentage calculation uses a low denominator, many events could show near 100%. Needs investigation — check `ScoreBadge.tsx` and `lib/scoring.ts`.

### 4. 303 Magazine Scraper Returns 0 Events
The scraper tries JSON-LD first, then DOM parsing. Both return nothing — their page structure likely changed. Needs investigation of current HTML at `https://303magazine.com/events/`.

### 5. Some Duplicate Events in Database
Events can appear from different sources with slightly different titles. Cross-source dedup now normalizes titles (lowercase, trim, strip "Presents:"/"Live:" prefixes), but exact-title-on-same-date dedup won't catch formatting differences like "Red Rocks - Phish" vs "Phish at Red Rocks".

### 6. Vercel CLI Auth Issue
The Vercel CLI in non-interactive mode has a scope/team bug. Workaround: deploy via Vercel API directly or from the dashboard.

---

## Cron Jobs (vercel.json)

| Path | Schedule | Description |
|------|----------|-------------|
| `/api/events/scrape` | `0 6 * * *` (daily 6am UTC) | Scrape all event sources, dedup, upsert, enrich |
| `/api/cron/cleanup-cache` | `0 4 * * *` (daily 4am UTC) | Delete expired GooglePlacesCache entries |
| `/api/cron/refresh-places?chunk=0` | `0 7 * * 0` (Sunday 7am UTC) | Refresh restaurants, bars, coffee, breweries |
| `/api/cron/refresh-places?chunk=1` | `10 7 * * 0` (Sunday 7:10am UTC) | Refresh art, museums, parks, music venues |
| `/api/cron/refresh-places?chunk=2` | `20 7 * * 0` (Sunday 7:20am UTC) | Refresh bowling, theaters, gyms, yoga studios |

All cron endpoints require `Authorization: Bearer $CRON_SECRET` header. All have `maxDuration = 60` (60s Vercel function limit).

---

## Key File Structure

```
pulse/
├── app/
│   ├── api/
│   │   ├── events/
│   │   │   ├── route.ts                   # GET events with filtering
│   │   │   └── scrape/route.ts            # Cron endpoint for scraping
│   │   ├── feed/route.ts                  # Scored/ranked personalized feed
│   │   ├── feed/following/route.ts        # Following feed
│   │   ├── auth/[...nextauth]/route.ts    # NextAuth config
│   │   ├── auth/signup/route.ts           # User registration
│   │   ├── places/
│   │   │   ├── route.ts                   # GET places (queries Place model, not Item!)
│   │   │   ├── [id]/notify/route.ts       # Place open notifications
│   │   │   ├── [id]/visited/route.ts      # Mark place visited
│   │   │   ├── new/route.ts              # New places endpoint
│   │   │   └── upcoming/route.ts          # Upcoming places endpoint
│   │   ├── cron/
│   │   │   ├── refresh-places/route.ts    # Weekly places refresh (chunked)
│   │   │   └── cleanup-cache/route.ts     # Daily cache cleanup
│   │   ├── curator/events/                # Creator event management
│   │   ├── friends/                       # Friend requests & list
│   │   ├── groups/                        # Group CRUD & voting
│   │   ├── calendar/                      # Calendar & invitations
│   │   ├── lists/                         # User lists CRUD & sharing
│   │   ├── nearby/                        # Proximity discovery API
│   │   ├── plans/                         # Plan CRUD & items
│   │   ├── badges/route.ts               # Badge system
│   │   ├── leaderboards/route.ts          # Leaderboard rankings
│   │   ├── preferences/route.ts           # User preferences
│   │   ├── constraints/route.ts           # User constraints
│   │   ├── feedback/route.ts              # Recommendation tuning
│   │   ├── influencers/route.ts           # Influencer profiles
│   │   ├── suggestions/route.ts           # AI suggestions
│   │   ├── trending/route.ts              # Trending events
│   │   ├── users/                         # User profiles, search, follow
│   │   ├── labs/                          # Pulse Labs RSVP/save
│   │   ├── upload/route.ts               # Image upload (Vercel Blob)
│   │   └── landing/route.ts              # Landing page data
│   ├── feed/page.tsx                      # Main event feed
│   ├── events/[eventId]/                  # Event detail page
│   ├── places/
│   │   ├── page.tsx                       # Places browse (tabs, filters)
│   │   └── [id]/                          # Place detail page
│   ├── new/                               # New in Denver page
│   ├── auth/login/ & signup/              # Auth pages
│   ├── onboarding/                        # Preference setup flow
│   ├── community/                         # Badges & leaderboards
│   ├── groups/                            # Group pages
│   ├── friends/page.tsx                   # Friends list
│   ├── calendar/page.tsx                  # Calendar view
│   ├── curator/                           # Creator dashboard
│   ├── labs/                              # Builder community
│   ├── settings/                          # Profile & preferences
│   ├── stats/page.tsx                     # Personal stats
│   ├── u/[username]/page.tsx              # Public profiles
│   └── page.tsx                           # Landing page
├── components/
│   ├── EventCard.tsx                      # Event card for feed
│   ├── PlaceCard.tsx                      # Place card (supports placeId prop for bridge)
│   ├── ScoreBadge.tsx                     # Match percentage badge
│   ├── PlaceBadges.tsx                    # New/ComingSoon/SoftOpen/Featured badges
│   ├── NavLinks.tsx                       # Navigation
│   ├── badges/                            # DogFriendlyBadge, SoberFriendlyBadge
│   ├── landing/                           # Landing page sections
│   ├── calendar/                          # Calendar components
│   ├── nearby/                            # Proximity discovery components
│   │   ├── NearbySection.tsx              # Main container with tabs + radius
│   │   ├── FromListsTab.tsx               # "From Your Lists" tab
│   │   ├── DiscoverTab.tsx                # "Discover Nearby" tab
│   │   ├── NearbyItemCard.tsx             # Compact item card
│   │   ├── AddToPlanModal.tsx             # Add to plan modal
│   │   └── SaveToListModal.tsx            # Save to list modal
│   └── feed/FeedSidebar.tsx               # Feed filters sidebar
├── lib/
│   ├── scoring.ts                         # Event scoring engine (15+ factors, ~200 pts)
│   ├── recommendations.ts                 # Recommendation logic
│   ├── recommendations-v2.ts              # V2 recommendations
│   ├── enrich-event.ts                    # OpenAI event enrichment
│   ├── prisma.ts                          # Prisma client singleton
│   ├── auth.ts                            # NextAuth config
│   ├── google-places.ts                   # Google Places API (search, details, photos, neighborhoods)
│   ├── places-refresh.ts                  # Shared places refresh logic (used by cron + CLI)
│   ├── geo.ts                             # Haversine distance, bounding box, formatting
│   ├── proximity.ts                       # Proximity query engine
│   ├── badges.ts                          # Badge logic
│   ├── friends.ts                         # Friends logic
│   ├── groups.ts                          # Groups logic
│   ├── calendar.ts                        # Calendar logic
│   ├── leaderboards.ts                    # Leaderboard logic
│   ├── ai/suggestions.ts                  # AI suggestion generation
│   ├── constants/categories.ts            # CATEGORY_EMOJI, CATEGORY_LABELS, CATEGORY_COLORS
│   ├── actions/
│   │   └── items.ts                       # Server actions: setItemStatus, removeItemStatus,
│   │                                      #   setPlaceStatus, removePlaceStatus (bridge pattern),
│   │                                      #   rateItem, getItemWithUserData, recordItemView, etc.
│   └── scrapers/
│       ├── index.ts                       # Orchestrator: runs all scrapers, dedup, upsert, enrichment
│       ├── classify.ts                    # Event classifier: venue map + keyword matching
│       ├── types.ts                       # ScrapedEvent, ScraperResult, Scraper interfaces
│       ├── fetch-utils.ts                 # Shared HTTP fetch with User-Agent
│       ├── denver-events.ts               # Do303 scraper (schema.org microdata)
│       ├── westword.ts                    # Westword scraper (DOM parsing)
│       ├── 303magazine.ts                 # 303 Magazine scraper (JSON-LD + DOM) — currently broken
│       ├── ticketmaster.ts                # Ticketmaster Discovery API scraper
│       └── eventbrite.ts                  # Eventbrite Search API scraper
├── scripts/
│   ├── enrich-events.ts                   # Batch AI enrichment for events
│   ├── enrich-places.ts                   # Batch AI enrichment for places
│   ├── ingest-places.ts                   # Google Places API ingestion (CLI, uses lib/places-refresh.ts)
│   ├── seed.ts                            # Database seeder
│   └── (various seed scripts)
├── prisma/
│   └── schema.prisma                      # Full database schema (~1500 lines)
├── vercel.json                            # Cron config (5 entries: daily scrape, daily cache cleanup, 3 weekly place refreshes)
├── next.config.mjs                        # Image domains, experimental opts
├── package.json                           # Dependencies & scripts
└── .env                                   # Environment variables (local)
```

---

## npm Scripts

```bash
npm run dev              # Start dev server
npm run build            # prisma generate && next build
npm run places:ingest    # Ingest places from Google Places API (--category, --limit, --dry-run, --verbose)
npm run places:enrich    # AI-enrich all places (vibeTags, descriptions, etc.)
npm run events:enrich    # AI-enrich events (--limit, --category, --dry-run, --force)
npm run seed             # Seed database with sample data
npm run prisma:studio    # Open Prisma Studio GUI
npm run prisma:migrate   # Run database migrations
```

---

## Deployment Notes

**Vercel:**
- Project: `pulse` (prj_FEDBvsCO88dR6oZtsaEtfvYNqMgq)
- Team: `quest-taylors-projects` (team_PjUVyAOdxMVrR2FRVblI26Cz)
- Git repo: `questltaylor13/pulse` (repoId: 1114781842)
- Production URL: https://pulse-three-eta.vercel.app
- `maxDuration = 60` on all cron routes (60s Vercel function limit)
- Auto-deploys on push to `main`

**Deploying via API** (workaround for CLI auth bug):
```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_PjUVyAOdxMVrR2FRVblI26Cz&forceNew=1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"pulse","project":"prj_FEDBvsCO88dR6oZtsaEtfvYNqMgq","gitSource":{"type":"github","repoId":1114781842,"ref":"main"},"target":"production"}'
```

Token is in `~/Library/Application Support/com.vercel.cli/auth.json`.

**Neon (Database):**
- Serverless PostgreSQL
- Connection pooler endpoint (required for serverless)
- DATABASE_URL must use `sslmode=require` but NOT `channel_binding=require`

---

## Recent Major Changes (Reverse Chronological)

### 2026-02-23: Data Pipeline Fix, Scrapers, and Automation
- **Fixed Places 404** — Rewrote `/api/places/route.ts` to query Place model instead of Item model. Added `setPlaceStatus`/`removePlaceStatus` bridge actions. Updated PlaceCard with `placeId` prop.
- **Added Ticketmaster scraper** — Ticketmaster Discovery API, paginated, genre mapping, image selection, price formatting
- **Added Eventbrite scraper** — Eventbrite Search API, venue fetching, pagination
- **Automated places refresh** — Weekly cron (3 chunks × 4 categories on Sundays), shared logic in `lib/places-refresh.ts`
- **Improved deduplication** — Title normalization for cross-source dedup (lowercase, trim, strip prefixes)
- **Reduced scraper timeout** — 15s → 10s (API scrapers are faster than HTML scrapers)
- **Commit:** `81890b8`

### 2026-02-23: Proximity-Aware Discovery
- Added "Plan Around This" section on event/place detail pages
- From Your Lists + Discover Nearby tabs with radius selector
- Geo utilities, proximity engine, Google Places cache
- List collaboration (VIEWER/EDITOR roles)
- **Commit:** `bfbb468`

### 2026-02-23: UI Standardization
- Updated color system to Electric Blue
- Fixed PlaceCard buttons
- **Commit:** `26f3e07`

### 2026-02-22: Event Categorization Fix
- Word-boundary regex matching instead of `.includes()`
- 65+ Denver venue mappings
- Re-classified all events
- **Commits:** `b97fae5`, `61a4cf7`

---

## What Needs to Be Done Next

### Priority 1: Fix 303 Magazine Scraper
The scraper returns 0 events. Need to investigate the current HTML at `https://303magazine.com/events/` and update selectors.

### Priority 2: Set Up Ticketmaster & Eventbrite API Keys
The scrapers are built but need API keys configured in Vercel environment variables:
- `TICKETMASTER_API_KEY` — free from developer.ticketmaster.com
- `EVENTBRITE_TOKEN` — from eventbrite.com/platform/api-keys

### Priority 3: Investigate Match Scoring
Check if match scores are inflated. Look at `ScoreBadge.tsx` → percentage calculation and `lib/scoring.ts` → theoretical max.

### Priority 4: Feed UI Polish
Better filtering, improved event cards, image handling, category navigation.

### Priority 5: Ongoing Scraper Reliability
Monitor that Do303 and Westword continue returning data. Web scrapers break when sites change HTML structure.

### Priority 6: Place-Status Migration
The current bridge pattern (Place → find/create Item → UserItemStatus) works but is a workaround. A proper migration would add a `placeId` column to `UserItemStatus` or create a `UserPlaceStatus` table for direct Place ↔ Status linkage.

---

## Database Stats (as of 2026-02-23)

- **~200 events** across 5 potential sources (Do303, Westword, 303Magazine, Ticketmaster, Eventbrite)
- **460 places** (all AI-enriched with vibeTags, descriptions, etc.)
- **12 place categories** refreshed weekly via cron
- Sources: do303, westword, 303magazine (broken), ticketmaster (pending API key), eventbrite (pending API key), pulse-seed, curator
