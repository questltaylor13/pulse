/**
 * Backfill Event.lat/lng by geocoding distinct scraped venue names (Wave 3).
 * This is what lights up the events map and enables the venue-match geo path;
 * the scraper pipeline never set coordinates, so the whole scraped corpus is
 * coordinate-less.
 *
 * Cache-first + negative-caching + one API call per distinct venue name — see
 * lib/geocode.ts. Idempotent + re-runnable; only touches events without coords.
 *
 * Owner action: the Geocoding API must be enabled on GOOGLE_PLACES_API_KEY's
 * Google Cloud project (a separate library from Places) or every call returns
 * REQUEST_DENIED (not cached, so a re-run after enabling succeeds).
 *
 * Usage: npm run events:backfill-geocodes
 */

import { PrismaClient } from "@prisma/client";
import { geocodeEvents } from "../lib/geocode";

const prisma = new PrismaClient();

async function main() {
  console.log("\nGeocoding upcoming events by distinct venue name...\n");
  // No timeBudget cap here (unlike the cron) — the backlog is small (~40 names)
  // and this runs off the serverless clock.
  const result = await geocodeEvents(prisma, undefined, { timeBudgetMs: 10 * 60 * 1000 });
  console.log("--- Results ---");
  console.log(`  Scanned (upcoming events w/o coords): ${result.scanned}`);
  console.log(`  Distinct venue names geocoded:        ${result.distinctNames}`);
  console.log(`  Events given coordinates:             ${result.geocoded}`);
  console.log(`  Names that failed to geocode:         ${result.failed}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Geocode backfill failed:", err);
    prisma.$disconnect();
    process.exitCode = 1;
  });
