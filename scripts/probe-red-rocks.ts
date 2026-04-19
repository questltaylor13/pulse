/**
 * Dry-run probe for the Red Rocks scraper. Reads only; no DB writes.
 * Usage: ts-node scripts/probe-red-rocks.ts
 */
import { scrapeRedRocks } from "../lib/scrapers/red-rocks";

async function main() {
  const t0 = Date.now();
  const result = await scrapeRedRocks();
  const ms = Date.now() - t0;

  console.log(`\n=== Red Rocks probe (${ms}ms) ===`);
  console.log(`Source: ${result.source}`);
  console.log(`Raw events: ${result.events.length}`);
  console.log(`Errors: ${result.errors.length ? result.errors.join(" | ") : "(none)"}`);
  console.log("");

  const sample = result.events.slice(0, 10);
  for (const e of sample) {
    console.log(
      `  - ${e.startTime.toISOString().slice(0, 16)} | ${e.title.slice(0, 50).padEnd(50)} | ${e.category} | ${e.sourceUrl ?? "-"}`
    );
  }

  // Sanity stats
  const titles = new Set(result.events.map((e) => e.title.toLowerCase()));
  console.log(`\nUnique titles: ${titles.size} / ${result.events.length}`);
  const monthBuckets = new Map<string, number>();
  for (const e of result.events) {
    const key = e.startTime.toISOString().slice(0, 7);
    monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
  }
  console.log("\nEvents per month:");
  for (const [k, v] of [...monthBuckets.entries()].sort()) {
    console.log(`  ${k}: ${v}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
