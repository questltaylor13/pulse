/**
 * Seed Script for Pulse Labs
 *
 * Seeds realistic Denver builder community events:
 * - Real projects (Nuro, Humn)
 * - Builder meetups
 * - Coworking sessions
 * - Workshops
 * - Get Involved opportunities
 *
 * Usage:
 *   npx ts-node scripts/seed-labs.ts
 */

import { PrismaClient, LabsItemType, LabsItemStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Helper functions for dates
function nextWednesday6pm(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntilWednesday = (3 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilWednesday);
  next.setHours(18, 0, 0, 0);
  return next;
}

function nextWednesday8pm(): Date {
  const date = nextWednesday6pm();
  date.setHours(20, 0, 0, 0);
  return date;
}

function nextThursday9am(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntilThursday = (4 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilThursday);
  next.setHours(9, 0, 0, 0);
  return next;
}

function nextThursday1pm(): Date {
  const date = nextThursday9am();
  date.setHours(13, 0, 0, 0);
  return date;
}

function everyTuesday8am(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntilTuesday = (2 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilTuesday);
  next.setHours(8, 0, 0, 0);
  return next;
}

function everyTuesday11am(): Date {
  const date = everyTuesday8am();
  date.setHours(11, 0, 0, 0);
  return date;
}

function lastFridayOfMonth5pm(): Date {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const day = lastDay.getDay();
  const diff = day >= 5 ? day - 5 : day + 2;
  lastDay.setDate(lastDay.getDate() - diff);
  lastDay.setHours(17, 0, 0, 0);
  return lastDay;
}

function lastFridayOfMonth7pm(): Date {
  const date = lastFridayOfMonth5pm();
  date.setHours(19, 0, 0, 0);
  return date;
}

interface LabsItemData {
  title: string;
  description: string;
  type: LabsItemType;
  startTime: Date | null;
  endTime: Date | null;
  venueName: string | null;
  address: string | null;
  neighborhood: string | null;
  isVirtual: boolean;
  virtualLink: string | null;
  tags: string[];
  imageUrl: string | null;
  hostName: string | null;
  hostImageUrl: string | null;
  capacity: number | null;
  spotsLeft: number | null;
  status: LabsItemStatus;
}

const LABS_ITEMS: LabsItemData[] = [
  // 1. Nuro Beta Testers (Quest's App - Real)
  {
    title: "Nuro Beta Testers Wanted",
    description: "Looking for beta testers for Nuro - a voice-first journaling app for people who think while they move. If you have ADHD, go on walking meetings, or process thoughts while moving, this is for you. Get early access and help shape the product.",
    type: "GET_INVOLVED",
    startTime: null,
    endTime: null,
    venueName: null,
    address: null,
    neighborhood: null,
    isVirtual: true,
    virtualLink: "https://nuro.app/beta",
    tags: ["beta-testing", "app", "adhd", "journaling", "voice"],
    imageUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800",
    hostName: "Quest Taylor",
    hostImageUrl: "/images/creators/quest.jpg",
    capacity: null,
    spotsLeft: null,
    status: "ACTIVE",
  },

  // 2. Humn Gym - Omar's Project (Real)
  {
    title: "Humn: The Future of Fitness in Denver",
    description: "Omar Romero is building Humn - a new kind of gym experience focused on what it truly means to be human. Not just another fitness center, but a space designed for holistic human performance. Come meet Omar, hear the vision, and get early access to founding memberships.",
    type: "STARTUP_EVENT",
    startTime: new Date("2026-01-18T11:00:00"),
    endTime: new Date("2026-01-18T13:00:00"),
    venueName: "TBD - Denver Location",
    address: null,
    neighborhood: "RiNo",
    isVirtual: false,
    virtualLink: null,
    tags: ["fitness", "gym", "wellness", "founding-member", "health"],
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800",
    hostName: "Omar Romero",
    hostImageUrl: null,
    capacity: 30,
    spotsLeft: 18,
    status: "ACTIVE",
  },

  // 3. Beta Testing Swap
  {
    title: "Beta Testing Swap",
    description: "Bring your app, get feedback. Test someone else's, give feedback. Simple. Each founder gets 15 minutes of live user testing from other builders who actually understand product. Limited to 10 founders so everyone gets quality time.",
    type: "BUILDER_MEETUP",
    startTime: nextWednesday6pm(),
    endTime: nextWednesday8pm(),
    venueName: "Galvanize",
    address: "1062 Delaware St",
    neighborhood: "Golden Triangle",
    isVirtual: false,
    virtualLink: null,
    tags: ["beta-testing", "feedback", "product", "founders"],
    imageUrl: "https://images.unsplash.com/photo-1531498860502-7c67cf02f657?w=800",
    hostName: "Denver Product Club",
    hostImageUrl: null,
    capacity: 10,
    spotsLeft: 4,
    status: "ACTIVE",
  },

  // 4. Workshop: Building in Public
  {
    title: "Workshop: Building in Public",
    description: "Learn how to share your journey without being cringe. We'll cover Twitter/X strategy, what to share vs what to keep private, how to build an audience while building a product, and why vulnerability beats polish. Bring your laptop - you'll tweet before you leave.",
    type: "WORKSHOP",
    startTime: new Date("2026-01-22T18:00:00"),
    endTime: new Date("2026-01-22T20:00:00"),
    venueName: "WeWork Tabor Center",
    address: "1200 17th St",
    neighborhood: "Downtown",
    isVirtual: false,
    virtualLink: null,
    tags: ["building-in-public", "twitter", "marketing", "founders"],
    imageUrl: "https://images.unsplash.com/photo-1552581234-26160f608093?w=800",
    hostName: "Denver Indie Hackers",
    hostImageUrl: null,
    capacity: 25,
    spotsLeft: 12,
    status: "ACTIVE",
  },

  // 5. No-Code Builders Meetup
  {
    title: "No-Code Builders Meetup",
    description: "Bubble, Webflow, Glide, Softr, Airtable - if you're building without writing code, this is your crew. Share what you're building, get unstuck on technical challenges, and meet other non-technical founders shipping real products.",
    type: "BUILDER_MEETUP",
    startTime: new Date("2026-01-16T17:30:00"),
    endTime: new Date("2026-01-16T19:30:00"),
    venueName: "Ratio Beerworks",
    address: "2920 Larimer St",
    neighborhood: "RiNo",
    isVirtual: false,
    virtualLink: null,
    tags: ["no-code", "bubble", "webflow", "founders", "non-technical"],
    imageUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800",
    hostName: "Denver No-Code",
    hostImageUrl: null,
    capacity: 30,
    spotsLeft: 18,
    status: "ACTIVE",
  },

  // 6. Founder Coffee - Weekly Coworking
  {
    title: "Founder Coffee",
    description: "Every Tuesday morning, founders take over the back of Little Owl. Work on your startup, grab a coffee, meet someone new. No agenda, no pitching, just good vibes and productivity. Come for 30 mins or 3 hours.",
    type: "COWORKING_SESSION",
    startTime: everyTuesday8am(),
    endTime: everyTuesday11am(),
    venueName: "Little Owl Coffee",
    address: "1555 Blake St",
    neighborhood: "LoDo",
    isVirtual: false,
    virtualLink: null,
    tags: ["coworking", "coffee", "founders", "weekly"],
    imageUrl: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800",
    hostName: "Denver Founders",
    hostImageUrl: null,
    capacity: 15,
    spotsLeft: 8,
    status: "ACTIVE",
  },

  // 7. Workshop: From Side Project to Startup
  {
    title: "Workshop: From Side Project to Startup",
    description: "You've built something. People are using it. Now what? This workshop covers the transition from side project to real company - when to quit your job, how to validate you have a business (not just a product), early revenue strategies, and the mental shift required.",
    type: "WORKSHOP",
    startTime: new Date("2026-01-25T10:00:00"),
    endTime: new Date("2026-01-25T13:00:00"),
    venueName: "Galvanize",
    address: "1062 Delaware St",
    neighborhood: "Golden Triangle",
    isVirtual: false,
    virtualLink: null,
    tags: ["side-project", "startup", "career", "founders"],
    imageUrl: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800",
    hostName: "Techstars Boulder",
    hostImageUrl: null,
    capacity: 30,
    spotsLeft: 9,
    status: "ACTIVE",
  },

  // 8. AI Product Builders
  {
    title: "AI Product Builders",
    description: "Not another AI hype meetup. This is for people actually building products with AI - wrappers welcome. Share prompts, discuss fine-tuning, debate build vs buy, and figure out what's actually useful vs what's just cool demos.",
    type: "BUILDER_MEETUP",
    startTime: new Date("2026-01-21T18:00:00"),
    endTime: new Date("2026-01-21T20:00:00"),
    venueName: "Industry Denver",
    address: "3001 Brighton Blvd",
    neighborhood: "RiNo",
    isVirtual: false,
    virtualLink: null,
    tags: ["ai", "product", "builders", "llm", "tech"],
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800",
    hostName: "Denver AI Builders",
    hostImageUrl: null,
    capacity: 35,
    spotsLeft: 14,
    status: "ACTIVE",
  },

  // 9. Get Involved: Startup Week Volunteers
  {
    title: "Denver Startup Week 2026 - Volunteers Needed",
    description: "Denver Startup Week is the largest free entrepreneurial event in North America and we need people like you to make it happen. Roles include registration, speaker support, event setup, and more. Get behind-the-scenes access and meet the whole ecosystem.",
    type: "GET_INVOLVED",
    startTime: new Date("2026-09-15T08:00:00"),
    endTime: null,
    venueName: null,
    address: null,
    neighborhood: null,
    isVirtual: false,
    virtualLink: "https://denverstartupweek.org/volunteer",
    tags: ["volunteer", "startup-week", "community", "networking"],
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
    hostName: "Denver Startup Week",
    hostImageUrl: null,
    capacity: null,
    spotsLeft: null,
    status: "ACTIVE",
  },

  // 10. Get Involved: Office Hours Mentor
  {
    title: "Give Office Hours to Early Founders",
    description: "Share 1 hour/month with founders who are where you were 2 years ago. We match you based on expertise - product, fundraising, hiring, sales, whatever you're good at. Low commitment, high impact.",
    type: "GET_INVOLVED",
    startTime: null,
    endTime: null,
    venueName: null,
    address: null,
    neighborhood: null,
    isVirtual: true,
    virtualLink: "https://denverfoundernetwork.com/mentor",
    tags: ["mentorship", "office-hours", "give-back", "founders"],
    imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800",
    hostName: "Denver Founders Network",
    hostImageUrl: null,
    capacity: null,
    spotsLeft: null,
    status: "ACTIVE",
  },

  // 11. Demo Day Watch Party
  {
    title: "YC Demo Day Watch Party",
    description: "W26 batch is presenting. Let's watch together, roast the pitches, and discuss what's fundable these days. Drinks provided. Hot takes encouraged.",
    type: "STARTUP_EVENT",
    startTime: new Date("2026-03-15T11:00:00"),
    endTime: new Date("2026-03-15T14:00:00"),
    venueName: "Galvanize",
    address: "1062 Delaware St",
    neighborhood: "Golden Triangle",
    isVirtual: false,
    virtualLink: null,
    tags: ["yc", "demo-day", "startups", "funding"],
    imageUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800",
    hostName: "Denver Founders",
    hostImageUrl: null,
    capacity: 50,
    spotsLeft: 31,
    status: "ACTIVE",
  },

  // 12. Solopreneur Sanity Check
  {
    title: "Solopreneur Sanity Check",
    description: "Building alone is hard. Once a month, solopreneurs get together to share wins, vent frustrations, and make sure we're not going crazy. Informal, supportive, no investors allowed.",
    type: "BUILDER_MEETUP",
    startTime: lastFridayOfMonth5pm(),
    endTime: lastFridayOfMonth7pm(),
    venueName: "Cerebral Brewing",
    address: "1477 Monroe St",
    neighborhood: "Congress Park",
    isVirtual: false,
    virtualLink: null,
    tags: ["solopreneur", "mental-health", "founders", "community"],
    imageUrl: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800",
    hostName: "Solo Denver",
    hostImageUrl: null,
    capacity: 20,
    spotsLeft: 11,
    status: "ACTIVE",
  },

  // 13. Thursday Builders Session
  {
    title: "Thursday Builders Session",
    description: "Work alongside other founders and builders at Industry Denver. Great wifi, good coffee, and interesting people. Drop in anytime between 9am-1pm.",
    type: "COWORKING_SESSION",
    startTime: nextThursday9am(),
    endTime: nextThursday1pm(),
    venueName: "Industry Denver",
    address: "3001 Brighton Blvd",
    neighborhood: "RiNo",
    isVirtual: false,
    virtualLink: null,
    tags: ["coworking", "founders", "remote-work"],
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
    hostName: "Denver Founders",
    hostImageUrl: null,
    capacity: 20,
    spotsLeft: 12,
    status: "ACTIVE",
  },
];

async function seedLabs() {
  console.log("Seeding Pulse Labs items...\n");

  // Clear existing labs items
  console.log("Clearing existing Labs items...");
  await prisma.labsSave.deleteMany({});
  await prisma.labsRSVP.deleteMany({});
  await prisma.labsItem.deleteMany({});

  let created = 0;

  for (const item of LABS_ITEMS) {
    try {
      await prisma.labsItem.create({
        data: {
          ...item,
          citySlug: "denver",
        },
      });
      console.log(`  Created: ${item.title}`);
      created++;
    } catch (error) {
      console.error(`  Error with ${item.title}:`, error);
    }
  }

  console.log("\n--- Seed Summary ---");
  console.log(`  Created: ${created}`);
  console.log(`  Total: ${LABS_ITEMS.length}`);

  // Print breakdown by type
  const byType = LABS_ITEMS.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\n--- By Item Type ---");
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
}

async function main() {
  try {
    await seedLabs();
    console.log("\nLabs seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
