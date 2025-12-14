/**
 * Seed Script for Denver Experiences
 *
 * This script seeds the database with experiential venues in Denver:
 * - Creative: glass blowing, pottery, paint & sip, candle making
 * - Active: axe throwing, rock climbing, escape rooms, go karts
 * - Wellness: spa, float tanks, sauna, yoga studios
 * - Entertainment: speakeasy bars, karaoke, VR arcades, board game cafes
 *
 * Usage:
 *   npx ts-node scripts/seed-experiences.ts
 */

import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

interface ExperienceData {
  title: string;
  description: string;
  venueName: string;
  address: string;
  neighborhood: string;
  hours: string;
  priceRange: string;
  tags: string[];
  vibeTags: string[];
  companionTags: string[];
  googleRating?: number;
  googleReviewCount?: number;
  imageUrl?: string;
}

// Creative Experiences
const CREATIVE_EXPERIENCES: ExperienceData[] = [
  {
    title: "Glass Blowing Workshop",
    description: "Create your own glass art piece in a hands-on workshop led by local artists. Perfect for beginners - walk away with a unique ornament or small bowl you made yourself.",
    venueName: "Denver Glass Studio",
    address: "3543 Walnut St, Denver, CO 80205",
    neighborhood: "RiNo",
    hours: "Thu-Sun 10am-6pm",
    priceRange: "$75-120",
    tags: ["glass-blowing", "workshop", "art-studio", "creative", "hands-on"],
    vibeTags: ["date-night", "unique", "artistic"],
    companionTags: ["couples", "friends", "solo"],
    googleRating: 4.8,
    googleReviewCount: 156,
    imageUrl: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800",
  },
  {
    title: "Pottery Class - Wheel Throwing",
    description: "Get your hands dirty in this beginner-friendly pottery class. Learn the basics of wheel throwing and create your own mug, bowl, or vase to take home.",
    venueName: "Clay & Fire Studio",
    address: "2845 Larimer St, Denver, CO 80205",
    neighborhood: "RiNo",
    hours: "Tue-Sat 11am-8pm",
    priceRange: "$55-85",
    tags: ["pottery", "clay", "wheel-throwing", "creative", "crafts", "art-studio"],
    vibeTags: ["relaxing", "date-night", "therapeutic"],
    companionTags: ["couples", "friends", "solo"],
    googleRating: 4.9,
    googleReviewCount: 203,
    imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800",
  },
  {
    title: "Paint & Sip Night",
    description: "Enjoy wine while painting a guided masterpiece! No experience needed - our instructors walk you through every step. BYOB friendly.",
    venueName: "Pinot's Palette",
    address: "1501 S Pearl St, Denver, CO 80210",
    neighborhood: "Platt Park",
    hours: "Daily 6pm-9pm",
    priceRange: "$35-50",
    tags: ["paint-sip", "painting", "wine", "creative", "guided", "art-studio"],
    vibeTags: ["social", "fun", "date-night"],
    companionTags: ["date-night", "friends", "groups"],
    googleRating: 4.6,
    googleReviewCount: 342,
    imageUrl: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800",
  },
  {
    title: "Candle Making Workshop",
    description: "Design and pour your own custom scented candle. Choose from 50+ fragrances and learn the art of candle making from expert chandlers.",
    venueName: "Wicks & Wax Co.",
    address: "3000 E 2nd Ave, Denver, CO 80206",
    neighborhood: "Cherry Creek",
    hours: "Wed-Sun 12pm-7pm",
    priceRange: "$45-65",
    tags: ["candle-making", "crafts", "scented", "creative", "workshop"],
    vibeTags: ["relaxing", "date-night", "cozy"],
    companionTags: ["couples", "friends", "solo"],
    googleRating: 4.7,
    googleReviewCount: 128,
    imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800",
  },
  {
    title: "Terrarium Building Workshop",
    description: "Build your own living terrarium in this relaxing workshop. Learn about plant care and take home your mini ecosystem.",
    venueName: "Plant Shop Co.",
    address: "4500 E Virginia Ave, Denver, CO 80246",
    neighborhood: "Glendale",
    hours: "Sat-Sun 10am-5pm",
    priceRange: "$50-80",
    tags: ["terrarium", "plants", "crafts", "creative", "botanical"],
    vibeTags: ["relaxing", "nature", "mindful"],
    companionTags: ["couples", "friends", "family"],
    googleRating: 4.8,
    googleReviewCount: 89,
    imageUrl: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800",
  },
];

