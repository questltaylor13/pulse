# Wave 6A — Event Identity & Recurrence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a recurring event one identity across its occurrences, so a rating lands on "the trivia" rather than on an arbitrary row — and stop the ingest path corrupting ratings every night.

**Architecture:** A new `EventSeries` parent keyed by a derived `seriesKey` (normalized title + venue). `Event` gains a nullable `seriesId`. Occurrence identity at ingest becomes `(source, externalId, startTime)`, with a synthesized `externalId` when a source supplies none — so the duplicate-creation bug is closed by a database constraint rather than by application code. Ratings resolve through the series; a rated series leaves the discovery pool but gains an "On again this week" rail.

**Tech Stack:** Next.js 14 App Router, Prisma 5.22 + Neon Postgres, vitest, TypeScript.

## Global Constraints

- **Never `prisma migrate dev`.** All env files point at the prod Neon DB. Hand-write migrations via `prisma migrate diff --from-schema-datamodel <HEAD schema> --to-schema-datamodel prisma/schema.prisma --script`.
- **Read source with `cat -n` via Bash**, not the Read tool (a claude-mem hook interferes).
- Every commit gated on all three: `npx vitest run`, `npx tsc --noEmit`, `npm run build`.
- Baseline: **220 vitest green**.
- Flag: `SERIES_V1_ENABLED` (`process.env.X === "true"`, in `lib/ranking/flags.ts`). Off ⇒ no series created, refs resolve to `{ eventId }` exactly as today, no regulars rail.
- **The ingest dedup fix ships UNFLAGGED.** It is a bug fix, not a feature; gating it means the corruption continues while the flag is off.
- Pure modules get tests; there is no Prisma mocking anywhere in this repo and we are not introducing it.

---

### Task 1: `deriveSeriesKey` — the identity function

This decides whether two rows are the same series. Everything else depends on it, so it gets tests before it gets callers.

**Files:**
- Create: `lib/series/key.ts`
- Test: `lib/series/__tests__/key.test.ts`

**Interfaces:**
- Produces: `deriveSeriesKey(title: string, venueName: string): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { deriveSeriesKey } from "@/lib/series/key";

describe("deriveSeriesKey", () => {
  it("gives the same key to the same series across weeks", () => {
    expect(deriveSeriesKey("Trivia Night", "Ratio Beerworks")).toBe(
      deriveSeriesKey("trivia night", "Ratio Beerworks"),
    );
  });

  it("strips a leading date or weekday prefix", () => {
    const canonical = deriveSeriesKey("Trivia Night", "Ratio Beerworks");
    expect(deriveSeriesKey("Tuesday: Trivia Night", "Ratio Beerworks")).toBe(canonical);
    expect(deriveSeriesKey("7/15 - Trivia Night", "Ratio Beerworks")).toBe(canonical);
  });

  it("ignores punctuation and whitespace drift", () => {
    const canonical = deriveSeriesKey("Trivia Night", "Ratio Beerworks");
    expect(deriveSeriesKey("Trivia  Night!", "Ratio Beerworks")).toBe(canonical);
  });

  it("separates different series at the same venue", () => {
    expect(deriveSeriesKey("Trivia Night", "Ratio")).not.toBe(
      deriveSeriesKey("Open Mic", "Ratio"),
    );
  });

  it("separates the same title at different venues", () => {
    expect(deriveSeriesKey("Trivia Night", "Ratio")).not.toBe(
      deriveSeriesKey("Trivia Night", "Mercury Cafe"),
    );
  });

  it("returns a stable, url-safe token", () => {
    expect(deriveSeriesKey("Trivia Night", "Ratio Beerworks")).toMatch(/^[a-z0-9|-]+$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/series` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
/**
 * Wave 6A — the identity of an event series across its occurrences.
 *
 * Two Event rows belong to the same series iff they produce the same key. That
 * makes this the most consequential pure function in the wave: a key that is too
 * loose merges "Trivia Night" with "Trivia Night (Finals)"; one that is too
 * tight splits a series every time a source reformats its title.
 *
 * Deliberately derived from title + venue rather than from the source's id,
 * because the whole problem is that sources disagree about what an id means:
 * Westword's is series-stable, do303's is per-occurrence.
 */

/** Leading "Tuesday:", "Tue -", "7/15 -", "July 15:" and friends. */
const DATE_PREFIX_RX =
  /^\s*(?:(?:mon|tues?|wed(?:nes)?|thur?s?|fri|sat(?:ur)?|sun)(?:day)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?|\d{1,2})\b[\s:,\/-]*/i;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")   // punctuation out
    .replace(/[\s_]+/g, "-")         // whitespace to hyphens
    .replace(/-+/g, "-")             // collapse
    .replace(/^-|-$/g, "");          // trim
}

