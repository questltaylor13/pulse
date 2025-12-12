/**
 * Recommendation Engine for Pulse
 *
 * "People like you also liked..." algorithm
 *
 * Algorithm Overview:
 * 1. Build a taste vector for the current user based on:
 *    - Explicit preferences (category likes/dislikes with intensity)
 *    - List actions (Want/Done events add bonus weight to their categories/tags)
 *
 * 2. Find similar users using Jaccard similarity on:
 *    - Overlapping liked categories
 *    - Overlapping saved/done events
 *
 * 3. Collect candidate events from similar users that current user hasn't interacted with
 *
 * 4. Rank candidates using combined score:
 *    - similarity_weight * user_similarity
 *    - event_match_score (how well event matches user's taste vector)
 *    - recency_boost (sooner events get slight boost)
 *
 * Fallbacks:
 * - Cold start: "Because you like X" - match user preferences to event categories
 * - Sparse data: Show trending/popular events by save/done count
 */

import { prisma } from "@/lib/prisma";
import { Category, EventListStatus } from "@prisma/client";

// Types
interface TasteVector {
  categories: Map<Category, number>; // category -> weight (-5 to +5 scale)
  tags: Map<string, number>; // tag -> weight
}

interface ScoredEvent {
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  venueName: string;
  address: string;
  startTime: Date;
  endTime: Date | null;
  priceRange: string;
  source: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  googleMapsUrl: string | null;
  appleMapsUrl: string | null;
  score: number;
  reason: string; // Why this was recommended
}

interface UserSimilarity {
  userId: string;
  similarity: number;
}

/**
 * Build a taste vector for a user based on preferences and list actions
 */
async function buildTasteVector(userId: string): Promise<TasteVector> {
  const categories = new Map<Category, number>();
  const tags = new Map<string, number>();

  // Get user preferences
  const preferences = await prisma.preference.findMany({
    where: { userId },
  });

  // Add preference weights
  // LIKE = +intensity, DISLIKE = -intensity
  for (const pref of preferences) {
    const weight = pref.preferenceType === "LIKE" ? pref.intensity : -pref.intensity;
    categories.set(pref.category, (categories.get(pref.category) || 0) + weight);
  }

  // Get user's Want/Done events and boost those categories/tags
  const userStatuses = await prisma.eventUserStatus.findMany({
    where: { userId },
    include: {
      event: {
        select: { category: true, tags: true },
      },
    },
  });

  // Bonus weights for list actions (DONE = stronger signal than WANT)
  for (const status of userStatuses) {
    const bonus = status.status === "DONE" ? 2 : 1;
    const currentCatWeight = categories.get(status.event.category) || 0;
    categories.set(status.event.category, currentCatWeight + bonus);

    // Boost tags from events user has saved
    for (const tag of status.event.tags) {
      tags.set(tag, (tags.get(tag) || 0) + bonus);
    }
  }

  return { categories, tags };
}

/**
 * Calculate Jaccard similarity between two sets
 * Jaccard = |A ∩ B| / |A ∪ B|
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Find users similar to the current user based on:
 * - Overlapping liked categories
 * - Overlapping Want/Done events
 */
async function findSimilarUsers(
  userId: string,
  limit: number = 20
): Promise<UserSimilarity[]> {
  // Get current user's liked categories
  const userPrefs = await prisma.preference.findMany({
    where: { userId, preferenceType: "LIKE" },
    select: { category: true },
  });
  const userCategories = new Set(userPrefs.map(p => p.category));

  // Get current user's interacted events
  const userStatuses = await prisma.eventUserStatus.findMany({
    where: { userId },
    select: { eventId: true },
  });
  const userEventIds = new Set(userStatuses.map(s => s.eventId));

  // Get all other users who have interacted with events
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
      eventStatuses: {
        select: { eventId: true },
      },
    },
  });

  // Calculate similarity for each user
  const similarities: UserSimilarity[] = [];

  for (const other of otherUsers) {
    const otherCategories = new Set(other.preferences.map(p => p.category));
    const otherEventIds = new Set(other.eventStatuses.map(s => s.eventId));

    // Combined similarity: average of category and event similarities
    const categorySimilarity = jaccardSimilarity(userCategories, otherCategories);
    const eventSimilarity = jaccardSimilarity(userEventIds, otherEventIds);

    // Weight event similarity higher as it's a stronger behavioral signal
    const combinedSimilarity = categorySimilarity * 0.4 + eventSimilarity * 0.6;

    if (combinedSimilarity > 0) {
      similarities.push({
        userId: other.id,
        similarity: combinedSimilarity,
      });
    }
  }

  // Sort by similarity descending and take top N
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Score how well an event matches a user's taste vector
 */
