/**
 * Seed Script for Demo Event with Creator Features
 *
 * Creates the New Year's Mindful Journaling Workshop event
 * and links it to creators Maggie and Haleigh.
 *
 * Usage:
 *   npx ts-node scripts/seed-demo-event.ts
 */

import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EVENT = {
  title: "New Year's Mindful Journaling Workshop",
  description: `Reflect, reset, and prep for the new year with a mindful journaling workshop led by Rachel of Inluma Collective (formerly Lost & Found Journals) and hosted by Denver&CO!

Inluma Collective offers a space for individuals to embark on a journey of self-discovery through the artistic and spiritual act of journaling. Each journal is crafted with a variety of customizable features, allowing every creator to personalize their own unique journaling experience. The journals encourage creators to write letters to their past and future, thereby furthering their connection to every version of themselves.

Join Denver&CO. at Devil's Ivy to kick off 2026 with a journaling session built to help you reflect, reset, and gain clarity for the new year. Attendees also receive 20% off of any purchase at Devil's Ivy!`,
  category: "FITNESS" as Category, // Wellness/mindfulness fits here
  venueName: "Devil's Ivy",
  address: "1844 Market St, Denver, CO 80202", // Actual Denver location
  neighborhood: "LoDo",
  startTime: new Date("2026-01-11T09:00:00-07:00"), // Sunday, January 11, 2026 at 9 AM MST
  endTime: new Date("2026-01-11T10:00:00-07:00"),
  priceRange: "$45",
  source: "denverand.co",
  sourceUrl: "https://www.denverand.co/events",
  tags: [
    "journaling",
    "wellness",
    "mindfulness",
    "new year",
    "workshop",
    "self-care",
    "women-friendly",
    "morning",
  ],
  vibeTags: ["chill"],
  companionTags: ["solo", "friends", "date-night"],
  occasionTags: ["self-improvement", "new-year"],
  whatsIncluded: [
    "1 personal Inluma Collective journal",
    "A 1-hour, instructor-led journaling session",
    "A New Year's goodie bag",
    "20% off of any purchase at Devil's Ivy",
  ],
  imageUrl: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800", // Journaling image
};

const CREATOR_FEATURES = [
  {
    handle: "haleighwatts",
    quote: "The perfect way to start 2026 with intention. I love Rachel's journals! 📓✨",
    isFeatured: true,
    isHost: true,
  },
  {
    handle: "maggieberra",
    quote: "Journaling has been huge for me. This workshop is a great intro if you've never tried it!",
    isFeatured: true,
    isHost: true,
  },
];

async function seedDemoEvent() {
  console.log("Starting demo event seed...\n");

  // First, get the Denver city record
  let city = await prisma.city.findFirst({
    where: { slug: "denver" },
  });

  if (!city) {
    console.log("Creating Denver city record...");
    city = await prisma.city.create({
      data: {
        name: "Denver",
        slug: "denver",
        timezone: "America/Denver",
      },
    });
  }

  // Check if event already exists
  let event = await prisma.event.findFirst({
    where: {
      title: DEMO_EVENT.title,
      source: DEMO_EVENT.source,
    },
  });

  if (event) {
    console.log(`  Updating existing event: ${event.title}`);
    event = await prisma.event.update({
      where: { id: event.id },
      data: {
        ...DEMO_EVENT,
        cityId: city.id,
      },
    });
  } else {
    console.log(`  Creating new event: ${DEMO_EVENT.title}`);
    event = await prisma.event.create({
      data: {
        ...DEMO_EVENT,
        cityId: city.id,
      },
    });
  }

  console.log(`  Event ID: ${event.id}`);

  // Now link creators to the event
  console.log("\nLinking creators to event...");

  for (const feature of CREATOR_FEATURES) {
    const influencer = await prisma.influencer.findUnique({
      where: { handle: feature.handle },
    });

    if (!influencer) {
      console.log(`  Warning: Creator @${feature.handle} not found, skipping...`);
      continue;
    }

    // Upsert the creator feature
    await prisma.creatorEventFeature.upsert({
      where: {
        influencerId_eventId: {
          influencerId: influencer.id,
          eventId: event.id,
        },
      },
      update: {
        quote: feature.quote,
        isFeatured: feature.isFeatured,
        isHost: feature.isHost,
      },
      create: {
        influencerId: influencer.id,
        eventId: event.id,
        quote: feature.quote,
        isFeatured: feature.isFeatured,
        isHost: feature.isHost,
      },
    });

    console.log(`  Linked @${feature.handle} to event`);
    console.log(`    Quote: "${feature.quote}"`);
  }

  console.log("\n--- Seed Summary ---");
  console.log(`  Event: ${event.title}`);
  console.log(`  Date: ${event.startTime.toLocaleDateString()}`);
  console.log(`  Venue: ${event.venueName}`);
  console.log(`  Creators: ${CREATOR_FEATURES.map((f) => "@" + f.handle).join(", ")}`);
}

async function main() {
  try {
    await seedDemoEvent();
    console.log("\nDemo event seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
