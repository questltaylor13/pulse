# Wave 6 — Event Identity, Situations & New Openings (Design)

Date: 2026-07-13
Branch: `feature/overhaul-wave-6`
Predecessor: Wave 5 (Trust & Social Surfacing) — shipped & live, `SOCIAL_V1_ENABLED=true`
Vision plan: `~/.claude/plans/can-you-review-this-cached-cook.md`

## Context

Wave 6 was scoped from the handoff as three features: new-openings detection, situational
attributes, and a recurring-series model. Reconnaissance found that all three rest on
foundations that are broken in ways the handoff did not know about — and that one of those
breaks is **actively corrupting the rating engine shipped in Waves 4–5**.

So the wave ships as three sequenced PRs, ordered by damage:

| Sub-wave | Why it goes here |
|---|---|
| **6A — Event identity & recurrence** | Live data corruption. Every nightly scrape puts more ratings on the wrong row. |
| **6B — Situational attributes** | Cheapest, user-visible, and fixes two dead surfaces on the way. |
| **6C — New openings** | Largest; needs the most new infrastructure. |

### What reconnaissance found (verified 2026-07-13)

**1. `isRecurring` does not mean "recurring". It means "is actually a Place."**

`scripts/sync-events-to-items.ts:26` — `const itemType = event.isRecurring ? "PLACE" : "EVENT"`.
The 34 rows flagged `isRecurring: true` are climbing gyms, Meow Wolf, Topgolf, the art museum.
The ~11 genuinely weekly things in the seed (trivia, open mic, karaoke, farmers market) are all
`false`. Only two code paths filter on it, and both treat it as "always available": it is exempt
from archiving (`archive-stale-events`) and always feed-active regardless of `startTime`
(`activeEventsWhere`).

**2. The real recurrence damage is in ingest dedup, and it has two opposite failure modes.**

The DB match key is `(externalId, source)` (`lib/scrapers/index.ts:257-323`) and `startTime` is
**payload, not key** — it is overwritten on match. Whether a weekly event becomes one row or many
depends entirely on the shape of the source's URL, which nobody has audited:

- **Westword** derives `externalId` from the *series* page URL, and its parser explicitly handles
  `"Every Sunday"` by anchoring to the next occurrence (`westword.ts:30-53`). Result: **one
  immortal row whose `startTime` is rewritten forward every night.** A rating from three weeks ago
  silently attaches to this week's edition. Worse, `buildCandidatePool` excludes DONE by row, so
  the event is **permanently suppressed from that user's feed, forever**.
- **do303 / Ticketmaster / Eventbrite** use per-occurrence URLs/ids. Result: **N unrelated rows.**
  The rating is orphaned onto a row that gets archived, the DONE-exclusion misses, and the event is
  **re-recommended every week, forever.**

Both populations exist in prod simultaneously and are indistinguishable from the data.

**3. `NULL externalId` creates unbounded duplicates.** `externalId` is nullable and the unique index
is `(externalId, source)`. Postgres treats NULLs as distinct in a unique index, and
`lib/scrapers/index.ts:258` short-circuits to `existing = null` when `externalId` is falsy — so every
red-rocks event without a permalink is **`create`d fresh on every nightly cron run**. The constraint
cannot stop it.

**4. We delete the exact content "where can I watch the game" is asking for.**
`lib/scrapers/exclusions.ts` matches on title **and description**, and
`exclusions.test.ts:20` explicitly asserts `isProSportsEvent("Nuggs Watch Party") === true`. A watch
party at a neighborhood bar is not a ticketed game a fan already knows about — it is precisely the
discovery content Pulse exists for, and it is hard-dropped pre-dedup, pre-DB.