function scoreEventMatch(
  event: { category: Category; tags: string[] },
  tasteVector: TasteVector
): number {
  let score = 0;

  // Category match (major factor)
  const categoryWeight = tasteVector.categories.get(event.category) || 0;
  score += categoryWeight * 10; // Scale up category importance

  // Tag matches
  for (const tag of event.tags) {
    const tagWeight = tasteVector.tags.get(tag) || 0;
    score += tagWeight * 2;
  }

  return score;
}

/**
 * Calculate recency boost - events happening sooner get slight preference
 * Returns 0-10 points based on how soon the event is
 */
function calculateRecencyBoost(startTime: Date): number {
  const now = new Date();
  const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 0) return 0; // Past event
  if (hoursUntil <= 24) return 10;
  if (hoursUntil <= 72) return 8;
  if (hoursUntil <= 168) return 5; // 7 days
  if (hoursUntil <= 336) return 3; // 14 days
  return 1;
}

/**
 * Get recommendations using similar users ("People like you also liked")
 */
async function getCollaborativeRecommendations(
  userId: string,
  excludeEventId: string,
  limit: number = 12
): Promise<ScoredEvent[]> {
  const similarUsers = await findSimilarUsers(userId);

  if (similarUsers.length === 0) {
    return []; // No similar users found, will fall back
  }

  const tasteVector = await buildTasteVector(userId);

  // Get events that current user has NOT interacted with
  const userStatusEventIds = await prisma.eventUserStatus.findMany({
    where: { userId },
    select: { eventId: true },
  });
  const userEventIds = new Set(userStatusEventIds.map(s => s.eventId));
  userEventIds.add(excludeEventId); // Also exclude current event

  // Get events that similar users have interacted with
  const now = new Date();
  const candidateEvents = await prisma.event.findMany({
    where: {
      id: { notIn: [...userEventIds] },
      startTime: { gt: now },
      city: { slug: "denver" },
      userStatuses: {
        some: {
          userId: { in: similarUsers.map(u => u.userId) },
        },
      },
    },
    include: {
      userStatuses: {
        where: {
          userId: { in: similarUsers.map(u => u.userId) },
        },
      },
    },
  });

  // Score each candidate event
  const scoredEvents: ScoredEvent[] = candidateEvents.map(event => {
    // Sum similarity weights of users who saved this event
    let similarityScore = 0;
    for (const status of event.userStatuses) {
      const userSim = similarUsers.find(u => u.userId === status.userId);
      if (userSim) {
        // DONE events are stronger signals
        const statusWeight = status.status === "DONE" ? 1.5 : 1;
        similarityScore += userSim.similarity * statusWeight;
      }
    }

    const matchScore = scoreEventMatch(
      { category: event.category, tags: event.tags },
      tasteVector
    );
    const recencyBoost = calculateRecencyBoost(event.startTime);

    // Combined score
    const totalScore = similarityScore * 50 + matchScore + recencyBoost;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      tags: event.tags,
      venueName: event.venueName,
      address: event.address,
      startTime: event.startTime,
      endTime: event.endTime,
      priceRange: event.priceRange,
      source: event.source,
      sourceUrl: event.sourceUrl,
      imageUrl: event.imageUrl,
      googleMapsUrl: event.googleMapsUrl,
      appleMapsUrl: event.appleMapsUrl,
      score: totalScore,
      reason: "People like you also liked this",
    };
  });

  return scoredEvents
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Fallback: Content-based recommendations ("Because you like X")
 * Used when there aren't enough similar users
 */
