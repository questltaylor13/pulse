/**
 * Badge Service - Check and award badges to users
 */

import { prisma } from "@/lib/prisma";
import { BadgeCategory, BadgeTier } from "@prisma/client";

// Requirement types that can be checked
export type RequirementType =
  | "events_attended"
  | "events_in_category"
  | "neighborhoods_visited"
  | "streak_weeks"
  | "users_followed"
  | "followers_count"
  | "creators_followed"
  | "groups_joined"
  | "public_lists_created"
  | "new_places_visited"
  | "early_visitor"
  | "joined_before";

export interface BadgeWithProgress {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier: BadgeTier;
  emoji: string;
  colorHex: string;
  isHidden: boolean;
  requirementType: string;
  requirementValue: number;
  requirementMeta: Record<string, unknown> | null;
  // User-specific
  progress: number;
  isEarned: boolean;
  earnedAt: Date | null;
  isPinned: boolean;
}

/**
 * Get all badges with user progress
 */
export async function getAllBadgesWithProgress(userId: string): Promise<BadgeWithProgress[]> {
  const badges = await prisma.badge.findMany({
    orderBy: [{ category: "asc" }, { tier: "asc" }],
    include: {
      userBadges: {
        where: { userId },
      },
    },
  });

  return badges.map((badge) => {
    const userBadge = badge.userBadges[0];
    return {
      id: badge.id,
      slug: badge.slug,
      name: badge.name,
      description: badge.description,
      category: badge.category,
      tier: badge.tier,
      emoji: badge.emoji,
      colorHex: badge.colorHex,
      isHidden: badge.isHidden,
      requirementType: badge.requirementType,
      requirementValue: badge.requirementValue,
      requirementMeta: badge.requirementMeta as Record<string, unknown> | null,
      progress: userBadge?.progress ?? 0,
      isEarned: userBadge?.isEarned ?? false,
      earnedAt: userBadge?.earnedAt ?? null,
      isPinned: userBadge?.isPinned ?? false,
    };
  });
}

/**
 * Get user's earned badges
 */
export async function getUserEarnedBadges(userId: string) {
  return prisma.userBadge.findMany({
    where: { userId, isEarned: true },
    include: { badge: true },
    orderBy: { earnedAt: "desc" },
  });
}

/**
 * Get user's pinned badges (for profile display)
 */
export async function getUserPinnedBadges(userId: string, limit = 6) {
  const pinned = await prisma.userBadge.findMany({
    where: { userId, isEarned: true, isPinned: true },
    include: { badge: true },
    orderBy: { earnedAt: "desc" },
    take: limit,
  });

  // If not enough pinned, fill with recent earned badges
  if (pinned.length < limit) {
    const additional = await prisma.userBadge.findMany({
      where: {
        userId,
        isEarned: true,
        isPinned: false,
        id: { notIn: pinned.map((p) => p.id) },
      },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
      take: limit - pinned.length,
    });
    return [...pinned, ...additional];
  }

  return pinned;
}

/**
 * Check and award all eligible badges for a user
 * Call this after significant actions (event attended, follow, etc.)
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const awardedBadges: string[] = [];

  // Get all badges the user hasn't earned yet
  const unearnedBadges = await prisma.badge.findMany({
    where: {
      OR: [
        { userBadges: { none: { userId } } },
        { userBadges: { some: { userId, isEarned: false } } },
      ],
    },
  });

  // Calculate stats for the user
  const stats = await getUserStats(userId);

  for (const badge of unearnedBadges) {
    const progress = calculateProgress(
      badge.requirementType,
      badge.requirementMeta as Record<string, unknown> | null,
      stats
    );

    // Update or create UserBadge record
    const userBadge = await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      create: {
        userId,
        badgeId: badge.id,
        progress,
        isEarned: progress >= badge.requirementValue,
        earnedAt: progress >= badge.requirementValue ? new Date() : null,
      },
      update: {
        progress,
        isEarned: progress >= badge.requirementValue,
        earnedAt:
          progress >= badge.requirementValue
            ? await prisma.userBadge
                .findUnique({ where: { userId_badgeId: { userId, badgeId: badge.id } } })
                .then((ub) => ub?.earnedAt ?? new Date())
            : null,
      },
    });

    if (userBadge.isEarned && progress >= badge.requirementValue) {
      // Check if this is newly earned (wasn't earned before this check)
      const wasJustEarned = await prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
        select: { earnedAt: true },
      });

      // If earned in the last minute, consider it newly awarded
      if (wasJustEarned?.earnedAt && Date.now() - wasJustEarned.earnedAt.getTime() < 60000) {
        awardedBadges.push(badge.name);
      }
    }
  }

  // Update user's badge count
  const totalBadges = await prisma.userBadge.count({
    where: { userId, isEarned: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { totalBadgesEarned: totalBadges },
  });

  return awardedBadges;
}

/**
 * Get user stats for badge calculation
 */
