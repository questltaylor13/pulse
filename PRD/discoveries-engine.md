# PRD: Discoveries Engine

**Owner:** Quest
**Status:** Ready for implementation (ship after `data-refresh-and-reliability.md` is complete and stable)
**Companion doc (prior):** `data-refresh-and-reliability.md` — handles the structured event/place pipeline. This PRD explicitly layers *on top of* that work, not in place of it.

---

## Context

Pulse's structured event pipeline (Eventbrite, Do303, Westword, concert venues, etc.) handles the "what's happening this week" layer well. But the content that makes Pulse feel *magical* — the stuff that triggers "how did Pulse know about that?" — doesn't live on those sites. It lives in three places:

1. **Local community knowledge** that only surfaces in Reddit threads, niche forums, and word-of-mouth (the curling competition, the archery dodgeball league, the sunflower field at Chatfield in August, the alley with all the street art off Santa Fe)
2. **Hyperlocal niche sites** for specific activities (Denver Curling Club, Denver Archery, run clubs, cycling clubs, rec leagues) that are too small and too infrequent to justify individual daily scrapers
3. **Active discovery via LLM research** — the same way a curious human would answer "what's unique to do in Denver right now" by searching and synthesizing

The Discoveries Engine is the pipeline that finds and curates this content. It is not a scraper. It is a research-and-curation system that runs on a weekly cadence, uses LLMs + web search + Reddit mining as input sources, produces structured `Discovery` records, and surfaces them in the app alongside events and places.

This is the layer that differentiates Pulse from Eventbrite, Do303, and every other event aggregator. Those aggregate what's already aggregated. Pulse surfaces what *isn't*.

---

## What is a "Discovery"?

A Discovery is a piece of curated local content that doesn't fit cleanly into the Event or Place taxonomy. Three subtypes:

1. **Hidden Gem** — a place or experience that exists permanently but is under-the-radar. Example: "The bench at Sloan's Lake at sunset," "Lookout Mountain drive on a Tuesday morning," "The Milk Market basement bar."
2. **Niche Activity / Club** — a recurring community activity without a fixed event date. Example: "Denver Curling Club open nights," "Cheesman Park run club, every Thursday 6am," "Denver Dodgeball League summer season signups."
3. **Seasonal Tip / Local Ritual** — time-bounded but not event-ticketed. Example: "When the sunflowers bloom at Chatfield (late August)," "Stargazing at Mount Evans after the first frost," "Larimer Square ice-skating opens around Thanksgiving."

Each Discovery has: a title, a 2–3 sentence Pulse-voice description, a category (mapped to existing enum where possible, plus new `HIDDEN_GEM` value), a subtype (above), optional location (lat/lng + neighborhood if applicable), optional season/timing hints, source attribution (Reddit, LLM research, niche site, community), quality score (1–10), and freshness signals (upvotes if from Reddit, recency of source).

---

## Goals

1. Build a new `Discovery` content type with its own schema, separate from `Event` and `Place`
2. Build three input pipelines: Reddit mining, LLM research job, niche-site curated list
3. Each pipeline produces candidate Discoveries that flow through a single quality/verification/enrichment pass
4. Surface Discoveries in the app alongside events and places, with clear visual differentiation
5. Establish a weekly cron cadence (not daily) with observability parity to the event pipeline
6. End state: every week, 15–30 new high-quality Discoveries get added to Pulse, and the feed feels curated by someone who actually lives in Denver

## Non-goals