// Active Experiences
const ACTIVE_EXPERIENCES: ExperienceData[] = [
  {
    title: "Axe Throwing Session",
    description: "Channel your inner lumberjack! Learn to throw axes at targets in a fun, competitive environment. Great for groups or competitive dates.",
    venueName: "Bad Axe Throwing",
    address: "3411 N Downing St, Denver, CO 80205",
    neighborhood: "RiNo",
    hours: "Daily 12pm-11pm",
    priceRange: "$25-35/person",
    tags: ["axe-throwing", "active", "competitive", "adventure", "unique"],
    vibeTags: ["adventurous", "fun", "energetic"],
    companionTags: ["groups", "date-night", "friends"],
    googleRating: 4.7,
    googleReviewCount: 567,
    imageUrl: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800",
  },
  {
    title: "Indoor Rock Climbing",
    description: "Scale walls of all difficulty levels at Denver's premier climbing gym. Day passes include gear rental and basic instruction for beginners.",
    venueName: "Movement RiNo",
    address: "2850 Walnut St, Denver, CO 80205",
    neighborhood: "RiNo",
    hours: "Mon-Fri 6am-11pm, Sat-Sun 8am-8pm",
    priceRange: "$22-30/day",
    tags: ["rock-climbing", "climbing", "fitness", "active", "adventure", "indoor"],
    vibeTags: ["energetic", "challenging", "active"],
    companionTags: ["date-night", "friends", "solo"],
    googleRating: 4.8,
    googleReviewCount: 892,
    imageUrl: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800",
  },
  {
    title: "Escape Room Adventure",
    description: "Work together to solve puzzles and escape before time runs out! Multiple themed rooms from spooky to sci-fi. Perfect for team building or friend groups.",
    venueName: "Escapology Denver",
    address: "2076 S University Blvd, Denver, CO 80210",
    neighborhood: "University Hills",
    hours: "Daily 10am-10pm",
    priceRange: "$30-40/person",
    tags: ["escape-room", "puzzles", "teamwork", "adventure", "indoor", "mystery"],
    vibeTags: ["exciting", "challenging", "fun"],
    companionTags: ["groups", "date-night", "friends", "team-building"],
    googleRating: 4.6,
    googleReviewCount: 423,
    imageUrl: "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=800",
  },
  {
    title: "Go Kart Racing",
    description: "High-speed indoor go kart racing on a professional track. Race your friends or compete for the fastest lap time of the day!",
    venueName: "Unser Karting & Events",
    address: "7500 W 61st Ave, Arvada, CO 80003",
    neighborhood: "Arvada",
    hours: "Mon-Thu 12pm-9pm, Fri-Sun 10am-11pm",
    priceRange: "$25-35/race",
    tags: ["go-karts", "racing", "active", "competitive", "adventure", "indoor"],
    vibeTags: ["thrilling", "competitive", "fun"],
    companionTags: ["groups", "date-night", "friends", "family"],
    googleRating: 4.5,
    googleReviewCount: 1234,
    imageUrl: "https://images.unsplash.com/photo-1504446661391-9ff83db7c933?w=800",
  },
  {
    title: "Bowling & Arcade",
    description: "Modern bowling alley with craft cocktails, great food, and a massive arcade. Perfect for a fun night out with friends.",
    venueName: "Punch Bowl Social",
    address: "65 Broadway, Denver, CO 80203",
    neighborhood: "Baker",
    hours: "Sun-Thu 11am-12am, Fri-Sat 11am-2am",
    priceRange: "$15-30/person",
    tags: ["bowling", "arcade", "games", "active", "social"],
    vibeTags: ["social", "fun", "casual"],
    companionTags: ["groups", "date-night", "friends"],
    googleRating: 4.3,
    googleReviewCount: 2156,
    imageUrl: "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=800",
  },
  {
    title: "Trampoline Park",
    description: "Bounce, flip, and play at this massive trampoline park. Features dodgeball courts, ninja courses, and foam pits. Adults-only sessions available.",
    venueName: "Sky Zone Denver",
    address: "11435 Community Center Dr, Northglenn, CO 80233",
    neighborhood: "Northglenn",
    hours: "Mon-Thu 3pm-9pm, Fri 3pm-11pm, Sat 10am-11pm, Sun 11am-8pm",
    priceRange: "$18-30/hour",
    tags: ["trampoline", "jumping", "active", "fun", "indoor"],
    vibeTags: ["energetic", "playful", "fun"],
    companionTags: ["family", "friends", "groups"],
    googleRating: 4.2,
    googleReviewCount: 876,
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800",
  },
  {
    title: "Batting Cages & Mini Golf",
    description: "Classic fun with batting cages for all skill levels and a challenging mini golf course. Great for competitive dates!",
    venueName: "Monster Mini Golf",
    address: "10447 Town Center Dr, Westminster, CO 80021",
    neighborhood: "Westminster",
    hours: "Sun-Thu 10am-9pm, Fri-Sat 10am-11pm",
    priceRange: "$12-20/activity",
    tags: ["batting-cages", "mini-golf", "games", "active", "sports"],
    vibeTags: ["playful", "competitive", "casual"],
    companionTags: ["date-night", "family", "friends"],
    googleRating: 4.4,
    googleReviewCount: 543,
    imageUrl: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800",
  },
];