async function getUserStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      currentStreak: true,
      longestStreak: true,
      totalEventsAttended: true,
    },
  });

  // Count events attended (DONE status)
  const eventsAttended = await prisma.eventUserStatus.count({
    where: { userId, status: "DONE" },
  });

  // Count events by category
  const eventsByCategory = await prisma.$queryRaw<{ category: string; count: bigint }[]>`
    SELECT e.category, COUNT(*) as count
    FROM "EventUserStatus" eus
    JOIN "Event" e ON eus."eventId" = e.id
    WHERE eus."userId" = ${userId} AND eus.status = 'DONE'
    GROUP BY e.category
  `;

  const categoryCountsRaw = eventsByCategory.reduce(
    (acc, row) => {
      acc[row.category] = Number(row.count);
      return acc;
    },
    {} as Record<string, number>
  );

  // Count unique neighborhoods visited
  const neighborhoods = await prisma.$queryRaw<{ neighborhood: string }[]>`
    SELECT DISTINCT e.neighborhood
    FROM "EventUserStatus" eus
    JOIN "Event" e ON eus."eventId" = e.id
    WHERE eus."userId" = ${userId} AND eus.status = 'DONE' AND e.neighborhood IS NOT NULL
  `;
  const neighborhoodsVisited = neighborhoods.length;

  // Count users followed
  const usersFollowed = await prisma.userFollow.count({
    where: { followerId: userId },
  });

  // Count followers
  const followersCount = await prisma.userFollow.count({
    where: { followingId: userId },
  });

  // Count creators followed
  const creatorsFollowed = await prisma.userInfluencerFollow.count({
    where: { userId },
  });

  // Count groups joined
  const groupsJoined = await prisma.groupMember.count({
    where: { userId },
  });

  // Count public lists created
  const publicListsCreated = await prisma.list.count({
    where: { userId, isPublic: true },
  });

  // Count new places visited (places opened < 90 days before visit)
  // This is a simplified version - in production you'd need actual visit dates
  const newPlacesVisited = 0; // TODO: Implement when place visits are tracked

  return {
    eventsAttended: Math.max(eventsAttended, user?.totalEventsAttended || 0),
    categoryCounts: categoryCountsRaw,
    neighborhoodsVisited,
    currentStreak: user?.currentStreak || 0,
    longestStreak: user?.longestStreak || 0,
    usersFollowed,
    followersCount,
    creatorsFollowed,
    groupsJoined,
    publicListsCreated,
    newPlacesVisited,
    joinedAt: user?.createdAt || new Date(),
  };
}

/**
 * Calculate progress for a specific badge requirement
 */
function calculateProgress(
  requirementType: string,
  requirementMeta: Record<string, unknown> | null,
  stats: Awaited<ReturnType<typeof getUserStats>>
): number {
  switch (requirementType) {
    case "events_attended":
      return stats.eventsAttended;

    case "events_in_category": {
      const category = requirementMeta?.category as string;
      return stats.categoryCounts[category] || 0;
    }

    case "neighborhoods_visited":
      return stats.neighborhoodsVisited;

    case "streak_weeks":
      return Math.max(stats.currentStreak, stats.longestStreak);

    case "users_followed":
      return stats.usersFollowed;

    case "followers_count":
      return stats.followersCount;

    case "creators_followed":
      return stats.creatorsFollowed;

    case "groups_joined":
      return stats.groupsJoined;

    case "public_lists_created":
      return stats.publicListsCreated;

    case "new_places_visited":
      return stats.newPlacesVisited;

    case "early_visitor":
      // This would need special tracking - placeholder
      return 0;

    case "joined_before": {
      const beforeDate = requirementMeta?.beforeDate as string;
      if (beforeDate && stats.joinedAt < new Date(beforeDate)) {
        return 1;
      }
      return 0;
    }

    default:
      return 0;
  }
}

/**
 * Pin/unpin a badge for profile display
 */
export async function toggleBadgePin(userId: string, badgeId: string): Promise<boolean> {
  const userBadge = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId } },
  });

  if (!userBadge || !userBadge.isEarned) {
    throw new Error("Badge not earned");
  }

  const updated = await prisma.userBadge.update({
    where: { userId_badgeId: { userId, badgeId } },
    data: { isPinned: !userBadge.isPinned },
  });

  return updated.isPinned;
}

/**
 * Get badge by slug
 */
export async function getBadgeBySlug(slug: string) {
  return prisma.badge.findUnique({
    where: { slug },
  });
}

/**
 * Get badges by category
 */
export async function getBadgesByCategory(category: BadgeCategory) {
  return prisma.badge.findMany({
    where: { category },
    orderBy: { tier: "asc" },
  });
}
