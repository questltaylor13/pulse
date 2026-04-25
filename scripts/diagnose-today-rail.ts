/**
 * PR 1 — Today Rail & Home Section Density Diagnostic.
 *
 * Reproduces the 04-24 audit that found 43 DB events for today but only 10
 * surfacing in the home Today rail. Prints the ladder:
 *
 *   eventsInDb
 *     >= eventsAfterActiveWhere   (archived / unpublished removed)
 *     >= eventsAfterTodayWindow   (now..endOfTodayDenver)
 *     >= eventsAfterDedup         (simulated scrape-time dedup rerun)
 *     >= eventsSurfaced           (final take: 25 slice)
 *
 * Any unexpected gap in the ladder points at the next layer to inspect.
 *
 * Usage:
 *   npx tsx scripts/diagnose-today-rail.ts
 */
import { PrismaClient } from "@prisma/client";
import { activeEventsWhere, endOfTodayLocal } from "../lib/queries/events";
import { denverDateKey } from "../lib/time/denver";
import { prioritize } from "../lib/scrapers/source-priority";

const prisma = new PrismaClient();
const HOME_CAP = 25;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/^(presents?:\s*|live:\s*)/i, "")
    .replace(/\s+/g, " ");
}

function normalizeVenue(venue: string | null): string {
  if (!venue) return "";
  return venue
    .toLowerCase()
    .trim()
    .replace(/\b(at|the|and|amphitheatre|amphitheater|theater|theatre|ballroom|auditorium|hall|club|live|room|park)\b/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main(): Promise<void> {
  const now = new Date();
  const eodToday = endOfTodayLocal(now);

  console.log("== Today Rail Density Diagnostic ==");
  console.log(`now                      : ${now.toISOString()}`);
  console.log(`endOfTodayDenver         : ${eodToday.toISOString()}`);
  console.log(`today (Denver key)       : ${denverDateKey(now)}`);
  console.log();

  const eventsInDb = await prisma.event.count();
  const eventsAfterActiveWhere = await prisma.event.count({
    where: activeEventsWhere(now),
  });
  const todayRows = await prisma.event.findMany({
    where: {
      AND: [activeEventsWhere(now), { startTime: { gte: now, lte: eodToday } }],
    },
    select: {
      id: true,
      title: true,
      venueName: true,
      startTime: true,
      source: true,
      imageUrl: true,
      priceRange: true,
      description: true,
    },
    orderBy: { startTime: "asc" },
  });

  // Simulate the scrape-time dedup collapse against today's rows only.
  const seen = new Map<string, (typeof todayRows)[number]>();
  for (const row of todayRows) {
    const key = `${normalizeTitle(row.title)}|${normalizeVenue(row.venueName)}|${denverDateKey(row.startTime)}`;
    const existing = seen.get(key);
    if (!existing) seen.set(key, row);
    else seen.set(key, prioritize(existing, row));
  }
  const dedupedCount = seen.size;
  const droppedDuplicates = todayRows.length - dedupedCount;

  console.log(`eventsInDb               : ${eventsInDb}`);
  console.log(`eventsAfterActiveWhere   : ${eventsAfterActiveWhere}`);
  console.log(`eventsAfterTodayWindow   : ${todayRows.length}`);
  console.log(`eventsAfterDedup         : ${dedupedCount}   (collapsed ${droppedDuplicates})`);
  console.log(`eventsSurfaced           : ${Math.min(dedupedCount, HOME_CAP)}`);
  console.log();

  if (droppedDuplicates > 0) {
    console.log("-- Duplicates still in DB (would collapse on next scrape) --");
    const byKey = new Map<string, string[]>();
    for (const row of todayRows) {
      const key = `${normalizeTitle(row.title)}|${normalizeVenue(row.venueName)}|${denverDateKey(row.startTime)}`;
      const tag = `${row.source}#${row.id}`;
      byKey.set(key, [...(byKey.get(key) ?? []), tag]);
    }
    for (const [key, tags] of byKey) {
      if (tags.length > 1) console.log(`  ${key}  ->  ${tags.join(" | ")}`);
    }
    console.log();
  }

  if (dedupedCount > HOME_CAP) {
    const overflow = dedupedCount - HOME_CAP;
    console.log(`"See all" link will be visible (overflow: ${overflow} more events beyond the cap).`);
  } else {
    console.log(`"See all" link will be hidden (count <= cap).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