// Wellness Experiences
const WELLNESS_EXPERIENCES: ExperienceData[] = [
  {
    title: "Float Tank Session",
    description: "Experience weightless relaxation in a sensory deprivation tank. Float in 1000 lbs of Epsom salt for deep meditation and muscle recovery.",
    venueName: "Samana Float Center",
    address: "3700 Tennyson St, Denver, CO 80212",
    neighborhood: "Berkeley",
    hours: "Daily 9am-9pm",
    priceRange: "$65-85/session",
    tags: ["float-tank", "sensory-deprivation", "wellness", "meditation", "relaxation", "spa"],
    vibeTags: ["relaxing", "meditative", "unique"],
    companionTags: ["solo", "couples"],
    googleRating: 4.9,
    googleReviewCount: 312,
    imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800",
  },
  {
    title: "Korean Spa Experience",
    description: "Full-day access to traditional Korean spa with hot tubs, saunas, steam rooms, and cold plunge pools. Optional scrubs and massages available.",
    venueName: "SoJo Spa Club",
    address: "1545 Champa St, Denver, CO 80202",
    neighborhood: "LoDo",
    hours: "Daily 9am-10pm",
    priceRange: "$50-80/day pass",
    tags: ["spa", "sauna", "korean-spa", "wellness", "relaxation", "hot-tub"],
    vibeTags: ["relaxing", "luxurious", "healing"],
    companionTags: ["solo", "couples", "friends"],
    googleRating: 4.6,
    googleReviewCount: 567,
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800",
  },
  {
    title: "Hot Yoga Class",
    description: "Challenge yourself in a heated 95°F studio. Great for flexibility, detox, and stress relief. All levels welcome.",
    venueName: "CorePower Yoga",
    address: "1600 Wynkoop St, Denver, CO 80202",
    neighborhood: "LoDo",
    hours: "Daily 6am-9pm",
    priceRange: "$25-35/class",
    tags: ["yoga", "hot-yoga", "fitness", "wellness", "meditation", "stretching"],
    vibeTags: ["challenging", "mindful", "energizing"],
    companionTags: ["solo", "friends"],
    googleRating: 4.7,
    googleReviewCount: 423,
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
  },
  {
    title: "Sound Bath Meditation",
    description: "Relax deeply as crystal singing bowls and gongs wash over you. A unique meditation experience perfect for stress relief.",
    venueName: "The Wellness Center",
    address: "2401 E Colfax Ave, Denver, CO 80206",
    neighborhood: "Congress Park",
    hours: "Sessions Thu-Sun evenings",
    priceRange: "$35-50/session",
    tags: ["sound-bath", "meditation", "wellness", "spiritual", "relaxation"],
    vibeTags: ["meditative", "peaceful", "unique"],
    companionTags: ["solo", "couples"],
    googleRating: 4.8,
    googleReviewCount: 167,
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
  },
  {
    title: "Infrared Sauna Session",
    description: "Detox and relax in a private infrared sauna pod. Great for muscle recovery, skin health, and overall wellness.",
    venueName: "HigherDOSE",
    address: "2910 E 2nd Ave, Denver, CO 80206",
    neighborhood: "Cherry Creek",
    hours: "Daily 8am-8pm",
    priceRange: "$45-65/30min",
    tags: ["sauna", "infrared", "wellness", "detox", "spa", "recovery"],
    vibeTags: ["relaxing", "healing", "private"],
    companionTags: ["solo", "couples"],
    googleRating: 4.7,
    googleReviewCount: 234,
    imageUrl: "https://images.unsplash.com/photo-1554244933-d876deb6b2ff?w=800",
  },
];

