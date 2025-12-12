/**
 * Suggestion Generation Service
 *
 * Generates "Suggested for you" weekly and monthly curated picks.
 *
 * Algorithm:
 * 1. Build candidate pool (top 50-100 items) using match-scoring logic
 * 2. If OpenAI configured: AI curates subsets + generates reasons (with zod validation)
 * 3. Fallback: Deterministic selection (soonest for weekly, diversified for monthly)
 * 4. Cache results with TTL (regenerate daily)
 */

import { prisma } from "@/lib/prisma";
import { Category, ItemType, ItemStatus } from "@prisma/client";
import {
  generateAISuggestions,
  generateDeterministicSuggestions,
  CandidateItem,
  UserTasteSummary,
  AI_SUGGESTIONS_ENABLED,
} from "@/lib/ai/suggestions";

// Types
interface SuggestionCandidate {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  category: Category;
  tags: string[];
  startTime: Date | null;
  venueName: string;
  priceRange: string;
  score: number;
}

interface SuggestionSet {
  weeklyPicks: SuggestionCandidate[];
  monthlyPicks: SuggestionCandidate[];
  reasonsById: Record<string, string>;
  summaryText: string;
  isAiGenerated: boolean;
}

interface TasteVector {
  categories: Map<Category, number>;
  tags: Map<string, number>;
}

// Configuration
const CANDIDATE_POOL_SIZE = 100;
const WEEKLY_PICK_COUNT = 8;
const MONTHLY_PICK_COUNT = 15;
const SUGGESTION_TTL_HOURS = 24;

/**
 * Build taste vector from user preferences and interactions
 */
async function buildTasteVector(userId: string): Promise<TasteVector> {
  const categories = new Map<Category, number>();
  const tags = new Map<string, number>();

  // Get explicit preferences
  const preferences = await prisma.preference.findMany({
    where: { userId },
  });

  for (const pref of preferences) {
    const weight = pref.preferenceType === "LIKE" ? pref.intensity : -pref.intensity;
    categories.set(pref.category, (categories.get(pref.category) || 0) + weight);
  }

  // Get item interactions (WANT/DONE boost, PASS penalty)
  const itemStatuses = await prisma.userItemStatus.findMany({
    where: { userId },
    include: {
      item: { select: { category: true, tags: true } },
    },
  });

  for (const status of itemStatuses) {
    let weight = 0;
    if (status.status === "DONE") weight = 3;
    else if (status.status === "WANT") weight = 2;
    else if (status.status === "PASS") weight = -3;

    const current = categories.get(status.item.category) || 0;
    categories.set(status.item.category, current + weight);

    for (const tag of status.item.tags) {
      const tagWeight = tags.get(tag) || 0;
      tags.set(tag, tagWeight + (weight > 0 ? weight : weight * 0.5));
    }
  }

  // Get ratings (4-5 boost, 1-2 penalty)
  const ratings = await prisma.userItemRating.findMany({
    where: { userId },
    include: {
      item: { select: { category: true, tags: true } },
    },
  });

  for (const rating of ratings) {
    let weight = 0;
    if (rating.rating >= 4) weight = rating.rating - 3; // 4->1, 5->2
    else if (rating.rating <= 2) weight = rating.rating - 3; // 1->-2, 2->-1
    // 3 is neutral

    if (weight !== 0) {
      const current = categories.get(rating.item.category) || 0;
      categories.set(rating.item.category, current + weight);

      for (const tag of rating.item.tags) {
        const tagWeight = tags.get(tag) || 0;
        tags.set(tag, tagWeight + weight * 0.5);
      }
    }
  }

  return { categories, tags };
}

/**
 * Build user taste summary for AI
 */
