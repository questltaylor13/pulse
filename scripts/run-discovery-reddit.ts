/**
 * Manual runner for the Reddit mining pipeline (PRD 3 Phase 2).
 *
 * Hits Reddit's public JSON endpoints (1 req/sec), extracts Discovery
 * candidates from each qualifying post via OpenAI, and persists per-post
 * debug rows to LLMResearchRun.
 *
 * Usage:
 *   npm run discoveries:reddit                  # full run
 *   npm run discoveries:reddit -- --max=3       # cap posts/sub for smoke test
 *
 * Env required:
 *   OPENAI_API_KEY
 *   DATABASE_URL
 */

import { runRedditMining } from "../lib/discoveries/pipelines/reddit";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseMaxArg(argv: string[]): number | undefined {
  for (const a of argv) {
    const m = a.match(/^--max=(\d+)$/);
    if (m) return Number(m[1]);
  }
  return undefined;
}

async function main() {
  const maxPostsPerSub = parseMaxArg(process.argv.slice(2));
  console.log("\nRunning Reddit mining pipeline...");
  console.log("Model:", process.env.DISCOVERIES_OPENAI_MODEL || "gpt-5.4-mini");
  if (maxPostsPerSub) console.log(`Cap per subreddit: ${maxPostsPerSub} posts`);
  console.log();

  const result = await runRedditMining({ maxPostsPerSub });

  console.log("\n--- Run summary ---");
  console.log(`  runBatchId:  ${result.runBatchId}`);
  console.log(`  rawCount:    ${result.rawCount}`);
  console.log(`  merged:      ${result.candidates.length}`);
  console.log(`  dropped:     ${result.droppedCount}`);
  console.log(`  errors:      ${result.errors.length}`);
  console.log(`  durationMs:  ${result.durationMs}`);

  if (result.errors.length) {
    console.log("\n--- First 10 errors ---");
    for (const err of result.errors.slice(0, 10)) console.log(`  ${err}`);
  }

  console.log("\n--- First 5 candidates ---");
  for (const c of result.candidates.slice(0, 5)) {
    console.log(`  [${c.subtype}] ${c.title}`);
    console.log(`    ${c.description}`);
    const ctx = c.sourceContext ?? {};
    console.log(
      `    sub=r/${ctx.subreddit ?? "?"}  ups=${ctx.postUpvotes ?? "?"}  town=${c.town_hint ?? "—"}`
    );
    console.log();
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Pipeline run failed:", err);
    prisma.$disconnect();
    process.exit(1);
  });