// Entertainment Experiences
const ENTERTAINMENT_EXPERIENCES: ExperienceData[] = [
  {
    title: "Speakeasy Cocktail Bar",
    description: "Step back in time at this hidden prohibition-era bar. Find the secret entrance and enjoy craft cocktails in a dimly lit, vintage atmosphere.",
    venueName: "Williams & Graham",
    address: "3160 Tejon St, Denver, CO 80211",
    neighborhood: "LoHi",
    hours: "Daily 5pm-1am",
    priceRange: "$15-20/cocktail",
    tags: ["speakeasy", "cocktails", "hidden-bar", "vintage", "entertainment"],
    vibeTags: ["romantic", "mysterious", "upscale"],
    companionTags: ["date-night", "couples"],
    googleRating: 4.6,
    googleReviewCount: 1456,
    imageUrl: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800",
  },
  {
    title: "Karaoke Night",
    description: "Sing your heart out in private karaoke rooms! Choose from thousands of songs and enjoy drinks and Asian small plates.",
    venueName: "Voicebox Karaoke",
    address: "2535 15th St, Denver, CO 80211",
    neighborhood: "Highlands",
    hours: "Daily 4pm-2am",
    priceRange: "$40-60/hour per room",
    tags: ["karaoke", "singing", "private-room", "entertainment", "nightlife"],
    vibeTags: ["fun", "social", "party"],
    companionTags: ["groups", "friends", "birthday"],
    googleRating: 4.5,
    googleReviewCount: 678,
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
  },
  {
    title: "VR Arcade Experience",
    description: "Immerse yourself in virtual reality with 30+ games and experiences. From zombie shooters to peaceful exploration games.",
    venueName: "VR Arcade Denver",
    address: "1400 16th St, Denver, CO 80202",
    neighborhood: "LoDo",
    hours: "Mon-Thu 12pm-9pm, Fri-Sun 10am-11pm",
    priceRange: "$30-50/hour",
    tags: ["vr-arcade", "virtual-reality", "gaming", "entertainment", "technology"],
    vibeTags: ["exciting", "futuristic", "immersive"],
    companionTags: ["friends", "date-night", "solo"],
    googleRating: 4.4,
    googleReviewCount: 345,
    imageUrl: "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=800",
  },
  {
    title: "Board Game Cafe",
    description: "Play from a library of 500+ board games while enjoying coffee, craft beer, and delicious snacks. Game gurus on staff to help!",
    venueName: "Tabletop Tap",
    address: "1855 Blake St, Denver, CO 80202",
    neighborhood: "LoDo",
    hours: "Daily 11am-11pm",
    priceRange: "$5 game fee + food/drinks",
    tags: ["board-game", "cafe", "games", "entertainment", "social"],
    vibeTags: ["casual", "fun", "geeky"],
    companionTags: ["friends", "date-night", "groups"],
    googleRating: 4.7,
    googleReviewCount: 456,
    imageUrl: "https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=800",
  },
  {
    title: "Comedy Show",
    description: "Laugh out loud at Denver's best comedy club featuring national headliners and local talent. Two drink minimum.",
    venueName: "Comedy Works",
    address: "1226 15th St, Denver, CO 80202",
    neighborhood: "LoDo",
    hours: "Show times vary",
    priceRange: "$20-50/ticket",
    tags: ["comedy", "stand-up", "live-entertainment", "nightlife", "theater"],
    vibeTags: ["fun", "social", "lively"],
    companionTags: ["date-night", "friends", "groups"],
    googleRating: 4.8,
    googleReviewCount: 2345,
    imageUrl: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800",
  },
  {
    title: "Jazz Club",
    description: "Intimate jazz performances in a classic club setting. Great cocktails and a warm atmosphere. Live music nightly.",
    venueName: "Dazzle Jazz",
    address: "1512 Curtis St, Denver, CO 80202",
    neighborhood: "LoDo",
    hours: "Daily 6pm-12am",
    priceRange: "$10-25 cover + drinks",
    tags: ["jazz", "live-music", "cocktails", "entertainment", "music-venue"],
    vibeTags: ["romantic", "sophisticated", "intimate"],
    companionTags: ["date-night", "couples"],
    googleRating: 4.6,
    googleReviewCount: 789,
    imageUrl: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800",
  },
  {
    title: "Retro Arcade Bar",
    description: "Classic arcade games from the 80s and 90s, pinball machines, and craft beer. All games on free play with cover charge.",
    venueName: "1Up Arcade",
    address: "1925 Blake St, Denver, CO 80202",
    neighborhood: "LoDo",
    hours: "Daily 4pm-2am",
    priceRange: "$5-10 cover, free games",
    tags: ["arcade", "retro", "bar", "games", "entertainment", "pinball"],
    vibeTags: ["nostalgic", "fun", "casual"],
    companionTags: ["date-night", "friends", "groups"],
    googleRating: 4.5,
    googleReviewCount: 1567,
    imageUrl: "https://images.unsplash.com/photo-1511882150382-421056c89033?w=800",
  },
];