async function buildUserTasteSummary(
  userId: string,
  tasteVector: TasteVector
): Promise<UserTasteSummary> {
  // Get liked and disliked categories
  const likedCategories: Category[] = [];
  const dislikedCategories: Category[] = [];

  for (const [category, weight] of tasteVector.categories) {
    if (weight > 2) likedCategories.push(category);
    else if (weight < -1) dislikedCategories.push(category);
  }

  // Get preferred tags
  const preferredTags = [...tasteVector.tags.entries()]
    .filter(([, weight]) => weight > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  // Get average rating
  const ratings = await prisma.userItemRating.aggregate({
    where: { userId },
    _avg: { rating: true },
    _count: true,
  });

  // Get status counts
  const statusCounts = await prisma.userItemStatus.groupBy({
    by: ["status"],
    where: { userId },
    _count: true,
  });

  const totalDone = statusCounts.find((s) => s.status === "DONE")?._count || 0;
  const totalPass = statusCounts.find((s) => s.status === "PASS")?._count || 0;

  // Get recent activity (last 5 items interacted with)
  const recentStatuses = await prisma.userItemStatus.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { item: { select: { title: true, category: true } } },
  });

  const recentActivity = recentStatuses.map(
    (s) => `${s.status} "${s.item.title}" (${s.item.category})`
  );

  return {
    likedCategories,
    dislikedCategories,
    preferredTags,
    avgRating: ratings._avg.rating,
    totalDone,
    totalPass,
    recentActivity,
  };
}

/**
 * Score an item based on user's taste vector
 */
function scoreItem(
  item: { category: Category; tags: string[]; startTime: Date | null },
  tasteVector: TasteVector
): number {
  let score = 0;

  // Category score (major factor)
  const categoryWeight = tasteVector.categories.get(item.category) || 0;
  score += categoryWeight * 10;

  // Tag scores
  for (const tag of item.tags) {
    const tagWeight = tasteVector.tags.get(tag) || 0;
    score += tagWeight * 2;
  }

  // Time relevance for events
  if (item.startTime) {
    const hoursUntil = (item.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil > 0 && hoursUntil <= 168) score += 10; // Within a week
    else if (hoursUntil > 168 && hoursUntil <= 720) score += 5; // Within a month
  }

  return score;
}

/**
 * Generate candidate pool of items for suggestions
 */
async function generateCandidatePool(
  userId: string,
  tasteVector: TasteVector
): Promise<SuggestionCandidate[]> {
  const now = new Date();

  // Get user's passed items to exclude
  const passedItems = await prisma.userItemStatus.findMany({
    where: { userId, status: "PASS" },
    select: { itemId: true },
  });
  const passedIds = new Set(passedItems.map((p) => p.itemId));

  // Get candidate items (future events + all places)
  const items = await prisma.item.findMany({
    where: {
      city: { slug: "denver" },
      OR: [
        { type: "EVENT", startTime: { gt: now } },
        { type: "PLACE" },
      ],
    },
    take: CANDIDATE_POOL_SIZE * 2,
  });

  // Filter out passed items and score remaining
  const candidates = items
    .filter((item) => !passedIds.has(item.id))
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      type: item.type,
      category: item.category,
      tags: item.tags,
      startTime: item.startTime,
      venueName: item.venueName,
      priceRange: item.priceRange,
      score: scoreItem(
        { category: item.category, tags: item.tags, startTime: item.startTime },
        tasteVector
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, CANDIDATE_POOL_SIZE);

  return candidates;
}

/**
 * Generate deterministic weekly picks (soonest upcoming events)
 */
function selectWeeklyDeterministic(
  candidates: SuggestionCandidate[],
  count: number
): SuggestionCandidate[] {
  const now = Date.now();
  const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;

  // Prefer events happening this week, sorted by start time
  const weeklyEvents = candidates
    .filter(
      (c) =>
        c.type === "EVENT" &&
        c.startTime &&
        c.startTime.getTime() > now &&
        c.startTime.getTime() <= weekFromNow
    )
    .sort((a, b) => (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0));

  // If not enough weekly events, add top-scored items
  if (weeklyEvents.length < count) {
    const remaining = candidates
      .filter((c) => !weeklyEvents.some((w) => w.id === c.id))
      .slice(0, count - weeklyEvents.length);
    return [...weeklyEvents, ...remaining];
  }

  return weeklyEvents.slice(0, count);
}

/**
 * Generate deterministic monthly picks (diversified by category)
 */
