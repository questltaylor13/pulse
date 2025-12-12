/**
 * Recommendation Engine V2 for Pulse
 *
 * Supports both Events and Places with:
 * - PASS status exclusion
 * - Rating-influenced taste vectors
 * - Collaborative filtering with similarity
 * - Content-based and trending fallbacks
 */

import { prisma } from "@/lib/prisma";
import { Category, ItemType, ItemStatus } from "@prisma/client";

// Types
interface TasteVector {
  categories: Map<Category, number>;
  tags: Map<string, number>;
}

interface ScoredItem {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  venueName: string;
  address: string;
  startTime: Date | null;
  endTime: Date | null;
  priceRange: string;
  source: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  googleMapsUrl: string | null;
  appleMapsUrl: string | null;
  neighborhood: string | null;
  hours: string | null;
  score: number;
  reason: string;
}

interface UserSimilarity {
  userId: string;
  similarity: number;
}

/**
 * Build taste vector with ratings influence
 * - Preferences: LIKE = +intensity, DISLIKE = -intensity
 * - Status: DONE = +3, WANT = +2, PASS = -3
 * - Ratings: 4-5 = +weight, 1-2 = -weight, 3 = neutral
 */
async function buildTasteVector(userId: string): Promise<TasteVector> {
  const categories = new Map<Category, number>();
  const tags = new Map<string, number>();

  // 1. Explicit preferences
  const preferences = await prisma.preference.findMany({
    where: { userId },
  });

  for (const pref of preferences) {
    const weight = pref.preferenceType === "LIKE" ? pref.intensity : -pref.intensity;
    categories.set(pref.category, (categories.get(pref.category) || 0) + weight);
  }

  // 2. Item status interactions
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
      // PASS penalizes tags less severely than categories
      tags.set(tag, tagWeight + (status.status === "PASS" ? weight * 0.5 : weight));
    }
  }

  // 3. Ratings influence
  const ratings = await prisma.userItemRating.findMany({
    where: { userId },
    include: {
      item: { select: { category: true, tags: true } },
    },
  });

  for (const rating of ratings) {
    let weight = 0;
    if (rating.rating >= 4) weight = (rating.rating - 3) * 1.5; // 4->1.5, 5->3
    else if (rating.rating <= 2) weight = (rating.rating - 3) * 1.5; // 1->-3, 2->-1.5
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
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Find similar users based on overlapping preferences and interactions
 */
async function findSimilarUsers(userId: string, limit: number = 20): Promise<UserSimilarity[]> {
  // Get current user's liked categories
  const userPrefs = await prisma.preference.findMany({
    where: { userId, preferenceType: "LIKE" },
    select: { category: true },
  });
  const userCategories = new Set(userPrefs.map((p) => p.category));

  // Get current user's interacted items
  const userStatuses = await prisma.userItemStatus.findMany({
    where: { userId, status: { in: ["WANT", "DONE"] } },
    select: { itemId: true },
  });
  const userItemIds = new Set(userStatuses.map((s) => s.itemId));

  // Get all other users with their data
  const otherUsers = await prisma.user.findMany({
    where: {
      id: { not: userId },
      onboardingComplete: true,
    },
    select: {
      id: true,
      preferences: {
        where: { preferenceType: "LIKE" },
        select: { category: true },
      },
      itemStatuses: {
        where: { status: { in: ["WANT", "DONE"] } },
        select: { itemId: true },
      },
    },
  });

  const similarities: UserSimilarity[] = [];

  for (const other of otherUsers) {
    const otherCategories = new Set(other.preferences.map((p) => p.category));
    const otherItemIds = new Set(other.itemStatuses.map((s) => s.itemId));

    const categorySimilarity = jaccardSimilarity(userCategories, otherCategories);
    const itemSimilarity = jaccardSimilarity(userItemIds, otherItemIds);

    // Weight item similarity higher (stronger behavioral signal)
    const combinedSimilarity = categorySimilarity * 0.3 + itemSimilarity * 0.7;

    if (combinedSimilarity > 0.05) {
      similarities.push({ userId: other.id, similarity: combinedSimilarity });
    }
  }

  return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}

/**
 * Score how well an item matches a user's taste vector
 */
function scoreItemMatch(
  item: { category: Category; tags: string[]; startTime: Date | null },
  tasteVector: TasteVector
): number {
  let score = 0;

  // Category match (major factor)
  const categoryWeight = tasteVector.categories.get(item.category) || 0;
  score += categoryWeight * 10;

  // Tag matches
  for (const tag of item.tags) {
    const tagWeight = tasteVector.tags.get(tag) || 0;
    score += tagWeight * 2;
  }

  return score;
}

/**
 * Calculate recency boost for events
 */
function calculateRecencyBoost(startTime: Date | null): number {
  if (!startTime) return 5; // Places get moderate boost

  const hoursUntil = (startTime.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < 0) return 0;
  if (hoursUntil <= 24) return 15;
  if (hoursUntil <= 72) return 12;
  if (hoursUntil <= 168) return 8; // 7 days
  if (hoursUntil <= 336) return 5; // 14 days
  return 2;
}

/**
 * Get items to exclude (passed, already in WANT/DONE, current item)
 */
async function getExcludedItemIds(
  userId: string,
  currentItemId: string
): Promise<Set<string>> {
  const excluded = new Set<string>([currentItemId]);

  // Add passed items
  const passed = await prisma.userItemStatus.findMany({
    where: { userId, status: "PASS" },
    select: { itemId: true },
  });
  passed.forEach((p) => excluded.add(p.itemId));

  return excluded;
}

/**
 * Collaborative recommendations from similar users
 */
async function getCollaborativeRecommendations(
  userId: string,
  excludeItemId: string,
  itemType: ItemType | null,
  limit: number
): Promise<ScoredItem[]> {
  const similarUsers = await findSimilarUsers(userId);
  if (similarUsers.length === 0) return [];

  const tasteVector = await buildTasteVector(userId);
  const excludedIds = await getExcludedItemIds(userId, excludeItemId);

  const now = new Date();
  const whereClause: any = {
    id: { notIn: [...excludedIds] },
    city: { slug: "denver" },
    userStatuses: {
      some: {
        userId: { in: similarUsers.map((u) => u.userId) },
        status: { in: ["WANT", "DONE"] },
      },
    },
  };

  // Filter by type if specified
  if (itemType === "EVENT") {
    whereClause.type = "EVENT";
    whereClause.startTime = { gt: now };
  } else if (itemType === "PLACE") {
    whereClause.type = "PLACE";
  }

  const candidates = await prisma.item.findMany({
    where: whereClause,
    include: {
      userStatuses: {
        where: {
          userId: { in: similarUsers.map((u) => u.userId) },
          status: { in: ["WANT", "DONE"] },
        },
      },
    },
  });

  const scoredItems: ScoredItem[] = candidates.map((item) => {
    // Sum similarity weights
    let similarityScore = 0;
    for (const status of item.userStatuses) {
      const userSim = similarUsers.find((u) => u.userId === status.userId);
      if (userSim) {
        const statusWeight = status.status === "DONE" ? 1.5 : 1;
        similarityScore += userSim.similarity * statusWeight;
      }
    }

    const matchScore = scoreItemMatch(
      { category: item.category, tags: item.tags, startTime: item.startTime },
      tasteVector
    );
    const recencyBoost = calculateRecencyBoost(item.startTime);
    const totalScore = similarityScore * 50 + matchScore + recencyBoost;

    return {
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      category: item.category,
      tags: item.tags,
      venueName: item.venueName,
      address: item.address,
      startTime: item.startTime,
      endTime: item.endTime,
      priceRange: item.priceRange,
      source: item.source,
      sourceUrl: item.sourceUrl,
      imageUrl: item.imageUrl,
      googleMapsUrl: item.googleMapsUrl,
      appleMapsUrl: item.appleMapsUrl,
      neighborhood: item.neighborhood,
      hours: item.hours,
      score: totalScore,
      reason: "People like you also liked this",
    };
  });

  return scoredItems.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Content-based recommendations using taste vector
 */
async function getContentBasedRecommendations(
  userId: string,
  excludeItemId: string,
  itemType: ItemType | null,
  limit: number
): Promise<ScoredItem[]> {
  const tasteVector = await buildTasteVector(userId);
  const excludedIds = await getExcludedItemIds(userId, excludeItemId);

  // Get top liked categories
  const topCategories = [...tasteVector.categories.entries()]
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat]) => cat);

  if (topCategories.length === 0) return [];

  const now = new Date();
  const whereClause: any = {
    id: { notIn: [...excludedIds] },
    city: { slug: "denver" },
    category: { in: topCategories },
  };

  if (itemType === "EVENT") {
    whereClause.type = "EVENT";
    whereClause.startTime = { gt: now };
  } else if (itemType === "PLACE") {
    whereClause.type = "PLACE";
  }

  const items = await prisma.item.findMany({
    where: whereClause,
    take: limit * 2,
  });

  const scoredItems: ScoredItem[] = items.map((item) => {
    const matchScore = scoreItemMatch(
      { category: item.category, tags: item.tags, startTime: item.startTime },
      tasteVector
    );
    const recencyBoost = calculateRecencyBoost(item.startTime);
    const categoryName = item.category.replace(/_/g, " ").toLowerCase();

    return {
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      category: item.category,
      tags: item.tags,
      venueName: item.venueName,
      address: item.address,
      startTime: item.startTime,
      endTime: item.endTime,
      priceRange: item.priceRange,
      source: item.source,
      sourceUrl: item.sourceUrl,
      imageUrl: item.imageUrl,
      googleMapsUrl: item.googleMapsUrl,
      appleMapsUrl: item.appleMapsUrl,
      neighborhood: item.neighborhood,
      hours: item.hours,
      score: matchScore + recencyBoost,
      reason: `Because you like ${categoryName}`,
    };
  });

  return scoredItems.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Trending/popular items fallback
 */