async function seedExperiences() {
  console.log("Starting Denver experiences seed...\n");

  // Get Denver city
  const denver = await prisma.city.findUnique({
    where: { slug: "denver" },
  });

  if (!denver) {
    console.error("Denver city not found! Please seed cities first.");
    process.exit(1);
  }

  const allExperiences = [
    ...CREATIVE_EXPERIENCES,
    ...ACTIVE_EXPERIENCES,
    ...WELLNESS_EXPERIENCES,
    ...ENTERTAINMENT_EXPERIENCES,
  ];

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const exp of allExperiences) {
    try {
      // Check if place already exists
      const existing = await prisma.item.findFirst({
        where: {
          type: "PLACE",
          venueName: exp.venueName,
          cityId: denver.id,
        },
      });

      const data = {
        type: "PLACE" as const,
        cityId: denver.id,
        title: exp.title,
        description: exp.description,
        category: "ACTIVITY_VENUE" as Category,
        tags: exp.tags,
        venueName: exp.venueName,
        address: exp.address,
        neighborhood: exp.neighborhood,
        hours: exp.hours,
        priceRange: exp.priceRange,
        source: "pulse-curated",
        vibeTags: exp.vibeTags,
        companionTags: exp.companionTags,
        googleRating: exp.googleRating,
        googleRatingCount: exp.googleReviewCount,
        imageUrl: exp.imageUrl,
      };

      if (existing) {
        await prisma.item.update({
          where: { id: existing.id },
          data,
        });
        console.log(`  Updated: ${exp.title} @ ${exp.venueName}`);
        updated++;
      } else {
        await prisma.item.create({ data });
        console.log(`  Created: ${exp.title} @ ${exp.venueName}`);
        created++;
      }
    } catch (error) {
      console.error(`  Error with ${exp.title}:`, error);
      skipped++;
    }
  }

  console.log("\n--- Seed Summary ---");
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${allExperiences.length}`);

  // Print breakdown by category
  console.log("\n--- By Experience Type ---");
  console.log(`  Creative: ${CREATIVE_EXPERIENCES.length}`);
  console.log(`  Active: ${ACTIVE_EXPERIENCES.length}`);
  console.log(`  Wellness: ${WELLNESS_EXPERIENCES.length}`);
  console.log(`  Entertainment: ${ENTERTAINMENT_EXPERIENCES.length}`);
}

async function main() {
  try {
    await seedExperiences();
    console.log("\nSeed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
