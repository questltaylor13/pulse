/**
 * Sync curated events from Event table to Item table.
 * Makes them visible to the Suggested for You system.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/sync-events-to-items.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Syncing curated events to Item table...\n");

  // Get all curated events
  const events = await prisma.event.findMany({
    where: { source: "pulse-curated" },
  });
  console.log(`Found ${events.length} curated events`);

  let created = 0;
  let updated = 0;

  for (const event of events) {
    const itemType = event.isRecurring ? "PLACE" : "EVENT";

    const data = {
      type: itemType as "EVENT" | "PLACE",
      cityId: event.cityId,
      title: event.title,
      description: event.description,
      category: event.category,
      tags: event.tags,
      venueName: event.venueName,
      address: event.address,
      startTime: event.isRecurring ? null : event.startTime,
      endTime: event.endTime,
      priceRange: event.priceRange,
      source: event.source,
      sourceUrl: event.sourceUrl,
      externalId: event.externalId,
      imageUrl: event.imageUrl,
      neighborhood: event.neighborhood,
      vibeTags: event.vibeTags,
      companionTags: event.companionTags,
      oneLiner: event.oneLiner,
      noveltyScore: event.noveltyScore,
      qualityScore: event.qualityScore,
    };

    const result = await prisma.item.upsert({
      where: {
        externalId_source: {
          externalId: event.externalId || event.id,
          source: event.source,
        },
      },
      update: data,
      create: data,
    });

    const isNew = Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
    if (isNew) created++;
    else updated++;
  }

  console.log(`\nSync complete: ${created} created, ${updated} updated`);

  // Verify
  const totalCurated = await prisma.item.count({ where: { source: "pulse-curated" } });
  console.log(`Total curated items in Item table: ${totalCurated}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
