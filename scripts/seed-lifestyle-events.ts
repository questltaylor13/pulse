/**
 * Seed Script for Dog-Friendly and Sober-Friendly Events
 *
 * Creates sample events with lifestyle attributes for testing
 * the dog-friendly and sober-friendly features.
 *
 * Usage:
 *   npx ts-node scripts/seed-lifestyle-events.ts
 */

import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

interface LifestyleEvent {
  title: string;
  description: string;
  category: Category;
  venueName: string;
  address: string;
  neighborhood: string;
  startTime: Date;
  endTime: Date;
  priceRange: string;
  source: string;
  sourceUrl: string;
  tags: string[];
  imageUrl: string;
  // Dog-friendly fields
  isDogFriendly?: boolean;
  dogFriendlyDetails?: string;
  // Sober-friendly fields
  isDrinkingOptional?: boolean;
  isAlcoholFree?: boolean;
  soberFriendlyNotes?: string;
}

// Create dates for the next 2 weeks
const today = new Date();
const getEventDate = (daysFromNow: number, hour: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const LIFESTYLE_EVENTS: LifestyleEvent[] = [
  // Dog-Friendly Events
  {
    title: "Paws in the Park - Dog Social Hour",
    description: "Bring your furry friend for a fun afternoon at City Park! Dogs of all sizes welcome. Off-leash areas available, water stations, and treats provided.",
    category: "OUTDOORS",
    venueName: "City Park",
    address: "2001 Colorado Blvd, Denver, CO 80205",
    neighborhood: "City Park",
    startTime: getEventDate(3, 10),
    endTime: getEventDate(3, 13),
    priceRange: "Free",
    source: "pulse-seed",
    sourceUrl: "https://pulse.denver",
    tags: ["dog-friendly", "outdoor", "social", "park", "family-friendly"],
    imageUrl: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800",
    isDogFriendly: true,
    dogFriendlyDetails: "Off-leash areas, water bowls, treats provided. All breeds welcome!",
    isDrinkingOptional: true,
    soberFriendlyNotes: "No alcohol at this event",
  },
  {
    title: "Yappy Hour at The Watering Bowl",
    description: "Denver's favorite dog bar hosts their weekly yappy hour! Enjoy craft beers while your pup plays in the indoor/outdoor dog park.",
    category: "BARS",
    venueName: "The Watering Bowl",
    address: "5411 Leetsdale Dr, Denver, CO 80246",
    neighborhood: "Glendale",
    startTime: getEventDate(5, 17),
    endTime: getEventDate(5, 20),
    priceRange: "$10 entry",
    source: "pulse-seed",
    sourceUrl: "https://pulse.denver",
    tags: ["dog-friendly", "happy-hour", "bar", "social"],
    imageUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800",
    isDogFriendly: true,
    dogFriendlyDetails: "Indoor/outdoor dog park with full bar. Dogs must be vaccinated.",
    isDrinkingOptional: true,
    soberFriendlyNotes: "Great mocktail menu available, many non-drinkers attend for the dogs",
  },
  {
    title: "Dog-Friendly Brewery Tour - Odell Brewing",
    description: "Take a behind-the-scenes tour of Odell Brewing with your four-legged friend! Sample seasonal releases and explore the dog-friendly patio.",
    category: "FOOD",
    venueName: "Odell Brewing Company",
    address: "800 E Lincoln Ave, Fort Collins, CO 80524",
    neighborhood: "Fort Collins",
    startTime: getEventDate(7, 14),
    endTime: getEventDate(7, 16),
    priceRange: "$15",
    source: "pulse-seed",
    sourceUrl: "https://pulse.denver",
    tags: ["brewery", "dog-friendly", "tour", "craft-beer"],
    imageUrl: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800",
    isDogFriendly: true,
    dogFriendlyDetails: "Dogs welcome on patio and garden areas. Leashes required.",
    isDrinkingOptional: true,
    soberFriendlyNotes: "Non-alcoholic options and root beer floats available",
  },

  // Sober-Friendly Events (Alcohol-Free)
  {
    title: "Sunrise Yoga at Red Rocks",
    description: "Start your day with an inspiring sunrise yoga session at the iconic Red Rocks Amphitheatre. All levels welcome. Coffee and tea provided.",
    category: "FITNESS",
    venueName: "Red Rocks Amphitheatre",
    address: "18300 W Alameda Pkwy, Morrison, CO 80465",
    neighborhood: "Morrison",
    startTime: getEventDate(2, 6),
    endTime: getEventDate(2, 8),
    priceRange: "$35",
    source: "pulse-seed",
    sourceUrl: "https://pulse.denver",
    tags: ["yoga", "sunrise", "outdoor", "wellness", "meditation"],
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800",
    isAlcoholFree: true,
    soberFriendlyNotes: "Completely alcohol-free wellness event. Herbal tea and coffee served.",
  },
  {
    title: "Sober Social - Game Night at Dumb Friends League",
    description: "A fun, alcohol-free social event with board games, snacks, and adoptable pets! Connect with like-minded people in a relaxed environment.",
    category: "OTHER",
    venueName: "Dumb Friends League",
    address: "2080 S Quebec St, Denver, CO 80231",
    neighborhood: "Quebec Street",
    startTime: getEventDate(4, 18),
    endTime: getEventDate(4, 21),
    priceRange: "$10",
    source: "pulse-seed",
    sourceUrl: "https://pulse.denver",
    tags: ["sober-friendly", "game-night", "social", "community"],
    imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800",
    isAlcoholFree: true,
    soberFriendlyNotes: "100% alcohol-free event. All proceeds support animal rescue.",
    isDogFriendly: true,
    dogFriendlyDetails: "Well-behaved dogs welcome! Meet adoptable animals too.",
  },
  {
    title: "Mocktail Mixology Class",
    description: "Learn to craft delicious non-alcoholic cocktails from expert mixologists. Take home recipes and enjoy an evening of creativity.",
    category: "FOOD",
    venueName: "The Stanley Marketplace",
    address: "2501 Dallas St, Aurora, CO 80010",
    neighborhood: "Stanley",
    startTime: getEventDate(6, 19),
    endTime: getEventDate(6, 21),
    priceRange: "$45",
    source: "pulse-seed",
    sourceUrl: "https://pulse.denver",
    tags: ["mocktails", "class", "sober-friendly", "cooking"],
    imageUrl: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=800",
    isAlcoholFree: true,
    soberFriendlyNotes: "Alcohol-free mixology class. Learn 5 signature mocktail recipes.",
  },

  // Sober-Friendly Events (Drinking Optional)
  {
    title: "First Friday Art Walk - RiNo",
    description: "Explore Denver's art district with gallery openings, live music, and street performers. Most galleries offer both alcoholic and non-alcoholic refreshments.",
    category: "ART",
    venueName: "RiNo Art District",
    address: "2901 Blake St, Denver, CO 80205",
    neighborhood: "RiNo",
    startTime: getEventDate(1, 17),
    endTime: getEventDate(1, 21),
    priceRange: "Free",
    source: "pulse-seed",
    sourceUrl: "https://pulse.denver",
    tags: ["art", "gallery", "first-friday", "community", "free"],
    imageUrl: "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800",
    isDrinkingOptional: true,
    soberFriendlyNotes: "Art is the focus! Most venues have non-alcoholic options. Zero pressure to drink.",
    isDogFriendly: true,
    dogFriendlyDetails: "Outdoor portions are dog-friendly. Some galleries allow dogs too.",
  },
  {
    title: "Jazz at Jack's - Live Music Night",
    description: "Enjoy world-class jazz in an intimate setting. Full bar and menu available, but the music is the star of the show.",
    category: "LIVE_MUSIC",
    venueName: "Jack's Jazz Club",
    address: "1234 Larimer St, Denver, CO 80204",
    neighborhood: "LoDo",
    startTime: getEventDate(8, 20),
    endTime: getEventDate(8, 23),
    priceRange: "$25",
    source: "pulse-seed",
    sourceUrl: "https://pulse.denver",
    tags: ["jazz", "live-music", "intimate", "nightlife"],
    imageUrl: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800",
    isDrinkingOptional: true,
    soberFriendlyNotes: "Great coffee and mocktail menu. Music-focused atmosphere, no drinking pressure.",
  },
  {
    title: "Comedy Night at Punch Line",
    description: "Laugh your heart out with Denver's best stand-up comedians. Two-drink minimum includes soft drinks and mocktails!",
    category: "OTHER",
    venueName: "Punch Line Comedy Club",
    address: "1617 Wazee St, Denver, CO 80202",
    neighborhood: "LoDo",
    startTime: getEventDate(9, 19),
    endTime: getEventDate(9, 22),
    priceRange: "$20",
    source: "pulse-seed",
    sourceUrl: "https://pulse.denver",
    tags: ["comedy", "stand-up", "nightlife", "entertainment"],
    imageUrl: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800",
    isDrinkingOptional: true,
    soberFriendlyNotes: "Two-drink minimum can be fulfilled with mocktails, sodas, or coffee!",
  },

  // Combined: Dog-Friendly AND Sober-Friendly
  {
    title: "Mindful Mornings - Meditation in the Park with Pups",
    description: "A peaceful morning of guided meditation in Cheesman Park. Dogs are welcome to join this calming experience. Tea and healthy snacks provided.",
    category: "FITNESS",
    venueName: "Cheesman Park",
    address: "1599 E 8th Ave, Denver, CO 80218",
    neighborhood: "Cheesman Park",
    startTime: getEventDate(10, 7),
    endTime: getEventDate(10, 9),
    priceRange: "$15",
    source: "pulse-seed",
    sourceUrl: "https://pulse.denver",
    tags: ["meditation", "dog-friendly", "wellness", "morning", "park"],
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
    isDogFriendly: true,
    dogFriendlyDetails: "Well-behaved dogs welcome. Bring a leash and water bowl.",
    isAlcoholFree: true,
    soberFriendlyNotes: "Alcohol-free wellness event. Herbal teas and healthy snacks provided.",
  },
];

async function seedLifestyleEvents() {
  console.log("Starting lifestyle events seed...\n");

  // Get or create Denver city
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

  console.log(`Using city: ${city.name} (${city.id})\n`);

  let created = 0;
  let updated = 0;

  for (const eventData of LIFESTYLE_EVENTS) {
    const existingEvent = await prisma.event.findFirst({
      where: {
        title: eventData.title,
        source: eventData.source,
      },
    });

    if (existingEvent) {
      await prisma.event.update({
        where: { id: existingEvent.id },
        data: {
          ...eventData,
          cityId: city.id,
        },
      });
      console.log(`  Updated: ${eventData.title}`);
      updated++;
    } else {
      await prisma.event.create({
        data: {
          ...eventData,
          cityId: city.id,
        },
      });
      console.log(`  Created: ${eventData.title}`);
      created++;
    }
  }

  console.log("\n--- Seed Summary ---");
  console.log(`  Total events: ${LIFESTYLE_EVENTS.length}`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);

  // Summary by type
  const dogFriendlyCount = LIFESTYLE_EVENTS.filter((e) => e.isDogFriendly).length;
  const alcoholFreeCount = LIFESTYLE_EVENTS.filter((e) => e.isAlcoholFree).length;
  const drinkingOptionalCount = LIFESTYLE_EVENTS.filter((e) => e.isDrinkingOptional).length;

  console.log(`\n  Dog-Friendly Events: ${dogFriendlyCount}`);
  console.log(`  Alcohol-Free Events: ${alcoholFreeCount}`);
  console.log(`  Drinking Optional Events: ${drinkingOptionalCount}`);
}

async function main() {
  try {
    await seedLifestyleEvents();
    console.log("\nLifestyle events seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