**5. The new-openings data is stale seed fiction, and detection is not the missing piece.**
Zero places have a fresh `openedDate`; the 15 `isNew` rows survive only because their `openedDate` is
NULL and the cron explicitly skips those. All 11 `COMING_SOON` rows have `expectedOpenDate` in the
past. The cause is not missing detection — it is that **nothing ever flips `COMING_SOON → OPEN`**.
Also: `Place` has no fuzzy dedup (`googlePlaceId` is the only unique key, and it is NULL for exactly
the pre-open rows a detector produces), `openingStatus` defaults to `OPEN` (a careless upsert
publishes an unopened venue into browse/map/ranking), `/new` is orphaned from nav, and
`NewPlaceAlert` is a **write-only table** — nothing reads it, and no email/push provider is installed.

**6. Two corrections to our own assumptions.**
- **Vercel is not on Hobby.** `vercel.json` has 15 crons, five of them weekly. "No cron slots" is a
  planning-doc assumption contradicted by the shipped config. Cron room is not a constraint.
- **All LLM work is OpenAI, not Claude.** There is no Anthropic SDK in the repo. Every "calls Claude"
  comment (`research-mountain-events/route.ts:12`, `discoveries/refresh-llm/route.ts:10`) is stale and
  wrong — almost certainly the source of the handoff's error. The real pipeline template is
  `lib/discoveries/*` (Zod validation, `LLMResearchRun` observability, Google Places verification,
  fuzzy dedup, admin dashboard), not `lib/llm-research/mountain-events.ts` (no validation, no
  observability, hand-rolled JSON slicing, a broken DST guess).

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Three PRs, sequenced 6A → 6B → 6C.** Not one wave. | Each is an independent subsystem with its own foundation to repair. One PR would be too large to review well, and Wave 5's review already strained to cover less surface. |
| D2 | **`EventSeries` parent model**, occurrences point at it. | The only model that makes "rating the trivia" mean something. A derived `seriesKey`-only approach gets ~90% of the benefit but silently splits a series on any venue rename, and cannot carry cadence or next-occurrence metadata. |
| D3 | **Occurrence identity is `(source, externalId, startTime-date)`.** | An occurrence *is* a (thing, time) pair. This one change fixes both failure modes at once and is uniform across every source, rather than special-casing each scraper's URL scheme. |
| D4 | **DONE means discovered, not never-again.** A rated series leaves the discovery pool but gains an "On again this week" rail. | A weekly you loved vanishing from the app is the opposite of what a taste engine should do. Beli's model: your ranked list is the record, and you go back to it deliberately. |
| D5 | **Rename `isRecurring` → `isPermanent`.** | Shipping a real `EventSeries` model *beside* a boolean named `isRecurring` that means "is a Place" would be permanently confusing. It has already produced one wrong handoff doc. |
| D6 | **Narrow the sports exclusion; keep watch parties.** Plus a `Place` attribute. | "Where can I watch the game" has two answers — a bar that always shows it (place) and a party on Thursday (event). We currently support neither, and actively delete the second. |
| D7 | **In-app alerts. No email provider.** | Owner's call. The "Notify Me" button gets an honest label rather than a new dependency. |
| D8 | **Model the openings pipeline on `lib/discoveries/*`, not `mountain-events.ts`.** | The former is production-shaped (Zod, run rows, verification, dedup); the latter is the one with no validation and a broken DST guess. |

---

# Wave 6A — Event identity & recurrence

## Schema

Migration `add_event_series`:

```prisma
model EventSeries {
  id        String  @id @default(cuid())
  cityId    String
  title     String        // canonical title, from the most recent occurrence
  venueName String
  placeId   String?       // resolved venue, when venue-match finds one
  category  Category
  cadence   String?       // "Every Tuesday" — human-readable, when a source tells us

  /// normalize(title)|normalize(venue). The identity of a series across weeks.
  seriesKey String  @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  city             City              @relation(...)
  place            Place?            @relation(...)
  events           Event[]
  userItemStatuses UserItemStatus[]
  rankedEntries    UserRankedEntry[]

  @@index([placeId])
}

model Event {
  // ... existing ...
  seriesId String?
  series   EventSeries? @relation(fields: [seriesId], references: [id], onDelete: SetNull)

  isPermanent Boolean @default(false)   // RENAMED from isRecurring

  @@unique([source, externalId, startTime])   // REPLACES @@unique([externalId, source])
  @@index([seriesId, startTime])
}

model UserItemStatus {
  seriesId String?
  series   EventSeries? @relation(...)
  @@unique([userId, seriesId])
}

model UserRankedEntry {
  seriesId String?
  series   EventSeries? @relation(...)
  @@unique([userId, seriesId])
}
```

