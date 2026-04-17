/**
 * Bulk AI Enrichment Script
 *
 * Runs gpt-5.4-nano on ALL events to populate:
 * - oneLiner, category, qualityScore, noveltyScore
 * - vibeTags, companionTags, lifestyle flags
 *
 * Also re-classifies using the keyword classifier as a fallback.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/enrich-all-events.ts
 */

import { PrismaClient, Category } from "@prisma/client";
import { enrichEvent } from "../lib/enrich-event";
import { classifyEvent } from "../lib/scrapers/classify";

const prisma = new PrismaClient();

// Valid categories for validation
const VALID_CATEGORIES = new Set<string>(Object.values(Category));

async function main() {
  console.log("Bulk AI Enrichment Script\n");

  const events = await prisma.event.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      venueName: true,
      category: true,
      tags: true,
      priceRange: true,
      neighborhood: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${events.length} events to enrich\n`);

  let enriched = 0;
  let reclassified = 0;
  let errors = 0;
  let lowQuality = 0;

  // Process in batches to avoid rate limits
  const BATCH_SIZE = 10;
  const DELAY_MS = 500;

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (event) => {
        try {
          const result = await enrichEvent({
            title: event.title,
            description: event.description,
            venueName: event.venueName,
            category: event.category,
            tags: event.tags,
            priceRange: event.priceRange,
            neighborhood: event.neighborhood,
          });

          if (!result) return { eventId: event.id, status: "error" as const };

          // Determine final category: prefer AI category, fall back to keyword classifier
          let finalCategory: Category = event.category;
          if (result.category && VALID_CATEGORIES.has(result.category)) {
            finalCategory = result.category as Category;
          }
          // Also run keyword classifier and use it if AI didn't change category
          const keywordCategory = classifyEvent(event.title, event.venueName);
          if (finalCategory === event.category && keywordCategory !== event.category) {
            finalCategory = keywordCategory;
          }

          const categoryChanged = finalCategory !== event.category;

          // Update the event
          await prisma.event.update({
            where: { id: event.id },
            data: {
              description: result.description || event.description,
              oneLiner: result.oneLiner,
              category: finalCategory,
              qualityScore: result.qualityScore,
              noveltyScore: result.noveltyScore,
              tags: { set: [...new Set([...event.tags, ...result.tags])] },
              vibeTags: { set: result.vibeTags },
              companionTags: { set: result.companionTags },
              isDogFriendly: result.isDogFriendly,
              isDrinkingOptional: result.isDrinkingOptional,
              isAlcoholFree: result.isAlcoholFree,
            },
          });

          return {
            eventId: event.id,
            status: "ok" as const,
            categoryChanged,
            oldCategory: event.category,
            newCategory: finalCategory,
            quality: result.qualityScore,
            novelty: result.noveltyScore,
          };
        } catch (err) {
          return { eventId: event.id, status: "error" as const };
        }
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.status === "ok") {
        enriched++;
        if (r.value.categoryChanged) {
          reclassified++;
          console.log(`  Reclassified: "${events.find(e => e.id === r.value.eventId)?.title?.slice(0, 40)}" ${r.value.oldCategory} -> ${r.value.newCategory}`);
        }
      } else {
        errors++;
      }
    }

    const pct = Math.round(((i + batch.length) / events.length) * 100);
    process.stdout.write(`\r  Progress: ${i + batch.length}/${events.length} (${pct}%) | Enriched: ${enriched} | Reclassified: ${reclassified} | Errors: ${errors}`);

    // Rate limit delay between batches
    if (i + BATCH_SIZE < events.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log("\n\nBulk Enrichment Complete!");
  console.log(`  Enriched: ${enriched}/${events.length}`);
  console.log(`  Reclassified: ${reclassified}`);
  console.log(`  Errors: ${errors}`);

  // Print category distribution after enrichment
  const catCounts = await prisma.event.groupBy({
    by: ["category"],
    _count: true,
    orderBy: { _count: { category: "desc" } },
  });
  console.log("\nCategory distribution after enrichment:");
  for (const c of catCounts) {
    console.log(`  ${c.category}: ${c._count}`);
  }

  // Print novelty score distribution
  const noveltyDist = await prisma.event.groupBy({
    by: ["noveltyScore"],
    _count: true,
    orderBy: { noveltyScore: "asc" },
    where: { noveltyScore: { not: null } },
  });
  console.log("\nNovelty score distribution:");
  for (const n of noveltyDist) {
    console.log(`  Score ${n.noveltyScore}: ${n._count} events`);
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
