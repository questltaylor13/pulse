# PRD 6: Matching Engine

**Owner:** Quest
**Status:** Ready for implementation (ships after PRD 4 and PRD 5 are live and accumulating data)
**Priority:** The keystone PRD — everything upstream produces inputs for this system. Do not ship until profile data and feedback data are flowing reliably.
**Prior context:**
- PRD 1 (`data-refresh-and-reliability.md`) — shipped.
- PRD 2 (`regional-expansion.md`) — Regional Expansion.
- PRD 3 (`hidden-gems-engine.md`) — Hidden Gems pipeline.
- PRD 4 (`psychographic-onboarding.md`) — Psychographic Onboarding.
- PRD 5 (`feedback-system.md`) — Feedback System.
**Companion doc:** `signal-map.md` — the contract document. This PRD implements the formula specified there; the signal map remains authoritative for weights and data shape.

---

## Context

Every previous PRD has produced inputs for the matching engine:
- PRD 1 produced quality-scored, categorized Events and Places
- PRD 2 added regional content with drive-time metadata
- PRD 3 added Hidden Gems with a distinct content type
- PRD 4 captured stated preferences (context segment, social style, vibe pairs, budget, aspirations)
- PRD 5 captures behavioral signal (interested / not-interested / been-there)

PRD 6 is where all of this converges. The matching engine:
1. Consumes all user-profile data and item metadata
2. Produces a ranked feed per user
3. Balances stated preferences, behavioral signal, quality, recency, and deliberate serendipity
4. Explains its reasoning when asked (for power users and for debugging)

### Product-level design decisions locked upstream

These are non-negotiable in this PRD. They came out of earlier discussion:

- **Pre-computed with real-time adjustments (hybrid).** A background job pre-ranks content per user; feed loads are near-instant. Small real-time adjustments layer on top for recency and just-given-feedback events.
- **In-process in Next.js.** No separate service. A `lib/ranking/` folder with pure TS functions called by `/api/feed`.
- **Soft-rank for new users until behavioral data accumulates.** New users rely more on universal quality than on profile fit for the first ~N days or ~M feedback items, to avoid overfitting to potentially unreliable stated preferences.
- **Serendipity via mixed-in slots (Phase 1) AND a dedicated "Outside your usual" surface (Phase 5).** Every ~5th slot in the main feed is a serendipity pick; a dedicated surface ships later in this same PRD.
- **One parameterized formula, not four rankers.** The formula is the same across all four Context Segments; only the weights/presets change.
- **User-facing explanations available on demand, not surfaced by default.** A "Why am I seeing this?" option in the three-dot menu from PRD 5 exposes the reasoning. No visible match-score microcopy on cards — the feed just feels right.
- **Location is orthogonal.** Use stored home city (Denver). Live location comes in a later PRD.
- **Q5 aspiration free-text stays raw.** LLM extraction is deferred to a future PRD.
- **Ranking weights in a config file.** Editable without redeploy.
- **A/B hooks built, statistical framework deferred.** Pulse doesn't have enough users yet for significance testing.

---

## Goals

1. Ship a pre-computed ranking system that produces personalized feeds per user
2. Honor the formula defined in `signal-map.md` and extend it with behavioral signals
3. Surface 10–20% serendipity naturally in the feed to prevent filter-bubble collapse
4. Expose a "Why this?" explanation path via the three-dot menu
5. Stay fast: a feed load should render in <200ms for any user (pre-computed)
6. Stay explainable: every ranked item should have a traceable reason for its position
7. Gracefully degrade to quality-only sort if the ranking system fails, silently from the user's perspective

## Non-goals

- Live user location (deferred)
- LLM processing of `aspirationText` free-text field (deferred)
- Social graph signals (friend activity, aggregate counts) (deferred)
- Separate ranking service / microservice architecture (in-process is fine)
- Statistical A/B testing framework (build hooks only, stats come later)
- Admin UI for tuning weights (config file only for V1)
- Item-level cold-start handling for brand-new items with zero engagement (use quality_score as the substitute until engagement data exists)

---

## Work is phased. After each phase, report back and wait for approval.

---

## PHASE 0 — ARCHITECTURE & FOUNDATIONS

### 0.1 Directory structure

