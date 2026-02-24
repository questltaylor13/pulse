# Pulse Project Status

> Last updated: 2026-02-23
> Live at: https://pulse-three-eta.vercel.app

## What is Pulse?

Pulse is an AI-powered social discovery app for Denver. It scrapes events from local sources (Do303, Westword, 303 Magazine), enriches them with OpenAI, and scores/ranks them based on user preferences (vibe, companion type, budget, dog-friendly, sober-friendly, etc.). Think "Yelp meets Tinder for events" — personalized feed, swipe-to-save, plan builder, friend groups, curated creator picks.

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
| Scraping | Cheerio (HTML parsing, schema.org microdata) |
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
CRON_SECRET="pulse-cron-secret-2026"     # Auth token for scraper cron endpoint
GOOGLE_PLACES_API_KEY="..."             # Google Places API for place data
OPENAI_API_KEY="..."                    # OpenAI for event/place AI enrichment
```

All of these must be set in Vercel Environment Variables for production.

---

## Features Built & Working

### Core Feed & Scoring
- **Personalized event feed** (`app/feed/page.tsx`) — scored/ranked events based on user preferences
- **Scoring engine** (`lib/scoring.ts`) — 15+ scoring factors across ~200 points: category match, time relevance, price, companion fit (solo/date/friends/family), vibe match (chill/moderate/high-energy), social intent, dog-friendly, sober-friendly, trending, diversity enforcement
- **Score badge** (`components/ScoreBadge.tsx`) — shows match percentage on event cards
- **Recommendation reasons** — "Matches your love for live music", "Perfect for date night", etc.
- **Diversity rules** — max 3 per category, max 2 per venue, exploration picks, trending picks

### Event Scraping Pipeline
- **3 sources:** Do303, Westword, 303 Magazine (303 currently returning 0 events)
- **Scraper orchestrator** (`lib/scrapers/index.ts`) — runs all scrapers with 15s timeout each, deduplicates by title+date
- **Classifier** (`lib/scrapers/classify.ts`) — venue-based classification (65+ Denver venues) + keyword matching with word boundaries
- **Tag extraction** — regex-based tag extraction for scoring-compatible tags
- **OpenAI enrichment** (`lib/enrich-event.ts`) — generates descriptions, vibeTags, companionTags, isDogFriendly, isDrinkingOptional, isAlcoholFree
- **Inline enrichment** — new events enriched during scrape if time budget allows (15s reserved)
- **Cron job** — runs daily at 6:00 AM UTC via Vercel cron (`vercel.json`)
- **Manual trigger:** `curl -H "Authorization: Bearer $CRON_SECRET" https://pulse-three-eta.vercel.app/api/events/scrape`

### Places System
- **460 places** ingested from Google Places API (`scripts/ingest-places.ts`)
- **All enriched** with AI-generated vibeTags, companionTags, occasionTags, goodForTags, pulseDescription
- **Place detail pages** (`app/places/[id]/`)
- **New/upcoming places** tracking with opening status, alerts, buzz scores

### User System
- **Auth** — signup/login with email/password (NextAuth credentials)
- **Onboarding** — category preferences, relationship status, Denver tenure, detailed preferences (companion, vibe, timing, budget, social intent, dog/sober preferences)
- **Profiles** — username, bio, profile image, public profiles at `/u/[username]`
- **Following** — user-to-user follows, following feed

### Social Features
- **Friends system** — friend requests, accept/decline, see friends going to events
- **Groups** — create groups, join codes, suggest events/places, voting (yes/no/maybe)
- **Lists** — custom event lists (public/private, shareable by slug)
- **Want/Done/Pass** — swipe-style event status tracking
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

