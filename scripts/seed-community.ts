/**
 * Seed Community Features: Badges, Demo Users, Groups, Leaderboards
 *
 * Usage: npx ts-node scripts/seed-community.ts
 */

import { PrismaClient, BadgeCategory, BadgeTier, GroupRole, LeaderboardType } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ============================================================================
// BADGE DEFINITIONS (30 badges)
// ============================================================================

const BADGES = [
  // MILESTONE badges (5)
  {
    slug: "first-steps",
    name: "First Steps",
    description: "Attended your first event",
    category: BadgeCategory.MILESTONE,
    tier: BadgeTier.BRONZE,
    emoji: "👣",
    requirementType: "events_attended",
    requirementValue: 1,
    colorHex: "#F59E0B",
  },
  {
    slug: "double-digits",
    name: "Double Digits",
    description: "Attended 10 events",
    category: BadgeCategory.MILESTONE,
    tier: BadgeTier.SILVER,
    emoji: "🔟",
    requirementType: "events_attended",
    requirementValue: 10,
    colorHex: "#8B5CF6",
  },
  {
    slug: "quarter-century",
    name: "Quarter Century",
    description: "Attended 25 events",
    category: BadgeCategory.MILESTONE,
    tier: BadgeTier.GOLD,
    emoji: "🏅",
    requirementType: "events_attended",
    requirementValue: 25,
    colorHex: "#F59E0B",
  },
  {
    slug: "fifty-club",
    name: "Fifty Club",
    description: "Attended 50 events",
    category: BadgeCategory.MILESTONE,
    tier: BadgeTier.GOLD,
    emoji: "🎖️",
    requirementType: "events_attended",
    requirementValue: 50,
    colorHex: "#EF4444",
  },
  {
    slug: "century",
    name: "Century",
    description: "Attended 100 events - legendary status",
    category: BadgeCategory.MILESTONE,
    tier: BadgeTier.PLATINUM,
    emoji: "💯",
    requirementType: "events_attended",
    requirementValue: 100,
    colorHex: "#EC4899",
  },

  // EXPLORER badges (4)
  {
    slug: "getting-around",
    name: "Getting Around",
    description: "Visited 5 different neighborhoods",
    category: BadgeCategory.EXPLORER,
    tier: BadgeTier.BRONZE,
    emoji: "🗺️",
    requirementType: "neighborhoods_visited",
    requirementValue: 5,
    colorHex: "#10B981",
  },
  {
    slug: "city-explorer",
    name: "City Explorer",
    description: "Visited 10 different neighborhoods",
    category: BadgeCategory.EXPLORER,
    tier: BadgeTier.SILVER,
    emoji: "🧭",
    requirementType: "neighborhoods_visited",
    requirementValue: 10,
    colorHex: "#3B82F6",
  },
  {
    slug: "denver-wanderer",
    name: "Denver Wanderer",
    description: "Visited 15 different neighborhoods",
    category: BadgeCategory.EXPLORER,
    tier: BadgeTier.GOLD,
    emoji: "🌄",
    requirementType: "neighborhoods_visited",
    requirementValue: 15,
    colorHex: "#F59E0B",
  },
  {
    slug: "denver-native",
    name: "Denver Native",
    description: "Visited 20 different neighborhoods - you know this city",
    category: BadgeCategory.EXPLORER,
    tier: BadgeTier.PLATINUM,
    emoji: "🏔️",
    requirementType: "neighborhoods_visited",
    requirementValue: 20,
    colorHex: "#8B5CF6",
  },

  // CATEGORY_FAN badges (10 - music, food, art, fitness, bars, coffee with tiers)
  {
    slug: "concert-junkie-bronze",
    name: "Concert Goer",
    description: "Attended 5 music events",
    category: BadgeCategory.CATEGORY_FAN,
    tier: BadgeTier.BRONZE,
    emoji: "🎵",
    requirementType: "events_in_category",
    requirementValue: 5,
    requirementMeta: { category: "LIVE_MUSIC" },
    colorHex: "#EC4899",
  },
  {
    slug: "concert-junkie-silver",
    name: "Music Lover",
    description: "Attended 15 music events",
    category: BadgeCategory.CATEGORY_FAN,
    tier: BadgeTier.SILVER,
    emoji: "🎸",
    requirementType: "events_in_category",
    requirementValue: 15,
    requirementMeta: { category: "LIVE_MUSIC" },
    colorHex: "#EC4899",
  },
  {
    slug: "concert-junkie-gold",
    name: "Concert Junkie",
    description: "Attended 25 music events",
    category: BadgeCategory.CATEGORY_FAN,
    tier: BadgeTier.GOLD,
    emoji: "🎤",
    requirementType: "events_in_category",
    requirementValue: 25,
    requirementMeta: { category: "LIVE_MUSIC" },
    colorHex: "#EC4899",
  },
  {
    slug: "foodie-bronze",
    name: "Food Curious",
    description: "Attended 5 food events",
    category: BadgeCategory.CATEGORY_FAN,
    tier: BadgeTier.BRONZE,
    emoji: "🍽️",
    requirementType: "events_in_category",
    requirementValue: 5,
    requirementMeta: { category: "FOOD" },
    colorHex: "#F97316",
  },
  {
    slug: "foodie-gold",
    name: "Foodie",
    description: "Attended 20 food events",
    category: BadgeCategory.CATEGORY_FAN,
    tier: BadgeTier.GOLD,
    emoji: "👨‍🍳",
    requirementType: "events_in_category",
    requirementValue: 20,
    requirementMeta: { category: "FOOD" },
    colorHex: "#F97316",
  },
  {
    slug: "art-aficionado",
    name: "Art Aficionado",
    description: "Attended 10 art events",
    category: BadgeCategory.CATEGORY_FAN,
    tier: BadgeTier.SILVER,
    emoji: "🎨",
    requirementType: "events_in_category",
    requirementValue: 10,
    requirementMeta: { category: "ART" },
    colorHex: "#8B5CF6",
  },
  {
    slug: "fitness-fanatic",
    name: "Fitness Fanatic",
    description: "Attended 15 fitness events",
    category: BadgeCategory.CATEGORY_FAN,
    tier: BadgeTier.SILVER,
    emoji: "💪",
    requirementType: "events_in_category",
    requirementValue: 15,
    requirementMeta: { category: "FITNESS" },
    colorHex: "#10B981",
  },
  {
    slug: "night-owl",
    name: "Night Owl",
    description: "Attended 10 bar events",
    category: BadgeCategory.CATEGORY_FAN,
    tier: BadgeTier.SILVER,
    emoji: "🦉",
    requirementType: "events_in_category",
    requirementValue: 10,
    requirementMeta: { category: "BARS" },
    colorHex: "#6366F1",
  },
  {
    slug: "coffee-connoisseur",
    name: "Coffee Connoisseur",
    description: "Visited 10 coffee spots",
    category: BadgeCategory.CATEGORY_FAN,
    tier: BadgeTier.SILVER,
    emoji: "☕",
    requirementType: "events_in_category",
    requirementValue: 10,
    requirementMeta: { category: "COFFEE" },
    colorHex: "#78350F",
  },

  // STREAK badges (4)
  {
    slug: "week-warrior",
    name: "Week Warrior",
    description: "2 consecutive weeks with events",
    category: BadgeCategory.STREAK,
    tier: BadgeTier.BRONZE,
    emoji: "🔥",
    requirementType: "streak_weeks",
    requirementValue: 2,
    colorHex: "#EF4444",
  },
  {
    slug: "month-momentum",
    name: "Month Momentum",
    description: "4 consecutive weeks with events",
    category: BadgeCategory.STREAK,
    tier: BadgeTier.SILVER,
    emoji: "⚡",
    requirementType: "streak_weeks",
    requirementValue: 4,
    colorHex: "#F59E0B",
  },
  {
    slug: "unstoppable",
    name: "Unstoppable",
    description: "8 consecutive weeks with events",
    category: BadgeCategory.STREAK,
    tier: BadgeTier.GOLD,
    emoji: "🚀",
    requirementType: "streak_weeks",
    requirementValue: 8,
    colorHex: "#EC4899",
  },
  {
    slug: "legend",
    name: "Legend",
    description: "12 consecutive weeks with events",
    category: BadgeCategory.STREAK,
    tier: BadgeTier.PLATINUM,
    emoji: "👑",
    requirementType: "streak_weeks",
    requirementValue: 12,
    colorHex: "#8B5CF6",
  },

  // SOCIAL badges (5)
  {
    slug: "friendly-face",
    name: "Friendly Face",
    description: "Follow 5 users",
    category: BadgeCategory.SOCIAL,
    tier: BadgeTier.BRONZE,
    emoji: "😊",
    requirementType: "users_followed",
    requirementValue: 5,
    colorHex: "#3B82F6",
  },
  {
    slug: "social-butterfly",
    name: "Social Butterfly",
    description: "Get 25 followers",
    category: BadgeCategory.SOCIAL,
    tier: BadgeTier.SILVER,
    emoji: "🦋",
    requirementType: "followers_count",
    requirementValue: 25,
    colorHex: "#EC4899",
  },
  {
    slug: "tastemaker-fan",
    name: "Tastemaker Fan",
    description: "Follow 5 creators",
    category: BadgeCategory.SOCIAL,
    tier: BadgeTier.BRONZE,
    emoji: "⭐",
    requirementType: "creators_followed",
    requirementValue: 5,
    colorHex: "#F59E0B",
  },
  {
    slug: "squad-goals",
    name: "Squad Goals",
    description: "Join a group",
    category: BadgeCategory.SOCIAL,
    tier: BadgeTier.BRONZE,
    emoji: "👥",
    requirementType: "groups_joined",
    requirementValue: 1,
    colorHex: "#10B981",
  },
  {
    slug: "list-maker",
    name: "List Maker",
    description: "Create 3 public lists",
    category: BadgeCategory.SOCIAL,
    tier: BadgeTier.BRONZE,
    emoji: "📝",
    requirementType: "public_lists_created",
    requirementValue: 3,
    colorHex: "#6366F1",
  },

  // PIONEER badges (2)
  {
    slug: "trendsetter",
    name: "Trendsetter",
    description: "Visit 3 places within their first month open",
    category: BadgeCategory.PIONEER,
    tier: BadgeTier.SILVER,
    emoji: "🌟",
    requirementType: "new_places_visited",
    requirementValue: 3,
    colorHex: "#F59E0B",
  },
  {
    slug: "early-bird",
    name: "Early Bird",
    description: "Be among first 10 users at a new place",
    category: BadgeCategory.PIONEER,
    tier: BadgeTier.GOLD,
    emoji: "🐦",
    requirementType: "early_visitor",
    requirementValue: 1,
    colorHex: "#10B981",
  },

  // SPECIAL badge (1)
  {
    slug: "founding-member",
    name: "Founding Member",
    description: "Joined Pulse during the early days",
    category: BadgeCategory.SPECIAL,
    tier: BadgeTier.PLATINUM,
    emoji: "💎",
    requirementType: "joined_before",
    requirementValue: 1,
    requirementMeta: { beforeDate: "2026-01-01" },
    colorHex: "#EC4899",
    isHidden: false,
  },
];

