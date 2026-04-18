/**
 * Dry-run probe for the Phase 1 regional scrapers. Read-only; no DB writes.
 */
import { scrapeChautauqua } from "../lib/scrapers/regional/chautauqua";
import { scrapePikesPeakCenter } from "../lib/scrapers/regional/pikes-peak-center";
import type { Scraper } from "../lib/scrapers/types";

async function probe(name: string, fn: Scraper) {
  const t0 = Date.now();
  const result = await fn();
  const ms = Date.now() - t0;
  console.log(`\n=== ${name} (${ms}ms) ===`);
  console.log(`Raw events: ${result.events.length}`);
  console.log(`Errors: ${result.errors.length ? result.errors.join(" | ") : "(none)"}`);
  for (const e of result.events.slice(0, 5)) {
    console.log(
      `  ${e.startTime.toISOString().slice(0, 16)} | ${e.title.slice(0, 55).padEnd(55)} | ${e.category} | ${e.neighborhood ?? "-"}`
    );
  }
}

async function main() {
  await probe("chautauqua", scrapeChautauqua);
  await probe("pikes-peak-center", scrapePikesPeakCenter);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
