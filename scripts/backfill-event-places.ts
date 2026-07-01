/**
 * Backfill Event.placeId by matching scraped event venue names to curated
 * Places (Wave 2). This is what makes the place-detail "Upcoming Events" block
 * and the "Live tonight" badge work — the scraper pipeline never set placeId,
 * so the whole scraped corpus is unlinked.
 *
 * Name-match only (scraped events have no coordinates), high-precision — see
 * lib/scrapers/venue-match.ts. Idempotent + re-runnable; never touches events
 * already linked (e.g. by the curator UI).
 *
 * Usage: npm run events:backfill-places
 */

import { PrismaClient } from "@prisma/client";
import { backfillEventPlaces } from "../lib/scrapers/venue-match";

const prisma = new PrismaClient();

async function main() {
  console.log("\nMatching upcoming events to places by venue name...\n");
  const result = await backfillEventPlaces(prisma);
  console.log("--- Results ---");
  console.log(`  Scanned (unlinked upcoming events): ${result.scanned}`);
  console.log(`  Matched to a place:                 ${result.matched}`);
  console.log(`  Newly linked (Event.placeId set):   ${result.updated}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Backfill failed:", err);
    prisma.$disconnect();
    process.exitCode = 1;
  });
