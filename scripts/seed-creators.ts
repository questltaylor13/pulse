/**
 * Seed Script for Creator Profiles
 *
 * This script seeds the database with the founding creator profiles.
 *
 * Usage:
 *   npx ts-node scripts/seed-creators.ts
 */

import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

const CREATORS = [
  {
    handle: "haleighwatts",
    displayName: "Haleigh Watts",
    profileImageUrl: "/images/creators/haleigh.png",
    profileColor: "#F5E6F0",
    instagram: "haleighwatts",
    tiktok: "haleighwatts",
    isDenverNative: true,
    yearsInDenver: null,
    isFounder: false,
    bio: `I'm Haleigh 👋 I'm so glad you're here. I'm a proud Denver native who firmly believes we live in one of the best cities and states. Growing up here and watching how much of a melting pot Denver has become brings me so much excitement; excitement about the type of people who are here, the endless possibilities to connect, and about watching our city continue to grow and thrive.`,
    funFacts: [
      "I basically grew up performing in an equestrian circus",
      "My lifelong goal is to have an animal sanctuary where I can rescue all types of senior animals",
      "I make a mean carbonara",
    ],
    specialties: ["date nights", "hidden gems", "local favorites", "events"],
    vibeDescription: "Date nights, hidden gems, local favorites, and must-attend events",
    preferredCategories: ["FOOD", "BARS", "RESTAURANT", "SEASONAL"] as Category[],
  },
  {
    handle: "maggieberra",
    displayName: "Maggie Berra",
    profileImageUrl: "/images/creators/maggie.png",
    profileColor: "#E8F0F5",
    instagram: "maggieberra",
    tiktok: "maggieberra",
    isDenverNative: false,
    yearsInDenver: 5,
    isFounder: false,
    bio: `Hi! I'm Maggie 👋 While not originally from here, I've been lucky enough to call Denver home for the last 5 years. Midwest raised with a Mid-Atlantic stint, I love to bring a little spunk to whatever life has to throw my way. This city has brought the best people into my life and helped shape who I am and want to be for years to come. I can't wait to be able to share that experience with more of you!`,
    funFacts: [
      "I have the lyrics to Dancing Queen by Abba tattooed on my arm",
      "I was a D1 athlete at UNC-Chapel Hill on the women's rowing team",
      "I've seen 200+ concerts",
    ],
    specialties: ["concerts", "nightlife", "fitness", "group activities"],
    vibeDescription: "Live music, nightlife, fitness, and group activities",
    preferredCategories: ["LIVE_MUSIC", "BARS", "FITNESS", "ACTIVITY_VENUE"] as Category[],
  },
  {
    handle: "questtaylor",
    displayName: "Quest",
    profileImageUrl: "/images/creators/quest.jpg",
    profileColor: "#E6F0E8",
    instagram: "questtaylor",
    tiktok: "questtaylor",
    isDenverNative: false,
    yearsInDenver: 5,
    isFounder: true,
    bio: `Hi! I'm Quest 👋 While I'm not originally from Denver, I've been lucky enough to call it home for the last 5 years. I've lived in a few different places and spent a lot of time on the road, but Denver is the city that really taught me how to balance going out with friends and staying active — which is basically my perfect combo.

I love anything that mixes sports, movement, good food, and fun people. One night I'm down for a workout or getting outside, the next I'm trying a new restaurant or saying yes to plans I didn't expect. Pulse came out of wanting an easier way to find experiences that make life feel less routine and more… alive.

I'm excited to share the things that make this city fun, energizing, and worth exploring — whether it's a great event, a new spot, or something that gets you moving.`,
    funFacts: [
      "I've traveled to 34+ countries and still get just as excited discovering a new neighborhood or spot in Denver",
      "I love sports and physical challenges, but I'll never say no to good food or a fun night out",
      "Some of my favorite memories come from last-minute plans that start small and turn into great nights",
    ],
    specialties: ["fitness", "sports", "food", "spontaneous plans", "outdoor activities", "travel"],
    vibeDescription: "Fitness, sports, great food, spontaneous plans, and outdoor adventures",
    preferredCategories: ["FITNESS", "OUTDOORS", "FOOD", "RESTAURANT", "ACTIVITY_VENUE"] as Category[],
  },
];

async function seedCreators() {
  console.log("Starting creator seed...\n");

  let created = 0;
  let updated = 0;

  for (const creator of CREATORS) {
    try {
      const existing = await prisma.influencer.findUnique({
        where: { handle: creator.handle },
      });

      if (existing) {
        await prisma.influencer.update({
          where: { handle: creator.handle },
          data: creator,
        });
        console.log(`  Updated: ${creator.displayName} (@${creator.handle})`);
        updated++;
      } else {
        await prisma.influencer.create({
          data: creator,
        });
        console.log(`  Created: ${creator.displayName} (@${creator.handle})`);
        created++;
      }
    } catch (error) {
      console.error(`  Error with ${creator.displayName}:`, error);
    }
  }

  console.log("\n--- Seed Summary ---");
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Total: ${CREATORS.length}`);
}

async function main() {
  try {
    await seedCreators();
    console.log("\nCreator seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