### Proximity-Aware Discovery (NEW — 2026-02-23)
- **"Plan Around This" section** — renders on event and place detail pages when coordinates are available
- **From Your Lists tab** — shows items from owned/shared lists near the viewed event/place, grouped by list with distance badges
- **Discover Nearby tab** — Google Places results (cached 24h), excluding already-saved items, with "New!" badges for recent openings
- **Radius selector** — toggle between 1 mi / 3 mi / 5 mi, triggers client-side refetch
- **Type filters** — All / Restaurants / Bars / Coffee / Activities on discovery tab
- **Add to Plan** — inline modal to add any nearby item to an existing plan
- **Save to List** — inline modal to save a discovery item to a user's list
- **Geo utilities** (`lib/geo.ts`) — haversine distance, bounding box for SQL pre-filtering, distance formatting
- **Proximity engine** (`lib/proximity.ts`) — `getListItemsNearby()` and `discoverNearby()` with bounding box pre-filter + haversine post-filter
- **List collaboration** — `ListCollaborator` model with VIEWER/EDITOR roles, share endpoint at `/api/lists/[id]/share`
- **Place support in Lists & Plans** — `ListItem` and `PlanEvent` now support `placeId` alongside `eventId`
- **Google Places cache** — `GooglePlacesCache` model with 24h TTL, daily cleanup cron at 4am UTC
- **Spatial index** — `@@index([lat, lng])` on Place model for efficient proximity queries

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
      → Run each scraper with 15s timeout:
        1. scrape303Magazine()  — JSON-LD first, DOM fallback
        2. scrapeDenverEvents() — schema.org microdata on do303.com/events
        3. scrapeWestword()     — DOM parsing on westword.com/things-to-do/
      → Deduplicate by title+date key
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

---

## Database Schema Overview

**Core models:** User, City, Event, Place, Item (unified events+places)

**Event fields:** title, description, category (enum), tags[], venueName, address, neighborhood, startTime, endTime, priceRange, source, sourceUrl, externalId, imageUrl, vibeTags[], companionTags[], isDogFriendly, isDrinkingOptional, isAlcoholFree

**Place fields:** googlePlaceId, name, address, lat/lng, googleRating, priceLevel, category, vibeTags[], companionTags[], occasionTags[], goodForTags[], pulseDescription, isDogFriendly, openingStatus, isNew, isUpcoming

**User preference models:** Preference (category likes/dislikes), DetailedPreferences (companion, vibe, timing, budget, social, dog/sober), UserConstraints (days, times, neighborhoods, budget)

**Interaction models:** UserEventInteraction, EventUserStatus, UserItemStatus, UserItemRating, EventFeedView, UserFeedback

**Social models:** UserFollow, Friendship, Group, GroupMember, GroupEvent, GroupPlace, EventInvitation, ListCollaborator

**Proximity/Cache models:** GooglePlacesCache

**Community models:** Badge, UserBadge, LeaderboardEntry

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
**Was:** Almost all events tagged as "Food" because `text.includes("eat")` matched substring "eat" inside "theatre" (th-eat-re). Every event at a Theatre/Theater venue got FOOD score 1 while nothing else matched.

**Fix applied:**
- Switched from `.includes()` to `\b` word-boundary regex matching
- Added 65+ Denver venue mappings as first classification signal
- Removed ambiguous keywords: "tour", "rock" from LIVE_MUSIC; standalone "theater"/"theatre" from ART; standalone "tasting" from FOOD weight-3
- Fixed 303Magazine to pass `venueName` instead of `description` to classifier
- Re-classified all 199 events in database

**Current state:** Classifier is working well. FOOD went from 27 → 11 events, LIVE_MUSIC from 37 → 61, ART from 17 → 35. Some edge cases remain (e.g., "Sunrise Yoga at Red Rocks" → LIVE_MUSIC because venue map, "Pilates by the Pool" at "The ART Hotel Pool" → ART because venue name contains "ART").

### 2. Match Scoring May Appear Inflated
The scoring system has a theoretical max of ~200+ points but the UI shows match as a percentage. If the percentage calculation uses a low denominator or doesn't account for all scoring dimensions properly, many events could show near 100%. This needs investigation — check how `ScoreBadge.tsx` converts raw score to percentage and whether the normalization is correct.

### 3. 303 Magazine Scraper Returns 0 Events
The scraper tries JSON-LD first, then DOM parsing. Both return nothing — their page structure likely changed. Needs investigation of their current HTML at `https://303magazine.com/events/`.

