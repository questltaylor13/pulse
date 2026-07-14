/**
 * Wave 6A — backfill EventSeries from existing events.
 *
 * Idempotent and re-runnable: series are upserted by seriesKey, and an event's
 * seriesId is set from the same derivation every time. Safe to run repeatedly,
 * which matters because seriesKey is derived from title + venue — a source that
 * reformats its titles will split a series, and re-running is the repair.
 *
 * A series is asserted only where the DATA shows recurrence: ≥2 occurrences of
 * the same seriesKey on DIFFERENT Denver days. A single event is not a series,
 * however weekly its title sounds — "Trivia Night" once is indistinguishable
 * from a one-off pub quiz.
 *
 * Deliberately does NOT migrate existing UserItemStatus / UserRankedEntry rows
 * onto the new series. They keep working via eventId; series-level rating starts
 * with new ratings. Prod has almost no event ratings, and a bad merge of
 * someone's taste history is unrecoverable.
 *
 * Usage:
 *   npm run series:backfill -- --dry-run
 *   npm run series:backfill
 */

import { prisma } from "../lib/prisma";
import { deriveSeriesKey } from "../lib/series/key";
import { denverDateKey } from "../lib/time/denver";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(DRY_RUN ? "DRY RUN — no writes\n" : "Backfilling EventSeries\n");

  const events = await prisma.event.findMany({
    select: {
      id: true,
      cityId: true,
      title: true,
      venueName: true,
      category: true,
      startTime: true,
      seriesId: true,
    },
    orderBy: { startTime: "asc" },
  });
  console.log(`${events.length} events scanned`);

  // Group by derived key, tracking DISTINCT Denver days — two rows on the same
  // night are a cross-source duplicate, not evidence of recurrence.
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

  const recurring = [...groups.entries()].filter(([, g]) => g.days.size >= 2);
  console.log(`${recurring.length} series detected (>=2 distinct days)\n`);

  let created = 0;
  let linked = 0;

  for (const [seriesKey, g] of recurring) {
    // Canonical fields come from the most recent occurrence: titles drift as
    // sources reformat, and the newest is the best guess at the current name.
    const newest = g.events[g.events.length - 1];
    console.log(
      `  ${seriesKey}  (${g.events.length} occurrences, ${g.days.size} days)  "${newest.title}" @ ${newest.venueName}`
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
      ? `\nWould create/update ${recurring.length} series and link their occurrences.`
      : `\n${created} series created, ${linked} occurrences linked.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