function selectMonthlyDeterministic(
  candidates: SuggestionCandidate[],
  count: number,
  excludeIds: Set<string>
): SuggestionCandidate[] {
  const selected: SuggestionCandidate[] = [];
  const categoryCounts = new Map<Category, number>();

  // Filter out already selected items
  const available = candidates.filter((c) => !excludeIds.has(c.id));

  // Iterate through sorted candidates, ensuring category diversity
  for (const candidate of available) {
    if (selected.length >= count) break;

    const catCount = categoryCounts.get(candidate.category) || 0;
    // Allow max 3 per category to ensure diversity
    if (catCount < 3) {
      selected.push(candidate);
      categoryCounts.set(candidate.category, catCount + 1);
    }
  }

  // If we need more, add remaining highest scored
  if (selected.length < count) {
    const remaining = available
      .filter((c) => !selected.some((s) => s.id === c.id))
      .slice(0, count - selected.length);
    selected.push(...remaining);
  }

  return selected;
}

/**
 * Generate reasons for deterministic selection
 */
function generateDeterministicReasons(
  picks: SuggestionCandidate[],
  tasteVector: TasteVector
): Record<string, string> {
  const reasons: Record<string, string> = {};

  for (const pick of picks) {
    const categoryWeight = tasteVector.categories.get(pick.category) || 0;
    const categoryName = pick.category.replace(/_/g, " ").toLowerCase();

    if (categoryWeight > 3) {
      reasons[pick.id] = `Matches your love of ${categoryName}`;
    } else if (categoryWeight > 0) {
      reasons[pick.id] = `Based on your interest in ${categoryName}`;
    } else if (pick.type === "EVENT" && pick.startTime) {
      const daysUntil = Math.ceil(
        (pick.startTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil <= 3) {
        reasons[pick.id] = `Happening soon - don't miss it!`;
      } else {
        reasons[pick.id] = `Coming up in ${daysUntil} days`;
      }
    } else {
      reasons[pick.id] = `Popular in Denver`;
    }
  }

  return reasons;
}

/**
 * Generate summary text for deterministic selection
 */
function generateDeterministicSummary(
  weeklyPicks: SuggestionCandidate[],
  monthlyPicks: SuggestionCandidate[],
  tasteVector: TasteVector
): string {
  const topCategories = [...tasteVector.categories.entries()]
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([cat]) => cat.replace(/_/g, " ").toLowerCase());

  const totalPicks = weeklyPicks.length + monthlyPicks.length;

  if (topCategories.length >= 2) {
    return `We found ${totalPicks} suggestions based on your love of ${topCategories[0]} and ${topCategories[1]}. Check out the weekly highlights for what's happening soon!`;
  } else if (topCategories.length === 1) {
    return `We curated ${totalPicks} picks focused on ${topCategories[0]} and things we think you'll enjoy. Don't miss this week's top events!`;
  }

  return `Here are ${totalPicks} handpicked suggestions for you. Explore what's happening in Denver this week and month!`;
}

/**
 * Get or generate suggestions for a user
 */
