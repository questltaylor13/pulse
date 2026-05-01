# Dedup Follow-Up Audit — 2026-05-01
One-week check on the Today Rail & Home Section Density Fix (PR1, shipped 2026-04-24).

---

## Environment Status

**DATABASE_URL is not set in this CI environment.**

Both diagnostic queries (`scripts/diagnose-today-rail.ts` and the all-events inline query)
exited with:

```
PrismaClientInitializationError: Environment variable not found: DATABASE_URL.
  --> schema.prisma:11
```

Dependencies were installed fresh (`npm install` + `npx prisma generate` both succeeded).
The failure is purely env config — the schema and Prisma client are fine.

**Quest: please run the two queries locally (or in a Vercel preview shell with `DATABASE_URL`
exported) and compare against the thresholds below.**

---

## What the Code Audit Can Confirm

### Scrape-time dedup (lib/scrapers/index.ts)

The `deduplicateEvents()` function shipped in PR1 is intact and correct:

```
key = normalizeTitle(title) | normalizeVenue(venueName) | denverDateKey(startTime)
```

`denverDateKey` uses `America/Denver` local date (not UTC `.slice(0,10)`), which is the
fix for the pre-PR1 late-evening split. On collision, `prioritize()` selects the
higher-priority source per `lib/scrapers/source-priority.ts`.

### Source priority (lib/scrapers/source-priority.ts)

```
do303 > red-rocks > westword > visit-denver > visit-golden >
chautauqua > pikes-peak-center > visit-estes-park >
visit-steamboat-chamber > ticketmaster > eventbrite
```

### Key structural limitation (unchanged since ship)

Scrape-time dedup only fires when two scrapers return the same event **in the same
scrape run**. Pre-existing rows with stable `externalId` values (e.g. the
`red-rocks#...` and `do303#...` twins for Subtronics) are matched by `externalId`
on upsert and **never re-enter the dedup pool**. They can only collapse if one of
the source sites removes the event and the corresponding DB row is archived by the
quality gate.

---

## Diagnostic Script Output

*Could not be captured — DATABASE_URL not available in this environment.*

---

## Decision Framework (to be applied after Quest runs the queries)

| All-events duplicate count | Recommendation |
|---------------------------|----------------|
| **0–2** | Success. Fix held. No cleanup script needed. |
| **> 2** | Residual pre-fix duplicates — recommend `scripts/dedup-existing-events.ts` (see below). |

### Recommended cleanup script if count > 2

`scripts/dedup-existing-events.ts` should:

1. **Find duplicates**: query all active, published events; build the same
   `normalizeTitle|normalizeVenue|denverDateKey` key; group by key; keep only
   groups with ≥ 2 members.

2. **Pick winner**: call `prioritize()` from `lib/scrapers/source-priority.ts`
   pairwise across the group to identify the winning row.

3. **Mark losers archived** (`isArchived = true`) rather than deleting them.
   Archiving is safer: it removes them from all active feeds (the
   `activeEventsWhere()` filter excludes `isArchived: true`) without destroying
   data. A hard delete is irreversible; archiving allows manual recovery if a
   winner was picked incorrectly.

4. **Dry-run by default**: print a summary table of `key → winner_id (source)
   | loser_ids`. Require `--apply` flag to actually mutate the DB.

5. **Log outcome**: print total collapsed, total archived, any errors.

---

## Subtronics Note

The specific Subtronics: Cyclops Rocks VI duplicate (sources `red-rocks` + `do303`,
date `2026-04-24`) should now be outside the active event window — the event date
has passed. However, whether the rows were actually archived or are still sitting as
`isArchived: false` / future `startTime` corrections is unknown without DB access.
The all-events query (step 3) will reveal this if Quest runs it.

---

## Recommendation

**Run locally before deciding.** The dedup code logic is sound. The only open question
is whether pre-fix DB rows (with differing `externalId` per source) have
self-resolved through natural expiry or quality-gate archiving. That answer is
entirely in the DB — this environment cannot reach it.
