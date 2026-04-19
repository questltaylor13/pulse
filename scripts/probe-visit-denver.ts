import { scrapeVisitDenver } from "../lib/scrapers/visit-denver";

async function main() {
  const t0 = Date.now();
  const result = await scrapeVisitDenver();
  const ms = Date.now() - t0;
  console.log(`\n=== Visit Denver probe (${ms}ms) ===`);
  console.log(`Raw events: ${result.events.length}`);
  console.log(`Errors: ${result.errors.length ? result.errors.join(" | ") : "(none)"}`);
  console.log("");

  const byCat = new Map<string, number>();
  for (const e of result.events) byCat.set(e.category, (byCat.get(e.category) ?? 0) + 1);
  console.log("By category:");
  for (const [k, v] of [...byCat.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }

  console.log("\nFirst 10 events:");
  for (const e of result.events.slice(0, 10)) {
    console.log(
      `  - ${e.startTime.toISOString().slice(0, 10)} | ${e.title.slice(0, 55).padEnd(55)} | ${e.category} | ${e.sourceUrl?.slice(0, 70)}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
