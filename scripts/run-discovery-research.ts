/**
 * Manual runner for the LLM research pipeline (PRD 3 Phase 1).
 *
 * Use this for local testing and prompt tuning — hits Claude with the same
 * prompts the weekly cron will, but runs locally and prints summary + first
 * few candidates so you can eyeball the output before a full commit.
 *
 * Usage:
 *   npm run discoveries:research
 *
 * Env required:
 *   OPENAI_API_KEY
 *   DATABASE_URL (to persist the LLMResearchRun debug rows)
 */

import { runLLMResearch } from "../lib/discoveries/pipelines/llm-research";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\nRunning LLM research pipeline...");
  console.log("Model:", process.env.DISCOVERIES_OPENAI_MODEL || "gpt-5.4-mini");
  console.log();

  const result = await runLLMResearch();

  console.log("\n--- Run summary ---");
  console.log(`  runBatchId:  ${result.runBatchId}`);
  console.log(`  candidates:  ${result.rawCount}`);
  console.log(`  errors:      ${result.errors.length}`);
  console.log(`  durationMs:  ${result.durationMs}`);

  if (result.errors.length) {
    console.log("\n--- Errors ---");
    for (const err of result.errors) console.log(`  ${err}`);
  }

  console.log("\n--- First 5 candidates ---");
  for (const c of result.candidates.slice(0, 5)) {
    console.log(`  [${c.subtype}] ${c.title}`);
    console.log(`    ${c.description}`);
    console.log(`    town=${c.town_hint ?? "—"}  urls=${c.source_urls.length}`);
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
