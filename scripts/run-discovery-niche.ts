/**
 * Manual runner for the niche sites pipeline (PRD 3 Phase 3).
 *
 * Fetches each enabled site (robots.txt checked first), extracts candidates
 * via the per-site cheerio extractor, and prints a summary. Useful for
 * tuning selectors — zero-candidate sites are flagged in the output.
 *
 * Usage:
 *   npm run discoveries:niche
 *
 * No LLM calls, no DB writes — this pipeline is pure fetch + parse.
 */

import { runNicheSites } from "../lib/discoveries/pipelines/niche-sites";

async function main() {
  console.log("\nRunning niche sites pipeline...\n");
  const result = await runNicheSites();

  console.log("--- Run summary ---");
  console.log(`  runBatchId:  ${result.runBatchId}`);
  console.log(`  candidates:  ${result.candidates.length}`);
  console.log(`  errors:      ${result.errors.length}`);
  console.log(`  durationMs:  ${result.durationMs}`);

  if (result.errors.length) {
    console.log("\n--- Errors / zero-candidate sites ---");
    for (const err of result.errors) console.log(`  ${err}`);
  }

  console.log("\n--- First 8 candidates ---");
  for (const c of result.candidates.slice(0, 8)) {
    console.log(`  [${c.subtype}] ${c.title}`);
    console.log(`    ${c.description.slice(0, 160)}${c.description.length > 160 ? "…" : ""}`);
    console.log(`    town=${c.town_hint ?? "—"}  src=${c.source_urls[0]}`);
    console.log();
  }
}

main().catch((err) => {
  console.error("Pipeline run failed:", err);
  process.exit(1);
});