```
lib/ranking/
  index.ts              # Public API: getRankedFeed(userId), rerankLive(userId, baseline)
  config.ts             # Weight config — the tunable knobs, editable without redeploy
  formula.ts            # The scoring function — pure, testable, no side effects
  candidate-pool.ts     # Builds the pool of candidates eligible for ranking
  explanation.ts        # Produces per-item reasoning for "Why this?" surfaces
  serendipity.ts        # Mixes serendipity slots into the ranked output
  precompute.ts         # The background job that runs per user
  cache.ts              # Where pre-computed rankings are stored/retrieved
  types.ts              # Shared types

app/api/feed/route.ts       # Reads pre-computed ranking + applies real-time adjustments
app/api/feed/why/route.ts   # Returns explanation for a given user+item pair
```

### 0.2 Caching strategy — where pre-computed rankings live

Neon Postgres is fine for V1. A new table stores pre-computed rankings per user:

```prisma
model RankedFeedCache {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // The ranked item list — array of {itemType, itemId, score, reasons[]}
  rankedItems  Json

  // Metadata about this ranking computation
  computedAt   DateTime @default(now())
  profileVersion Int    // increments when user profile changes
  feedbackCount  Int    // snapshot of feedback count at compute time

  @@index([userId])
  @@index([computedAt])
}
```

**Rationale:** Redis would be faster but adds infrastructure. Postgres is sufficient for Pulse's scale and keeps the stack identical. If read latency becomes a problem later, swap for Redis or Vercel KV.

**Cache TTL: 4 hours.** If pre-compute hasn't run in 4 hours, the next feed load triggers an on-demand ranking as fallback (slower but guarantees freshness). Tunable via config.

### 0.3 Configuration file

`lib/ranking/config.ts` holds all tunable weights. Editing this file and redeploying changes ranking behavior globally — no code changes, no admin UI.

```typescript
export const RANKING_CONFIG = {
  // Base formula weights
  weights: {
    baseQuality: 1.0,        // multiplier on base quality score
    socialBoost: 0.15,       // max boost from Q2 match
    vibeBoost: 0.32,         // max boost from Q3 pairs (4 × 0.08)
    aspirationBoost: 0.40,   // max boost from Q5 chips
    budgetPenalty: 0.25,     // max penalty for budget mismatch
    recencyBoost: 0.05,      // boost for items created in last 48h
    interestedSimilarity: 0.40,  // max boost from INTERESTED behavioral signal
    notInterestedSimilarity: 0.50, // max penalty from NOT_INTERESTED
  },

  // Strategy presets per context segment
  strategyPresets: {
    NEW_TO_CITY: { qualityMultiplier: 1.10, novelty: 1.00, regional: 0.90 },
    IN_A_RUT: { qualityMultiplier: 1.00, novelty: 1.30, regional: 1.10 },
    LOCAL_EXPLORER: { qualityMultiplier: 1.00, novelty: 1.20, regional: 1.15 },
    VISITING: { qualityMultiplier: 1.15, novelty: 0.80, regional: 0.85 },
  },

  // Cold-start / soft-rank parameters
  coldStart: {
    softRankDays: 7,              // first week post-signup, soften profile weight
    softRankFeedbackThreshold: 15, // below 15 feedbacks, profile weight reduced
    softRankMultiplier: 0.6,       // profile signal multiplied by this in soft-rank mode
  },

  // Serendipity
  serendipity: {
    mixedInInterval: 5,      // every Nth slot is serendipity
    targetPercent: 0.15,     // aim for ~15% of feed as serendipity overall
    preferHiddenGems: true,  // prefer Hidden Gems for serendipity slots
  },

  // Candidate pool
  candidatePool: {
    maxPoolSize: 500,        // rank up to this many items per user
    minQualityScore: 0.5,    // items below this never enter pool
  },

  // Pre-compute schedule
  precompute: {
    cadenceMinutes: 60,      // how often background job runs
    maxStaleHours: 4,        // cache TTL before on-demand fallback kicks in
  },

  // Fallback
  fallback: {
    onErrorUseQualityOnly: true,  // if ranking errors, sort by quality alone
    logFallbackToAdmin: true,
  },
};
```

Every weight here has a comment explaining what it does. This file is **the single knob set** for the ranking engine.

### 0.4 Pure function discipline

`formula.ts` must be a pure function. Given:
- User profile (from `UserProfile` + `UserItemFeedback`)
- Item metadata (Event / Place / Discovery + tags, category, price, region, etc.)
- Config (from `config.ts`)