`onDelete: SetNull` on `Event.seriesId` matches the existing `Event.placeId` convention: deleting a
series must not delete its history.

## Components

### 1. Series derivation (pure)
`lib/series/key.ts` — `deriveSeriesKey(title, venueName)`: lowercase, strip a leading date/day
prefix, collapse whitespace, drop punctuation, join `title|venue`. Pure, unit-tested. This is the
one function that decides whether two rows are the same series, so it gets tests before it gets
callers.

### 2. Ingest (`lib/scrapers/index.ts`)

**`externalId` becomes non-null, always.** This is load-bearing and easy to get wrong. The current
bug is that `externalId` is nullable and the unique index is `(externalId, source)` — and Postgres
treats NULLs as **distinct** in a unique index, so the constraint cannot stop duplicate NULL rows,
which is why every permalink-less red-rocks event is re-created nightly. Adding `startTime` to the
key does **not** fix that on its own: `(source, NULL, t)` still never collides with itself.

So the fix is to stop having NULLs. When a source supplies no id, ingest **synthesizes a
deterministic one**:

```
externalId = source-supplied id
          ?? stableId(`${source}|${seriesKey}|${denverDateKey(startTime)}`)
```

Now `@@unique([source, externalId, startTime])` is genuinely enforceable by the database, and the
duplicate-creation bug is closed by a constraint rather than by application code that someone has to
remember to keep correct. `externalId` stays nullable in the schema (curator/admin-created events
legitimately have none) — the guarantee is that the *scrape path* never writes one.

- Occurrence match becomes a real `upsert` on the new composite unique, replacing the
  `findFirst` + branch, which is also a TOCTOU race.
- A `ScrapedEvent` may now carry an optional `cadence` string. Westword already parses
  `"Every Sunday"` (`westword.ts:30-53`) and currently throws it away; it now sets `cadence`.
- Series attach: upsert `EventSeries` by `seriesKey` when **either** the scraper supplied a
  `cadence`, **or** ≥2 occurrences share a `seriesKey` at different dates. The second condition is
  what catches do303's per-occurrence rows, which carry no recurrence hint at all.

The migration replacing `@@unique([externalId, source])` with `@@unique([source, externalId, startTime])`
cannot fail on existing data: the new key is strictly weaker (it can only split groups, never merge
them), so no current row pair can violate it.

### 3. Series as a content ref
`lib/feedback/types.ts` `FeedbackRef` and `lib/rank-engine/ordering.ts` `RankRef` gain `{ seriesId }`.
`lib/content/snapshot.ts` gains `loadSeriesSnapshot` + a `series` branch in `resolveContent` — the
Wave 5 mapper already exists precisely so a fourth content type is a small change rather than four.

**Rating an occurrence writes against its series.** `resolveContentRef` maps an event that has a
`seriesId` to `{ seriesId }`. A one-off event (no series) is unchanged — it still resolves to
`{ eventId }`.

### 4. Discovery suppression + the regulars rail
- `lib/ranking/candidate-pool.ts` excludes events whose **series** the user has DONE, not just
  events they have DONE by row. This is the fix for "re-recommended every week forever".
- New home rail **"On again this week"** (`components/home/fetch-home-feed.ts`): the next
  occurrence of each series the user ranked `LIKED`, within 7 days, ordered by their rank. Omitted
  entirely when empty, matching the existing rail convention.

### 5. `isRecurring` → `isPermanent`
Mechanical rename. Behaviour is identical: exempt from archiving, always feed-active. Only the name
changes, plus a comment saying what it actually means. Also fixes the disagreement where
`candidate-pool.ts:53` hardcodes `startTime >= now` instead of calling `activeEventsWhere()`, so
permanent rows are visible in browse but invisible to the ranker.

