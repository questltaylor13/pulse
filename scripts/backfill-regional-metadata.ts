/**
 * PRD 2 (Regional Expansion) Phase 0 — one-shot backfill.
 *
 * Reads Event.neighborhood and Place.neighborhood, looks each up in the
 * static drive-time table, and populates region / townName / isDayTrip /
 * isWeekendTrip / driveTimeFromDenver / driveNote on matching rows.
 *
 * Idempotent — safe to run repeatedly. Skips rows that already have
 * `region != DENVER_METRO` unless `FORCE=1` is set (used after editing
 * the drive-time table).
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' \
 *     -r tsconfig-paths/register scripts/backfill-regional-metadata.ts
 *
 *   FORCE=1 ...same command...   # overwrite existing non-Denver classifications
 */
import { PrismaClient } from "@prisma/client";
import { deriveRegionalFields } from "../lib/regional/metadata";

const prisma = new PrismaClient();
const FORCE = process.env.FORCE === "1";

interface Transition {
  beforeRegion: string;
  afterRegion: string;
  count: number;
}

async function backfillEvents(): Promise<void> {
  console.log("\n== Events ==");

  const where = FORCE
    ? { neighborhood: { not: null } }
    : { neighborhood: { not: null }, region: "DENVER_METRO" as const };

  const rows = await prisma.event.findMany({
    where,
    select: { id: true, neighborhood: true, region: true },
  });
  console.log(`  candidates with non-null neighborhood: ${rows.length}`);

  const transitions = new Map<string, number>();
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const fields = deriveRegionalFields(row.neighborhood);
    if (fields.region === "DENVER_METRO") {
      // No match in the drive-time table; skip — row stays classified as Denver.
      unchanged++;
      continue;
    }
    await prisma.event.update({
      where: { id: row.id },
      data: fields,
    });
    const key = `${row.region} → ${fields.region}`;
    transitions.set(key, (transitions.get(key) ?? 0) + 1);
    updated++;
  }

  console.log(`  updated: ${updated}, unchanged: ${unchanged}`);
  if (transitions.size > 0) {
    console.log("  transitions:");
    for (const [k, v] of [...transitions.entries()].sort()) {
      console.log(`    ${k}: ${v}`);
    }
  }
}

async function backfillPlaces(): Promise<void> {
  console.log("\n== Places ==");

  const where = FORCE
    ? { neighborhood: { not: null } }
    : { neighborhood: { not: null }, region: "DENVER_METRO" as const };

  const rows = await prisma.place.findMany({
    where,
    select: { id: true, neighborhood: true, region: true },
  });
  console.log(`  candidates with non-null neighborhood: ${rows.length}`);

  const transitions = new Map<string, number>();
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const fields = deriveRegionalFields(row.neighborhood);
    if (fields.region === "DENVER_METRO") {
      unchanged++;
      continue;
    }
    // Place has the same fields as Event minus worthTheDriveScore.
    await prisma.place.update({
      where: { id: row.id },
      data: {
        region: fields.region,
        townName: fields.townName,
        isDayTrip: fields.isDayTrip,
        isWeekendTrip: fields.isWeekendTrip,
        driveTimeFromDenver: fields.driveTimeFromDenver,
        driveNote: fields.driveNote,
      },
    });
    const key = `${row.region} → ${fields.region}`;
    transitions.set(key, (transitions.get(key) ?? 0) + 1);
    updated++;
  }

  console.log(`  updated: ${updated}, unchanged: ${unchanged}`);
  if (transitions.size > 0) {
    console.log("  transitions:");
    for (const [k, v] of [...transitions.entries()].sort()) {
      console.log(`    ${k}: ${v}`);
    }
  }
}

async function postRunSummary(): Promise<void> {
  console.log("\n== Post-run region distribution ==");
  const [eventRegions, placeRegions] = await Promise.all([
    prisma.event.groupBy({ by: ["region"], _count: true }),
    prisma.place.groupBy({ by: ["region"], _count: true }),
  ]);

  console.log("  Events by region:");
  for (const g of eventRegions.sort((a, b) => a.region.localeCompare(b.region))) {
    console.log(`    ${g.region}: ${(g._count as unknown as number) ?? 0}`);
  }
  console.log("  Places by region:");
  for (const g of placeRegions.sort((a, b) => a.region.localeCompare(b.region))) {
    console.log(`    ${g.region}: ${(g._count as unknown as number) ?? 0}`);
  }
}

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || "";
  let host = "unknown";
  try {
    host = new URL(dbUrl).host;
  } catch {
    // leave as 'unknown'
  }
  console.log("=== Regional metadata backfill (PRD 2 Phase 0) ===");
  console.log(`DB host: ${host}`);
  console.log(`Mode: ${FORCE ? "FORCE (overwrite non-Denver rows)" : "normal (only rows still DENVER_METRO)"}`);

  await backfillEvents();
  await backfillPlaces();
  await postRunSummary();
  console.log("\n✓ Backfill complete.");
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