export async function getSuggestions(userId: string): Promise<SuggestionSet> {
  const now = new Date();

  // Check for cached suggestions
  const cached = await prisma.userSuggestionSet.findFirst({
    where: {
      userId,
      expiresAt: { gt: now },
    },
    orderBy: { generatedAt: "desc" },
  });

  if (cached) {
    // Fetch full item data for cached IDs
    const allIds = [...cached.weeklyIds, ...cached.monthlyIds];
    const items = await prisma.item.findMany({
      where: { id: { in: allIds } },
    });

    const itemMap = new Map(items.map((i) => [i.id, i]));

    const weeklyPicks = cached.weeklyIds
      .map((id) => itemMap.get(id))
      .filter(Boolean)
      .map((i) => ({
        id: i!.id,
        title: i!.title,
        description: i!.description,
        type: i!.type,
        category: i!.category,
        tags: i!.tags,
        startTime: i!.startTime,
        venueName: i!.venueName,
        priceRange: i!.priceRange,
        score: 0,
      })) as SuggestionCandidate[];

    const monthlyPicks = cached.monthlyIds
      .map((id) => itemMap.get(id))
      .filter(Boolean)
      .map((i) => ({
        id: i!.id,
        title: i!.title,
        description: i!.description,
        type: i!.type,
        category: i!.category,
        tags: i!.tags,
        startTime: i!.startTime,
        venueName: i!.venueName,
        priceRange: i!.priceRange,
        score: 0,
      })) as SuggestionCandidate[];

    return {
      weeklyPicks,
      monthlyPicks,
      reasonsById: JSON.parse(cached.reasonsJson),
      summaryText: cached.summaryText,
      isAiGenerated: cached.isAiGenerated,
    };
  }

  // Generate new suggestions
  const tasteVector = await buildTasteVector(userId);
  const candidates = await generateCandidatePool(userId, tasteVector);

  let suggestions: SuggestionSet;

  // Try AI curation first (if enabled)
  if (AI_SUGGESTIONS_ENABLED && candidates.length > 0) {
    const tasteSummary = await buildUserTasteSummary(userId, tasteVector);

    // Convert candidates to AI format
    const aiCandidates: CandidateItem[] = candidates.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      category: c.category,
      tags: c.tags,
      startTime: c.startTime,
      venueName: c.venueName,
      priceRange: c.priceRange,
      score: c.score,
    }));

    const aiResult = await generateAISuggestions(tasteSummary, aiCandidates);

    if (aiResult) {
      // Map AI result IDs back to full candidates
      const candidateMap = new Map(candidates.map((c) => [c.id, c]));

      const weeklyPicks = aiResult.weeklyPickIds
        .map((id) => candidateMap.get(id))
        .filter(Boolean) as SuggestionCandidate[];

      const monthlyPicks = aiResult.monthlyPickIds
        .map((id) => candidateMap.get(id))
        .filter(Boolean) as SuggestionCandidate[];

      suggestions = {
        weeklyPicks,
        monthlyPicks,
        reasonsById: aiResult.reasonsById,
        summaryText: aiResult.summaryText,
        isAiGenerated: true,
      };
    } else {
      // AI failed, use deterministic fallback
      suggestions = createDeterministicSuggestions(candidates, tasteVector);
    }
  } else {
    // AI disabled, use deterministic selection
    suggestions = createDeterministicSuggestions(candidates, tasteVector);
  }

  // Cache the suggestions
  const expiresAt = new Date(now.getTime() + SUGGESTION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.userSuggestionSet.create({
    data: {
      userId,
      expiresAt,
      weeklyIds: suggestions.weeklyPicks.map((p) => p.id),
      monthlyIds: suggestions.monthlyPicks.map((p) => p.id),
      reasonsJson: JSON.stringify(suggestions.reasonsById),
      summaryText: suggestions.summaryText,
      isAiGenerated: suggestions.isAiGenerated,
    },
  });

  return suggestions;
}

/**
 * Create deterministic suggestions (helper)
 */
function createDeterministicSuggestions(
  candidates: SuggestionCandidate[],
  tasteVector: TasteVector
): SuggestionSet {
  const weeklyPicks = selectWeeklyDeterministic(candidates, WEEKLY_PICK_COUNT);
  const weeklyIds = new Set(weeklyPicks.map((p) => p.id));
  const monthlyPicks = selectMonthlyDeterministic(
    candidates,
    MONTHLY_PICK_COUNT,
    weeklyIds
  );

  const allPicks = [...weeklyPicks, ...monthlyPicks];
  const reasonsById = generateDeterministicReasons(allPicks, tasteVector);
  const summaryText = generateDeterministicSummary(
    weeklyPicks,
    monthlyPicks,
    tasteVector
  );

  return {
    weeklyPicks,
    monthlyPicks,
    reasonsById,
    summaryText,
    isAiGenerated: false,
  };
}

/**
 * Force regenerate suggestions for a user (e.g., after preferences change)
 */
export async function regenerateSuggestions(userId: string): Promise<SuggestionSet> {
  // Delete existing suggestions
  await prisma.userSuggestionSet.deleteMany({
    where: { userId },
  });

  return getSuggestions(userId);
}

export type { SuggestionCandidate, SuggestionSet };