## Backfill

`scripts/backfill-event-series.ts` (idempotent): derive `seriesKey` for all ~346 events, group,
create an `EventSeries` for any key with ≥2 occurrences at different dates, link them. Existing
`UserItemStatus` / `UserRankedEntry` rows pointing at an event that now has a series are **left
alone** — they keep working via the `eventId` path. Series-level rating starts with new ratings.
Migrating old ratings onto series is deliberately out of scope: prod has almost no event ratings, and
a bad merge is unrecoverable.

## PRs

| PR | Contents |
|----|----------|
| 6A.1 | `deriveSeriesKey` (pure + tests), schema + migration, ingest upsert + NULL-externalId fix |
| 6A.2 | Series as a content ref (feedback + rank-engine + snapshot), series-level DONE |
| 6A.3 | Discovery suppression + "On again this week" rail |
| 6A.4 | `isRecurring` → `isPermanent`, candidate-pool/activeEventsWhere reconciliation, backfill script |

---

# Wave 6B — Situational attributes

## The exclusion, narrowed

`lib/scrapers/exclusions.ts` today: any title/description mentioning a Denver pro team is dropped,
unless it mentions a brewery, a trail, or a 5K. That drops watch parties.

New rule — **drop the ticketed game, keep everything about it**:

```
isTicketedProGame(title, description, venueName) =
  TEAM_RX matches
  AND (
    VS_RX matches            // "Nuggets vs Lakers", "Broncos at Chiefs"
    OR PRO_VENUE_RX matches  // Ball Arena, Empower Field, Coors Field, Dick's Sporting Goods Park
  )
  AND NOT WATCH_PARTY_RX     // "watch party", "watch the game", "viewing party", "game day"
```

A watch party at Blake Street Tavern survives. `Nuggets vs Lakers` at Ball Arena still dies. The
existing false-positive guards (brewery/trail/5K) are retained. The existing test asserting
`"Nuggs Watch Party"` is dropped is **inverted** — it now asserts the opposite, with a comment
explaining why the old expectation was wrong.

## Place attributes

Migration `add_situational_attributes`:

```prisma
model Place {
  goodForWatchingSports Boolean @default(false)   // has screens, shows games
  isKidFriendly         Boolean @default(false)
  hasOutdoorSeating     Boolean @default(false)
  hasIndoorSeating      Boolean @default(true)    // default true: most places do
  fitsLargeGroups       Boolean @default(false)   // 6+ without a reservation

  @@index([goodForWatchingSports])
  @@index([isKidFriendly])
  @@index([fitsLargeGroups])
}
```

Booleans, not tags. The tag vocabularies are the problem (see below), not the solution — a
first-class indexed boolean is queryable, and `isLocalFavorite` / `goodForWorking` already establish
the pattern.

**Population.** `scripts/enrich-places.ts` is the only place enricher and it is **manual-CLI-only**
— on no cron. It moves to `lib/enrich-place.ts` + a weekly cron, and its prompt gains the five
booleans (whitelisted output, same as the existing tag handling). Idempotence gate stays
(`pulseDescription = null` unless `--force`), so the first run needs a one-off `--force` pass over
the ~460-place corpus.

## Two dead surfaces, fixed on the way

1. **`/browse/groups` returns ~0 places.** `browse-configs.ts` asks for `vibeTag: "group-friendly"`,
   `fetch-browse.ts:152` turns that into `vibeTags hasSome ["group-friendly"]` — but enrichment
   writes group signal into **`companionTags` as `"Groups"`**. The correct query,
   `groupFriendlyPlacesWhere()`, is **imported into `fetch-browse.ts:7` and never called.** Call it.
2. **Enriched places show zero vibe chips.** `filterValidVibeTags` validates against a kebab-case
   allowlist (`lib/constants/vibe-tags.ts`) while enrichment writes Title-case (`"Cozy"`,
   `"Lively"`). Every LLM-enriched place filters to `[]`. Fixed by normalizing at the boundary with
   the Wave 4 `normalizeTagToken` that already exists — not by rewriting the data.

