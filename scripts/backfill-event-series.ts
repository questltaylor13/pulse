/**
 * Wave 6A — backfill occurrence identity + EventSeries onto existing events.
 *
 * MUST RUN BEFORE THE FIRST POST-DEPLOY SCRAPE. Three things depend on it, and
 * the third is a data-loss hazard:
 *
 *  1. seriesKey — derived per row, so recurrence can be detected across nights.
 *  2. occurrenceDate — the migration backfills this in SQL; this re-derives it in
 *     TS as a belt-and-braces check that the two agree.
 *  3. externalId on legacy NULL rows. THIS IS THE HAZARD. Ingest now synthesizes a
 *     non-null externalId (`syn_…`), so on the first scrape a legacy row with
 *     externalId = NULL will not be matched, and a SECOND row is inserted beside
 *     it. The old row is not archived (its startTime is unchanged and still
 *     future), so both sit in the feed, and any rating on the old one is stranded.
 *     Red Rocks is the largest source in prod and its permalink-less cards are
 *     exactly these rows.
 *
 * Order matters: adopt the NULL rows FIRST (collapsing any existing duplicate
 * groups, keeping the oldest), THEN set the synthesized ids — doing it the other
 * way round hits the unique constraint, because the duplicates all map to the same
 * (source, syn_id, occurrenceDate) triple.
 *
 * Idempotent and re-runnable: everything is derived, so a second run is a no-op.
 * That matters because seriesKey comes from title + venue — a source reformatting
 * its titles WILL split a series eventually, and re-running is the repair.
 *
 * Deliberately does NOT migrate existing UserItemStatus / UserRankedEntry rows
 * onto the new series. They keep working via eventId; series-level rating starts
 * with new ratings. Prod has almost no event ratings, and a bad merge of someone's
 * taste history is unrecoverable.
 *
 * Usage:
 *   npm run series:backfill -- --dry-run
 *   npm run series:backfill
 */

import { prisma } from "../lib/prisma";
import { deriveSeriesKey } from "../lib/series/key";
import { occurrenceIdentity } from "../lib/series/occurrence";
import { isRecurringSeries } from "../lib/series/detect";
import { denverDateKey } from "../lib/time/denver";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(DRY_RUN ? "DRY RUN — no writes\n" : "Backfilling event identity + series\n");

  const events = await prisma.event.findMany({
    select: {
      id: true,
      cityId: true,
      title: true,
      venueName: true,
      category: true,
      startTime: true,
      source: true,
      externalId: true,
      seriesId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" }, // oldest first — the survivor of a dupe group
  });
  console.log(`${events.length} events scanned\n`);

  // --- 1. Adopt legacy NULL-externalId rows -------------------------------
  //
  // Collapse duplicate groups first: rows that will all synthesize to the SAME
  // (source, syn_id, occurrenceDate) must be reduced to one, or setting the id
  // violates the unique index.
  const nullId = events.filter((e) => !e.externalId);
  console.log(`${nullId.length} events with NULL externalId (legacy duplicates live here)`);

  const byIdentity = new Map<string, typeof nullId>();
  for (const e of nullId) {
    const id = occurrenceIdentity(e);
    const k = `${id.source}|${id.externalId}|${id.occurrenceDate.toISOString()}`;
    byIdentity.set(k, [...(byIdentity.get(k) ?? []), e]);
  }

  let collapsed = 0;
  let adopted = 0;
  for (const [, group] of byIdentity) {
    const [survivor, ...dupes] = group; // oldest first, per the orderBy
    if (dupes.length > 0) {
      console.log(
        `  collapsing ${dupes.length} duplicate(s) of "${survivor.title}" @ ${survivor.venueName}`
      );
      if (!DRY_RUN) {
        // Archive rather than delete: the dupes may carry ratings, and deleting
        // them would SetNull those FKs and silently destroy someone's history.
        await prisma.event.updateMany({
          where: { id: { in: dupes.map((d) => d.id) } },
          data: { isArchived: true },
        });
      }
      collapsed += dupes.length;
    }
    if (!DRY_RUN) {
      const id = occurrenceIdentity(survivor);
      await prisma.event.update({
        where: { id: survivor.id },
        data: { externalId: id.externalId, occurrenceDate: id.occurrenceDate },
      });
    }
    adopted++;
  }
  console.log(`  ${adopted} adopted, ${collapsed} duplicates archived\n`);

  // --- 2. seriesKey + occurrenceDate on every row -------------------------
  let keyed = 0;
  for (const e of events) {
    if (DRY_RUN) continue;
    const id = occurrenceIdentity(e);
    await prisma.event.update({
      where: { id: e.id },
      data: {
        seriesKey: deriveSeriesKey(e.title, e.venueName),
        occurrenceDate: id.occurrenceDate,
      },
    });
    keyed++;
  }
  console.log(`${DRY_RUN ? events.length : keyed} events keyed\n`);

  // --- 3. Assert series where the DATA shows a rhythm ----------------------
  //
  // Not bare repetition: a two-night Red Rocks run is the same title at the same
  // venue on two dates, and asserting a series there would park a rock show on the
  // "On again this week" rail. See lib/series/detect.ts.
  const groups = new Map<
    string,
    { events: typeof events; days: Set<string> }
  >();
  for (const e of events) {
    const key = deriveSeriesKey(e.title, e.venueName);
    const g = groups.get(key) ?? { events: [], days: new Set<string>() };
    g.events.push(e);
    g.days.add(denverDateKey(e.startTime));
    groups.set(key, g);
  }

  const recurring = [...groups.entries()].filter(([, g]) =>
    isRecurringSeries(g.days, null)
  );
  console.log(`${recurring.length} series detected (recurrence rhythm, not bare repetition)\n`);

  let created = 0;
  let linked = 0;
  for (const [seriesKey, g] of recurring) {
    // Canonical fields from the most recent occurrence: titles drift, and the
    // newest is the best guess at the current name.
    const newest = g.events[g.events.length - 1];
    const days = [...g.days].sort();
    console.log(
      `  ${seriesKey}  (${g.events.length} occurrences over ${g.days.size} days: ${days[0]} … ${days[days.length - 1]})`
    );
    if (DRY_RUN) continue;

    const series = await prisma.eventSeries.upsert({
      where: { seriesKey },
      update: {
        title: newest.title,
        venueName: newest.venueName,
        category: newest.category,
      },
      create: {
        seriesKey,
        cityId: newest.cityId,
        title: newest.title,
        venueName: newest.venueName,
        category: newest.category,
      },
      select: { id: true, createdAt: true, updatedAt: true },
    });
    if (series.createdAt.getTime() === series.updatedAt.getTime()) created++;

    const res = await prisma.event.updateMany({
      where: { id: { in: g.events.map((e) => e.id) } },
      data: { seriesId: series.id },
    });
    linked += res.count;
  }

  console.log(
    DRY_RUN
      ? `\nDRY RUN. Would adopt ${adopted} rows, archive ${collapsed} duplicates, key ${events.length}, and create/update ${recurring.length} series.`
      : `\n${created} series created, ${linked} occurrences linked.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
