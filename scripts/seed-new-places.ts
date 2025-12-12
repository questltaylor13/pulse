/**
 * Seed Script for New & Upcoming Places
 *
 * This script seeds the database with sample new, soft-open, and coming soon places
 * to demonstrate the "What's New in Denver" feature.
 *
 * Usage:
 *   npx ts-node scripts/seed-new-places.ts
 *
 * The script creates:
 * - 5 recently opened places (last 30 days)
 * - 3 soft-open places
 * - 4 coming soon places with dates
 * - 3 announced places without dates
 */

import { PrismaClient, Category, OpeningStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Helper to create dates relative to now
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date;
}

// Sample new/upcoming places data
const NEW_PLACES = [
  // Recently Opened (Just Opened - last 30 days)
  {
    name: "Rosetta Hall",
    address: "1109 Walnut St, Boulder, CO 80302",
    neighborhood: "LoDo",
    category: "RESTAURANT" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(5),
    isNew: true,
    isFeatured: true,
    buzzScore: 42,
    conceptDescription: "Modern American food hall concept with six rotating chef stations",
    priceLevel: 2,
    googleRating: 4.5,
    googleRatingCount: 23,
    primaryImageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
    vibeTags: ["trendy", "date-night", "groups"],
    newsSource: "Westword",
    newsSourceUrl: "https://www.westword.com",
  },
  {
    name: "Neon Tiger",
    address: "3295 Blake St, Denver, CO 80205",
    neighborhood: "RiNo",
    category: "BARS" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(12),
    isNew: true,
    isFeatured: false,
    buzzScore: 28,
    conceptDescription: "Asian-fusion cocktail bar with karaoke rooms",
    priceLevel: 3,
    googleRating: 4.3,
    googleRatingCount: 15,
    primaryImageUrl: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800",
    vibeTags: ["nightlife", "groups", "late-night"],
    newsSource: "303 Magazine",
    newsSourceUrl: "https://303magazine.com",
  },
  {
    name: "The Bread Shop",
    address: "2020 Lawrence St, Denver, CO 80205",
    neighborhood: "Ballpark",
    category: "COFFEE" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(20),
    isNew: true,
    isFeatured: false,
    buzzScore: 35,
    conceptDescription: "Artisan bakery and specialty coffee from a Michelin-trained pastry chef",
    priceLevel: 2,
    googleRating: 4.7,
    googleRatingCount: 31,
    primaryImageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
    vibeTags: ["cozy", "work-friendly", "brunch"],
    newsSource: "Eater Denver",
    newsSourceUrl: "https://denver.eater.com",
  },
  {
    name: "Evergreen Social",
    address: "1400 Larimer St, Denver, CO 80202",
    neighborhood: "LoDo",
    category: "FOOD" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(25),
    isNew: true,
    isFeatured: false,
    buzzScore: 19,
    conceptDescription: "Farm-to-table small plates with extensive natural wine list",
    priceLevel: 3,
    primaryImageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
    vibeTags: ["date-night", "upscale", "wine-bar"],
    newsSource: "Denver Post",
    newsSourceUrl: "https://www.denverpost.com",
  },
  {
    name: "Peak Fitness RiNo",
    address: "2900 Brighton Blvd, Denver, CO 80216",
    neighborhood: "RiNo",
    category: "FITNESS" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(8),
    isNew: true,
    isFeatured: true,
    buzzScore: 55,
    conceptDescription: "High-altitude training gym with recovery spa",
    priceLevel: 3,
    primaryImageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800",
    vibeTags: ["fitness", "wellness", "community"],
    newsSource: "5280 Magazine",
    newsSourceUrl: "https://5280.com",
  },

  // Soft Open places
  {
    name: "Moonstone Omakase",
    address: "1850 Wazee St, Denver, CO 80202",
    neighborhood: "LoDo",
    category: "RESTAURANT" as Category,
    openingStatus: "SOFT_OPEN" as OpeningStatus,
    announcedDate: daysAgo(60),
    expectedOpenDate: daysFromNow(14),
    isUpcoming: true,
    isFeatured: true,
    buzzScore: 67,
    preOpeningSaves: 89,
    conceptDescription: "18-seat omakase experience from a Nobu-trained chef",
    expectedPriceLevel: 4,
    sneakPeekInfo: "Reservations only via Instagram DM, limited seats available",
    primaryImageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800",
    vibeTags: ["fine-dining", "date-night", "exclusive"],
    socialLinks: { instagram: "@moonstoneden" },
    newsSource: "Eater Denver",
    newsSourceUrl: "https://denver.eater.com",
  },
  {
    name: "Third Rail",
    address: "2201 Arapahoe St, Denver, CO 80205",
    neighborhood: "Five Points",
    category: "BARS" as Category,
    openingStatus: "SOFT_OPEN" as OpeningStatus,
    announcedDate: daysAgo(45),
    expectedOpenDate: daysFromNow(7),
    isUpcoming: true,
    isFeatured: false,
    buzzScore: 34,
    preOpeningSaves: 45,
    conceptDescription: "Speakeasy-style cocktail bar with live jazz Thursdays",
    expectedPriceLevel: 3,
    sneakPeekInfo: "Walk-ins welcome, no password needed during soft open",
    primaryImageUrl: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800",
    vibeTags: ["speakeasy", "jazz", "intimate"],
    socialLinks: { instagram: "@thirdraildenver" },
    newsSource: "303 Magazine",
  },
  {
    name: "Gather Kitchen",
    address: "3500 Pecos St, Denver, CO 80211",
    neighborhood: "LoHi",
    category: "FOOD" as Category,
    openingStatus: "SOFT_OPEN" as OpeningStatus,
    announcedDate: daysAgo(30),
    expectedOpenDate: daysFromNow(10),
    isUpcoming: true,
    isFeatured: false,
    buzzScore: 22,
    preOpeningSaves: 31,
    conceptDescription: "Community kitchen offering cooking classes and private dining",
    expectedPriceLevel: 2,
    sneakPeekInfo: "Testing weekend brunch service, walk-ins only",
    primaryImageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
    vibeTags: ["family-friendly", "cooking-classes", "community"],
    socialLinks: { instagram: "@gatherkitchenden" },
  },

  // Coming Soon places (with expected dates)
  {
    name: "The Silver Lining",
    address: "1616 Platte St, Denver, CO 80202",
    neighborhood: "LoHi",
    category: "BARS" as Category,
    openingStatus: "COMING_SOON" as OpeningStatus,
    announcedDate: daysAgo(90),
    expectedOpenDate: daysFromNow(30),
    isUpcoming: true,
    isFeatured: true,
    buzzScore: 78,
    preOpeningSaves: 156,
    conceptDescription: "Rooftop bar with panoramic mountain views and Colorado-only spirits",
    expectedPriceLevel: 3,
    primaryImageUrl: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800",
    vibeTags: ["rooftop", "views", "upscale"],
    socialLinks: { instagram: "@silverliningden", twitter: "@silverliningden" },
    newsSource: "Westword",
    newsSourceUrl: "https://www.westword.com",
  },
  {
    name: "Marigold",
    address: "2700 Larimer St, Denver, CO 80205",
    neighborhood: "RiNo",
    category: "RESTAURANT" as Category,
    openingStatus: "COMING_SOON" as OpeningStatus,
    announcedDate: daysAgo(45),
    expectedOpenDate: daysFromNow(45),
    isUpcoming: true,
    isFeatured: false,
    buzzScore: 41,
    preOpeningSaves: 67,
    conceptDescription: "Elevated Mexican cuisine with house-made tortillas and mole",
    expectedPriceLevel: 3,
    primaryImageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800",
    vibeTags: ["upscale-casual", "date-night", "patio"],
    socialLinks: { instagram: "@marigolddenver" },
    newsSource: "Eater Denver",
  },
  {
    name: "Basecamp Climbing Co.",
    address: "4500 York St, Denver, CO 80216",
    neighborhood: "Clayton",
    category: "FITNESS" as Category,
    openingStatus: "COMING_SOON" as OpeningStatus,
    announcedDate: daysAgo(120),
    expectedOpenDate: daysFromNow(60),
    isUpcoming: true,
    isFeatured: false,
    buzzScore: 29,
    preOpeningSaves: 88,
    conceptDescription: "35,000 sq ft climbing gym with yoga studio and gear shop",
    expectedPriceLevel: 2,
    primaryImageUrl: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800",
    vibeTags: ["climbing", "fitness", "community"],
    socialLinks: { instagram: "@basecampclimbing" },
    newsSource: "5280 Magazine",
  },
  {
    name: "Petals & Pour",
    address: "1555 Blake St, Denver, CO 80202",
    neighborhood: "LoDo",
    category: "COFFEE" as Category,
    openingStatus: "COMING_SOON" as OpeningStatus,
    announcedDate: daysAgo(21),
    expectedOpenDate: daysFromNow(21),
    isUpcoming: true,
    isFeatured: false,
    buzzScore: 15,
    preOpeningSaves: 34,
    conceptDescription: "Flower shop meets coffee bar with seasonal arrangements",
    expectedPriceLevel: 2,
    primaryImageUrl: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800",
    vibeTags: ["instagrammable", "cozy", "unique"],
    socialLinks: { instagram: "@petalsandpour" },
  },

  // Announced (no firm date yet)
  {
    name: "Temple Nightclub",
    address: "TBD, Denver, CO",
    neighborhood: "RiNo",
    category: "LIVE_MUSIC" as Category,
    openingStatus: "COMING_SOON" as OpeningStatus,
    announcedDate: daysAgo(14),
    isUpcoming: true,
    isFeatured: true,
    buzzScore: 92,
    preOpeningSaves: 234,
    conceptDescription: "3-story electronic music venue from Meow Wolf partners",
    expectedPriceLevel: 3,
    primaryImageUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800",
    vibeTags: ["nightclub", "electronic", "immersive"],
    socialLinks: { instagram: "@templedenver", twitter: "@templedenver" },
    newsSource: "EDM.com",
    newsSourceUrl: "https://edm.com",
  },
  {
    name: "Good Fortune Dim Sum",
    address: "Federal Blvd, Denver, CO",
    neighborhood: "Barnum",
    category: "RESTAURANT" as Category,
    openingStatus: "COMING_SOON" as OpeningStatus,
    announcedDate: daysAgo(7),
    isUpcoming: true,
    isFeatured: false,
    buzzScore: 18,
    preOpeningSaves: 42,
    conceptDescription: "Traditional Hong Kong-style dim sum with cart service",
    expectedPriceLevel: 2,
    primaryImageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800",
    vibeTags: ["authentic", "family-friendly", "brunch"],
    newsSource: "Westword",
  },
  {
    name: "Second Act",
    address: "Colfax Ave, Denver, CO",
    neighborhood: "Capitol Hill",
    category: "ART" as Category,
    openingStatus: "COMING_SOON" as OpeningStatus,
    announcedDate: daysAgo(30),
    isUpcoming: true,
    isFeatured: false,
    buzzScore: 24,
    preOpeningSaves: 56,
    conceptDescription: "Theater and performance art space supporting local artists",
    expectedPriceLevel: 2,
    primaryImageUrl: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800",
    vibeTags: ["theater", "art", "local"],
    socialLinks: { instagram: "@secondactdenver" },
    newsSource: "Denver Gazette",
  },
];