It returns:
- A numeric score
- An array of reasons: `[{factor: "vibe_match", contribution: 0.12, tags_matched: [...]}]`

No DB calls, no side effects, no async. Pure. Unit-testable. When the feed feels wrong, we can test the formula against a fixture and find the bug without spinning up anything.

---

## PHASE 1 — THE FORMULA (CORE RANKING)

Implements the scoring function from `signal-map.md`.

### 1.1 Full formula

```
For each candidate item:

base_score = item.qualityScore × strategy_preset[contextSegment].qualityMultiplier

vibe_tag_boost = sum over Q3 pairs of (0.08 × #matched_tags_per_pair)
  // max 0.32 total

aspiration_boost = sum over Q5 chips of (0.20 × chip_matches_item_category)
  // max 0.40 total

social_boost = if Q2 signals a clear tag preference AND item has that tag: +0.15

interested_similarity = sum over INTERESTED items of (tag_overlap × 0.05)
  // capped at +0.40

not_interested_similarity = sum over NOT_INTERESTED items of (tag_overlap × 0.06)
  // capped at -0.50

budget_penalty = tier-appropriate multiplier (see signal-map.md)
  // ranges from 0.0 to -0.25

recency_boost = if item.createdAt within 48h: +0.05 else 0

novelty_adjustment = strategy_preset.novelty × (1 - user_familiarity_with_category)
  // boosts categories user hasn't engaged with much, strongest for IN_A_RUT

soft_rank_multiplier = if in_cold_start(user): 0.6 else 1.0
  // applied to all profile-derived boosts

final_score = base_score
            + soft_rank_multiplier × (vibe_tag_boost + aspiration_boost + social_boost)
            + interested_similarity - not_interested_similarity
            - budget_penalty
            + recency_boost
            × novelty_adjustment

// Then filter:
if item.beenThere(user): remove from pool entirely
if item.budgetFilterExcluded(user): remove from pool entirely
if final_score < 0.50: remove from pool

// Then return top N items sorted desc by final_score
```

### 1.2 The cold-start / soft-rank logic

A user is in "cold-start mode" if:
- Account age < `softRankDays` (default 7), OR
- Total feedback count < `softRankFeedbackThreshold` (default 15)

In cold-start mode:
- Profile-derived boosts (vibe, aspiration, social) multiply by `softRankMultiplier` (default 0.6)
- Quality weight is effectively higher
- This prevents overfitting to onboarding answers that might not match actual behavior

Transition out of cold-start is automatic as age passes 7 days AND feedback hits 15. Both conditions must be met.

### 1.3 Novelty adjustment

For the `IN_A_RUT` and `LOCAL_EXPLORER` segments, boost categories the user hasn't engaged with much:

```
user_familiarity[category] =
  (INTERESTED + BEEN_THERE count in category) / total feedback count

novelty_adjustment = 1 + (strategy.novelty - 1) × (1 - user_familiarity[item.category])
```

User who has marked 10 food items Interested but no art items will see `art` boosted by novelty multiplier for IN_A_RUT. Prevents feed homogenization.

### 1.4 The reasons array

Every scored item produces a reasons array:

```typescript
interface ScoreReason {
  factor: string;           // e.g., "vibe_match", "aspiration_food", "interested_similarity"
  contribution: number;     // signed — can be negative
  human_readable: string;   // e.g., "Matches your 'underground music' preference"
  tags_matched?: string[];  // what specifically matched
}

interface RankedItem {
  itemType: 'event' | 'place' | 'discovery';
  itemId: string;
  score: number;
  reasons: ScoreReason[];
}
```

This structure makes explanations trivial in Phase 4 — just render the reasons array with some nice copy.

### 1.5 Candidate pool construction

Before ranking, build the candidate pool:

```
1. Fetch all Events, Places, Discoveries where:
   - status == ACTIVE
   - startsAt >= now() (for Events)
   - quality_score >= config.candidatePool.minQualityScore
   - not beenThere(user)
   - not budget-excluded for user
   - For VISITING segment: startsAt within stay window
2. Apply regional filter: if user's scope is "Near Denver" (see PRD 2),
   exclude MOUNTAIN_DEST items; include everything else
3. Cap at config.candidatePool.maxPoolSize (default 500) — sort by
   quality desc first, then take top 500
```

