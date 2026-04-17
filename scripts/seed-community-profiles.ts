/**
 * Seed Community Profiles, Shared Lists, and Denver Active Crew Group
 *
 * Creates:
 * - 5 community profiles (User + Influencer records)
 * - Auto-follows Jensen to 2 profiles
 * - InfluencerPickSets with saved items for each profile
 * - 3 public shared lists with editorial comments
 * - Denver Active Crew group with members and seed activity
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-community-profiles.ts
 */

import { PrismaClient, Category, GroupRole, ActivityType } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ============================================================================
// PROFILE DEFINITIONS
// ============================================================================

const PROFILES = [
  {
    handle: "denveradventure",
    displayName: "Denver Adventure Collective",
    bio: "Group hikes, trail runs, and outdoor adventures around the Front Range. Weekend warriors welcome.",
    emoji: "\ud83c\udfd4\ufe0f",
    specialties: ["hiking", "trail running", "outdoor adventures"],
    categories: ["OUTDOORS", "FITNESS"] as Category[],
    followerCount: 847,
    savedEventTitles: [
      "Red Rocks Fitness \u2014 Stair Workout",
      "Colorado Mountain Club \u2014 Group Hike: South Table Mountain",
      "Lookout Mountain Hill Climb \u2014 Tuesday Ride",
      "Cherry Creek Bike Path \u2014 Group Ride",
      "Denver Pork Circuit Series \u2014 2-Mile Race",
    ],
    pickSetTitle: "This Week's Outdoor Adventures",
  },
  {
    handle: "weirddenver",
    displayName: "Try Something Weird Denver",
    bio: "Curling. Axe throwing. Archery dodgeball. If it's unusual and in Denver, we've tried it.",
    emoji: "\ud83c\udfaf",
    specialties: ["unique experiences", "activity venues", "hidden gems"],
    categories: ["ACTIVITY_VENUE", "SOCIAL"] as Category[],
    followerCount: 1243,
    savedEventTitles: [
      "Archery Games Denver",
      "Denver Curling Club",
      "Bad Axe Throwing \u2014 Downtown Denver",
      "All Out Smash",
      "EscapeWorks Denver",
      "Rock Creek Curling",
    ],
    pickSetTitle: "This Week's Weirdest Finds",
  },
  {
    handle: "milehighmovers",
    displayName: "Mile High Movers",
    bio: "Denver's social fitness crew. Run clubs, cycling groups, sports leagues, and post-workout hangs.",
    emoji: "\ud83c\udfc3",
    specialties: ["run clubs", "cycling", "sports leagues", "social fitness"],
    categories: ["FITNESS", "SOCIAL"] as Category[],
    followerCount: 2108,
    savedEventTitles: [
      "Cooldown Running Club",
      "Traverse Fitness \u2014 Breakfast Club Track Workout",
      "Play Mile High \u2014 Spring Kickball League",
      "Denver Bouldering Club",
      "Movement RiNo",
      "Mile Hi Pickleball",
    ],
    pickSetTitle: "This Week's Best Workouts",
  },
  {
    handle: "rinoculture",
    displayName: "RiNo Culture Guide",
    bio: "Art walks, gallery openings, live music, and creative happenings in Denver's River North Art District.",
    emoji: "\ud83c\udfa8",
    specialties: ["art walks", "galleries", "live music", "RiNo"],
    categories: ["ART", "LIVE_MUSIC"] as Category[],
    followerCount: 956,
    savedEventTitles: [
      "RiNo Art Walk",
      "Community Clay Denver",
      "Meow Wolf Denver \u2014 Convergence Station",
      "RISE Comedy",
    ],
    pickSetTitle: "This Week in RiNo",
  },
  {
    handle: "activedenver",
    displayName: "Active Denver",
    bio: "For people who'd rather do something than scroll about doing something. Fitness, outdoors, and active social events.",
    emoji: "\ud83d\udcaa",
    specialties: ["fitness", "outdoors", "active social", "hidden gems"],
    categories: ["FITNESS", "OUTDOORS", "ACTIVITY_VENUE", "SOCIAL"] as Category[],
    followerCount: 3412,
    savedEventTitles: [
      "Red Rocks Fitness \u2014 Stair Workout",
      "Denver Bouldering Club",
      "Lookout Mountain Hill Climb \u2014 Tuesday Ride",
      "Cooldown Running Club",
      "Cherry Creek Bike Path \u2014 Group Ride",
      "Mile Hi Pickleball",
    ],
    pickSetTitle: "This Week's Active Picks",
  },
];

