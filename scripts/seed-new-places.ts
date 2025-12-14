/**
 * Seed Script for New & Upcoming Places
 *
 * Real Denver spots with actual images
 *
 * Usage:
 *   npx ts-node scripts/seed-new-places.ts
 */

import { PrismaClient, Category, OpeningStatus } from "@prisma/client";

const prisma = new PrismaClient();

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

// Real Denver places with actual/representative images
const NEW_PLACES = [
  // ============ RECENTLY OPENED ============
  {
    name: "Death & Co Denver",
    address: "1280 25th St, Denver, CO 80205",
    neighborhood: "RiNo",
    category: "BARS" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(14),
    isNew: true,
    isFeatured: true,
    buzzScore: 89,
    conceptDescription: "Award-winning NYC cocktail bar's first Denver outpost. Craft cocktails in a moody, sophisticated atmosphere.",
    priceLevel: 3,
    googleRating: 4.6,
    googleRatingCount: 234,
    primaryImageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80",
    vibeTags: ["craft-cocktails", "date-night", "upscale"],
    newsSource: "Eater Denver",
    newsSourceUrl: "https://denver.eater.com",
    website: "https://www.deathandcompany.com/denver",
  },
  {
    name: "Hop Alley",
    address: "3500 Larimer St, Denver, CO 80205",
    neighborhood: "RiNo",
    category: "RESTAURANT" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(21),
    isNew: true,
    isFeatured: true,
    buzzScore: 76,
    conceptDescription: "Modern Chinese-American restaurant with dim sum, wok dishes, and creative cocktails in a vibrant space.",
    priceLevel: 2,
    googleRating: 4.5,
    googleRatingCount: 189,
    primaryImageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80",
    vibeTags: ["asian-fusion", "groups", "trendy"],
    newsSource: "5280 Magazine",
    newsSourceUrl: "https://5280.com",
  },
  {
    name: "Misaki",
    address: "2500 Lawrence St, Denver, CO 80205",
    neighborhood: "RiNo",
    category: "RESTAURANT" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(10),
    isNew: true,
    isFeatured: true,
    buzzScore: 92,
    conceptDescription: "Intimate 12-seat omakase experience from a Tokyo-trained sushi master. Reservation only.",
    priceLevel: 4,
    googleRating: 4.9,
    googleRatingCount: 67,
    primaryImageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80",
    vibeTags: ["omakase", "fine-dining", "date-night"],
    newsSource: "Westword",
    newsSourceUrl: "https://www.westword.com",
  },
  {
    name: "Retrograde Coffee",
    address: "1801 Blake St, Denver, CO 80202",
    neighborhood: "LoDo",
    category: "COFFEE" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(7),
    isNew: true,
    isFeatured: false,
    buzzScore: 45,
    conceptDescription: "Third-wave coffee shop with house-roasted beans, seasonal drinks, and fresh pastries.",
    priceLevel: 2,
    googleRating: 4.7,
    googleRatingCount: 89,
    primaryImageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
    vibeTags: ["specialty-coffee", "work-friendly", "cozy"],
    newsSource: "303 Magazine",
    newsSourceUrl: "https://303magazine.com",
  },
  {
    name: "Barre3 Cherry Creek",
    address: "2955 E 1st Ave, Denver, CO 80206",
    neighborhood: "Cherry Creek",
    category: "FITNESS" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(18),
    isNew: true,
    isFeatured: false,
    buzzScore: 38,
    conceptDescription: "Signature barre workout combining ballet, yoga, and pilates in a welcoming studio.",
    priceLevel: 3,
    googleRating: 4.8,
    googleRatingCount: 45,
    primaryImageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
    vibeTags: ["barre", "wellness", "boutique-fitness"],
    newsSource: "5280 Magazine",
  },

  // ============ ACTIVITY VENUES ============
  {
    name: "Punch Bowl Social",
    address: "65 Broadway, Denver, CO 80203",
    neighborhood: "Baker",
    category: "ACTIVITY_VENUE" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(30),
    isNew: true,
    isFeatured: true,
    buzzScore: 72,
    conceptDescription: "Massive entertainment venue with bowling, arcade games, karaoke, and craft cocktails.",
    priceLevel: 2,
    googleRating: 4.2,
    googleRatingCount: 3420,
    primaryImageUrl: "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=800&q=80",
    vibeTags: ["games", "groups", "late-night"],
    newsSource: "Denver Post",
    website: "https://www.punchbowlsocial.com/location/denver",
  },
  {
    name: "Topgolf Denver",
    address: "4050 E 62nd Ave, Commerce City, CO 80022",
    neighborhood: "Commerce City",
    category: "ACTIVITY_VENUE" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    isNew: false,
    isFeatured: true,
    buzzScore: 85,
    conceptDescription: "High-tech driving range with climate-controlled bays, full bar, and restaurant.",
    priceLevel: 3,
    googleRating: 4.3,
    googleRatingCount: 8900,
    primaryImageUrl: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80",
    vibeTags: ["golf", "groups", "sports-bar"],
    website: "https://topgolf.com/us/denver/",
  },
  {
    name: "Escapology Denver",
    address: "1529 Champa St, Denver, CO 80202",
    neighborhood: "LoDo",
    category: "ACTIVITY_VENUE" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(45),
    isNew: true,
    isFeatured: false,
    buzzScore: 52,
    conceptDescription: "Immersive escape rooms with Hollywood-quality sets and puzzles. Team building favorite.",
    priceLevel: 3,
    googleRating: 4.9,
    googleRatingCount: 890,
    primaryImageUrl: "https://images.unsplash.com/photo-1590845947670-c009801ffa74?w=800&q=80",
    vibeTags: ["escape-room", "team-building", "date-night"],
    website: "https://escapology.com/denver",
  },
  {
    name: "1UP Arcade Bar - Colfax",
    address: "717 E Colfax Ave, Denver, CO 80203",
    neighborhood: "Capitol Hill",
    category: "ACTIVITY_VENUE" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    isNew: false,
    isFeatured: true,
    buzzScore: 78,
    conceptDescription: "Retro arcade bar with 50+ classic games, pinball machines, and craft beers.",
    priceLevel: 2,
    googleRating: 4.5,
    googleRatingCount: 2340,
    primaryImageUrl: "https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&q=80",
    vibeTags: ["arcade", "retro", "late-night"],
    website: "https://www.the-1up.com/",
  },

  // ============ SOFT OPEN ============
  {
    name: "Citizen Rail",
    address: "1899 16th St, Denver, CO 80202",
    neighborhood: "Union Station",
    category: "RESTAURANT" as Category,
    openingStatus: "SOFT_OPEN" as OpeningStatus,
    announcedDate: daysAgo(60),
    expectedOpenDate: daysFromNow(7),
    isUpcoming: true,
    isFeatured: true,
    buzzScore: 81,
    preOpeningSaves: 156,
    conceptDescription: "Wood-fired American cuisine in a stunning Union Station space. From the Bonanno Concepts team.",
    expectedPriceLevel: 3,
    sneakPeekInfo: "Soft open reservations available via Resy. Full menu being tested.",
    primaryImageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80",
    vibeTags: ["wood-fired", "upscale-casual", "date-night"],
    socialLinks: { instagram: "@citizenraildenver" },
    newsSource: "Eater Denver",
  },
  {
    name: "Milkbox Ice Creamery",
    address: "1875 Lawrence St, Denver, CO 80202",
    neighborhood: "LoDo",
    category: "FOOD" as Category,
    openingStatus: "SOFT_OPEN" as OpeningStatus,
    announcedDate: daysAgo(30),
    expectedOpenDate: daysFromNow(5),
    isUpcoming: true,
    isFeatured: false,
    buzzScore: 42,
    preOpeningSaves: 78,
    conceptDescription: "Small-batch ice cream using local dairy and seasonal Colorado ingredients.",
    expectedPriceLevel: 2,
    sneakPeekInfo: "Testing limited flavors. Cash only during soft open.",
    primaryImageUrl: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&q=80",
    vibeTags: ["dessert", "local", "family-friendly"],
    socialLinks: { instagram: "@milkboxicecream" },
  },

  // ============ COMING SOON ============
  {
    name: "The Bindery",
    address: "1817 Central St, Denver, CO 80211",
    neighborhood: "LoHi",
    category: "RESTAURANT" as Category,
    openingStatus: "COMING_SOON" as OpeningStatus,
    announcedDate: daysAgo(45),
    expectedOpenDate: daysFromNow(21),
    isUpcoming: true,
    isFeatured: true,
    buzzScore: 88,
    preOpeningSaves: 234,
    conceptDescription: "James Beard-nominated restaurant relocating with expanded menu and bakery program.",
    expectedPriceLevel: 3,
    primaryImageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80",
    vibeTags: ["new-american", "brunch", "pastries"],
    socialLinks: { instagram: "@thebinderydenver" },
    newsSource: "5280 Magazine",
    newsSourceUrl: "https://5280.com",
  },
  {
    name: "Meow Wolf Denver",
    address: "1338 1st St, Denver, CO 80204",
    neighborhood: "Sun Valley",
    category: "ART" as Category,
    openingStatus: "COMING_SOON" as OpeningStatus,
    announcedDate: daysAgo(180),
    expectedOpenDate: daysFromNow(60),
    isUpcoming: true,
    isFeatured: true,
    buzzScore: 97,
    preOpeningSaves: 892,
    conceptDescription: "Massive immersive art experience spanning 90,000 sq ft. Denver's most anticipated opening.",
    expectedPriceLevel: 3,
    primaryImageUrl: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=800&q=80",
    vibeTags: ["immersive-art", "instagram-worthy", "family-friendly"],
    socialLinks: { instagram: "@meaboredwolf", twitter: "@meowwolf" },
    newsSource: "Denver Post",
    newsSourceUrl: "https://www.denverpost.com",
  },
  {
    name: "F45 Training Union Station",
    address: "1701 Wynkoop St, Denver, CO 80202",
    neighborhood: "Union Station",
    category: "FITNESS" as Category,
    openingStatus: "COMING_SOON" as OpeningStatus,
    announcedDate: daysAgo(30),
    expectedOpenDate: daysFromNow(14),
    isUpcoming: true,
    isFeatured: false,
    buzzScore: 35,
    preOpeningSaves: 67,
    conceptDescription: "High-intensity group training studio with 45-minute functional workouts.",
    expectedPriceLevel: 3,
    primaryImageUrl: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80",
    vibeTags: ["hiit", "group-fitness", "community"],
    socialLinks: { instagram: "@f45training" },
  },
  {
    name: "Avanti F&B 2.0",
    address: "3200 N Pecos St, Denver, CO 80211",
    neighborhood: "LoHi",
    category: "FOOD" as Category,
    openingStatus: "COMING_SOON" as OpeningStatus,
    announcedDate: daysAgo(60),
    expectedOpenDate: daysFromNow(45),
    isUpcoming: true,
    isFeatured: true,
    buzzScore: 72,
    preOpeningSaves: 189,
    conceptDescription: "Expanded food hall concept with rooftop bar and 8 new restaurant stalls.",
    expectedPriceLevel: 2,
    primaryImageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
    vibeTags: ["food-hall", "rooftop", "variety"],
    socialLinks: { instagram: "@avaboredantifandb" },
    newsSource: "Westword",
  },

  // ============ MORE ACTIVITY VENUES ============
  {
    name: "Axe & Oak Whiskey House",
    address: "3330 Brighton Blvd, Denver, CO 80216",
    neighborhood: "RiNo",
    category: "ACTIVITY_VENUE" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(25),
    isNew: true,
    isFeatured: false,
    buzzScore: 58,
    conceptDescription: "Axe throwing lanes combined with craft whiskey bar. Perfect for groups.",
    priceLevel: 2,
    googleRating: 4.6,
    googleRatingCount: 345,
    primaryImageUrl: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&q=80",
    vibeTags: ["axe-throwing", "whiskey", "groups"],
  },
  {
    name: "Denver Selfie Museum",
    address: "821 17th St, Denver, CO 80202",
    neighborhood: "Downtown",
    category: "ART" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(35),
    isNew: true,
    isFeatured: false,
    buzzScore: 44,
    conceptDescription: "Interactive photo experience with 20+ themed rooms. Instagram paradise.",
    priceLevel: 2,
    googleRating: 4.3,
    googleRatingCount: 234,
    primaryImageUrl: "https://images.unsplash.com/photo-1604871000636-074fa5117945?w=800&q=80",
    vibeTags: ["instagram", "interactive", "groups"],
    website: "https://denverselfiemuseum.com",
  },
  {
    name: "FlyteCo Brewing + Taproom",
    address: "4499 W 38th Ave, Denver, CO 80212",
    neighborhood: "Berkeley",
    category: "BARS" as Category,
    openingStatus: "OPEN" as OpeningStatus,
    openedDate: daysAgo(20),
    isNew: true,
    isFeatured: false,
    buzzScore: 52,
    conceptDescription: "Aviation-themed brewery in a converted airplane hangar with flight simulators.",
    priceLevel: 2,
    googleRating: 4.5,
    googleRatingCount: 567,
    primaryImageUrl: "https://images.unsplash.com/photo-1559526324-593bc073d938?w=800&q=80",
    vibeTags: ["brewery", "unique-venue", "family-friendly"],
    website: "https://flytecobrewing.com",
  },
];

async function seedNewPlaces() {
  console.log("Starting new places seed...\n");

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const placeData of NEW_PLACES) {
    try {
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
        website: placeData.website,
      };

      if (existing) {
        await prisma.place.update({
          where: { id: existing.id },
          data,
        });
        console.log(`  Updated: ${placeData.name} (${placeData.category})`);
        updated++;
      } else {
        await prisma.place.create({ data });
        console.log(`  Created: ${placeData.name} (${placeData.category})`);
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

  // Print breakdown by category
  console.log("\n--- By Category ---");
  const byCategory = NEW_PLACES.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`  ${cat}: ${count}`);
  }

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
