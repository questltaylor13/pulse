/**
 * Mountain-events LLM research runner (PRD 2 Phase 3.2).
 *
 * One-off CLI wrapper around lib/llm-research/mountain-events.ts. Uses
 * OpenAI's Responses API with the built-in web_search tool to find
 * upcoming festivals/races/seasonal events in Colorado mountain towns,
 * then upserts the verified ones into the DB.
 *
 * Cost: roughly $0.30–$1.50 per run depending on web-search breadth
 * and model pricing.
 *
 * Usage:
 *   OPENAI_API_KEY=... npx ts-node --compiler-options '{"module":"CommonJS"}' \
 *     -r tsconfig-paths/register scripts/research-mountain-events.ts
 *
 *   # Dry run (research only, no DB writes):
 *   DRY_RUN=1 ...
 */
import { PrismaClient } from "@prisma/client";
import {
  ingestResearchedEvents,
  researchMountainEvents,
} from "../lib/llm-research/mountain-events";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not set. Aborting.");
    process.exit(1);
  }

  console.log("=== Mountain Events LLM Research ===");
  console.log(`Mode: ${DRY_RUN ? "dry-run (no DB writes)" : "live (will upsert)"}`);
  console.log("Calling OpenAI Responses API with web search...");

  const t0 = Date.now();
  const candidates = await researchMountainEvents();
  const elapsed = Date.now() - t0;
  console.log(`\nGot ${candidates.length} candidates in ${elapsed}ms.\n`);

  for (const c of candidates.slice(0, 20)) {
    console.log(
      `  ${c.startDate} | ${c.title.slice(0, 45).padEnd(45)} | ${c.town.padEnd(18)} | ${c.category}`
    );
    console.log(`      ${c.sourceUrl}`);
  }

  if (DRY_RUN) {
    console.log("\nDRY_RUN=1 — skipping DB writes.");
    return;
  }

  console.log("\nUpserting into DB...");
  const result = await ingestResearchedEvents(prisma, candidates);
  console.log(
    `  inserted=${result.inserted} updated=${result.updated} skipped=${result.skipped} errors=${result.errors.length}`
  );
  if (result.errors.length) {
    console.log("  errors:");
    for (const e of result.errors) console.log(`    - ${e}`);
  }
}

main()
  .catch((e) => {
    console.error("Research failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