### 4. Some Duplicate Events in Database
Events like "First Friday Art Walk - RiNo" appear 3 times from different sources (pulse-seed, Visit Denver x2). The deduplication is by title+date, but same-name events from different sources on the same day still duplicate. Source case inconsistency too: "do303" vs "Do303".

### 5. Vercel CLI Auth Issue
The Vercel CLI in non-interactive mode has a scope/team bug — `--scope` and `--team` flags don't work properly. Workaround: deploy via Vercel API directly using the auth token from `~/Library/Application Support/com.vercel.cli/auth.json` with teamId and repoId. Or just deploy from the Vercel dashboard.

---

## Key File Structure

```
pulse/
├── app/
│   ├── api/
│   │   ├── events/
│   │   │   ├── route.ts              # GET events with filtering
│   │   │   └── scrape/route.ts       # Cron endpoint for scraping
│   │   ├── feed/route.ts             # Scored/ranked personalized feed
│   │   ├── auth/[...nextauth]/route.ts # NextAuth config
│   │   ├── places/                   # Places CRUD
│   │   ├── curator/events/           # Creator event management
│   │   ├── friends/                  # Friend requests & list
│   │   ├── groups/                   # Group CRUD & voting
│   │   ├── calendar/                 # Calendar & invitations
│   │   ├── badges/route.ts           # Badge system
│   │   ├── leaderboards/route.ts     # Leaderboard rankings
│   │   ├── preferences/route.ts      # User preferences
│   │   ├── constraints/route.ts      # User constraints
│   │   ├── feedback/route.ts         # Recommendation tuning
│   │   ├── lists/                    # User lists CRUD
│   │   │   └── [id]/share/route.ts   # List collaboration management
│   │   ├── nearby/
│   │   │   ├── lists/route.ts        # Nearby items from user's lists
│   │   │   └── discover/route.ts     # Google Places discovery
│   │   ├── plans/[id]/items/route.ts # Add event/place to plan
│   │   ├── cron/cleanup-cache/route.ts # Daily cache cleanup
│   │   └── landing/route.ts          # Landing page data
│   ├── feed/page.tsx                 # Main event feed
│   ├── events/[eventId]/             # Event detail page
│   ├── places/                       # Places browse & detail
│   ├── auth/login/ & signup/         # Auth pages
│   ├── onboarding/                   # Preference setup flow
│   ├── community/                    # Badges & leaderboards
│   ├── groups/                       # Group pages
│   ├── friends/page.tsx              # Friends list
│   ├── calendar/page.tsx             # Calendar view
│   ├── curator/                      # Creator dashboard
│   ├── labs/                         # Builder community
│   ├── settings/                     # Profile & preferences
│   ├── stats/page.tsx                # Personal stats
│   └── page.tsx                      # Landing page
├── components/
│   ├── EventCard.tsx                 # Event card for feed
│   ├── PlaceCard.tsx                 # Place card
│   ├── ScoreBadge.tsx                # Match percentage badge
│   ├── NavLinks.tsx                  # Navigation
│   ├── landing/                      # Landing page sections
│   ├── calendar/                     # Calendar components
│   ├── badges/                       # Badge display components
│   ├── nearby/                       # Proximity discovery components
│   │   ├── NearbySection.tsx         # Main container with tabs + radius selector
│   │   ├── FromListsTab.tsx          # "From Your Lists" tab content
│   │   ├── DiscoverTab.tsx           # "Discover Nearby" tab with type filters
│   │   ├── NearbyItemCard.tsx        # Reusable compact item card
│   │   ├── AddToPlanModal.tsx        # Add to plan modal
│   │   └── SaveToListModal.tsx       # Save to list modal
│   └── feed/FeedSidebar.tsx          # Feed filters sidebar
├── lib/
│   ├── scoring.ts                    # Event scoring engine (15+ factors, ~200 points)
│   ├── recommendations.ts            # Recommendation logic
│   ├── recommendations-v2.ts         # V2 recommendations
│   ├── enrich-event.ts              # OpenAI event enrichment
│   ├── prisma.ts                    # Prisma client singleton
│   ├── auth.ts                      # NextAuth config
│   ├── google-places.ts             # Google Places API
│   ├── geo.ts                       # Haversine distance, bounding box, formatting
│   ├── proximity.ts                 # Proximity query engine (nearby lists + discovery)
│   ├── badges.ts                    # Badge logic
│   ├── friends.ts                   # Friends logic
│   ├── groups.ts                    # Groups logic
│   ├── calendar.ts                  # Calendar logic
│   ├── leaderboards.ts             # Leaderboard logic
│   ├── ai/suggestions.ts           # AI suggestion generation
│   ├── actions/                     # Server actions (events, items, lists, stats)
│   └── scrapers/
│       ├── index.ts                 # Orchestrator: runs all scrapers, dedup, upsert, enrichment
│       ├── classify.ts              # Event classifier: venue map + keyword matching
│       ├── types.ts                 # ScrapedEvent, ScraperResult interfaces
│       ├── fetch-utils.ts           # Shared HTTP fetch with User-Agent
│       ├── denver-events.ts         # Do303 scraper (schema.org microdata)
│       ├── westword.ts              # Westword scraper (DOM parsing)
│       └── 303magazine.ts           # 303 Magazine scraper (JSON-LD + DOM)
├── scripts/
│   ├── enrich-events.ts             # Batch AI enrichment for events
│   ├── enrich-places.ts             # Batch AI enrichment for places
│   ├── ingest-places.ts             # Google Places API ingestion
│   ├── seed.ts                      # Database seeder
│   └── (various seed scripts)
├── prisma/
│   └── schema.prisma                # Full database schema
├── vercel.json                      # Cron config (daily 6am UTC scrape)
├── next.config.mjs                  # Image domains, experimental opts
├── package.json                     # Dependencies & scripts
└── .env                             # Environment variables (local)
```