export function deriveSeriesKey(title: string, venueName: string): string {
  const stripped = title.replace(DATE_PREFIX_RX, "");
  // A title that is ONLY a date prefix would normalize to "" — fall back to the
  // raw title rather than collapsing every such event into one series.
  const t = normalize(stripped) || normalize(title);
  return `${t}|${normalize(venueName)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/series` — Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/series && git commit -m "Wave 6A: deriveSeriesKey — series identity across occurrences"
```

---

### Task 2: Schema + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260714000000_add_event_series/migration.sql`
- Modify: `lib/ranking/flags.ts` (add `isSeriesV1Enabled`)

**Interfaces:**
- Produces: `EventSeries` model; `Event.seriesId`; `Event.isPermanent` (renamed from `isRecurring`); `UserItemStatus.seriesId`; `UserRankedEntry.seriesId`; `isSeriesV1Enabled(): boolean`

- [ ] **Step 1: Add `EventSeries` + `Event.seriesId` + rename `isRecurring` → `isPermanent`**

```prisma
model EventSeries {
  id        String   @id @default(cuid())
  cityId    String
  title     String
  venueName String
  placeId   String?
  category  Category
  cadence   String?  // "Every Tuesday" — when a source tells us
  seriesKey String   @unique  // normalize(title)|normalize(venue)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  city             City              @relation(fields: [cityId], references: [id], onDelete: Cascade)
  place            Place?            @relation(fields: [placeId], references: [id], onDelete: SetNull)
  events           Event[]
  userItemStatuses UserItemStatus[]
  rankedEntries    UserRankedEntry[]

  @@index([placeId])
}
```

On `Event`: add `seriesId String?` + relation + `@@index([seriesId, startTime])`; rename `isRecurring` → `isPermanent`; replace `@@unique([externalId, source])` with `@@unique([source, externalId, startTime])`.

On `UserItemStatus` and `UserRankedEntry`: add `seriesId String?` + relation + `@@unique([userId, seriesId])`.
On `City` and `Place`: add the `eventSeries EventSeries[]` back-relations.

- [ ] **Step 2: Generate the migration**

```bash
SCRATCH=<scratchpad>
git show HEAD:prisma/schema.prisma > "$SCRATCH/head.prisma"
npx prisma migrate diff --from-schema-datamodel "$SCRATCH/head.prisma" --to-schema-datamodel prisma/schema.prisma --script
```

Expected: `CREATE TABLE "EventSeries"`, `ALTER TABLE "Event" RENAME COLUMN "isRecurring" TO "isPermanent"` (verify — Prisma may emit DROP+ADD, which would **lose the 34 true rows**; if so, hand-write the RENAME), `DROP INDEX Event_externalId_source_key`, `CREATE UNIQUE INDEX Event_source_externalId_startTime_key`, new columns + FKs.

**Critical:** if the diff emits `DROP COLUMN "isRecurring"` + `ADD COLUMN "isPermanent"`, hand-edit to `ALTER TABLE "Event" RENAME COLUMN "isRecurring" TO "isPermanent";` — a drop/add silently zeroes the 34 permanent-venue rows.

- [ ] **Step 3: Write the migration file, `npx prisma generate`**

- [ ] **Step 4: Add the flag**

```ts
/**
 * Wave 6A — gates the EventSeries model: series creation at ingest, series-level
 * rating refs, and the "On again this week" rail. Off ⇒ refs resolve to
 * { eventId } exactly as pre-Wave-6.
 *
 * The ingest dedup FIX is deliberately NOT behind this flag — it is a bug fix,
 * and gating it would mean the corruption continues while the flag is off.
 */
export function isSeriesV1Enabled(): boolean {
  return process.env.SERIES_V1_ENABLED === "true";
}
```

- [ ] **Step 5: Fix every `isRecurring` call site**

Run `grep -rn "isRecurring" --include=*.ts --include=*.tsx app lib components scripts` and rename all. Known sites: `lib/queries/events.ts:19-22` (`activeEventsWhere`), `app/api/cron/archive-stale-events/route.ts:20`, `scripts/sync-events-to-items.ts:26,37`, `lib/ranking/rails.ts:47`, `app/api/home/events-feed/route.ts:87`, `lib/ranking/outside-usual.ts:40`, `components/home/fetch-home-feed.ts:113`, `components/EventCard.tsx:510`, `lib/home/event-view.ts:17-18`, `app/api/new-this-month/route.ts:33`, seed scripts.

Add a comment at the schema field saying what it actually means:
```prisma
  /// Always-available, place-like activity (climbing gym, museum) — NOT a
  /// recurring series. Exempt from archiving; feed-active regardless of
  /// startTime. Genuinely recurring things use EventSeries.
  isPermanent Boolean @default(false)
```

- [ ] **Step 6: Gate**

`npx tsc --noEmit && npx vitest run && npm run build` — Expected: clean, 226 green.

- [ ] **Step 7: Commit**

---

### Task 3: Ingest — occurrence identity + the duplicate-creation fix

**Files:**
- Modify: `lib/scrapers/types.ts` (add `cadence?: string` to `ScrapedEvent`)
- Modify: `lib/scrapers/index.ts:257-323` (the `findFirst` + branch)
- Modify: `lib/scrapers/westword.ts` (emit `cadence` from its existing "Every Sunday" parse)
- Create: `lib/series/ingest.ts` (`attachSeries`)
- Test: `lib/series/__tests__/ingest.test.ts` (pure part only)

**Interfaces:**
- Consumes: `deriveSeriesKey` (Task 1)
- Produces: `resolveExternalId(event: ScrapedEvent, seriesKey: string): string`, `attachSeries(tx, events) : Promise<Map<string, string>>` (seriesKey → seriesId)

- [ ] **Step 1: Write the failing test for the pure part**

```ts
import { describe, it, expect } from "vitest";
import { resolveExternalId } from "@/lib/series/ingest";

const base = { title: "Trivia", venueName: "Ratio", source: "westword", startTime: new Date("2026-07-14T19:00:00Z") };

describe("resolveExternalId", () => {
  it("uses the source's id when it has one", () => {
    expect(resolveExternalId({ ...base, externalId: "abc123" } as any, "trivia|ratio")).toBe("abc123");
  });

  it("synthesizes a deterministic id when the source has none", () => {
    const a = resolveExternalId({ ...base, externalId: undefined } as any, "trivia|ratio");
    const b = resolveExternalId({ ...base, externalId: undefined } as any, "trivia|ratio");
    expect(a).toBe(b);
    expect(a).toMatch(/^syn_[a-f0-9]{16}$/);
  });

  it("gives different occurrences of one series different ids", () => {
    const week1 = resolveExternalId({ ...base, externalId: undefined, startTime: new Date("2026-07-14T19:00:00Z") } as any, "trivia|ratio");
    const week2 = resolveExternalId({ ...base, externalId: undefined, startTime: new Date("2026-07-21T19:00:00Z") } as any, "trivia|ratio");
    expect(week1).not.toBe(week2);
  });

  it("NEVER returns null — the whole point is that NULLs defeat the unique index", () => {
    expect(resolveExternalId({ ...base, externalId: undefined } as any, "x|y")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement `resolveExternalId`**

```ts
import { createHash } from "crypto";
import { denverDateKey } from "@/lib/time/denver";
import type { ScrapedEvent } from "@/lib/scrapers/types";

/**
 * Wave 6A — an occurrence's stable id, guaranteed non-null.
 *
 * The bug this closes: externalId was nullable and the unique index was
 * (externalId, source). Postgres treats NULLs as DISTINCT in a unique index, so
 * the constraint could not stop duplicate NULL rows — every permalink-less
 * red-rocks event was re-created on every nightly run, and the constraint was
 * powerless to notice.
 *
 * Adding startTime to the key does not fix that on its own: (source, NULL, t)
 * still never collides with itself. The fix is to stop having NULLs, so the
 * database can enforce the invariant instead of application code that someone
 * has to remember to keep correct.
 */
export function resolveExternalId(event: ScrapedEvent, seriesKey: string): string {
  if (event.externalId) return event.externalId;
  const material = `${event.source}|${seriesKey}|${denverDateKey(event.startTime)}`;
  return `syn_${createHash("sha256").update(material).digest("hex").slice(0, 16)}`;
}
```

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Replace the `findFirst` + branch with an `upsert`** in `lib/scrapers/index.ts`

```ts
const seriesKey = deriveSeriesKey(event.title, event.venueName);
const externalId = resolveExternalId(event, seriesKey);

await prisma.event.upsert({
  where: {
    source_externalId_startTime: { source: event.source, externalId, startTime: event.startTime },
  },
  update: { /* payload — NOT startTime, which is now part of identity */ },
  create: { ...payload, externalId, seriesId },
});
```

Note `startTime` moves out of the update payload: it is identity now, not data. That is the change that stops Westword's row mutating forward and dragging old ratings onto this week's edition.

- [ ] **Step 6: `attachSeries`** — flag-gated (`isSeriesV1Enabled()`). Group the run's events by `seriesKey`; upsert an `EventSeries` when the scraper gave a `cadence` **or** ≥2 occurrences share a key at different dates. Best-effort: wrap in try/catch — a failure to attach a series must never fail the ingest of the occurrence.

- [ ] **Step 7: Westword emits `cadence`** — it already parses `"Every Sunday"` at `westword.ts:30-53` and throws it away. Capture it.

- [ ] **Step 8: Gate + commit.**

---

### Task 4: Series as a content ref

**Files:**
- Modify: `lib/feedback/types.ts` (`FeedbackRef` + `resolveContentRef` + `resolveItemTarget`)
- Modify: `lib/rank-engine/ordering.ts` (`RankRef`, `refWhere`)
- Modify: `lib/rank-engine/service.ts` (`refCreateFields`, `CONTENT_INCLUDE`, `loadContent`)
- Modify: `lib/content/snapshot.ts` (`loadSeriesSnapshot`, `resolveContent` series branch)
- Modify: `lib/feedback/api.ts` (series upsert branch)
- Test: `lib/feedback/__tests__/types.test.ts` (extend)

**Interfaces:**
- Consumes: `isSeriesV1Enabled` (Task 2)
- Produces: `{ seriesId: string }` as a member of `FeedbackRef`, `ContentRef`, `RankRef`

- [ ] **Step 1: Write the failing test** — `resolveContentRef` maps an event **with** a `seriesId` to `{ seriesId }` when the flag is on, and to `{ eventId }` when off or when the event has no series.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Implement.** The Wave 5 `resolveContent` mapper already exists precisely so a fourth content type is a small change; add a `series` branch rather than a fourth copy of the title/image rules.

- [ ] **Step 4–6: Run, gate, commit.**

---

### Task 5: Discovery suppression + "On again this week"

**Files:**
- Modify: `lib/ranking/candidate-pool.ts` (exclude events whose *series* is DONE)
- Create: `components/home/RegularsRail.tsx`
- Modify: `components/home/fetch-home-feed.ts` + `lib/home/types.ts`
- Test: `lib/home/__tests__/regulars.test.ts` (pure selection logic)

- [ ] **Step 1:** Write the failing test for the pure selection: given ranked series + upcoming occurrences, return the next occurrence per series within 7 days, ordered by the user's rank.
- [ ] **Step 2:** Run to verify it fails.
- [ ] **Step 3:** Implement `selectRegulars()` pure + wire the rail. Omit the rail entirely when empty (matches the existing `sections.filter(s => s.items.length > 0)` convention).
- [ ] **Step 4:** Candidate pool: exclude by series. This is the fix for "re-recommended every week forever".
- [ ] **Step 5–6:** Gate, commit.

---

### Task 6: Backfill script

**Files:**
- Create: `scripts/backfill-event-series.ts`
- Modify: `package.json` (`"series:backfill"`)

- [ ] **Step 1:** Derive `seriesKey` for all events, group, create `EventSeries` for any key with ≥2 occurrences at **different dates**, link. Idempotent (upsert by `seriesKey`; re-runnable).
- [ ] **Step 2:** `--dry-run` flag that prints what it would create. Run it first.
- [ ] **Step 3:** Existing `UserItemStatus` / `UserRankedEntry` rows are **left alone** — they keep working via `eventId`. Series-level rating starts with new ratings. Migrating old ratings is out of scope: prod has almost no event ratings and a bad merge is unrecoverable.
- [ ] **Step 4:** Add `-r tsconfig-paths/register` to the npm script (ts-node does not resolve `@/` aliases without it — this bit us in Wave 3).
- [ ] **Step 5:** Gate, commit.

---

## Self-Review

**Spec coverage:** EventSeries ✓ (T2), seriesKey ✓ (T1), occurrence identity + synthesized externalId ✓ (T3), series content ref ✓ (T4), DONE-means-discovered + regulars rail ✓ (T5), isRecurring rename ✓ (T2 S5), backfill ✓ (T6), flag ✓ (T2 S4), unflagged dedup fix ✓ (T3).

**Placeholders:** none — every code step carries its code.

**Type consistency:** `deriveSeriesKey(title, venueName)` used identically in T3 and T6. `resolveExternalId(event, seriesKey)` matches its test. `isSeriesV1Enabled()` matches the flags convention.

**Gap found and closed:** the migration could emit DROP+ADD for the `isRecurring` rename, which would silently zero the 34 permanent-venue rows. T2 S2 now calls this out explicitly with the hand-edit.
