/**
 * AI Enrichment CLI for Places.
 *
 * The logic lives in lib/enrich-place.ts (shared with the weekly cron at
 * /api/cron/enrich-places). This file is just argument parsing.
 *
 * Usage:
 *   npm run places:enrich                          # describe+tag places that have never been enriched
 *   npm run places:enrich -- --attributes-only     # Wave 6B backfill: derive ONLY the 5 situational booleans
 *   npm run places:enrich -- --dry-run
 *   npm run places:enrich -- --limit=10 --category=bar
 *   npm run places:enrich -- --force               # ignore the idempotence gate
 *
 * --attributes-only is the mode to run once over the corpus after the Wave 6B
 * deploy. It leaves every existing pulseDescription and tag untouched — a bare
 * --force would regenerate all of them, and those are live.
 *
 * Environment: OPENAI_API_KEY, DATABASE_URL.
 */

import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { runEnrichment, type EnrichRunOptions } from "@/lib/enrich-place";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const KNOWN_FLAGS = ["--attributes-only", "--dry-run", "--force"];
const KNOWN_OPTIONS = ["--limit", "--category"];

function parseArgs(): EnrichRunOptions {
  const args = process.argv.slice(2);

  // Unknown args are a HARD ERROR, not a shrug.
  //
  // They used to be silently ignored, which put the footgun directly under the
  // one command that must never misfire: `--attributes --force` (a plausible
  // typo for --attributes-only) parsed as mode "full" + force, which regenerates
  // every pulseDescription in the corpus. Those are live. The mode exists
  // precisely to not do that.
  for (const arg of args) {
    const name = arg.split("=")[0];
    if (!KNOWN_FLAGS.includes(name) && !KNOWN_OPTIONS.includes(name)) {
      console.error(`Unknown argument: ${arg}`);
      console.error(`Known: ${[...KNOWN_FLAGS, ...KNOWN_OPTIONS.map((o) => `${o}=…`)].join(" ")}`);
      process.exit(1);
    }
    if (KNOWN_OPTIONS.includes(name) && !arg.includes("=")) {
      console.error(`${name} needs a value, e.g. ${name}=10`);
      process.exit(1);
    }
  }

  const options: EnrichRunOptions = {
    mode: args.includes("--attributes-only") ? "attributes" : "full",
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    onProgress: (m) => console.log(`  ${m}`),
  };

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      const n = parseInt(arg.split("=")[1], 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error(`--limit must be a positive integer, got "${arg.split("=")[1]}"`);
        process.exit(1);
      }
      options.limit = n;
    }
    if (arg.startsWith("--category=")) options.category = arg.split("=")[1];
  }

  // Full + force regenerates every live description in the corpus. Make the
  // operator say so out loud.
  if (options.mode === "full" && options.force && !options.dryRun) {
    console.error(
      "REFUSING: `--force` in full mode regenerates EVERY pulseDescription and tag set,\n" +
        "and those are live in production. If you want the situational booleans, use\n" +
        "`--attributes-only` (which never touches copy). If you really do mean to\n" +
        "regenerate all copy, add --dry-run first and look at what it would hit.",
    );
    process.exit(1);
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log("\n=== Pulse Places AI Enrichment ===\n");
  console.log(
    `mode=${options.mode}  limit=${options.limit ?? "none"}  ` +
      `category=${options.category ?? "all"}  dryRun=${!!options.dryRun}  force=${!!options.force}`,
  );
  if (options.mode === "attributes") {
    console.log("Attributes-only: existing descriptions and tags will NOT be touched.");
  }
  console.log("");

  const result = await runEnrichment(prisma, openai, options);

  console.log("\n=== Enrichment Complete ===\n");
  console.log(`Processed: ${result.processed}`);
  console.log(`Enriched:  ${result.enriched}`);
  console.log(`Failed:    ${result.failed}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