For most users this pool is <500 items and the cap doesn't activate. It's a safety valve, not a routine filter.

---

## PHASE 2 — THE BACKGROUND PRE-COMPUTE JOB

### 2.1 The cron

`vercel.json` gets a new cron entry:

```json
{
  "path": "/api/ranking/precompute",
  "schedule": "0 */1 * * *"
}
```

Runs every hour. Handler: `app/api/ranking/precompute/route.ts`.

### 2.2 What the job does

For each active user:
1. Build candidate pool
2. Score every item in pool using `formula.ts`
3. Sort descending by score
4. Take top 200 items
5. Mix in serendipity (see Phase 3)
6. Upsert into `RankedFeedCache` for that user

### 2.3 Incremental updates

Not every user needs full re-rank every hour. Two optimizations:

- **Stale-aware:** if `RankedFeedCache.computedAt` is less than 30 minutes old and `feedbackCount` hasn't changed, skip that user.
- **Event-driven invalidation:** when a user gives feedback, mark their cache dirty. The next pre-compute run prioritizes dirty users.

### 2.4 Performance budget

The job must complete within Vercel's 60-second function limit. Means:
- At 100 users: ~0.6 seconds per user. Plenty of headroom.
- At 1000 users: ~60ms per user. Tight but doable.
- At 10,000 users: impossible in a single function. Will need to split into batches or move to a queue.

**Scale trigger:** if the job starts taking >45 seconds regularly, time to shard or move to a separate service. Add a log alert when this threshold hits.

### 2.5 On-demand fallback

If a user requests the feed and their `RankedFeedCache` is missing or stale by >4 hours, the `/api/feed` endpoint computes ranking on-demand. This guarantees no user ever gets no feed, but is slower (~500ms-2s depending on pool size). Log these events — they indicate cache coverage gaps.

---

## PHASE 3 — SERENDIPITY INJECTION (mixed-in slots)

### 3.1 The mechanic

After the ranked list is produced, before it's cached, inject serendipity slots:

```
Every Nth position (default N=5):
  - Select an item NOT in the user's matched profile
  - Prefer Hidden Gems (quality_score >= 7) if available
  - Otherwise pick from top-quality items in categories user hasn't engaged with
  - Must pass budget filter (never inject budget-mismatched content)
  - Must not be BEEN_THERE or NOT_INTERESTED by user
```

The injected items replace the would-be match at that position. So position 5 goes from "5th best match" to "best serendipity pick"; the 5th best match slides to position 6, and so on.

### 3.2 Tagged for explanation

Serendipity slots get a special flag in the `reasons` array:

```typescript
{
  factor: "serendipity",
  contribution: 0,
  human_readable: "Outside your usual — we thought you might be curious",
}
```

When the user opens "Why am I seeing this?" on a serendipity item, the explanation is honest: "This isn't a typical match for your profile, but we think you might find it interesting." Honest explanation builds trust.

### 3.3 Serendipity diversity

Don't put the same kind of "surprise" in every slot. If slot 5 is a Hidden Gem, slot 10 should be an off-profile event in a different category. The serendipity selector tracks what's been used and biases toward variety.

---

## PHASE 4 — THE "WHY THIS?" EXPLANATION SURFACE

### 4.1 Entry point

Already exists in PRD 5's three-dot action sheet. Add a new row:

| Icon | Label | Subtitle |
|---|---|---|
| 💡 | "Why am I seeing this?" | "See how this matched your taste" |

Placed between "Share" and "Cancel" in the sheet.

### 4.2 The explanation sheet

Tapping "Why am I seeing this?" opens a modal overlay with the explanation. Layout:

- Item title at top
- Ranking position: "#7 in your feed today"
- **Main reasons list** — the 3-5 most significant positive contributions
  - Each row: icon + human-readable reason + relative magnitude bar
  - Example: "🎵 Matches your 'underground music' vibe (+0.08)"
  - Example: "🎯 You're into more 'live music' (+0.20)"
  - Example: "🎧 Similar to 3 things you've marked interested (+0.18)"
- **If serendipity:** explanation block: "Outside your usual. We thought you might be curious."
- **Feedback CTA at bottom:** "Not matching? [Tell us why]" → jumps to feedback action sheet
- Close button

### 4.3 Copy tone