- User-submitted Discoveries (community submission flow is a later phase, roadmap item 5)
- Real-time or daily updates (weekly is the right cadence and this PRD treats that as a feature, not a limitation)
- Discoveries for cities other than Denver (per-city expansion is a separate future project)
- Replacing or modifying the existing event/place scraper pipeline from PRD 1
- A full admin dashboard UI (reuse the `/admin/scrapers` page pattern from PRD 1)
- Storing raw Reddit post content verbatim (licensing concern — we extract and restructure, we don't republish)

---

## Work is phased. After each phase, report back and wait for approval before moving on.

---

## PHASE 0 — SCHEMA & FOUNDATIONS

### 0.1 Prisma schema additions

Add a new `Discovery` model:

```prisma
model Discovery {
  id            String   @id @default(cuid())
  title         String
  description   String   @db.Text
  subtype       DiscoverySubtype
  category      Category
  neighborhood  String?
  latitude      Float?
  longitude     Float?
  seasonHint    String?  // "Late August", "After first frost", "Thursday mornings"
  sourceType    DiscoverySource
  sourceUrl     String?
  sourceUpvotes Int?     // Reddit upvotes or equivalent signal
  qualityScore  Int      // 1-10 from enrichment pass
  tags          String[]
  status        DiscoveryStatus @default(ACTIVE)
  verifiedAt    DateTime?        // Null if unverified (e.g., no Google Places match)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([status, qualityScore])
  @@index([category, status])
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
  EDITORIAL     // Manually added by Quest, for seeding and overrides
  COMMUNITY     // Future: user-submitted
}

enum DiscoveryStatus {
  ACTIVE
  ARCHIVED      // Ran out of season, closed, or manually hidden
  UNVERIFIED    // LLM-generated, couldn't verify, needs manual review
  FLAGGED       // Potential hallucination or quality issue
}
```

Add `HIDDEN_GEM` to the existing `Category` enum if it makes sense as a filter, or skip if the existing categories cover it — Quest's call after seeing initial data.

### 0.2 Directory structure

```
lib/discoveries/
  types.ts                     # Shared Discovery types
  orchestrator.ts              # Runs all pipelines, dedupes, enriches, upserts
  enrichment.ts                # AI enrichment pass (Pulse-voice description, quality score, verification)
  verification.ts              # Google Places verification for location-based Discoveries
  pipelines/
    reddit.ts                  # Reddit mining pipeline
    llm-research.ts            # LLM + web search research pipeline
    niche-sites.ts             # Hand-curated niche Denver site checker
```

### 0.3 Editorial seeding

Before any automated pipelines run, seed 10–15 Discoveries manually (Quest's choice — the curling competition, his favorite hidden spots, the sunflower field, etc.). This:
- Validates the schema end-to-end
- Gives the enrichment prompt real examples of good Pulse-voice output
- Ensures there's *something* in the Discoveries surface on day one

Put these in a seed script. Source = `EDITORIAL`.

---

## PHASE 1 — LLM RESEARCH PIPELINE

This is the most important pipeline and the one that most directly answers "how do we keep finding unique things."

### 1.1 Core loop

A weekly cron job calls an LLM with web search enabled. The job does N separate research queries, each scoped to a different angle:

```
Query 1: "What are 5-10 unique, under-the-radar things to do in Denver right now?
         Focus on activities that aren't on Eventbrite — rec leagues, niche clubs,
         seasonal experiences, hidden viewpoints, weird competitions. Exclude
         chain restaurants, mainstream concerts, and generic tourist attractions."

Query 2: "What are the best-kept-secret spots in Denver that locals love but
         tourists don't know about? Focus on specific locations — hidden parks,
         under-the-radar bars, quiet viewpoints, unusual shops."

Query 3: "What seasonal activities in Denver are happening right now or in the
         next 4-6 weeks that most people don't know about? Focus on nature,
         community events, and time-limited experiences."

Query 4: "What are the most distinctive hobby groups, rec leagues, and niche
         clubs active in Denver? Include things like curling, archery, unusual
         sports leagues, specialty run/bike clubs, maker groups."

Query 5: "What's newly opened or newly trending in Denver in the past 3-6
         months that fits the vibe of young professionals aged 25-35?"
```

Exact queries tunable — treat them as config in `lib/discoveries/pipelines/llm-research.ts`.

### 1.2 Structured output

Each query returns JSON with a list of candidates. Strict response schema:

```typescript
{
  candidates: Array<{
    title: string
    description: string  // 2-3 sentences
    subtype: "HIDDEN_GEM" | "NICHE_ACTIVITY" | "SEASONAL_TIP"
    category_hint: string  // e.g., "outdoors", "bars", "fitness"
    location_hint: string | null  // e.g., "Sloan's Lake", "RiNo", null if no specific location
    season_hint: string | null
    source_urls: string[]  // URLs the LLM referenced, for later verification
  }>
}
```

### 1.3 Model choice

Use Anthropic's API with the web search tool enabled (Claude handles web search cleanly and Quest already has the account). Cost is minimal at weekly cadence — estimate under $5/month even with 5 queries/week.

Do NOT use OpenAI's web search capability unless there's a specific reason — Claude with web search is more reliable for structured local research based on current testing, and Quest already uses Claude everywhere else in the stack.

Save raw LLM responses to a `LLMResearchRun` table for debugging and prompt tuning.

### 1.4 Hallucination guardrails

LLMs will invent plausible-sounding Denver places that don't exist. Mitigations:

1. **Source URLs required.** Every candidate must have at least one source URL the LLM cited. If no source URL, drop the candidate or flag as UNVERIFIED.
2. **Google Places verification for location-based candidates.** If the candidate has a `location_hint`, hit Google Places API to verify the place exists. If no match, mark as UNVERIFIED rather than dropping — Quest reviews manually.
3. **Cross-source corroboration boost.** If the same candidate surfaces in multiple queries or multiple source URLs, boost its quality score.

---

## PHASE 2 — REDDIT MINING PIPELINE

### 2.1 Subreddits

Target these Denver-relevant subreddits (verify each still exists and is active before wiring up):
- r/Denver
- r/denverfood
- r/ColoradoHiking
- r/colorado
- r/denvermusic
- r/DenverCirclejerk (surprisingly good signal on what's overhyped)
- r/cycling (filtered to Denver/Colorado geo tags)
- r/climbing (same)

### 2.2 Reddit API vs. scraping

Reddit's API tightened in 2023. Two options:

**Option A (preferred):** Use Reddit's public JSON endpoints (`reddit.com/r/Denver/top.json?t=week`) which are free and don't require API keys for read-only access. Respect rate limits (1 req/sec, include a descriptive User-Agent).

**Option B (fallback):** Register for Reddit's free API tier (60 req/min) if the public JSON endpoints prove unreliable.

Do not use any paid Reddit API tier without approval.

### 2.3 Post selection

Weekly job pulls, from each subreddit:
- Top 25 posts from the past week (`top.json?t=week`)
- Top 10 posts from the past month (`top.json?t=month`)
- All posts matching title patterns like "hidden gem", "things to do", "what should I", "recommend", "best [anything] in Denver" from the past 3 months

Filter threshold: minimum 50 upvotes for weekly/monthly top, minimum 20 for pattern-matched.

### 2.4 Extraction via LLM

Raw Reddit posts and their top comments go through a Claude API call with a prompt like:

```
You are extracting structured Denver recommendations from a Reddit discussion.
From the post and top comments below, extract any specific places, activities,
events, or experiences that are being recommended. For each, return:

- title: the name of the place/activity
- description: 2-3 sentences in Pulse's voice — opinionated, specific, local-feeling
- subtype: HIDDEN_GEM / NICHE_ACTIVITY / SEASONAL_TIP
- mentioned_by_n_commenters: integer
- community_sentiment: strongly_positive / positive / mixed / negative

Exclude: chains, major tourist attractions, anything vague ("go for a walk"),
anything clearly joking.

Post title: {title}
Post body: {body}
Top 10 comments: {comments}
```

### 2.5 Licensing posture

Do NOT store raw Reddit post text in the DB. Store only the extracted/restructured Discovery plus a link back to the source thread for attribution. This is defensible fair use (we're citing and synthesizing, not republishing).

### 2.6 Dedup across Reddit runs

Same hidden gem surfaces in Reddit threads repeatedly. Match new candidates against existing Discoveries by fuzzy title match + location match. Instead of creating duplicates, boost `sourceUpvotes` and refresh `updatedAt` on the existing record — this becomes a "community consensus" signal.

---

## PHASE 3 — NICHE SITES PIPELINE

Small, hand-curated list of Denver niche sites that warrant periodic checking. These are the sites too small to justify individual daily scrapers but high-enough signal to pull from weekly.

### 3.1 Initial site list

Start with these (verify each exists and is scrapeable before building):
- Denver Curling Club (events/open nights page)
- Denver Archery Center
- Denver Dodgeball League (seasonal signups)
- Denver Bike Party
- Colfax Marathon + related running events
- Denver Mountain Parks (obscure trail/park features)
- Any specific niche site Quest flags

### 3.2 Implementation

Not a fancy scraper. A simple HTML fetch + targeted selector per site, wrapped in try/catch. Each site gets 10–20 lines of code. If a site breaks, log and move on.

Each site contributes 1–5 candidates per run, max. This is not a volume play — it's a "make sure the curling bonspiel doesn't get missed" play.

### 3.3 Site list is itself a config file

`lib/discoveries/pipelines/niche-sites.config.ts` — list of `{ name, url, selector, subtype, category }` entries. Easy to add new sites without touching the pipeline code.

---

## PHASE 4 — ENRICHMENT, VERIFICATION & QUALITY GATING

All three pipelines feed candidates into a single post-processing flow.

### 4.1 Enrichment pass

Every candidate runs through a Claude API call:

```
You are the curation voice for Pulse, a Denver discovery platform for
25-35 year old locals. Rewrite this Discovery candidate in Pulse's voice:

- Opinionated, specific, never generic
- 2-3 sentences max
- No marketing speak, no "immerse yourself in"
- Sound like a friend who actually lives here
- Include one concrete detail that proves it's real (a time, a cross-street,
  a specific thing to order/do)

Candidate: {raw_candidate_json}

Return JSON:
{
  "title": string (max 60 chars, punchy),
  "description": string,
  "category": one of [ART, LIVE_MUSIC, BARS, FOOD, COFFEE, OUTDOORS, FITNESS,
                      SEASONAL, POPUP, RESTAURANT, ACTIVITY_VENUE, SOCIAL, OTHER],
  "tags": string[] (3-5 tags, e.g., "free", "group-friendly", "date-worthy"),
  "quality_score": integer 1-10
}
```

### 4.2 Quality threshold

Quality < 6 gets dropped. This threshold is intentionally *stricter* than the event pipeline (which uses 5) because Discoveries are meant to be the top-shelf content.

### 4.3 Location verification

For candidates with a location hint:
- Hit Google Places API, try to match
- If match: populate lat/lng, set `verifiedAt = now()`
- If no match: `status = UNVERIFIED`, don't show in feed, surface in admin for Quest review

### 4.4 Dedup

Before insert, fuzzy-match against existing Discoveries by:
- Title similarity (Levenshtein or simple normalized string match)
- Location proximity (within 100m for location-based)

If match found: update existing record's upvote/mention count, don't create duplicate.

---

## PHASE 5 — APP SURFACING

### 5.1 Where Discoveries appear

Add a new top-level tab next to Events, Places, Guides — call it **Hidden Gems**.

Note on naming: internally the schema and engine are called "Discoveries" (technical term for the content type — broader than just hidden gems, since it includes niche activities and seasonal tips). The user-facing tab is called "Hidden Gems" because it's punchier and brand-right. Don't rename the schema; just label the tab `Hidden Gems` in the UI.

Within the Hidden Gems tab:
- Filter chips mirror the Events/Places pattern: All, Spots, Clubs & Leagues, Seasonal
  - "Spots" = HIDDEN_GEM subtype
  - "Clubs & Leagues" = NICHE_ACTIVITY subtype
  - "Seasonal" = SEASONAL_TIP subtype
- Sort default: quality_score desc, with a subtle recency boost

### 5.2 Cross-surfacing

Don't wall off Discoveries to their own tab only. Also surface them:
- On the home Events tab, in a "You might not know about" row (3–5 Discoveries, mixed subtypes)
- On the Places tab, mixed into "Where locals actually go" when relevant
- On a Guide page, as related items

### 5.3 Visual differentiation

Discoveries need a visual tell so users understand they're not typical listings. Options (Quest's call during implementation):
- A small "Hidden Gem" badge on cards
- A distinct card style (different accent color from events/places)
- An attribution line: "Surfaced from r/Denver" or "Curated by Pulse"

The Hidden Gems tab itself is already a signal, but when Discoveries cross-surface on the Events and Places tabs (section 5.2), the badge/attribution becomes important — that's where users need to understand *why* this item looks different from the surrounding events/places.

### 5.4 Link-out handling

For Discoveries sourced from Reddit, the card links to a Pulse detail page (not directly to Reddit). The detail page can include a small "originally mentioned on r/Denver" attribution with a link-out, for user trust and licensing safety.

---

## PHASE 6 — RELIABILITY & OBSERVABILITY

Mirrors the PRD 1 pattern — don't reinvent.

### 6.1 Cron

- `vercel.json`: weekly cron, Sunday 3am UTC, hits `/api/discoveries/refresh`
- Endpoint runs all three pipelines sequentially, then the enrichment/verification/dedup flow
- Full run expected to take 5–15 minutes — may need Vercel function timeout extension or a queue-style approach. Flag to Quest if timeout becomes an issue.

### 6.2 Logging

Same `ScraperRun`-style structured logging per pipeline: source, raw count, enriched count, verified count, inserted count, duration, errors. Persist to a `DiscoveryRun` table (parallel to `ScraperRun`).

### 6.3 Admin surface

Extend the existing `/admin/scrapers` page (built in PRD 1) with a Discoveries section:
- Last 4 weeks of runs per pipeline
- Count of UNVERIFIED Discoveries needing review, with a link to a review UI
- Manual "Run now" button per pipeline

### 6.4 Unverified review UI

New page: `/admin/discoveries/review`. Simple list of Discoveries with `status = UNVERIFIED`. Each row has: approve (marks verified, moves to ACTIVE), reject (archives), edit (inline edit title/description/category).

This is how Quest triages LLM hallucinations without them leaking into the public feed.

---

## PHASE 7 — END-TO-END VERIFICATION

After all phases:

### 7.1 Full pipeline run
Run all three pipelines against production.

### 7.2 Final counts report
- Total ACTIVE Discoveries (target: 30+ after first run, including editorial seeds)
- Breakdown by subtype (Hidden Gem / Niche Activity / Seasonal Tip)
- Breakdown by source pipeline
- UNVERIFIED queue count (flag if > 20, prompt/verification may need tuning)

### 7.3 Quality spot-check
Quest manually reviews the first 20 Discoveries generated. If more than 3 feel generic, hallucinated, or off-brand → prompt tuning needed before wider rollout.

### 7.4 Visual verification
Screenshots of: Discoveries tab top-of-feed, a Discovery detail page, the "You might not know about" row on the Events tab.

### 7.5 Update PULSE_STATUS.md
- Discovery schema + subtypes + sources
- Weekly cron cadence
- Admin review UI location
- Known-fragile sources on the watch list

---

## Ground rules

- Do NOT store raw Reddit content verbatim — extract and restructure only
- Quality threshold ≥ 6, stricter than events
- Every location-based Discovery must either verify against Google Places or route to UNVERIFIED
- Weekly cadence, not daily — resist the urge to hammer sources
- Respect robots.txt + rate limits on all scraped sources
- Do not add paid APIs, paid services, or infrastructure (queues, Redis, Puppeteer) without explicit approval
- Ask clarifying questions before starting any phase if anything is ambiguous
- Each phase ends with a report and pauses for Quest's review — do not chain phases

---

## Start with Phase 0 (schema + editorial seeding). Produce the schema migration and seed script, and wait for approval before implementing any pipelines.