// Jensen auto-follows these two profiles
const JENSEN_AUTO_FOLLOWS = ["activedenver", "weirddenver"];

// ============================================================================
// LIST DEFINITIONS
// ============================================================================

const LISTS = [
  {
    ownerHandle: "weirddenver",
    name: "Stuff You Didn't Know You Could Do in Denver",
    description: "Forget the same old bars and restaurants. Here's the weird, wonderful, and genuinely surprising stuff happening in this city.",
    saveCount: 234,
    shareSlug: "weird-denver-guide",
    emoji: "\ud83e\udd2f",
    items: [
      { title: "Denver Curling Club", note: "Yes, curling. Like the Olympics. They teach you everything and provide all the gear." },
      { title: "Archery Games Denver", note: "Dodgeball. With bows and arrows. Need I say more?" },
      { title: "All Out Smash", note: "Rage room + axe throwing + paint splatter room, all under one roof. Bring friends." },
      { title: "Rock Creek Curling", note: "Colorado's home for curling. Intro courses, leagues, and corporate events." },
      { title: "iFly Indoor Skydiving", note: "Feel the rush of freefall without the whole jumping-out-of-a-plane thing." },
      { title: "EscapeWorks Denver", note: "Right on 16th Street. Walk-in friendly on weekdays. The Speakeasy room is the move." },
    ],
  },
  {
    ownerHandle: "milehighmovers",
    name: "Free Fitness in Denver",
    description: "You don't need a gym membership to stay active in this city. Here's the best free stuff.",
    saveCount: 412,
    shareSlug: "free-fitness-denver",
    emoji: "\ud83c\udfcb\ufe0f",
    items: [
      { title: "Red Rocks Fitness \u2014 Stair Workout", note: "380 steps at sunrise. Free. Show up early." },
      { title: "Cooldown Running Club", note: "Every Tuesday at 6:30pm. 1-5 miles, all paces. Denver's biggest social run." },
      { title: "Cherry Creek Bike Path \u2014 Group Ride", note: "Sunday mornings. 20-30 miles on paved trail. Just bring a helmet." },
      { title: "Lookout Mountain Hill Climb \u2014 Tuesday Ride", note: "The rite of passage for Colorado cyclists. 4.3 miles, 1,300ft up." },
      { title: "Colorado Mountain Club \u2014 Group Hike: South Table Mountain", note: "Under-30 membership is $30/year. Organized hikes every weekend." },
      { title: "Brunch Running", note: "Run first, brunch after. Different restaurant every Sunday." },
    ],
  },
  {
    ownerHandle: "activedenver",
    name: "Jensen's Weekend Starter Pack",
    description: "New to Pulse? Start here. The best active, social, no-alcohol-required things to do this month.",
    saveCount: 189,
    shareSlug: "jensen-starter-pack",
    emoji: "\ud83d\ude80",
    items: [
      { title: "Denver Bouldering Club", note: "24/7 access, 35,000 sq ft of climbing. The community alone is worth it." },
      { title: "Archery Games Denver", note: "The most fun you'll have losing a dodgeball game." },
      { title: "Mile Hi Pickleball", note: "11 indoor courts, leagues, and a lounge for post-game hangs." },
      { title: "Denver Pork Circuit Series \u2014 2-Mile Race", note: "2 miles + post-race party at Cerebral Brewing. Apr 11." },
      { title: "Play Mile High \u2014 Spring Kickball League", note: "Adult kickball league in Wash Park. Register solo or bring a squad." },
      { title: "Meow Wolf Denver \u2014 Convergence Station", note: "2-3 hours of mind-bending immersive art. Even if you're not an 'art person.'" },
    ],
  },
];

// ============================================================================
// GROUP DEFINITION
// ============================================================================

