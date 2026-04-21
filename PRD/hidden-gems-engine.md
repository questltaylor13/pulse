# PRD 3: Hidden Gems Engine

**Owner:** Quest
**Status:** Ready for implementation (ships after PRD 2 Regional Expansion is stable)
**Prior context:**
- PRD 1 (`data-refresh-and-reliability.md`) — shipped. Denver event + place pipelines live.
- PRD 2 (`regional-expansion.md`) — extends event/place coverage to Front Range + mountain towns.
**Companion doc (later):** PRD 4 (`matching-engine.md`) — scores fit between users and content across all three content types (Events, Places, Hidden Gems).

---

## Context

PRDs 1 and 2 built the structured content layer: events and places from aggregators, concert venues, town calendars, visitor bureaus. That pipeline is solid but structurally limited — it can only surface what's already on a structured event site somewhere. The content that makes Pulse feel *magical* doesn't live on those sites. It lives in:

1. **Local community knowledge** that only surfaces in Reddit threads, niche forums, and word-of-mouth (the curling competition, the archery dodgeball league, the sunflower field at Chatfield in August, the alley with all the street art off Santa Fe)
2. **Hyperlocal niche sites** for specific activities (Denver Curling Club, Denver Archery, run clubs, cycling clubs, rec leagues) that are too small and too infrequent to justify individual daily scrapers
3. **Active discovery via LLM research** — the same way a curious local would answer "what's unique to do right now" by searching and synthesizing

The Hidden Gems Engine finds and curates this content. It is **not a scraper**. It is a research-and-curation system that runs on a weekly cadence, uses LLMs + web search + Reddit mining + a small curated niche-site list as inputs, produces structured `Discovery` records, and surfaces them in the app under the **Hidden Gems** tab and cross-surfaced in Events/Places feeds.

This layer is what differentiates Pulse from every other event aggregator. Eventbrite and Do303 aggregate what's already aggregated. Pulse surfaces what *isn't*.

---

## Naming convention (important)

- **Schema / engine / pipeline:** `Discovery` (technical term — broader than "gem" since it includes niche activities and seasonal tips)
- **User-facing tab + badges + copy:** "Hidden Gems"

Don't rename the schema. Just label the UI consistently as Hidden Gems. The internal/external naming split is intentional and keeps the system flexible if the content mix evolves.

---

## What is a Discovery?

A Discovery is curated local content that doesn't fit cleanly into the Event or Place taxonomy. Three subtypes:

1. **Hidden Gem (`HIDDEN_GEM`)** — a place or experience that exists permanently but is under-the-radar. Example: "The bench at Sloan's Lake at sunset," "Lookout Mountain drive on a Tuesday morning," "The Milk Market basement bar," "That legendary dive bar in Nederland."
2. **Niche Activity / Club (`NICHE_ACTIVITY`)** — a recurring community activity without a fixed event date. Example: "Denver Curling Club open nights," "Cheesman Park run club, Thursday 6am," "Denver Dodgeball League summer signups."
3. **Seasonal Tip / Local Ritual (`SEASONAL_TIP`)** — time-bounded but not event-ticketed. Example: "When the sunflowers bloom at Chatfield (late August)," "Stargazing at Mount Evans after first frost," "Larimer Square ice-skating opens around Thanksgiving."

### The Event vs. Hidden Gem rule (critical — carried forward from PRD 2)

The clean decision tree for whether a piece of content is an Event or a Discovery:

- **Has a specific date + time + ticket/admission → Event** (Fort Collins Art Festival this weekend, Vail Jazz Festival in July)
- **Permanent, recurring, or seasonal without a specific ticketed instance → Discovery** (a Nederland dive bar, Thursday run club, sunflower bloom season)

Edge cases and how to handle:
- **Recurring events with specific weekly times** (run clubs, open mic nights) → Discovery (NICHE_ACTIVITY). Users don't "buy a ticket to Thursday."
- **Festivals that happen annually** → Event when the dated instance is upcoming, Discovery (SEASONAL_TIP) when it's the concept of the festival.
- **A popup that has specific dates** → Event.
- **A "where to go in August" style recommendation** → Discovery (SEASONAL_TIP).

This rule is enforced at the enrichment layer (Phase 4) — candidates that look like dated events get rejected from the Discovery pipeline and flagged for the Event pipeline instead.

---

## Goals