// ============================================================================
// DEMO USERS (10)
// ============================================================================

const DEMO_USERS = [
  {
    email: "alex@demo.pulse",
    name: "Alex Chen",
    username: "alexchen",
    neighborhood: "RiNo",
    eventsAttended: 47,
    currentStreak: 3,
    longestStreak: 8,
    badgeSlugs: ["concert-junkie-gold", "coffee-connoisseur", "city-explorer", "quarter-century"],
    score: 750,
  },
  {
    email: "jordan@demo.pulse",
    name: "Jordan Martinez",
    username: "jordanmartinez",
    neighborhood: "LoHi",
    eventsAttended: 62,
    currentStreak: 6,
    longestStreak: 12,
    badgeSlugs: ["foodie-gold", "fifty-club", "trendsetter", "legend"],
    score: 890,
  },
  {
    email: "sam@demo.pulse",
    name: "Sam Williams",
    username: "samwilliams",
    neighborhood: "Capitol Hill",
    eventsAttended: 38,
    currentStreak: 2,
    longestStreak: 5,
    badgeSlugs: ["art-aficionado", "double-digits", "getting-around"],
    score: 520,
  },
  {
    email: "taylor@demo.pulse",
    name: "Taylor Brooks",
    username: "taylorbrooks",
    neighborhood: "Wash Park",
    eventsAttended: 55,
    currentStreak: 8,
    longestStreak: 10,
    badgeSlugs: ["fitness-fanatic", "fifty-club", "unstoppable", "month-momentum"],
    score: 820,
  },
  {
    email: "casey@demo.pulse",
    name: "Casey Johnson",
    username: "caseyjohnson",
    neighborhood: "LoDo",
    eventsAttended: 41,
    currentStreak: 1,
    longestStreak: 4,
    badgeSlugs: ["night-owl", "double-digits", "week-warrior"],
    score: 580,
  },
  {
    email: "riley@demo.pulse",
    name: "Riley Thompson",
    username: "rileythompson",
    neighborhood: "Cherry Creek",
    eventsAttended: 23,
    currentStreak: 2,
    longestStreak: 3,
    badgeSlugs: ["first-steps", "friendly-face"],
    score: 320,
  },
  {
    email: "morgan@demo.pulse",
    name: "Morgan Davis",
    username: "morgandavis",
    neighborhood: "Five Points",
    eventsAttended: 51,
    currentStreak: 4,
    longestStreak: 7,
    badgeSlugs: ["concert-junkie-silver", "quarter-century", "social-butterfly"],
    score: 680,
  },
  {
    email: "drew@demo.pulse",
    name: "Drew Anderson",
    username: "drewanderson",
    neighborhood: "Highlands",
    eventsAttended: 44,
    currentStreak: 5,
    longestStreak: 6,
    badgeSlugs: ["trendsetter", "list-maker", "denver-wanderer"],
    score: 620,
  },
  {
    email: "avery@demo.pulse",
    name: "Avery Wilson",
    username: "averywilson",
    neighborhood: "Sloan's Lake",
    eventsAttended: 36,
    currentStreak: 3,
    longestStreak: 5,
    badgeSlugs: ["fitness-fanatic", "concert-junkie-bronze", "month-momentum"],
    score: 480,
  },
  {
    email: "jamie@demo.pulse",
    name: "Jamie Garcia",
    username: "jamiegarcia",
    neighborhood: "Baker",
    eventsAttended: 29,
    currentStreak: 2,
    longestStreak: 4,
    badgeSlugs: ["social-butterfly", "double-digits", "squad-goals"],
    score: 410,
  },
];