const GROUP = {
  name: "Denver Active Crew",
  emoji: "\ud83c\udfd4\ufe0f",
  description: "Fitness, outdoors, and adventures around the Mile High City. Share what you're doing this weekend.",
  memberHandles: ["activedenver", "milehighmovers", "denveradventure", "weirddenver"],
  ownerHandle: "activedenver",
  seedActivity: [
    { handle: "milehighmovers", eventTitle: "Red Rocks Fitness \u2014 Stair Workout", text: "Who's in for Wednesday sunrise?" },
    { handle: "weirddenver", eventTitle: "Denver Curling Club", text: "Just did the learn-to-curl session. Absolutely addicted now." },
    { handle: "denveradventure", eventTitle: "Colorado Mountain Club \u2014 Group Hike: South Table Mountain", text: "South Table Mountain this Saturday. Perfect spring hike." },
    { handle: "activedenver", eventTitle: "Archery Games Denver", text: "Took 8 people last weekend. Lost my voice from yelling. 10/10." },
  ],
};

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("Seeding Community Profiles, Lists & Group\n");

  const passwordHash = await bcrypt.hash("community2026!", 10);

  // Get Denver city
  const denver = await prisma.city.findUnique({ where: { slug: "denver" } });
  if (!denver) throw new Error("Denver city not found");

  // Get Jensen
  const jensen = await prisma.user.findUnique({ where: { email: "jensen@pulse.app" } });
  if (!jensen) throw new Error("Jensen not found. Run seed-jensen.ts first.");

  // Build event title → ID lookup
  const allEvents = await prisma.event.findMany({
    where: { source: "pulse-curated" },
    select: { id: true, title: true },
  });
  const eventByTitle = new Map(allEvents.map((e) => [e.title, e.id]));

  // Build item title → ID lookup
  const allItems = await prisma.item.findMany({
    where: { source: "pulse-curated" },
    select: { id: true, title: true },
  });
  const itemByTitle = new Map(allItems.map((i) => [i.title, i.id]));

  // ========== PHASE 2: Community Profiles ==========
  console.log("Creating community profiles...");

  const profileUsers: Map<string, { userId: string; influencerId: string }> = new Map();

  for (const profile of PROFILES) {
    // Create User record
    const user = await prisma.user.upsert({
      where: { email: `${profile.handle}@pulse.community` },
      update: {
        name: profile.displayName,
        bio: profile.bio,
        profileImageUrl: null,
        isInfluencer: true,
        onboardingComplete: true,
      },
      create: {
        email: `${profile.handle}@pulse.community`,
        name: profile.displayName,
        bio: profile.bio,
        passwordHash,
        isInfluencer: true,
        onboardingComplete: true,
      },
    });

    // Create Influencer record
    const influencer = await prisma.influencer.upsert({
      where: { handle: profile.handle },
      update: {
        displayName: profile.displayName,
        bio: profile.bio,
        userId: user.id,
        specialties: profile.specialties,
        preferredCategories: profile.categories,
        vibeDescription: profile.bio,
      },
      create: {
        handle: profile.handle,
        displayName: profile.displayName,
        bio: profile.bio,
        userId: user.id,
        citySlug: "denver",
        specialties: profile.specialties,
        preferredCategories: profile.categories,
        vibeDescription: profile.bio,
      },
    });

    profileUsers.set(profile.handle, { userId: user.id, influencerId: influencer.id });

    // Create fake follower records to get the count up
    // We'll create UserInfluencerFollow records from dummy user IDs (just Jensen + count)
    // Actually, just seed Jensen's follow. The sidebar shows _count which we can't fake without real records.
    // The API returns followerCount from _count.followers — we need real follow records.
    // For the demo, the follower count will be small but real. That's fine — "2 followers" is better than question marks.

    // Create InfluencerPickSet with saved items
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const pickSet = await prisma.influencerPickSet.create({
      data: {
        influencerId: influencer.id,
        range: "WEEK",
        title: profile.pickSetTitle,
        summaryText: profile.bio,
        expiresAt,
      },
    });

    // Create picks from saved items
    let rank = 1;
    for (const title of profile.savedEventTitles) {
      const itemId = itemByTitle.get(title);
      if (itemId) {
        await prisma.influencerPick.upsert({
          where: { pickSetId_itemId: { pickSetId: pickSet.id, itemId } },
          update: { rank, reason: `${profile.displayName}'s pick` },
          create: {
            pickSetId: pickSet.id,
            itemId,
            rank,
            reason: `${profile.displayName}'s pick`,
          },
        });
        rank++;
      }
    }

    console.log(`  @${profile.handle}: ${rank - 1} picks`);
  }

  // Auto-follow Jensen to specified profiles
  console.log("\nAuto-following Jensen...");
  for (const handle of JENSEN_AUTO_FOLLOWS) {
    const profile = profileUsers.get(handle);
    if (profile) {
      await prisma.userInfluencerFollow.upsert({
        where: {
          userId_influencerId: {
            userId: jensen.id,
            influencerId: profile.influencerId,
          },
        },
        update: {},
        create: {
          userId: jensen.id,
          influencerId: profile.influencerId,
        },
      });
      console.log(`  Jensen now follows @${handle}`);
    }
  }

  // ========== PHASE 3: Shared Lists ==========
  console.log("\nCreating shared lists...");

  for (const listDef of LISTS) {
    const profile = profileUsers.get(listDef.ownerHandle);
    if (!profile) continue;

    // Try to find existing list by shareSlug first
    let list = await prisma.list.findUnique({ where: { shareSlug: listDef.shareSlug } });
    if (list) {
      list = await prisma.list.update({
        where: { id: list.id },
        data: {
          name: listDef.name,
          description: listDef.description,
          isPublic: true,
          saveCount: listDef.saveCount,
        },
      });
    } else {
      list = await prisma.list.create({
        data: {
          userId: profile.userId,
          name: listDef.name,
          description: listDef.description,
          isPublic: true,
          saveCount: listDef.saveCount,
          shareSlug: listDef.shareSlug,
        },
      });
    }

    // Create list items
    let order = 0;
    for (const item of listDef.items) {
      const eventId = eventByTitle.get(item.title);
      if (eventId) {
        // Check if already exists
        const existing = await prisma.listItem.findUnique({
          where: { listId_eventId: { listId: list.id, eventId } },
        });
        if (!existing) {
          await prisma.listItem.create({
            data: {
              listId: list.id,
              eventId,
              order,
              notes: item.note,
            },
          });
        }
        order++;
      }
    }

    console.log(`  "${listDef.name}" by @${listDef.ownerHandle}: ${order} items`);
  }

  // ========== PHASE 4: Denver Active Crew Group ==========
  console.log("\nCreating Denver Active Crew group...");

  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const group = await prisma.group.upsert({
    where: { joinCode },
    update: {
      name: GROUP.name,
      emoji: GROUP.emoji,
      description: GROUP.description,
      isPublic: true,
    },
    create: {
      name: GROUP.name,
      emoji: GROUP.emoji,
      description: GROUP.description,
      joinCode,
      isPublic: true,
      memberCount: 5,
    },
  });

  // Add Jensen as member
  const jensenMembership = await prisma.groupMember.findFirst({
    where: { groupId: group.id, userId: jensen.id },
  });
  if (!jensenMembership) {
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: jensen.id, role: "MEMBER" },
    });
  }

  // Add community profiles as members
  for (const handle of GROUP.memberHandles) {
    const profile = profileUsers.get(handle);
    if (!profile) continue;

    const role = handle === GROUP.ownerHandle ? "OWNER" : "MEMBER";
    const existing = await prisma.groupMember.findFirst({
      where: { groupId: group.id, userId: profile.userId },
    });
    if (!existing) {
      await prisma.groupMember.create({
        data: { groupId: group.id, userId: profile.userId, role: role as GroupRole },
      });
    }
  }
  console.log(`  Group: ${GROUP.name} (${GROUP.memberHandles.length + 1} members)`);

  // Create seed group events
  for (const activity of GROUP.seedActivity) {
    const profile = profileUsers.get(activity.handle);
    const eventId = eventByTitle.get(activity.eventTitle);
    if (!profile || !eventId) continue;

    const existing = await prisma.groupEvent.findFirst({
      where: { groupId: group.id, eventId },
    });
    if (!existing) {
      await prisma.groupEvent.create({
        data: {
          groupId: group.id,
          eventId,
          suggestedById: profile.userId,
          status: "CONFIRMED",
        },
      });
    }

    // Create activity record
    await prisma.userActivity.create({
      data: {
        userId: profile.userId,
        type: "SAVED_EVENT",
        eventId,
        metadata: JSON.stringify({ text: activity.text }),
        isPublic: true,
      },
    });
  }
  console.log(`  Seed activity: ${GROUP.seedActivity.length} posts`);

  console.log("\nCommunity seed complete!");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
