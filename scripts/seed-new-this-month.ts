/**
 * Seed "New This Month" items
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-new-this-month.ts
 */

import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_ITEMS = [
  {
    title: "Denver Clayroom",
    venueName: "Denver Clayroom",
    address: "Denver, CO",
    description: "Brand new pottery studio built from the ground up for Denver. Classes, memberships, and drop-in times. From the team behind a beloved SF studio.",
    category: "ART" as Category,
    tags: ["pottery", "ceramics", "creative", "new opening", "moderate", "solo-friendly"],
    priceRange: "Classes from ~$50",
    oneLiner: "Brand-new pottery studio from the team behind a beloved SF favorite.",
    noveltyScore: 7,
    qualityScore: 7,
    externalId: "new-denver-clayroom",
  },
  {
    title: "Chicken N Pickle \u2014 Thornton",
    venueName: "Chicken N Pickle",
    address: "14225 Lincoln St, Thornton CO",
    description: "The popular pickleball-meets-restaurant chain just opened in Thornton. Indoor and outdoor courts, a full food menu built around chicken, and a 90-acre shopping district around it.",
    category: "ACTIVITY_VENUE" as Category,
    tags: ["pickleball", "restaurant", "new opening", "social", "friends-group", "high-energy"],
    priceRange: "Court rental + food",
    oneLiner: "Pickleball meets restaurant\u2014indoor and outdoor courts plus a full chicken menu.",
    noveltyScore: 8,
    qualityScore: 8,
    externalId: "new-chicken-n-pickle-thornton",
  },
  {
    title: "Spring Farmers Markets Return",
    venueName: "Various Denver Locations",
    address: "Union Station, Cherry Creek, City Park",
    description: "Denver's outdoor farmers markets are back for the season. Fresh produce, artisan foods, live music, and weekend vibes.",
    category: "SEASONAL" as Category,
    tags: ["farmers market", "food", "outdoor", "free", "seasonal", "social", "moderate"],
    priceRange: "Free entry",
    oneLiner: "Denver's farmers markets are back\u2014fresh produce, artisan food, and weekend vibes.",
    noveltyScore: 5,
    qualityScore: 7,
    externalId: "new-spring-farmers-markets",
  },
  {
    title: "Peak Fitness RiNo",
    venueName: "Peak Fitness RiNo",
    address: "RiNo, Denver CO",
    description: "New fitness studio in the heart of RiNo. Strength, HIIT, and recovery classes in a sleek space.",
    category: "FITNESS" as Category,
    tags: ["fitness", "HIIT", "strength", "new opening", "RiNo", "high-energy"],
    priceRange: "Class packages vary",
    oneLiner: "Sleek new RiNo fitness studio\u2014strength, HIIT, and recovery classes.",
    noveltyScore: 5,
    qualityScore: 6,
    externalId: "new-peak-fitness-rino",
  },
  {
    title: "Spring Trail Season",
    venueName: "Various Front Range Trailheads",
    address: "South Table Mountain, Red Rocks, Mount Falcon",
    description: "Snow's melting and the trails are opening up. South Table Mountain, Red Rocks Trading Post Trail, and Mount Falcon are all good to go. Perfect hiking weather through May.",
    category: "OUTDOORS" as Category,
    tags: ["hiking", "trails", "outdoors", "seasonal", "free", "nature", "moderate"],
    priceRange: "Free (some require park pass)",
    oneLiner: "Trails are open\u2014South Table Mountain, Red Rocks, and Mount Falcon are good to go.",
    noveltyScore: 5,
    qualityScore: 7,
    externalId: "new-spring-trail-season",
  },
];

async function main() {
  console.log("Seeding New This Month items...\n");

  const denver = await prisma.city.findUnique({ where: { slug: "denver" } });
  if (!denver) throw new Error("Denver not found");

  let created = 0;
  for (const item of NEW_ITEMS) {
    await prisma.event.upsert({
      where: {
        externalId_source: {
          externalId: item.externalId,
          source: "pulse-curated",
        },
      },
      update: {
        isNew: true,
        oneLiner: item.oneLiner,
        noveltyScore: item.noveltyScore,
        qualityScore: item.qualityScore,
      },
      create: {
        title: item.title,
        venueName: item.venueName,
        address: item.address,
        description: item.description,
        category: item.category,
        tags: item.tags,
        priceRange: item.priceRange,
        startTime: new Date("2026-12-31"),
        isRecurring: true,
        isNew: true,
        oneLiner: item.oneLiner,
        noveltyScore: item.noveltyScore,
        qualityScore: item.qualityScore,
        source: "pulse-curated",
        externalId: item.externalId,
        cityId: denver.id,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    created++;
    console.log("  " + item.title);
  }

  // Also mark existing Sploinky Rave as new
  const sploinky = await prisma.event.findFirst({
    where: { title: { contains: "Sploinky" } },
  });
  if (sploinky) {
    await prisma.event.update({
      where: { id: sploinky.id },
      data: { isNew: true },
    });
    console.log("  Sploinky Rave (marked as new)");
    created++;
  }

  console.log("\nSeeded " + created + " New This Month items");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