// ============================================================================
// DEMO GROUPS (4)
// ============================================================================

const DEMO_GROUPS = [
  {
    name: "The Weekend Crew",
    emoji: "🎉",
    description: "Friends who explore Denver every weekend",
    joinCode: "WKND25",
    memberEmails: ["alex@demo.pulse", "jordan@demo.pulse", "casey@demo.pulse", "morgan@demo.pulse"],
    ownerEmail: "jordan@demo.pulse",
  },
  {
    name: "Fitness Friends",
    emoji: "💪",
    description: "Workout buddies and fitness event enthusiasts",
    joinCode: "FIT2GO",
    memberEmails: ["taylor@demo.pulse", "avery@demo.pulse", "riley@demo.pulse"],
    ownerEmail: "taylor@demo.pulse",
  },
  {
    name: "Art & Culture Club",
    emoji: "🎨",
    description: "Gallery openings, museum nights, and cultural events",
    joinCode: "ARTDEN",
    memberEmails: ["sam@demo.pulse", "drew@demo.pulse", "riley@demo.pulse", "morgan@demo.pulse"],
    ownerEmail: "sam@demo.pulse",
  },
  {
    name: "New to Denver",
    emoji: "🏔️",
    description: "Helping newcomers discover the best of Denver",
    joinCode: "NEWDEN",
    memberEmails: ["riley@demo.pulse", "drew@demo.pulse", "jamie@demo.pulse"],
    ownerEmail: "riley@demo.pulse",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log("🌱 Seeding Community Features...\n");

  // 1. SEED BADGES
  console.log("📛 Creating badges...");
  const badgeMap = new Map<string, string>(); // slug -> id

  for (const badge of BADGES) {
    const existing = await prisma.badge.findUnique({
      where: { slug: badge.slug },
    });

    if (existing) {
      badgeMap.set(badge.slug, existing.id);
      console.log(`  - ${badge.emoji} ${badge.name} (exists)`);
    } else {
      const created = await prisma.badge.create({
        data: {
          slug: badge.slug,
          name: badge.name,
          description: badge.description,
          category: badge.category,
          tier: badge.tier,
          emoji: badge.emoji,
          requirementType: badge.requirementType,
          requirementValue: badge.requirementValue,
          requirementMeta: badge.requirementMeta ?? undefined,
          colorHex: badge.colorHex,
          isHidden: badge.isHidden || false,
        },
      });
      badgeMap.set(badge.slug, created.id);
      console.log(`  + ${badge.emoji} ${badge.name}`);
    }
  }
  console.log(`  Total: ${BADGES.length} badges\n`);

  // 2. SEED DEMO USERS
  console.log("👤 Creating demo users...");
  const userMap = new Map<string, string>(); // email -> id
  const passwordHash = await bcrypt.hash("demo123", 10);

  for (const demoUser of DEMO_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: demoUser.email },
    });

    if (existing) {
      // Update existing user stats
      await prisma.user.update({
        where: { email: demoUser.email },
        data: {
          totalEventsAttended: demoUser.eventsAttended,
          currentStreak: demoUser.currentStreak,
          longestStreak: demoUser.longestStreak,
          totalBadgesEarned: demoUser.badgeSlugs.length,
        },
      });
      userMap.set(demoUser.email, existing.id);
      console.log(`  - ${demoUser.name} (exists, updated stats)`);
    } else {
      const created = await prisma.user.create({
        data: {
          email: demoUser.email,
          name: demoUser.name,
          username: demoUser.username,
          passwordHash,
          citySlug: "denver",
          onboardingComplete: true,
          totalEventsAttended: demoUser.eventsAttended,
          currentStreak: demoUser.currentStreak,
          longestStreak: demoUser.longestStreak,
          totalBadgesEarned: demoUser.badgeSlugs.length,
        },
      });
      userMap.set(demoUser.email, created.id);
      console.log(`  + ${demoUser.name} (@${demoUser.username})`);
    }

    // Assign badges to user
    const userId = userMap.get(demoUser.email)!;
    for (const badgeSlug of demoUser.badgeSlugs) {
      const badgeId = badgeMap.get(badgeSlug);
      if (badgeId) {
        const existingUserBadge = await prisma.userBadge.findUnique({
          where: { userId_badgeId: { userId, badgeId } },
        });

        if (!existingUserBadge) {
          const badge = BADGES.find(b => b.slug === badgeSlug);
          await prisma.userBadge.create({
            data: {
              userId,
              badgeId,
              progress: badge?.requirementValue || 0,
              isEarned: true,
              earnedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date in past 90 days
            },
          });
        }
      }
    }
  }
  console.log(`  Total: ${DEMO_USERS.length} demo users\n`);

  // 3. SEED GROUPS
  console.log("👥 Creating groups...");

  for (const group of DEMO_GROUPS) {
    const existing = await prisma.group.findUnique({
      where: { joinCode: group.joinCode },
    });

    if (existing) {
      console.log(`  - ${group.emoji} ${group.name} (exists)`);
      continue;
    }

    const ownerUserId = userMap.get(group.ownerEmail);
    if (!ownerUserId) {
      console.log(`  ! Skipping ${group.name} - owner not found`);
      continue;
    }

    const createdGroup = await prisma.group.create({
      data: {
        name: group.name,
        emoji: group.emoji,
        description: group.description,
        joinCode: group.joinCode,
        isPublic: false,
        memberCount: group.memberEmails.length,
      },
    });

    // Add members
    for (const memberEmail of group.memberEmails) {
      const memberId = userMap.get(memberEmail);
      if (memberId) {
        await prisma.groupMember.create({
          data: {
            groupId: createdGroup.id,
            userId: memberId,
            role: memberEmail === group.ownerEmail ? GroupRole.OWNER : GroupRole.MEMBER,
          },
        });
      }
    }

    console.log(`  + ${group.emoji} ${group.name} (${group.memberEmails.length} members)`);
  }
  console.log(`  Total: ${DEMO_GROUPS.length} groups\n`);

  // 4. SEED LEADERBOARD ENTRIES
  console.log("🏆 Creating leaderboard entries...");
  const currentPeriod = new Date().toISOString().slice(0, 7); // "2025-12"

  // Sort users by score for ranking
  const sortedUsers = [...DEMO_USERS].sort((a, b) => b.score - a.score);

  for (let i = 0; i < sortedUsers.length; i++) {
    const demoUser = sortedUsers[i];
    const userId = userMap.get(demoUser.email);
    if (!userId) continue;

    const existing = await prisma.leaderboardEntry.findUnique({
      where: {
        userId_period_type_typeValue: {
          userId,
          period: currentPeriod,
          type: LeaderboardType.OVERALL,
          typeValue: "",
        },
      },
    });

    if (!existing) {
      await prisma.leaderboardEntry.create({
        data: {
          userId,
          period: currentPeriod,
          type: LeaderboardType.OVERALL,
          typeValue: "",
          score: demoUser.score,
          eventsAttended: demoUser.eventsAttended,
          uniquePlaces: Math.floor(demoUser.eventsAttended * 0.7),
          neighborhoodsVisited: Math.min(15, Math.floor(demoUser.eventsAttended / 4)),
          rank: i + 1,
        },
      });
      console.log(`  + #${i + 1} ${demoUser.name} - ${demoUser.score} pts`);
    } else {
      console.log(`  - #${i + 1} ${demoUser.name} (exists)`);
    }
  }

  // Also create all-time entries
  for (let i = 0; i < sortedUsers.length; i++) {
    const demoUser = sortedUsers[i];
    const userId = userMap.get(demoUser.email);
    if (!userId) continue;

    const existing = await prisma.leaderboardEntry.findUnique({
      where: {
        userId_period_type_typeValue: {
          userId,
          period: "all-time",
          type: LeaderboardType.OVERALL,
          typeValue: "",
        },
      },
    });

    if (!existing) {
      await prisma.leaderboardEntry.create({
        data: {
          userId,
          period: "all-time",
          type: LeaderboardType.OVERALL,
          typeValue: "",
          score: Math.floor(demoUser.score * 1.5), // All-time is higher
          eventsAttended: demoUser.eventsAttended,
          uniquePlaces: Math.floor(demoUser.eventsAttended * 0.7),
          neighborhoodsVisited: Math.min(15, Math.floor(demoUser.eventsAttended / 4)),
          rank: i + 1,
        },
      });
    }
  }

  console.log(`  Total: ${DEMO_USERS.length * 2} leaderboard entries\n`);

  // 5. Give Quest Taylor the founding member badge
  console.log("⭐ Checking Quest Taylor for founding member badge...");
  const questUser = await prisma.user.findUnique({
    where: { email: "quest@pulse.app" },
  });

  if (questUser) {
    const foundingBadgeId = badgeMap.get("founding-member");
    if (foundingBadgeId) {
      const existingBadge = await prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId: questUser.id, badgeId: foundingBadgeId } },
      });

      if (!existingBadge) {
        await prisma.userBadge.create({
          data: {
            userId: questUser.id,
            badgeId: foundingBadgeId,
            progress: 1,
            isEarned: true,
            earnedAt: new Date(),
            isPinned: true,
          },
        });
        await prisma.user.update({
          where: { id: questUser.id },
          data: { totalBadgesEarned: { increment: 1 } },
        });
        console.log("  + Quest Taylor awarded Founding Member badge!\n");
      } else {
        console.log("  - Quest Taylor already has Founding Member badge\n");
      }
    }
  } else {
    console.log("  ! Quest Taylor user not found - run seed-quest-user.ts first\n");
  }

  console.log("✅ Community features seeded successfully!");
  console.log("\nDemo user login: any @demo.pulse email with password 'demo123'");
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