async function getTrendingRecommendations(
  excludeItemId: string,
  itemType: ItemType | null,
  limit: number
): Promise<ScoredItem[]> {
  const now = new Date();
  const whereClause: any = {
    id: { not: excludeItemId },
    city: { slug: "denver" },
  };

  if (itemType === "EVENT") {
    whereClause.type = "EVENT";
    whereClause.startTime = { gt: now };
  } else if (itemType === "PLACE") {
    whereClause.type = "PLACE";
  }

  const items = await prisma.item.findMany({
    where: whereClause,
    include: {
      _count: { select: { userStatuses: true, ratings: true } },
    },
    orderBy: [
      { userStatuses: { _count: "desc" } },
      { ratings: { _count: "desc" } },
    ],
    take: limit,
  });

  return items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    category: item.category,
    tags: item.tags,
    venueName: item.venueName,
    address: item.address,
    startTime: item.startTime,
    endTime: item.endTime,
    priceRange: item.priceRange,
    source: item.source,
    sourceUrl: item.sourceUrl,
    imageUrl: item.imageUrl,
    googleMapsUrl: item.googleMapsUrl,
    appleMapsUrl: item.appleMapsUrl,
    neighborhood: item.neighborhood,
    hours: item.hours,
    score: item._count.userStatuses + item._count.ratings * 2,
    reason: "Trending in Denver",
  }));
}