async function seedNewPlaces() {
  console.log("Starting new places seed...\n");

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const placeData of NEW_PLACES) {
    try {
      // Check if place already exists by name and neighborhood
      const existing = await prisma.place.findFirst({
        where: {
          name: placeData.name,
          neighborhood: placeData.neighborhood,
        },
      });

      const data = {
        name: placeData.name,
        address: placeData.address,
        neighborhood: placeData.neighborhood,
        category: placeData.category,
        openingStatus: placeData.openingStatus,
        openedDate: placeData.openedDate,
        announcedDate: placeData.announcedDate,
        expectedOpenDate: placeData.expectedOpenDate,
        isNew: placeData.isNew || false,
        isUpcoming: placeData.isUpcoming || false,
        isFeatured: placeData.isFeatured || false,
        buzzScore: placeData.buzzScore || 0,
        preOpeningSaves: placeData.preOpeningSaves || 0,
        conceptDescription: placeData.conceptDescription,
        priceLevel: placeData.priceLevel,
        expectedPriceLevel: placeData.expectedPriceLevel,
        sneakPeekInfo: placeData.sneakPeekInfo,
        primaryImageUrl: placeData.primaryImageUrl,
        vibeTags: placeData.vibeTags || [],
        socialLinks: placeData.socialLinks || {},
        newsSource: placeData.newsSource,
        newsSourceUrl: placeData.newsSourceUrl,
        googleRating: placeData.googleRating,
        googleReviewCount: placeData.googleRatingCount,
      };

      if (existing) {
        await prisma.place.update({
          where: { id: existing.id },
          data,
        });
        console.log(`  Updated: ${placeData.name} (${placeData.openingStatus})`);
        updated++;
      } else {
        await prisma.place.create({ data });
        console.log(`  Created: ${placeData.name} (${placeData.openingStatus})`);
        created++;
      }
    } catch (error) {
      console.error(`  Error with ${placeData.name}:`, error);
      skipped++;
    }
  }

  console.log("\n--- Seed Summary ---");
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${NEW_PLACES.length}`);

  // Print breakdown by status
  console.log("\n--- By Opening Status ---");
  const byStatus = NEW_PLACES.reduce((acc, p) => {
    acc[p.openingStatus] = (acc[p.openingStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const [status, count] of Object.entries(byStatus)) {
    console.log(`  ${status}: ${count}`);
  }
}

async function main() {
  try {
    await seedNewPlaces();
    console.log("\nSeed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