1. Build a `Discovery` content type with its own schema, separate from Event and Place
2. Build three input pipelines: LLM research, Reddit mining, niche-site checker
3. All candidates flow through a single quality + verification + enrichment pass
4. Surface Discoveries in a dedicated **Hidden Gems** tab, with cross-surfacing on Events/Places feeds
5. Weekly cadence (not daily) with observability parity to PRD 1/2
6. Cover both Denver and the regional footprint established in PRD 2 — a hidden gem in Nederland or Fort Collins is still a hidden gem
7. End state: every week, 15–30 high-quality Discoveries get added across Denver + region, and users feel like the app is curated by someone who actually lives here

## Non-goals

- User-submitted Discoveries (community submission is roadmap phase 5, later)
- Daily updates (weekly is the right cadence and treated as a feature)
- Discoveries for cities outside the Denver + 2-hour + mountain-destination footprint
- Replacing or modifying PRD 1/2 pipelines
- A full admin dashboard UI (extend the `/admin/scrapers` page from PRD 1)
- Storing raw Reddit post content verbatim (licensing — extract and restructure, don't republish)

---

## Work is phased. After each phase, report back and wait for approval.

---

## PHASE 0 — SCHEMA & EDITORIAL SEEDING

### 0.1 Prisma schema

Add the `Discovery` model:

```prisma
model Discovery {
  id            String   @id @default(cuid())
  title         String
  description   String   @db.Text
  subtype       DiscoverySubtype
  category      Category
  
  // Location (null if non-geographic, e.g., "Colorado stargazing in winter")
  neighborhood  String?
  townName      String?         // "Denver", "Nederland", "Fort Collins", etc.
  region        EventRegion     @default(DENVER_METRO)  // reuse enum from PRD 2
  latitude      Float?
  longitude     Float?
  
  // Timing hints (Discoveries don't have hard dates, but often have season/time flavor)
  seasonHint    String?         // "Late August", "After first frost", "Thursday mornings"
  
  // Provenance
  sourceType    DiscoverySource
  sourceUrl     String?
  sourceUpvotes Int?            // Reddit upvotes or equivalent signal
  mentionedByN  Int     @default(1)  // Count of times this has surfaced across pipelines
  
  // Quality + verification
  qualityScore  Int             // 1-10 from enrichment pass
  tags          String[]
  status        DiscoveryStatus @default(ACTIVE)
  verifiedAt    DateTime?       // Null if unverified (e.g., no Google Places match for location-based)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([status, qualityScore])
  @@index([category, status])
  @@index([region, status])
}

enum DiscoverySubtype {
  HIDDEN_GEM
  NICHE_ACTIVITY
  SEASONAL_TIP
}

enum DiscoverySource {
  REDDIT
  LLM_RESEARCH
  NICHE_SITE
  EDITORIAL     // Manually added by Quest
  COMMUNITY     // Future: user-submitted
}

enum DiscoveryStatus {
  ACTIVE
  ARCHIVED      // Out of season, closed, or manually hidden
  UNVERIFIED    // LLM-generated, couldn't verify — needs manual review
  FLAGGED       // Potential hallucination or quality issue
}
```

### 0.2 Directory structure

```
lib/discoveries/
  types.ts                     # Shared Discovery types
  orchestrator.ts              # Runs all pipelines, dedupes, enriches, upserts
  enrichment.ts                # AI enrichment pass (Pulse-voice description, quality score, Event-vs-Gem classifier)
  verification.ts              # Google Places verification for location-based Discoveries
  pipelines/
    llm-research.ts            # LLM + web search research
    reddit.ts                  # Reddit mining
    niche-sites.ts             # Hand-curated niche site checker
    niche-sites.config.ts      # List of {name, url, selector, subtype, category, town}
```

### 0.3 Editorial seeding (do this BEFORE automated pipelines run)

Seed 12–15 Discoveries manually — Quest's call on which. Examples:
- The curling competition / Denver Curling Club open nights
- The Chatfield sunflower field in August
- A few of Quest's personal "I love this spot" picks
- The Larimer Square ice-skating opening ritual
- A Nederland or Boulder gem to validate regional coverage in the schema

This serves three purposes:
- Validates the schema end-to-end
- Gives the enrichment prompt real in-brand examples (prompt quality improves significantly when the LLM has seen actual Pulse-voice Discoveries)
- Guarantees the Hidden Gems tab isn't empty on day one

Create a seed script: `prisma/seed-discoveries.ts`. Source = `EDITORIAL`, `verifiedAt` populated (Quest has personally verified these).

---

## PHASE 1 — LLM RESEARCH PIPELINE

Most important pipeline — most directly answers "how do we keep finding unique things."

### 1.1 Core loop

Weekly cron job calls Claude API with web search enabled. Runs N separate research queries, each scoped to a different angle so we get breadth:

```
Query 1 — Denver under-the-radar:
"What are 5-10 unique, under-the-radar things to do in Denver right now?
Focus on activities that aren't on Eventbrite — rec leagues, niche clubs,
seasonal experiences, hidden viewpoints, weird competitions. Exclude chain
restaurants, mainstream concerts, and generic tourist attractions."

Query 2 — Hidden spots:
"What are best-kept-secret spots in Denver that locals love but tourists
don't know about? Focus on specific locations — hidden parks, under-the-radar
bars, quiet viewpoints, unusual shops."

Query 3 — Seasonal:
"What seasonal activities in Denver and along the Colorado Front Range are
happening right now or in the next 4-6 weeks that most people don't know
about? Focus on nature, community events, and time-limited experiences."

Query 4 — Hobby groups:
"What are the most distinctive hobby groups, rec leagues, and niche clubs
active in Denver and nearby towns (Boulder, Fort Collins, Colorado Springs)?
Include curling, archery, unusual sports leagues, specialty run/bike clubs,
maker groups."

Query 5 — Regional hidden gems:
"What are hidden gems in mountain towns within 2 hours of Denver — places
in Nederland, Estes Park, Idaho Springs, Georgetown, Winter Park — that
locals love but most Denver residents don't know about? Focus on spots,
rituals, and small experiences, not big-ticket tourist attractions."

Query 6 — Newly interesting:
"What's newly opened or newly trending in Denver in the past 3-6 months
that fits the vibe of young professionals aged 25-35?"
```

Exact prompts tunable — store as config in `lib/discoveries/pipelines/llm-research.ts` so Quest can edit without touching pipeline code.

### 1.2 Structured output

Strict JSON schema:

```typescript
{
  candidates: Array<{
    title: string
    description: string  // 2-3 sentences
    subtype: "HIDDEN_GEM" | "NICHE_ACTIVITY" | "SEASONAL_TIP"
    category_hint: string  // e.g., "outdoors", "bars", "fitness"
    location_hint: string | null   // e.g., "Sloan's Lake", "RiNo", "Nederland", null if no specific location
    town_hint: string | null       // e.g., "Denver", "Nederland", "Fort Collins"
    season_hint: string | null
    source_urls: string[]          // URLs the LLM referenced — required
  }>
}
```

### 1.3 Model choice

Use **Anthropic Claude API with web search enabled**. Quest already uses Claude across the stack; Claude with web search is reliable for structured local research. Cost at weekly cadence is under $5/month even with 6 queries.

Do NOT use OpenAI web search unless there's a specific reason. Consistency > mixing providers.

Save raw responses to a `LLMResearchRun` table for debugging and prompt tuning.

### 1.4 Hallucination guardrails

LLMs invent plausible-sounding places that don't exist. Mitigations:

1. **Source URLs required.** Every candidate must have ≥1 source URL. No source URL → drop or flag as UNVERIFIED.
2. **Google Places verification for location-based candidates.** If `location_hint` present, verify via Google Places API. No match → status = UNVERIFIED (not dropped — Quest reviews).
3. **Cross-source corroboration boost.** Same candidate surfaces in multiple queries or multiple source URLs → boost quality score.
4. **Event-vs-Gem classifier in enrichment.** If the candidate looks like a dated event (has a specific date, ticket URL, single-occurrence framing), reject from Discovery pipeline. Flag for Event pipeline review.

---

## PHASE 2 — REDDIT MINING PIPELINE

### 2.1 Subreddits (verify each is active before wiring)

Denver-focused:
- r/Denver
- r/denverfood
- r/denvermusic
- r/DenverCirclejerk (surprisingly high signal on what's overhyped)

Regional (new — per PRD 2 geographic expansion):
- r/Boulder
- r/fortcollins
- r/ColoradoSprings
- r/Breckenridge
- r/Vail
- r/SteamboatSprings

Colorado-wide:
- r/ColoradoHiking
- r/colorado
- r/cycling (filter to Denver/Colorado geo tags)
- r/climbing (same)

### 2.2 Reddit API access

**Preferred:** Public JSON endpoints (`reddit.com/r/Denver/top.json?t=week`). Free, no auth for read-only, respect 1 req/sec with descriptive User-Agent.

**Fallback:** Free Reddit API tier (60 req/min) if JSON endpoints prove unreliable.

No paid Reddit API tier without approval.

### 2.3 Post selection

Weekly job pulls per subreddit:
- Top 25 posts from past week (`top.json?t=week`)
- Top 10 posts from past month (`top.json?t=month`)
- All posts matching patterns like "hidden gem", "things to do", "what should I", "recommend", "best [anything]" from past 3 months

Filter thresholds:
- Top weekly/monthly: min 50 upvotes (scale down for smaller subs like r/Breckenridge — min 20)
- Pattern-matched: min 20 upvotes

### 2.4 Extraction via LLM

Posts + top comments → Claude API call with a prompt like:

```
You are extracting structured recommendations from a Reddit discussion
about {subreddit_town}. From the post and top comments below, extract
specific places, activities, or experiences being recommended. For each:

- title: name of the place/activity
- description: 2-3 sentences in Pulse's voice — opinionated, specific, local
- subtype: HIDDEN_GEM / NICHE_ACTIVITY / SEASONAL_TIP
- town_hint: which town/city (inferred from subreddit + context)
- mentioned_by_n_commenters: integer
- community_sentiment: strongly_positive / positive / mixed / negative

Exclude:
- Chains, major tourist attractions, anything vague ("go for a walk")
- Obvious jokes or shitposts
- Anything that's clearly a dated event (concerts, festivals with specific
  dates, ticketed one-off events) — those belong in the Event pipeline, not here

Post title: {title}
Post body: {body}
Top 10 comments: {comments}
```

### 2.5 Licensing posture

Do NOT store raw Reddit text in DB. Store only the extracted/restructured Discovery + link back to source thread. This is defensible fair use (citing and synthesizing, not republishing).

### 2.6 Dedup across Reddit runs

Same hidden gem surfaces repeatedly. Match new candidates against existing Discoveries via fuzzy title match + location proximity. On match:
- Boost `sourceUpvotes` (sum of cumulative upvotes across threads)
- Increment `mentionedByN`
- Refresh `updatedAt`

Don't create duplicates. The `mentionedByN` field becomes a "community consensus" signal — something mentioned in 5 different threads is more validated than something mentioned once.

---

## PHASE 3 — NICHE SITES PIPELINE

Small, hand-curated list of niche sites. Too small for daily scrapers, too high-signal to ignore.

### 3.1 Initial site list (extend via config file)

Denver:
- Denver Curling Club (events / open nights page)
- Denver Archery Center
- Denver Dodgeball League (seasonal signups)
- Denver Bike Party
- Colorado Mountain Club (events + local chapters)

Regional (per PRD 2):
- Boulder Flatirons Climbing Club (or equivalent)
- Fort Collins Bike Co-op
- Any niche site Quest flags during PRD 2 work

### 3.2 Implementation

Not a fancy scraper. Simple HTML fetch + targeted selector per site, ~10-20 lines each, wrapped in try/catch. Each site gets one entry in `niche-sites.config.ts`:

```typescript
export const NICHE_SITES = [
  {
    name: "Denver Curling Club",
    url: "https://denvercurlingclub.com/events",
    selector: ".event-card",
    subtype: "NICHE_ACTIVITY",
    category: "ACTIVITY_VENUE",
    town: "Denver",
    region: "DENVER_METRO"
  },
  // ...
]
```

### 3.3 Expected volume

Each site contributes 1–5 candidates per run, max. Not a volume play — a "make sure the curling bonspiel doesn't get missed" play.

---

## PHASE 4 — ENRICHMENT, VERIFICATION & QUALITY GATING

All three pipelines feed candidates into a single post-processing flow.

### 4.1 Event-vs-Gem classifier (new — enforces the PRD 2 rule)

Before enrichment, every candidate goes through a classifier step:

```
Given this candidate, determine: is this a DATED_EVENT (has specific date + 
time + ticket/admission, single-occurrence or festival instance) or a 
DISCOVERY (permanent/recurring/seasonal without specific ticketed instance)?

Candidate: {candidate_json}

Return: { classification: "DATED_EVENT" | "DISCOVERY", confidence: 0-1, reason: string }
```

If `DATED_EVENT` with confidence > 0.7:
- Reject from Discovery pipeline
- Log to an `event-pipeline-candidates` queue for Quest review (or for a future Event-pipeline auto-ingest, out of scope here)

If `DISCOVERY` or low-confidence: proceed to enrichment.

### 4.2 Enrichment pass

```
You are the curation voice for Pulse, a Denver + Front Range discovery 
platform for 25-35 year old locals. Rewrite this Discovery in Pulse's voice:

- Opinionated, specific, never generic
- 2-3 sentences max
- No marketing speak, no "immerse yourself in"
- Sound like a friend who actually lives here
- Include one concrete detail that proves it's real (a time, a cross-street, 
  a specific thing to order/do, a specific season)

Candidate: {candidate_json}

Return JSON:
{
  "title": string (max 60 chars, punchy),
  "description": string,
  "category": one of [ART, LIVE_MUSIC, BARS, FOOD, COFFEE, OUTDOORS, FITNESS,
                      SEASONAL, POPUP, RESTAURANT, ACTIVITY_VENUE, SOCIAL, OTHER],
  "tags": string[] (3-5 tags, e.g., "free", "group-friendly", "date-worthy", "regional"),
  "quality_score": integer 1-10
}
```

### 4.3 Quality threshold

Quality < 6 gets dropped. Stricter than the event pipeline (which uses 5) because Hidden Gems are the top-shelf layer.

### 4.4 Location verification

For candidates with a location hint:
- Hit Google Places API, attempt match
- Match → populate lat/lng, set `verifiedAt = now()`, status = ACTIVE
- No match → status = UNVERIFIED, don't show in feed, route to admin review

### 4.5 Regional metadata

Populate `region`, `townName` using the same logic as PRD 2. Use the `DRIVE_TIMES_FROM_DENVER` table for consistency. A Nederland Hidden Gem gets `region = MOUNTAIN_GATEWAY`, `townName = "Nederland"`, which unlocks proper surfacing (see Phase 5).

### 4.6 Dedup

Before insert, fuzzy-match against existing Discoveries:
- Title similarity (Levenshtein or normalized string match)
- Location proximity (within 100m for location-based)
- Same subtype

Match → update existing record (upvote/mention counts, refresh `updatedAt`), don't duplicate.

---

## PHASE 5 — APP SURFACING

### 5.1 Hidden Gems tab

Add a top-level tab: **Hidden Gems** (next to Events, Places, Guides).

Filter chips:
- **All**
- **Spots** (subtype = HIDDEN_GEM)
- **Clubs & Leagues** (subtype = NICHE_ACTIVITY)
- **Seasonal** (subtype = SEASONAL_TIP)

Sort default: `qualityScore` desc, with recency boost. After PRD 4 ships, sort incorporates user match score.

Add a geographic filter chip (parallel to PRD 2's "Near Denver" filter): **Near Me** vs. **All of Colorado** — default to Near Me (Denver metro + Front Range + Mountain Gateway).

### 5.2 Cross-surfacing (integration, not walls)

Discoveries appear in other surfaces too:
- **Events tab:** a "You might not know about" row — 3–5 Discoveries mixed in, below "This weekend's picks"
- **Places tab:** Discoveries with `subtype = HIDDEN_GEM` and a verified location mix into "Where locals actually go" section
- **Guides:** when Quest builds Guides in the future, they pull from all three content types

### 5.3 Visual differentiation

Discovery cards need a visual tell so users understand they're not typical listings:
- Small "Hidden Gem" badge on the card
- Distinct accent color for the badge (different from event/place category colors)
- Source attribution line when cross-surfaced: "Surfaced from r/Denver" or "Curated by Pulse"

In the Hidden Gems tab itself the badge may be redundant — Quest's call during implementation.

### 5.4 Link-out handling

For Reddit-sourced Discoveries: card links to a Pulse detail page (not directly to Reddit). Detail page includes small "originally mentioned on r/Denver" attribution + link-out for trust and licensing safety.

For LLM-research Discoveries: detail page shows source URLs as "Further reading" with clear attribution.

### 5.5 Empty state for Near Me filter

If Near Me filter is on and there are < 5 Discoveries in Denver metro + Front Range, show a nudge: "Not seeing much nearby? Try 'All of Colorado' to see mountain town picks." Don't leave the tab feeling empty.

---

## PHASE 6 — RELIABILITY & OBSERVABILITY

Mirrors PRD 1/2 pattern — don't reinvent.

### 6.1 Cron

- `vercel.json`: weekly cron, Sunday 3am UTC, hits `/api/discoveries/refresh`
- Endpoint runs all three pipelines sequentially → enrichment/verification/dedup flow
- Full run estimated 5–15 minutes — may need Vercel function timeout extension. If timeout is an issue, split pipelines into separate endpoints called in sequence.

### 6.2 Logging

Each pipeline logs to a new `DiscoveryRun` table, parallel to `ScraperRun`:
- Source (LLM_RESEARCH, REDDIT, NICHE_SITE)
- Raw candidate count
- Candidates rejected as dated events (Event-vs-Gem classifier)
- Candidates passing enrichment + quality gate
- Candidates verified vs. unverified
- Final inserted/updated count
- Duration (ms)
- Errors

### 6.3 Admin surface

Extend `/admin/scrapers` (from PRD 1 + 2) with a Hidden Gems section:
- Last 4 weeks of runs per pipeline
- Count of UNVERIFIED Discoveries needing review (with link to review UI)
- Count of candidates rejected as dated events (signal for Event pipeline gap)
- Manual "Run now" button per pipeline

### 6.4 Unverified review UI

New page: `/admin/discoveries/review`. Simple list of Discoveries with `status = UNVERIFIED`. Per row:
- Approve → marks `verifiedAt = now()`, status = ACTIVE
- Reject → status = ARCHIVED
- Edit → inline edit title/description/category

This is how Quest triages LLM hallucinations weekly without letting them leak into the public feed. Expect this to be a 15-minute weekly ritual, especially during the first month while prompts tune.

---

## PHASE 7 — END-TO-END VERIFICATION

After all phases:

### 7.1 Full pipeline run
All three pipelines against production.

### 7.2 Final counts report
- Total ACTIVE Discoveries (target: 30+ after first run, including 12-15 editorial seeds)
- Breakdown by subtype (Hidden Gem / Niche Activity / Seasonal Tip)
- Breakdown by source pipeline
- Breakdown by region (Denver metro vs. Front Range vs. Mountain Gateway vs. Mountain Destination)
- UNVERIFIED queue count (flag if > 20 — indicates prompts or verification need tuning)
- Candidates rejected as dated events (flag if > 30% of raw candidates — indicates Event-vs-Gem rule needs tightening)

### 7.3 Quality spot-check
Quest manually reviews first 20 auto-generated Discoveries. Key questions:
- Do they feel specific and local, or generic?
- Is the Pulse voice landing?
- Any hallucinations that slipped past verification?
- Any that are really dated events in disguise?

If > 3 of 20 feel off → prompt tuning needed before wider rollout.

### 7.4 Visual verification

Screenshots:
- Hidden Gems tab top-of-feed
- A Discovery detail page with source attribution
- "You might not know about" row on the Events tab (cross-surfacing)
- Admin review UI with sample UNVERIFIED candidates

### 7.5 Update PULSE_STATUS.md
- Discovery schema + subtypes + sources
- Weekly cron cadence + endpoint path
- Admin review UI location + expected ritual cadence
- Event-vs-Gem classification rule
- Known-fragile sources on watch list
- Regional coverage breakdown across Discoveries

---

## Ground rules

- Do NOT store raw Reddit content verbatim — extract and restructure only
- Quality threshold ≥ 6, stricter than events
- Every location-based Discovery either verifies against Google Places or routes to UNVERIFIED
- Weekly cadence, not daily — resist the urge to hammer sources
- Respect robots.txt + rate limits on all scraped sources
- Do NOT add paid APIs, paid services, or infrastructure (queues, Redis, Puppeteer) without approval
- Event-vs-Gem rule is strict: if it has a specific dated instance, it goes to the Event pipeline, not here
- Each phase pauses for Quest's review — do not chain phases

---

## Open questions for Quest

1. **UNVERIFIED review ritual cadence:** weekly alongside the pipeline run, or on-demand? Recommend weekly so the queue doesn't grow stale.

2. **Should dated-event rejections from the classifier auto-ingest to the Event pipeline?** Out of scope for this PRD, but worth deciding for a future cycle. For now they just log to a queue Quest can glance at.

3. **Mountain destination Discoveries surfacing:** a Hidden Gem in Telluride is genuinely cool but 6 hours away. Should these be hidden behind the "All of Colorado" filter, or allowed into the main Hidden Gems feed with a clear distance badge? Recommend: allow in main feed with distance badge — the whole point of Hidden Gems is discovery, and weekend-trip gems are part of that.

---

## Start with Phase 0 (schema + editorial seeding). Produce the migration and seed script, wait for Quest's approval before implementing any pipelines.