## Browse

New situational configs. `fetch-browse.ts` currently hardcodes four `defaults` keys, so a new
config is *not* a one-line row. Add a `placeFlag` default that maps to any indexed boolean column,
making the five new attributes (and the two existing ones) data-driven:

```ts
"watch-the-game": { title: "Where to watch the game", source: "places", defaults: { placeFlag: "goodForWatchingSports" } },
"kid-friendly":   { title: "Good with kids",          source: "places", defaults: { placeFlag: "isKidFriendly" } },
"big-groups":     { title: "Fits a big group",        source: "places", defaults: { placeFlag: "fitsLargeGroups" } },
```

## PRs

| PR | Contents |
|----|----------|
| 6B.1 | Narrow the exclusion; invert the watch-party test |
| 6B.2 | Schema + migration; enrichment prompt + `lib/enrich-place.ts` + weekly cron |
| 6B.3 | Browse `placeFlag` + new configs; fix `/browse/groups`; fix vibe chips; surface attributes on the place detail page |

---

# Wave 6C — New openings

## Detection

`lib/openings/` modeled on `lib/discoveries/*`:

- `pipeline.ts` — OpenAI Responses API + `web_search_preview`, model from
  `OPENINGS_OPENAI_MODEL || "gpt-5.4-mini"` (env-overridable, unlike the two hardcoded model ids
  elsewhere). Queries: newly opened (last 60d), opening soon (named date), announced (no date yet).
- `schema.ts` — **strict Zod**. `source_urls` required; a candidate with no citation is dropped.
- `verification.ts` — resolve against Google Places (`searchPlacesByText`). A confident match gives
  us `googlePlaceId` + coordinates. **No match is not a rejection** — a pre-open restaurant has no
  Google listing yet, which is the normal case for `COMING_SOON`.
- `dedup.ts` — fuzzy `Place` match: normalized-name Levenshtein ≤3 **plus** haversine ≤150m when both
  have coordinates, else name + neighborhood. This does not exist today and is the reason a weekly
  news pass would otherwise create a duplicate row for the same restaurant every week.
- Every run writes an `LLMResearchRun`-equivalent row (prompt, raw response, candidate count, status,
  duration) — the mountain-events pipeline's total lack of observability is why nobody noticed it
  producing nothing.

## The rot fix (the actually-important part)

**`COMING_SOON → OPEN` transition cron.** Nothing does this today, which is the entire reason all 11
upcoming rows are stale. Daily:

- `expectedOpenDate` has passed and Google now returns `business_status: OPERATIONAL` → set
  `openingStatus: OPEN`, `openedDate = today`, `isNew = true`, `isUpcoming = false`.
- `expectedOpenDate` passed but Google still has nothing → leave `COMING_SOON`, bump a
  `staleSince` counter. After 60 days, flag for review rather than guessing.

This also means `isNew` finally has a real writer, so the `openedDate`-based 45-day window in the
scrape cron starts doing something.

## Moderation

`Place.reviewStatus` (`PUBLISHED | UNVERIFIED`), defaulting to `PUBLISHED` so every existing row is
unaffected. LLM-detected places land `UNVERIFIED` and are **excluded from browse/map/ranking/feed**
until reviewed — `Discovery` already has exactly this state and an admin dashboard; `Place` has
neither. `openingStatus` defaults to `OPEN`, so without this an LLM hallucination would publish an
imaginary restaurant straight into the map.

Admin review at `/admin/openings`, mirroring `/admin/discoveries`.

## In-app alerts (D7)

No email provider. Instead:

- The "Notify Me" button becomes **"Follow this opening"** — an honest name for what it does.
- A new **"Opened since you last looked"** section on `/new`, listing places the user follows that
  have flipped to `OPEN`/`SOFT_OPEN` since their last visit. `NewPlaceAlert.notified` finally has a
  reader.
- Two real bugs in `app/api/places/[id]/notify/route.ts` fixed: re-subscribing double-counts
  `preOpeningSaves` (unconditional `increment` after an `upsert`), and unsubscribing decrements even
  when `deleteMany` deleted zero rows, so the counter can go **negative**.

