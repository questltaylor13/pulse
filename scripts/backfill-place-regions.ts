/**
 * Backfill Place.region fields from address. Events got this during PRD 2
 * Phase 0; the Place equivalent never ran, so the whole corpus is
 * DENVER_METRO. That's why the home-feed Near / All toggle is invisible
 * on the Places tab.
 *
 * Strategy: parse ", <Town>, CO" out of the address, feed to
 * deriveRegionalFields(), update if anything drifted. Idempotent.
 *
 * Usage: npm run places:backfill-regions
 */

import { PrismaClient } from "@prisma/client";
import { deriveRegionalFields } from "../lib/regional/metadata";

const prisma = new PrismaClient();

function extractTown(address: string | null | undefined): string | null {
  if (!address) return null;
  const re = /,\s*([A-Za-z][A-Za-z .'\-]+?)\s*,\s*CO\b/g;
  let match: RegExpExecArray | null;
  let last: string | null = null;
  while ((match = re.exec(address)) !== null) last = match[1].trim();
  return last;
}

async function main() {
  const places = await prisma.place.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      region: true,
      townName: true,
      driveTimeFromDenver: true,
    },
  });

  console.log(`\nScanning ${places.length} places...\n`);

  let updated = 0;
  let unchanged = 0;
  let noTown = 0;
  const regionTally: Record<string, number> = {};

  for (const place of places) {
    const town = extractTown(place.address);
    if (!town) {
      noTown++;
      continue;
    }
    const fields = deriveRegionalFields(town);
    regionTally[fields.region] = (regionTally[fields.region] ?? 0) + 1;

    const drift =
      fields.region !== place.region ||
      fields.townName !== place.townName ||
      fields.driveTimeFromDenver !== place.driveTimeFromDenver;

    if (!drift) {
      unchanged++;
      continue;
    }

    await prisma.place.update({
      where: { id: place.id },
      data: {
        region: fields.region,
        townName: fields.townName,
        isDayTrip: fields.isDayTrip,
        isWeekendTrip: fields.isWeekendTrip,
        driveTimeFromDenver: fields.driveTimeFromDenver,
        driveNote: fields.driveNote,
      },
    });
    updated++;
  }

  console.log("--- Results ---");
  console.log(`  Updated:   ${updated}`);
  console.log(`  Unchanged: ${unchanged}`);
  console.log(`  No-town:   ${noTown}`);
  console.log("\n--- Region tally (parseable towns only) ---");
  for (const [region, n] of Object.entries(regionTally)) {
    console.log(`  ${region}: ${n}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Backfill failed:", err);
    prisma.$disconnect();
  });