async function getContentBasedRecommendations(
  userId: string,
  excludeEventId: string,
  limit: number = 12
): Promise<ScoredEvent[]> {
  const tasteVector = await buildTasteVector(userId);

  // Get user's interacted events to exclude
  const userStatuses = await prisma.eventUserStatus.findMany({
    where: { userId },
    select: { eventId: true },
  });
  const excludeIds = new Set(userStatuses.map(s => s.eventId));
  excludeIds.add(excludeEventId);

  // Get user's top liked categories
  const topCategories = [...tasteVector.categories.entries()]
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  if (topCategories.length === 0) {
    return []; // No preferences, will fall back to trending
  }

  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      id: { notIn: [...excludeIds] },
      startTime: { gt: now },
      city: { slug: "denver" },
      category: { in: topCategories },
    },
    take: limit * 2, // Get extra to filter
  });

  // Score and sort
  const scoredEvents: ScoredEvent[] = events.map(event => {
    const matchScore = scoreEventMatch(
      { category: event.category, tags: event.tags },
      tasteVector
    );
    const recencyBoost = calculateRecencyBoost(event.startTime);
    const categoryName = event.category.replace(/_/g, " ").toLowerCase();

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      tags: event.tags,
      venueName: event.venueName,
      address: event.address,
      startTime: event.startTime,
      endTime: event.endTime,
      priceRange: event.priceRange,
      source: event.source,
      sourceUrl: event.sourceUrl,
      imageUrl: event.imageUrl,
      googleMapsUrl: event.googleMapsUrl,
      appleMapsUrl: event.appleMapsUrl,
      score: matchScore + recencyBoost,
      reason: `Because you like ${categoryName}`,
    };
  });

  return scoredEvents
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Fallback: Trending/popular events
 * Used when user has no preferences or similar users
 */
async function getTrendingRecommendations(
  excludeEventId: string,
  limit: number = 12
): Promise<ScoredEvent[]> {
  const now = new Date();

  // Get events with most saves/dones
  const events = await prisma.event.findMany({
    where: {
      id: { not: excludeEventId },
      startTime: { gt: now },
      city: { slug: "denver" },
    },
    include: {
      _count: {
        select: { userStatuses: true },
      },
    },
    orderBy: {
      userStatuses: {
        _count: "desc",
      },
    },
    take: limit,
  });

  return events.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    tags: event.tags,
    venueName: event.venueName,
    address: event.address,
    startTime: event.startTime,
    endTime: event.endTime,
    priceRange: event.priceRange,
    source: event.source,
    sourceUrl: event.sourceUrl,
    imageUrl: event.imageUrl,
    googleMapsUrl: event.googleMapsUrl,
    appleMapsUrl: event.appleMapsUrl,
    score: event._count.userStatuses,
    reason: "Trending in Denver",
  }));
}

/**
 * Main recommendation function
 * Tries collaborative filtering first, falls back to content-based, then trending
 */
export async function getRecommendations(
  userId: string,
  excludeEventId: string,
  limit: number = 12
): Promise<ScoredEvent[]> {
  // Try collaborative filtering first
  let recommendations = await getCollaborativeRecommendations(userId, excludeEventId, limit);

  // If not enough results, supplement with content-based
  if (recommendations.length < limit) {
    const contentBased = await getContentBasedRecommendations(
      userId,
      excludeEventId,
      limit - recommendations.length
    );

    // Filter out duplicates
    const existingIds = new Set(recommendations.map(r => r.id));
    const newRecs = contentBased.filter(r => !existingIds.has(r.id));
    recommendations = [...recommendations, ...newRecs];
  }

  // If still not enough, add trending
  if (recommendations.length < limit) {
    const trending = await getTrendingRecommendations(
      excludeEventId,
      limit - recommendations.length
    );

    // Filter out duplicates
    const existingIds = new Set(recommendations.map(r => r.id));
    const newRecs = trending.filter(r => !existingIds.has(r.id));
    recommendations = [...recommendations, ...newRecs];
  }

  return recommendations.slice(0, limit);
}

export type { ScoredEvent };