## Surfacing

`/new` is orphaned — not in `NavLinks`, and its two feeding APIs are consumed only by dead code
(`components/NewInDenverSection.tsx`, which nothing imports). Wire `/new` into nav; delete the dead
components.

## PRs

| PR | Contents |
|----|----------|
| 6C.1 | `COMING_SOON → OPEN` transition cron + `Place.reviewStatus` + notify-route bug fixes |
| 6C.2 | `lib/openings/` detection pipeline (Zod, verification, fuzzy dedup, run observability) + weekly cron |
| 6C.3 | `/admin/openings` review dashboard |
| 6C.4 | Surfacing: nav, "Follow this opening", "Opened since you last looked", dead-code deletion |

---

## Rollout

Two flags, same `process.env.X === "true"` pattern as `SOCIAL_V1_ENABLED`:

- **`SERIES_V1_ENABLED`** (6A) — off ⇒ no series are created, refs resolve to `{ eventId }` exactly
  as today, no regulars rail. **The ingest dedup fix ships UNFLAGGED**, because it is a bug fix, not
  a feature: leaving it behind a flag means the corruption continues while the flag is off.
- **`OPENINGS_V1_ENABLED`** (6C) — off ⇒ no detection cron, no `/new` nav entry, `UNVERIFIED` places
  stay hidden (which they are anyway).

6B ships unflagged. It is a narrowing of an over-broad exclusion plus additive place attributes;
there is no state in which the old behaviour is preferable.

## Testing

Baseline: 220 vitest green, `tsc --noEmit` + `next build` clean. Every commit gated on all three.

Pure modules get tests, per the repo's convention (no Prisma mocking anywhere):

- `deriveSeriesKey` — the same series across weeks, title/venue drift, a date prefix, punctuation.
  This function decides identity; it is the highest-value test in the wave.
- `isTicketedProGame` — the inverted watch-party case, `vs` matching, pro-venue matching, and the
  retained brewery/trail/5K guards.
- Openings Zod schema + fuzzy dedup (name distance, haversine).
- Regression guard, mirroring Waves 4–5: with `SERIES_V1_ENABLED` off, `score()` and its `reasons[]`
  are byte-identical, and `resolveContentRef` returns `{ eventId }` for every event.

DB-coupled behaviour (upsert dedup, transition cron, alert delivery) is covered by the manual UAT
checklist, not by mocks.

## Error handling

- Series attach is best-effort: a failure to upsert `EventSeries` must never fail the ingest of the
  occurrence itself. An unlinked occurrence is a worse feed, not a broken one.
- The openings pipeline is failure-tolerant per-candidate: one bad candidate is dropped and logged,
  it does not abort the run.
- Google Places verification failing yields `UNVERIFIED`, never a silent publish.
- The transition cron never *guesses* an opening. If Google has nothing, the place stays
  `COMING_SOON`. Wrongly telling someone a restaurant is open is worse than telling them nothing.

## Out of scope

Migrating existing event ratings onto series (prod has almost none; a bad merge is unrecoverable).
Email/push alerts (D7). RRULE expansion in `lib/scrapers/ics.ts` — `CIVIC_ICS_FEEDS` is empty, so it
is a landmine for the next ICS feed, not an active bug; noted for whoever adds one. Capacity/table-size
data for group sizing (we infer `fitsLargeGroups`, we do not know it).

## Accepted risks

- `seriesKey` is derived from title + venue. A venue rename splits a series; a source that
  reformats its titles splits a series. The backfill is idempotent and re-runnable, so a split is
  repairable, but it will happen at least once.
- Narrowing the sports exclusion could let ticketed games through if a source describes them
  unusually. The failure mode is a Nuggets game in the feed — annoying, not harmful, and visible
  immediately.
- The openings pipeline is LLM-sourced and will hallucinate. `UNVERIFIED` + admin review is the
  mitigation; nothing reaches the map unreviewed.
