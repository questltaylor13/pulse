/**
 * Manual runner for the full Discovery orchestrator (PRD 3 Phases 4 + 6).
 *
 * Runs all three pipelines, pushes candidates through classifier +
 * enrichment + verification + dedup, and upserts into Discovery. Writes
 * DiscoveryRun rows for the admin dashboard.
 *
 * Usage:
 *   npm run discoveries:orchestrate                 # full run
 *   npm run discoveries:orchestrate -- --reddit=3   # cap Reddit per-sub
 *   npm run discoveries:orchestrate -- --sources=LLM_RESEARCH,NICHE_SITE
 *
 * Env required:
 *   OPENAI_API_KEY
 *   GOOGLE_PLACES_API_KEY (optional — candidates without it land UNVERIFIED)
 *   DATABASE_URL
 */

import { runOrchestrator } from "../lib/discoveries/orchestrator";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const out: {
    redditMaxPostsPerSub?: number;
    enabledSources?: Array<"LLM_RESEARCH" | "REDDIT" | "NICHE_SITE">;
  } = {};
  for (const a of argv) {
    const redditMatch = a.match(/^--reddit=(\d+)$/);
    if (redditMatch) out.redditMaxPostsPerSub = Number(redditMatch[1]);
    const sourcesMatch = a.match(/^--sources=(.+)$/);
    if (sourcesMatch) {
      out.enabledSources = sourcesMatch[1]
        .split(",")
        .filter((s) =>
          ["LLM_RESEARCH", "REDDIT", "NICHE_SITE"].includes(s)
        ) as Array<"LLM_RESEARCH" | "REDDIT" | "NICHE_SITE">;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log("\nRunning full Discovery orchestrator...");
  if (args.enabledSources)
    console.log(`Sources:       ${args.enabledSources.join(", ")}`);
  if (args.redditMaxPostsPerSub)
    console.log(`Reddit cap:    ${args.redditMaxPostsPerSub} posts/sub`);
  console.log();

  const result = await runOrchestrator(args);

  console.log("\n=== Run summary ===");
  console.log(`  runBatchId:      ${result.runBatchId}`);
  console.log(`  totalUpserted:   ${result.totalUpserted}`);
  console.log(`  totalUpdated:    ${result.totalUpdated}`);
  console.log(`  durationMs:      ${result.durationMs}`);

  console.log("\n=== Per-pipeline ===");
  for (const [src, stats] of Object.entries(result.perPipeline)) {
    if (!stats) continue;
    console.log(`\n  ${src}`);
    console.log(`    raw:               ${stats.rawCandidateCount}`);
    console.log(`    rejected as event: ${stats.rejectedAsEventCount}`);
    console.log(`    dropped (quality): ${stats.droppedForQualityCount}`);
    console.log(`    unverified:        ${stats.unverifiedCount}`);
    console.log(`    upserted (new):    ${stats.upsertedCount}`);
    console.log(`    updated existing:  ${stats.updatedExistingCount}`);
    console.log(`    errors:            ${stats.errorCount}`);
    if (stats.errors.length > 0) {
      console.log(`    first errors:`);
      for (const err of stats.errors.slice(0, 5))
        console.log(`      ${err}`);
    }
  }

  // Final DB counts
  const [active, unverified, archived] = await Promise.all([
    prisma.discovery.count({ where: { status: "ACTIVE" } }),
    prisma.discovery.count({ where: { status: "UNVERIFIED" } }),
    prisma.discovery.count({ where: { status: "ARCHIVED" } }),
  ]);
  console.log("\n=== DB state ===");
  console.log(`  ACTIVE:      ${active}`);
  console.log(`  UNVERIFIED:  ${unverified}`);
  console.log(`  ARCHIVED:    ${archived}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Orchestrator run failed:", err);
    prisma.$disconnect();
    process.exit(1);
  });
