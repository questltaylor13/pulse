/**
 * Leaderboard Service - Rankings and scores
 */

import { prisma } from "@/lib/prisma";
import { LeaderboardType } from "@prisma/client";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  username: string | null;
  profileImageUrl: string | null;
  score: number;
  eventsAttended: number;
  uniquePlaces: number;
  neighborhoodsVisited: number;
  topBadge?: {
    emoji: string;
    name: string;
  };
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUserRank?: number;
  currentUserScore?: number;
  period: string;
  type: LeaderboardType;
  typeValue?: string;
}

/**
 * Get leaderboard entries
 */
export async function getLeaderboard(options: {
  period?: string; // "2025-12" or "all-time"
  type?: LeaderboardType;
  typeValue?: string;
  limit?: number;
  userId?: string; // Current user for highlighting
}): Promise<LeaderboardResponse> {
  const {
    period = getCurrentPeriod(),
    type = LeaderboardType.OVERALL,
    typeValue = "",
    limit = 50,
    userId,
  } = options;

  const entries = await prisma.leaderboardEntry.findMany({
    where: {
      period,
      type,
      typeValue: typeValue || "",
    },
    orderBy: { score: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          profileImageUrl: true,
          badges: {
            where: { isEarned: true },
            include: { badge: true },
            orderBy: { earnedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  // Map to response format with rank
  const leaderboardEntries: LeaderboardEntry[] = entries.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    userName: entry.user.name || "Anonymous",
    username: entry.user.username,
    profileImageUrl: entry.user.profileImageUrl,
    score: entry.score,
    eventsAttended: entry.eventsAttended,
    uniquePlaces: entry.uniquePlaces,
    neighborhoodsVisited: entry.neighborhoodsVisited,
    topBadge: entry.user.badges[0]?.badge
      ? {
          emoji: entry.user.badges[0].badge.emoji,
          name: entry.user.badges[0].badge.name,
        }
      : undefined,
  }));

  // Get current user's rank if not in top entries
  let currentUserRank: number | undefined;
  let currentUserScore: number | undefined;

  if (userId) {
    const userEntry = await prisma.leaderboardEntry.findUnique({
      where: {
        userId_period_type_typeValue: {
          userId,
          period,
          type,
          typeValue: typeValue || "",
        },
      },
    });

    if (userEntry) {
      currentUserScore = userEntry.score;

      // Count how many users have higher score
      const higherCount = await prisma.leaderboardEntry.count({
        where: {
          period,
          type,
          typeValue: typeValue || "",
          score: { gt: userEntry.score },
        },
      });

      currentUserRank = higherCount + 1;
    }
  }

  return {
    entries: leaderboardEntries,
    currentUserRank,
    currentUserScore,
    period,
    type,
    typeValue,
  };
}

/**
 * Update user's leaderboard entry
 * Call this after events are marked as attended
 */
export async function updateUserLeaderboard(userId: string): Promise<void> {
  const currentPeriod = getCurrentPeriod();

  // Calculate user's stats
  const stats = await calculateUserStats(userId);

  // Calculate score: (events * 10) + (places * 5) + (neighborhoods * 15)
  const score =
    stats.eventsAttended * 10 + stats.uniquePlaces * 5 + stats.neighborhoodsVisited * 15;

  // Update or create monthly entry
  await prisma.leaderboardEntry.upsert({
    where: {
      userId_period_type_typeValue: {
        userId,
        period: currentPeriod,
        type: LeaderboardType.OVERALL,
        typeValue: "",
      },
    },
    create: {
      userId,
      period: currentPeriod,
      type: LeaderboardType.OVERALL,
      typeValue: "",
      score,
      eventsAttended: stats.eventsAttended,
      uniquePlaces: stats.uniquePlaces,
      neighborhoodsVisited: stats.neighborhoodsVisited,
    },
    update: {
      score,
      eventsAttended: stats.eventsAttended,
      uniquePlaces: stats.uniquePlaces,
      neighborhoodsVisited: stats.neighborhoodsVisited,
    },
  });

  // Update all-time entry
  await prisma.leaderboardEntry.upsert({
    where: {
      userId_period_type_typeValue: {
        userId,
        period: "all-time",
        type: LeaderboardType.OVERALL,
        typeValue: "",
      },
    },
    create: {
      userId,
      period: "all-time",
      type: LeaderboardType.OVERALL,
      typeValue: "",
      score,
      eventsAttended: stats.eventsAttended,
      uniquePlaces: stats.uniquePlaces,
      neighborhoodsVisited: stats.neighborhoodsVisited,
    },
    update: {
      score,
      eventsAttended: stats.eventsAttended,
      uniquePlaces: stats.uniquePlaces,
      neighborhoodsVisited: stats.neighborhoodsVisited,
    },
  });

  // Update ranks (simplified - in production you'd use a job)
  await updateRanks(currentPeriod);
  await updateRanks("all-time");
}

/**
 * Update ranks for a period
 */
async function updateRanks(period: string): Promise<void> {
  // Get all entries ordered by score
  const entries = await prisma.leaderboardEntry.findMany({
    where: {
      period,
      type: LeaderboardType.OVERALL,
      typeValue: "",
    },
    orderBy: { score: "desc" },
    select: { id: true },
  });

  // Update ranks in batch
  for (let i = 0; i < entries.length; i++) {
    await prisma.leaderboardEntry.update({
      where: { id: entries[i].id },
      data: { rank: i + 1 },
    });
  }
}

/**
 * Calculate user stats for leaderboard
 */
async function calculateUserStats(userId: string) {
  // Count events attended this period
  const eventsAttended = await prisma.eventUserStatus.count({
    where: { userId, status: "DONE" },
  });

  // Count unique places (venues)
  const uniquePlaces = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT e."venueName") as count
    FROM "EventUserStatus" eus
    JOIN "Event" e ON eus."eventId" = e.id
    WHERE eus."userId" = ${userId} AND eus.status = 'DONE'
  `;

  // Count unique neighborhoods
  const neighborhoods = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT e.neighborhood) as count
    FROM "EventUserStatus" eus
    JOIN "Event" e ON eus."eventId" = e.id
    WHERE eus."userId" = ${userId} AND eus.status = 'DONE' AND e.neighborhood IS NOT NULL
  `;

  return {
    eventsAttended,
    uniquePlaces: Number(uniquePlaces[0]?.count || 0),
    neighborhoodsVisited: Number(neighborhoods[0]?.count || 0),
  };
}

/**
 * Get current period string (YYYY-MM)
 */
export function getCurrentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Get user's current rank and position info
 */
export async function getUserRankInfo(userId: string, period?: string) {
  const currentPeriod = period || getCurrentPeriod();

  const entry = await prisma.leaderboardEntry.findUnique({
    where: {
      userId_period_type_typeValue: {
        userId,
        period: currentPeriod,
        type: LeaderboardType.OVERALL,
        typeValue: "",
      },
    },
  });

  if (!entry) {
    return null;
  }

  // Get user ahead (for "X points behind #Y")
  const userAhead = await prisma.leaderboardEntry.findFirst({
    where: {
      period: currentPeriod,
      type: LeaderboardType.OVERALL,
      typeValue: "",
      score: { gt: entry.score },
    },
    orderBy: { score: "asc" },
    include: {
      user: {
        select: { name: true, username: true },
      },
    },
  });

  return {
    rank: entry.rank,
    score: entry.score,
    eventsAttended: entry.eventsAttended,
    uniquePlaces: entry.uniquePlaces,
    neighborhoodsVisited: entry.neighborhoodsVisited,
    userAhead: userAhead
      ? {
          name: userAhead.user.name,
          username: userAhead.user.username,
          pointsAhead: userAhead.score - entry.score,
          rank: userAhead.rank,
        }
      : null,
  };
}
