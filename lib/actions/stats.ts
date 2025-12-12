"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";

// Time range options in days
export type TimeRange = 7 | 30 | 90 | "all";

interface StatsResult {
  totalViews: number;
  totalWant: number;
  totalDone: number;
  topCategories: { category: Category; count: number }[];
  topTags: { tag: string; count: number }[];
  vibeSummary: string;
  streakWeeks: number;
  range: TimeRange;
}

/**
 * Get date range start based on range option
 * Range filtering: subtracts N days from now for bounded queries
 */
function getDateRangeStart(range: TimeRange): Date | null {
  if (range === "all") return null;

  const start = new Date();
  start.setDate(start.getDate() - range);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Generate a deterministic "vibe" summary from top categories and tags
 * No LLM required - uses template-based generation
 */
function generateVibeSummary(
  topCategories: { category: Category; count: number }[],
  topTags: { tag: string; count: number }[]
): string {
  if (topCategories.length === 0) {
    return "Start exploring events to discover your vibe!";
  }

  const categoryLabels: Record<Category, string> = {
    ART: "art & culture",
    LIVE_MUSIC: "live music",
    BARS: "nightlife",
    FOOD: "food adventures",
    COFFEE: "coffee culture",
    OUTDOORS: "outdoor activities",
    FITNESS: "fitness & wellness",
    SEASONAL: "seasonal experiences",
    POPUP: "pop-ups & markets",
    OTHER: "unique experiences",
    RESTAURANT: "dining experiences",
    ACTIVITY_VENUE: "fun activities",
  };

  // Get top 3 categories
  const vibes = topCategories
    .slice(0, 3)
    .map(c => categoryLabels[c.category]);

  // Add top tags for flavor
  const tagFlavor = topTags.slice(0, 2).map(t => t.tag.toLowerCase());

  let summary = `You're into ${vibes.join(" + ")}`;

  if (tagFlavor.length > 0) {
    summary += ` with a side of ${tagFlavor.join(" & ")}`;
  }

  summary += " lately.";

  return summary;
}

/**
 * Calculate streak of consecutive weeks with at least 1 "Done" event or item
 * Now includes BOTH legacy EventUserStatus and new UserItemStatus
 */
async function calculateStreak(userId: string): Promise<number> {
  // Get all DONE events and items ordered by date from BOTH systems
  const [doneEvents, doneItems] = await Promise.all([
    // Legacy events
    prisma.eventUserStatus.findMany({
      where: {
        userId,
        status: "DONE",
      },
      include: {
        event: {
          select: { startTime: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    // New items
    prisma.userItemStatus.findMany({
      where: {
        userId,
        status: "DONE",
      },
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (doneEvents.length === 0 && doneItems.length === 0) return 0;

  // Group by week (week number since epoch)
  const weeksWithActivity = new Set<number>();

  // Add weeks from legacy events
  for (const event of doneEvents) {
    const eventDate = event.event.startTime;
    const weekNumber = Math.floor(eventDate.getTime() / (7 * 24 * 60 * 60 * 1000));
    weeksWithActivity.add(weekNumber);
  }

  // Add weeks from new items (using updatedAt as the completion date)
  for (const item of doneItems) {
    const itemDate = item.updatedAt;
    const weekNumber = Math.floor(itemDate.getTime() / (7 * 24 * 60 * 60 * 1000));
    weeksWithActivity.add(weekNumber);
  }

  // Get current week
  const now = new Date();
  const currentWeek = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));

  // Count consecutive weeks backwards from current
  let streak = 0;
  let checkWeek = currentWeek;

  while (weeksWithActivity.has(checkWeek)) {
    streak++;
    checkWeek--;
  }

  return streak;
}

/**
 * Get user stats for the Wrapped page
 * Now queries BOTH legacy EventUserStatus and new UserItemStatus tables
 */
export async function getUserStats(range: TimeRange = 30): Promise<StatsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const rangeStart = getDateRangeStart(range);

  // Build date filter for queries
  const dateFilter = rangeStart ? { gte: rangeStart } : undefined;

  // Get counts from BOTH systems in parallel
  const [
    eventViewCount,
    itemViewCount,
    eventWantCount,
    itemWantCount,
    eventDoneCount,
    itemDoneCount,
    eventStatusesWithDetails,
    itemStatusesWithDetails,
  ] = await Promise.all([
    // Legacy event views
    prisma.eventView.count({
      where: {
        userId,
        ...(dateFilter && { createdAt: dateFilter }),
      },
    }),

    // New item views
    prisma.itemView.count({
      where: {
        userId,
        ...(dateFilter && { createdAt: dateFilter }),
      },
    }),

    // Legacy Want (events)
    prisma.eventUserStatus.count({
      where: {
        userId,
        status: "WANT",
        ...(dateFilter && { createdAt: dateFilter }),
      },
    }),

    // New Want (items/places)
    prisma.userItemStatus.count({
      where: {
        userId,
        status: "WANT",
        ...(dateFilter && { createdAt: dateFilter }),
      },
    }),

    // Legacy Done (events)
    prisma.eventUserStatus.count({
      where: {
        userId,
        status: "DONE",
        ...(dateFilter && { createdAt: dateFilter }),
      },
    }),

    // New Done (items/places)
    prisma.userItemStatus.count({
      where: {
        userId,
        status: "DONE",
        ...(dateFilter && { createdAt: dateFilter }),
      },
    }),

    // Get legacy event statuses with details for category/tag analysis
    prisma.eventUserStatus.findMany({
      where: {
        userId,
        ...(dateFilter && { createdAt: dateFilter }),
      },
      include: {
        event: {
          select: { category: true, tags: true },
        },
      },
    }),

    // Get new item statuses with details
    prisma.userItemStatus.findMany({
      where: {
        userId,
        ...(dateFilter && { createdAt: dateFilter }),
      },
      include: {
        item: {
          select: { category: true, tags: true, type: true },
        },
      },
    }),
  ]);

  // Combine counts from both systems
  const totalViews = eventViewCount + itemViewCount;
  const totalWant = eventWantCount + itemWantCount;
  const totalDone = eventDoneCount + itemDoneCount;

  // Aggregate categories from both systems
  const categoryCounts = new Map<Category, number>();
  const tagCounts = new Map<string, number>();

  // From legacy event statuses
  for (const status of eventStatusesWithDetails) {
    const cat = status.event.category;
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);

    for (const tag of status.event.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  // From new item statuses (exclude EVENT type to avoid double counting)
  for (const status of itemStatusesWithDetails) {
    if (status.item.type === "EVENT") continue; // Skip events to avoid duplicates

    const cat = status.item.category;
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);

    for (const tag of status.item.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  // Sort and get top categories
  const topCategories = [...categoryCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Sort and get top tags
  const topTags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Calculate streak
  const streakWeeks = await calculateStreak(userId);

  // Generate vibe summary
  const vibeSummary = generateVibeSummary(topCategories, topTags);

  return {
    totalViews,
    totalWant,
    totalDone,
    topCategories,
    topTags,
    vibeSummary,
    streakWeeks,
    range,
  };
}