/**
 * Main recommendation function
 * Combines collaborative, content-based, and trending with fallbacks
 */
export async function getItemRecommendations(
  userId: string,
  excludeItemId: string,
  options: {
    itemType?: ItemType | null;
    limit?: number;
  } = {}
): Promise<ScoredItem[]> {
  const { itemType = null, limit = 12 } = options;

  // Try collaborative filtering first
  let recommendations = await getCollaborativeRecommendations(
    userId,
    excludeItemId,
    itemType,
    limit
  );

  // Supplement with content-based if needed
  if (recommendations.length < limit) {
    const contentBased = await getContentBasedRecommendations(
      userId,
      excludeItemId,
      itemType,
      limit - recommendations.length
    );
    const existingIds = new Set(recommendations.map((r) => r.id));
    recommendations.push(...contentBased.filter((r) => !existingIds.has(r.id)));
  }

  // Supplement with trending if still needed
  if (recommendations.length < limit) {
    const trending = await getTrendingRecommendations(
      excludeItemId,
      itemType,
      limit - recommendations.length
    );
    const existingIds = new Set(recommendations.map((r) => r.id));
    recommendations.push(...trending.filter((r) => !existingIds.has(r.id)));
  }

  return recommendations.slice(0, limit);
}

/**
 * Get recommended places for the feed
 */
export async function getRecommendedPlaces(
  userId: string,
  limit: number = 12
): Promise<ScoredItem[]> {
  return getItemRecommendations(userId, "", { itemType: "PLACE", limit });
}

/**
 * Get recommended events for the feed
 */
export async function getRecommendedEvents(
  userId: string,
  limit: number = 12
): Promise<ScoredItem[]> {
  return getItemRecommendations(userId, "", { itemType: "EVENT", limit });
}

export type { ScoredItem, TasteVector };