Explanations are Pulse-voiced, not technical:

Good:
- "Matches your taste for the off-beat"
- "3 people who share your vibe saved this" (when we have social signal later)
- "New-to-Pulse — and we think you'll like it"

Bad (do not do):
- "Vibe tag match coefficient: 0.72"
- "Weighted factor 0.08 × multiplier 1.2"

A mapping table of factor names → Pulse-voice copy lives in `lib/ranking/explanation.ts`.

### 4.4 Performance

The explanation endpoint (`/api/feed/why`) reads the reasons array directly from the cached ranking. No recomputation. <50ms.

---

## PHASE 5 — "OUTSIDE YOUR USUAL" DEDICATED SURFACE

Ships last in this PRD.

### 5.1 Placement

A new horizontal-scroll section on the Events tab (and eventually Places, Hidden Gems), placed between "Just added on Pulse" and "Outside the city."

Section header: **"Outside your usual"**
Section subtitle: *"Things we don't normally show you — curious?"*

### 5.2 Content

Items explicitly NOT in the user's matched profile. Sourcing:
- Top-quality items in categories the user has engaged with least
- Hidden Gems the user hasn't seen before
- Items with high quality but no profile-derived boosts
- Must still pass budget filter and not be BEEN_THERE/NOT_INTERESTED

Max 8 items per section. Refresh with each pre-compute cycle.

### 5.3 Visual differentiation

Cards in this section get a subtle visual tell: a small "Stretch" or "Outside usual" pill on the image, positioned like the "Tonight" badge in your current UI. Signals to users this section is intentional discovery, not algorithm-picked-for-you.

### 5.4 Feedback loop

Items from this section feeding back INTERESTED or BEEN_THERE update the user's familiarity map — which means over time, "Outside your usual" finds new edges to stretch them on. The surface gets smarter the more users engage with it.

### 5.5 Empty state

If the user is too new for meaningful "outside" recommendations (< 5 feedback items total), hide the section entirely. Don't fake it with random content.

---

## PHASE 6 — A/B TEST HOOKS

No statistical framework, but build the plumbing so we can start experiments later.

### 6.1 Variant assignment

A new field on the user:

```prisma
model User {
  // ... existing fields
  rankingVariant String @default("control")
}
```

Backfill all existing users to `"control"`. New users get assigned via simple hash (userId → variant) when they sign up.

### 6.2 Variant lookup in the formula

The scoring function accepts a variant parameter. If variant != "control", look up variant-specific overrides in `config.ts`:

```typescript
export const RANKING_VARIANTS = {
  control: RANKING_CONFIG,
  variant_high_serendipity: {
    ...RANKING_CONFIG,
    serendipity: { ...RANKING_CONFIG.serendipity, mixedInInterval: 3 },
  },
  variant_strict_budget: {
    ...RANKING_CONFIG,
    weights: { ...RANKING_CONFIG.weights, budgetPenalty: 0.50 },
  },
};
```

Variants don't ship with the PRD — the plumbing is in place so when Quest wants to test something, he adds a variant here, assigns some users to it, and watches engagement differ.

### 6.3 Variant logging

Every feed load logs `userId`, `rankingVariant`, timestamp. Lets us reconstruct what each user saw when. Foundation for future stats work.

---

## PHASE 7 — FALLBACK & OBSERVABILITY

### 7.1 Graceful degradation

If the ranking system throws at any point (formula error, cache miss with slow pool build, etc.):
1. Log the error with full context (userId, error message, stack)
2. Fall back to quality-only sort: return top items by `qualityScore` desc, no personalization
3. User sees a feed, never sees an error
4. Admin gets a notification/log

The user experience never surfaces the failure. They might notice the feed feels less personalized that session, but they don't see a broken app.

### 7.2 Admin dashboard extension

Extend `/admin/scrapers` with a new **Ranking** section showing:
- Pre-compute job: last run time, duration, #users ranked, errors
- Cache health: % of users with fresh cache, oldest cache
- Fallback incidents (last 7 days): how many times ranking failed and quality-only kicked in
- Per-variant distribution: how many users on each variant
- Feed load latency: p50, p95, p99 for `/api/feed`

### 7.3 Structured logging

Every ranking run logs:
- userId, rankingVariant, candidatePoolSize, rankedCount, serendipityCount, duration, error (if any)

Stored in a `RankingRun` table, 14-day retention.

