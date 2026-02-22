/**
 * AI Enrichment Script for Events
 *
 * Uses OpenAI (via lib/enrich-event.ts) to generate descriptions, vibe tags,
 * companion tags, and lifestyle flags for scraped events.
 *
 * Usage:
 *   npm run events:enrich
 *   npm run events:enrich -- --limit=10
 *   npm run events:enrich -- --category=live_music
 *   npm run events:enrich -- --dry-run
 *   npm run events:enrich -- --force
 *
 * Environment Variables Required:
 *   OPENAI_API_KEY - Your OpenAI API key
 *   DATABASE_URL   - PostgreSQL connection string
 */

import { PrismaClient, Category } from "@prisma/client";
import { enrichEvent } from "../lib/enrich-event";

const prisma = new PrismaClient();

interface EnrichmentOptions {
  limit?: number;
  category?: string;
  dryRun?: boolean;
  force?: boolean;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enrichEvents(options: EnrichmentOptions = {}): Promise<void> {
  const { limit, category, dryRun = false, force = false } = options;

  console.log("\n=== Pulse Events AI Enrichment ===\n");
  console.log(
    `Options: limit=${limit || "none"}, category=${category || "all"}, dryRun=${dryRun}, force=${force}\n`,
  );

  // Build query — enrich events missing description or vibeTags
  const where: Record<string, unknown> = {};

  if (!force) {
    where.OR = [
      { description: "" },
      { vibeTags: { isEmpty: true } },
    ];
  }

  if (category) {
    const categoryMap: Record<string, Category> = {
      art: "ART",
      live_music: "LIVE_MUSIC",
      bars: "BARS",
      food: "FOOD",
      coffee: "COFFEE",
      outdoors: "OUTDOORS",
      fitness: "FITNESS",
      seasonal: "SEASONAL",
      popup: "POPUP",
      other: "OTHER",
    };

    if (!categoryMap[category]) {
      console.error(`Unknown category: ${category}`);
      console.log(
        `Available categories: ${Object.keys(categoryMap).join(", ")}`,
      );
      process.exit(1);
    }

    where.category = categoryMap[category];
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { startTime: "asc" },
    take: limit,
  });

  console.log(`Found ${events.length} events to enrich\n`);

  let enriched = 0;
  let failed = 0;

  for (const event of events) {
    console.log(`Processing: ${event.title}`);

    if (dryRun) {
      console.log(`  [DRY RUN] Would enrich with AI`);
      enriched++;
      continue;
    }

    const result = await enrichEvent({
      title: event.title,
      description: event.description,
      venueName: event.venueName,
      category: event.category,
      tags: event.tags,
      priceRange: event.priceRange,
      neighborhood: event.neighborhood,
    });

    if (result) {
      // Merge AI tags into existing tags (deduplicated)
      const mergedTags = Array.from(
        new Set([...event.tags, ...result.tags]),
      );

      await prisma.event.update({
        where: { id: event.id },
        data: {
          description: result.description || event.description,
          tags: mergedTags,
          vibeTags: result.vibeTags,
          companionTags: result.companionTags,
          isDogFriendly: result.isDogFriendly,
          isDrinkingOptional: result.isDrinkingOptional,
          isAlcoholFree: result.isAlcoholFree,
        },
      });

      console.log(`  Vibe: ${result.vibeTags.join(", ")}`);
      console.log(`  Companion: ${result.companionTags.join(", ")}`);
      if (result.description) {
        console.log(
          `  Description: ${result.description.substring(0, 80)}...`,
        );
      }
      enriched++;
    } else {
      console.log(`  FAILED`);
      failed++;
    }

    // Respect rate limits
    await delay(500);
  }

  console.log("\n=== Enrichment Complete ===\n");
  console.log(`Total processed: ${events.length}`);
  console.log(`Enriched: ${enriched}`);
  console.log(`Failed: ${failed}`);
}

// Parse command line arguments
function parseArgs(): EnrichmentOptions {
  const args = process.argv.slice(2);
  const options: EnrichmentOptions = {};

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--category=")) {
      options.category = arg.split("=")[1];
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--force") {
      options.force = true;
    }
  }

  return options;
}

// Main execution
const options = parseArgs();

enrichEvents(options)
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
