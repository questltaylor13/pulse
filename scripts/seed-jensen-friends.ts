/**
 * Seed fake friends for Jensen to make the platform feel alive.
 * Creates user accounts, friendships, saves, and group membership.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-jensen-friends.ts
 */

import { PrismaClient, Category, RelationshipStatus, PreferenceType } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const FRIENDS = [
  {
    email: "sarah@pulse.local",
    name: "Sarah Chen",
    username: "sarahchen",
    bio: "Yoga instructor by day, concert-goer by night. Always looking for the next outdoor adventure.",
    relationshipStatus: "SINGLE" as RelationshipStatus,
    profileImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    likedCategories: ["FITNESS", "OUTDOORS", "LIVE_MUSIC", "WELLNESS"] as Category[],
    savedEventTitles: [
      "Red Rocks Fitness \u2014 Stair Workout",
      "Colorado Mountain Club \u2014 Group Hike: South Table Mountain",
      "Meow Wolf Denver \u2014 Convergence Station",
      "Cooldown Running Club",
    ],
  },
  {
    email: "marcus@pulse.local",
    name: "Marcus Rivera",
    username: "marcusriv",
    bio: "Cycling nerd and craft coffee snob. If there's a group ride happening, I'm probably there.",
    relationshipStatus: "SINGLE" as RelationshipStatus,
    profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    likedCategories: ["FITNESS", "OUTDOORS", "COFFEE", "SOCIAL"] as Category[],
    savedEventTitles: [
      "Denver Cycling Club (DCC)",
      "Lookout Mountain Hill Climb \u2014 Tuesday Ride",
      "Cherry Creek Bike Path \u2014 Group Ride",
      "Denver Bouldering Club",
      "Denver Pork Circuit Series \u2014 2-Mile Race",
    ],
  },
  {
    email: "alex@pulse.local",
    name: "Alex Kim",
    username: "alexkim",
    bio: "New to Denver. Trying to do every weird thing this city has. Curling was last week, axe throwing is next.",
    relationshipStatus: "SINGLE" as RelationshipStatus,
    profileImageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80",
    likedCategories: ["ACTIVITY_VENUE", "SOCIAL", "COMEDY", "FOOD"] as Category[],
    savedEventTitles: [
      "Archery Games Denver",
      "Denver Curling Club",
      "Bad Axe Throwing \u2014 Downtown Denver",
      "All Out Smash",
      "EscapeWorks Denver",
      "RISE Comedy",
    ],
  },
  {
    email: "taylor@pulse.local",
    name: "Taylor Morgan",
    username: "taylormorgan",
    bio: "Art nerd + social butterfly. RiNo is my neighborhood. Always down for a gallery opening or pottery class.",
    relationshipStatus: "COUPLE" as RelationshipStatus,
    profileImageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80",
    likedCategories: ["ART", "SOCIAL", "COMEDY", "FOOD"] as Category[],
    savedEventTitles: [
      "RiNo Art Walk",
      "Community Clay Denver",
      "Denver Art Museum",
      "Comedy Works Downtown",
      "Meow Wolf Denver \u2014 Convergence Station",
    ],
  },
  {
    email: "jordan@pulse.local",
    name: "Jordan Patel",
    username: "jordanp",
    bio: "Run club regular, pickleball addict, and weekend warrior. Looking for people to do stuff with.",
    relationshipStatus: "SINGLE" as RelationshipStatus,
    profileImageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80",
    likedCategories: ["FITNESS", "SOCIAL", "OUTDOORS", "ACTIVITY_VENUE"] as Category[],
    savedEventTitles: [
      "Cooldown Running Club",
      "Mile Hi Pickleball",
      "Play Mile High \u2014 Spring Kickball League",
      "Traverse Fitness \u2014 Breakfast Club Track Workout",
      "Red Rocks Fitness \u2014 Stair Workout",
    ],
  },
  {
    email: "maya@pulse.local",
    name: "Maya Thompson",
    username: "mayat",
    bio: "Freelance designer exploring Denver one hidden gem at a time. Always chasing golden hour on trails.",
    relationshipStatus: "SINGLE" as RelationshipStatus,
    profileImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
    likedCategories: ["OUTDOORS", "ART", "COFFEE", "WELLNESS"] as Category[],
    savedEventTitles: [
      "Denver Botanic Gardens \u2014 Spring Bloom Walk",
      "Rocky Mountain Paddleboard",
      "Barr Lake State Park \u2014 Archery & Wildlife",
      "Community Clay Denver",
    ],
  },
];