---

## npm Scripts

```bash
npm run dev              # Start dev server
npm run build            # prisma generate && next build
npm run places:ingest    # Ingest places from Google Places API
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
- Crons: daily 6am UTC scrape (`/api/events/scrape`), daily 4am UTC cache cleanup (`/api/cron/cleanup-cache`)
- `maxDuration = 60` on scrape route (60s Vercel function limit)

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

## What Needs to Be Done Next

### Priority 1: Fix 303 Magazine Scraper
The scraper returns 0 events. Need to investigate the current HTML at `https://303magazine.com/events/` and update selectors. This is the easiest source of additional events.

### Priority 2: Investigate Match Scoring
Check if match scores are inflated (many events showing near 100%). Look at:
- `components/ScoreBadge.tsx` — how raw score is converted to percentage
- `lib/scoring.ts` — what the theoretical max score actually is
- Whether events without tags/enrichment get high scores by default

### Priority 3: More Event Sources
Consider adding more scrapers for Denver events. Visit Denver (`visitdenver.com/events/`) was attempted but requires JavaScript rendering (no headless browser available). Other options: Eventbrite API, Facebook Events, local venue calendars.

### Priority 4: Feed UI Polish
Once categories are correct, improve the feed UI — better filtering by category, improved event cards, images.

### Priority 5: Ongoing Scraper Reliability
Monitor that Do303 and Westword continue returning data. Web scrapers break when sites change HTML structure. Current yields: ~25 events from Do303, ~9 from Westword per scrape run.

---

## Database Stats (as of 2026-02-22)

- **199 events** (61 LIVE_MUSIC, 35 ART, 31 OTHER, 21 OUTDOORS, 17 BARS, 11 FOOD, 8 COFFEE, 7 SEASONAL, 5 FITNESS, 3 POPUP)
- **460 places** (all AI-enriched)
- **59 events AI-enriched** with vibeTags, companionTags, descriptions
- Sources: do303, Do303, pulse-seed, Denver Post, Visit Denver, westword, 303magazine, denverand.co, curator