### 7.4 Reality check

Add a weekly automated sanity check:
- **Top-10 feed items across all users** — if the same 3 items are in everyone's top 10, there's a filter-bubble problem (the feed is collapsing to universal content, serendipity is broken)
- **Serendipity hit rate** — what % of serendipity slots get INTERESTED feedback? If <5%, serendipity isn't working; if >50%, it's actually a good match and we mislabeled it.
- **Per-segment divergence check** — do VISITING users see different content than LOCAL_EXPLORER users? If top-10s are >70% identical, strategy presets aren't pulling enough weight.

These checks log warnings, not alerts, but Quest reviews weekly.

---

## PHASE 8 — END-TO-END VERIFICATION

### 8.1 Full pipeline test

Complete user journey:
1. Create test account
2. Complete onboarding (PRD 4) with specific answers
3. Wait for pre-compute cycle OR force a run manually
4. Load the feed, verify items ranked and returned <200ms
5. Tap "Why am I seeing this?" on a random card, verify explanation renders with Pulse-voice reasons
6. Give feedback (INTERESTED on a few items, NOT_INTERESTED on others)
7. Wait for next pre-compute OR force a run
8. Verify feed has shifted — similar items to INTERESTED appear higher, similar to NOT_INTERESTED appear lower or gone
9. Mark an item BEEN_THERE, verify it disappears from feed permanently
10. Verify "Outside your usual" section populated with diverse off-profile content

### 8.2 Cold-start verification

- Create a brand-new account, complete onboarding
- Immediately load feed — verify soft-rank is in effect (feed should be more quality-driven than heavily personalized)
- Give 15+ feedback items + wait 7 days simulated
- Verify soft-rank has disengaged — profile signals now apply at full weight

### 8.3 Fallback verification

- Deliberately trigger an error in the formula (e.g., malformed config)
- Verify user still gets a feed (quality-only)
- Verify error logged to admin
- Verify no error visible to user

### 8.4 Performance verification

- Load the feed 100 times in a row as various users
- P95 latency must be <200ms
- P99 must be <500ms
- If pre-compute cache miss rate >5%, the background job isn't running often enough — investigate

### 8.5 Update PULSE_STATUS.md

- Ranking architecture overview (pre-computed + real-time, in-process)
- `RankedFeedCache` schema
- Location of `config.ts` and how to tune weights
- How to assign ranking variants (A/B plumbing)
- "Why this?" explanation endpoint
- "Outside your usual" surface placement
- Known limitations: no live location, no free-text processing, no social signals
- Pointer to `signal-map.md` as the authoritative formula reference

---

## Ground rules

- The formula in `formula.ts` MUST be a pure function. No DB calls, no async, no side effects.
- Config changes in `config.ts` take effect on next deploy. Do not build dynamic config loading from DB in V1.
- Explanation copy lives in `explanation.ts` with a clear mapping table — do not inline strings throughout the codebase.
- User NEVER sees a broken feed. Fallback to quality-only on any error.
- Do not add admin UI for weight tuning — config file is the interface for V1.
- Do not build social signal plumbing — deferred.
- Do not process `aspirationText` free text — deferred to a future PRD.
- Do not add live location — deferred.
- Pre-compute job runs hourly. Do not ship a slower cadence without explicit approval.
- Each phase pauses for Quest's review. Do not chain phases.
- Ask clarifying questions before starting any phase if anything is ambiguous.

---

## Open questions for Quest

1. **Cold-start parameters:** 7 days + 15 feedback items is my starting guess. Comfortable, or do you want shorter (faster personalization) or longer (safer against overfitting)?

2. **Serendipity interval:** 1-in-5 slots. Too aggressive? Too timid? Easy to tune in config but I want your instinct on the starting point.

3. **"Outside your usual" visibility trigger:** I said hide it until the user has 5+ feedback items. Could also show it from day one with "pure quality" picks. Which direction feels right?

4. **Explanation copy tone:** should the "Why am I seeing this?" sheet feel more like a friendly explainer (warm, conversational) or more like a transparent report (neutral, factual)? My draft leans warm — you can always adjust the copy in `explanation.ts` later.

---

## Start with Phase 0 (architecture + config file + schema). Produce `config.ts`, `types.ts`, and the `RankedFeedCache` migration, wait for approval before implementing the formula.