async function main() {
  console.log("Seeding Jensen's friends...\n");

  const passwordHash = await bcrypt.hash("friend2026!", 10);

  const jensen = await prisma.user.findUnique({ where: { email: "jensen@pulse.app" } });
  if (!jensen) throw new Error("Jensen not found");

  // Event title lookup
  const allEvents = await prisma.event.findMany({
    where: { source: "pulse-curated" },
    select: { id: true, title: true },
  });
  const eventByTitle = new Map(allEvents.map((e) => [e.title, e.id]));

  for (const friend of FRIENDS) {
    // Create user
    const user = await prisma.user.upsert({
      where: { email: friend.email },
      update: {
        name: friend.name,
        username: friend.username,
        bio: friend.bio,
        profileImageUrl: friend.profileImageUrl,
        relationshipStatus: friend.relationshipStatus,
        onboardingComplete: true,
      },
      create: {
        email: friend.email,
        name: friend.name,
        username: friend.username,
        bio: friend.bio,
        profileImageUrl: friend.profileImageUrl,
        passwordHash,
        relationshipStatus: friend.relationshipStatus,
        onboardingComplete: true,
      },
    });

    // Create friendship (accepted)
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: jensen.id, addresseeId: user.id },
          { requesterId: user.id, addresseeId: jensen.id },
        ],
      },
    });
    if (!existing) {
      await prisma.friendship.create({
        data: {
          requesterId: jensen.id,
          addresseeId: user.id,
          status: "ACCEPTED",
        },
      });
    }

    // Create preferences
    await prisma.preference.deleteMany({ where: { userId: user.id } });
    for (const cat of friend.likedCategories) {
      await prisma.preference.create({
        data: {
          userId: user.id,
          category: cat,
          preferenceType: PreferenceType.LIKE,
          intensity: Math.floor(Math.random() * 2) + 4,
        },
      });
    }

    // Create save activity
    for (const title of friend.savedEventTitles) {
      const eventId = eventByTitle.get(title);
      if (eventId) {
        const existingActivity = await prisma.userActivity.findFirst({
          where: { userId: user.id, eventId, type: "SAVED_EVENT" },
        });
        if (!existingActivity) {
          await prisma.userActivity.create({
            data: {
              userId: user.id,
              type: "SAVED_EVENT",
              eventId,
              isPublic: true,
            },
          });
        }
      }
    }

    console.log("  " + friend.name + " (@" + friend.username + ") - " + friend.savedEventTitles.length + " saves");
  }

  // Add friends to Denver Active Crew group
  const group = await prisma.group.findFirst({ where: { name: "Denver Active Crew" } });
  if (group) {
    const friendUsers = await prisma.user.findMany({
      where: { email: { in: FRIENDS.map(f => f.email) } },
      select: { id: true, name: true },
    });

    for (const user of friendUsers) {
      const existingMember = await prisma.groupMember.findFirst({
        where: { groupId: group.id, userId: user.id },
      });
      if (!existingMember) {
        await prisma.groupMember.create({
          data: { groupId: group.id, userId: user.id, role: "MEMBER" },
        });
      }
    }

    const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } });
    await prisma.group.update({
      where: { id: group.id },
      data: { memberCount },
    });

    console.log("\n  Added to Denver Active Crew (" + memberCount + " members total)");
  }

  console.log("\nJensen now has " + FRIENDS.length + " friends!");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
