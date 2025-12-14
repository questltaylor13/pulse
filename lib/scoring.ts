import {
  Category,
  RelationshipStatus,
  FeedbackType,
  DayOfWeek,
  TimeOfDay,
  BudgetPreference,
  GoingWith,
  SocialIntent,
} from "@prisma/client";

// ============================================================================
// TYPES
// ============================================================================

export interface PlaceData {
  id: string;
  googleMapsUrl: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  priceLevel: number | null;
  combinedScore: number | null;
  vibeTags: string[];
  companionTags: string[];
  pulseDescription: string | null;
  primaryImageUrl?: string | null;
  isDogFriendly?: boolean;
  dogFriendlyNotes?: string | null;
  isDrinkingOptional?: boolean;
  isAlcoholFree?: boolean;
  hasMocktailMenu?: boolean;
  soberFriendlyNotes?: string | null;
}

export interface ScoredEvent {
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  venueName: string;
  address: string;
  neighborhood: string | null;
  startTime: Date;
  endTime: Date | null;
  priceRange: string;
  source: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  appleRating: number | null;
  appleRatingCount: number | null;
  place?: PlaceData | null;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  recommendationReason: string;
  reasonType: ReasonType;
  isExplorationPick?: boolean;
  isTrendingPick?: boolean;
}

export interface ScoreBreakdown {
  categoryScore: number;
  timeScore: number;
  priceScore: number;
  relationshipScore: number;
  feedbackScore: number;
  constraintScore: number;
  diversityScore: number;
  trendingScore: number;
  // Detailed preferences scores
  companionScore: number;
  timingScore: number;
  budgetScore: number;
  vibeScore: number;
  socialScore: number;
  // Lifestyle scores
  dogFriendlyScore: number;
  soberFriendlyScore: number;
}

export type ReasonType =
  | "CATEGORY_MATCH"
  | "NEIGHBORHOOD_MATCH"
  | "SIMILAR_TASTE"
  | "TRENDING"
  | "WEEKEND_PREFERENCE"
  | "TIME_PREFERENCE"
  | "VENUE_FAVORITE"
  | "EXPLORATION"
  | "HIGH_RATED"
  | "FREE_EVENT"
  | "GOING_WITH_MATCH"
  | "DATE_NIGHT_MATCH"
  | "FRIENDS_MATCH"
  | "FAMILY_MATCH"
  | "SOLO_MATCH"
  | "VIBE_MATCH"
  | "SOCIAL_MATCH"
  | "BUDGET_MATCH"
  | "DOG_FRIENDLY_MATCH"
  | "SOBER_FRIENDLY_MATCH";

export interface UserPreferences {
  categories: Map<Category, { type: "LIKE" | "DISLIKE"; intensity: number }>;
  relationshipStatus: RelationshipStatus | null;
}

export interface UserFeedbackData {
  moreCategories: Map<Category, number>; // category -> boost count
  lessCategories: Map<Category, number>; // category -> reduce count
  moreVenues: Map<string, number>; // venueName -> boost count
  lessVenues: Map<string, number>; // venueName -> reduce count
  hiddenEventIds: Set<string>;
}

export interface UserConstraintsData {
  preferredDays: DayOfWeek[];
  preferredTimes: TimeOfDay[];
  budgetMax: BudgetPreference;
  neighborhoods: string[];
  homeNeighborhood: string | null;
  freeEventsOnly: boolean;
  discoveryMode: boolean;
}

export interface FeedViewData {
  seenCounts: Map<string, number>; // eventId -> times seen
  interactedEventIds: Set<string>;
}

export interface UserInteractionData {
  savedCategories: Map<Category, number>; // category -> save count
  topNeighborhoods: string[];
  goingWithHistory: Map<GoingWith, number>; // type -> count
}

export interface DetailedPreferencesData {
  // Going with preferences (1-5 intensity)
  goingSolo: number | null;
  goingDate: number | null;
  goingFriends: number | null;
  goingFamily: number | null;
  // Time preferences (1-5 intensity)
  timeWeeknight: number | null;
  timeWeekend: number | null;
  timeMorning: number | null;
  timeDaytime: number | null;
  timeEvening: number | null;
  timeLateNight: number | null;
  // Budget
  budget: BudgetPreference;
  // Vibe preferences (1-5 intensity)
  vibeChill: number | null;
  vibeModerate: number | null;
  vibeHighEnergy: number | null;
  // Social intent
  socialIntent: SocialIntent;
  // Lifestyle preferences
  hasDog: boolean;
  dogFriendlyOnly: boolean;
  preferSoberFriendly: boolean;
  avoidBars: boolean;
}

export interface ScoringContext {
  preferences: UserPreferences;
  feedback?: UserFeedbackData;
  constraints?: UserConstraintsData;
  feedViews?: FeedViewData;
  interactions?: UserInteractionData;
  globalTrending?: Set<string>; // eventIds with high save counts
  detailedPreferences?: DetailedPreferencesData;
}

interface EventForScoring {
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  venueName: string;
  address: string;
  neighborhood: string | null;
  startTime: Date;
  endTime: Date | null;
  priceRange: string;
  source: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  appleRating: number | null;
  appleRatingCount: number | null;
  place?: PlaceData | null;
  saveCount?: number; // For trending calculation
  // Lifestyle fields
  isDogFriendly?: boolean;
  dogFriendlyDetails?: string | null;
  isDrinkingOptional?: boolean;
  isAlcoholFree?: boolean;
  soberFriendlyNotes?: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COUPLE_FRIENDLY_CATEGORIES = new Set<Category>([
  "ART",
  "FOOD",
  "COFFEE",
  "LIVE_MUSIC",
  "SEASONAL",
  "RESTAURANT",
]);

const SINGLES_FRIENDLY_CATEGORIES = new Set<Category>([
  "BARS",
  "LIVE_MUSIC",
  "FITNESS",
  "OUTDOORS",
  "POPUP",
]);

const FRIENDS_FRIENDLY_CATEGORIES = new Set<Category>([
  "BARS",
  "LIVE_MUSIC",
  "FOOD",
  "OUTDOORS",
  "FITNESS",
  "POPUP",
]);

const FAMILY_FRIENDLY_CATEGORIES = new Set<Category>([
  "ART",
  "OUTDOORS",
  "SEASONAL",
  "FOOD",
  "ACTIVITY_VENUE",
]);

const DATE_FRIENDLY_TAGS = new Set([
  "romantic",
  "date night",
  "date-friendly",
  "intimate",
  "upscale",
  "dinner",
  "sunset",
]);

const DAY_MAP: Record<number, DayOfWeek> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

// Companion-friendly tags
const SOLO_FRIENDLY_TAGS = new Set([
  "solo-friendly",
  "self-care",
  "self-paced",
  "meditation",
  "yoga",
  "workshop",
  "class",
  "reading",
  "coffee",
  "museum",
  "gallery",
  "exhibition",
]);

const FRIENDS_FRIENDLY_TAGS = new Set([
  "group",
  "friends-group",
  "social",
  "party",
  "trivia",
  "game-night",
  "brunch",
  "happy-hour",
  "bar-crawl",
  "festival",
  "concert",
]);

const FAMILY_FRIENDLY_TAGS = new Set([
  "family-friendly",
  "kid-friendly",
  "all-ages",
  "children",
  "family",
  "outdoor",
  "park",
  "zoo",
  "aquarium",
]);

// Vibe tags
const CHILL_VIBE_TAGS = new Set([
  "chill",
  "relaxed",
  "low-key",
  "casual",
  "acoustic",
  "coffee",
  "brunch",
  "yoga",
  "meditation",
  "spa",
  "self-care",
]);

const MODERATE_VIBE_TAGS = new Set([
  "moderate",
  "fun",
  "social",
  "dinner",
  "live-music",
  "comedy",
  "trivia",
  "workshop",
  "outdoor",
]);

const HIGH_ENERGY_VIBE_TAGS = new Set([
  "high-energy",
  "party",
  "club",
  "dancing",
  "festival",
  "concert",
  "rave",
  "sports",
  "fitness",
  "adventure",
  "edm",
  "electronic",
]);

// Social tags
const SOCIAL_MEETUP_TAGS = new Set([
  "meetup",
  "networking",
  "social",
  "singles",
  "community",
  "class",
  "workshop",
  "group-activity",
  "tour",
  "walking-tour",
]);

const SOLO_ACTIVITY_TAGS = new Set([
  "solo-friendly",
  "self-paced",
  "exhibition",
  "museum",
  "gallery",
  "coffee",
  "reading",
  "self-care",
]);

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate category match score (0-50 points)
 */
function calculateCategoryScore(
  category: Category,
  preferences: UserPreferences
): number {
  const pref = preferences.categories.get(category);

  if (!pref) {
    return 25; // Neutral score for categories without preference
  }

  if (pref.type === "LIKE") {
    return 30 + pref.intensity * 4;
  } else {
    return 20 - pref.intensity * 4;
  }
}

/**
 * Calculate time relevance score (0-20 points)
 */
function calculateTimeScore(startTime: Date): number {
  const now = new Date();
  const hoursUntilEvent =
    (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilEvent < 0) return 0;
  if (hoursUntilEvent <= 24) return 20;
  if (hoursUntilEvent <= 72) return 15;
  if (hoursUntilEvent <= 168) return 10;
  if (hoursUntilEvent <= 336) return 5;
  return 0;
}

/**
 * Calculate price appeal score (0-10 points)
 */
function calculatePriceScore(priceRange: string): number {
  const lowerPrice = priceRange.toLowerCase();

  if (lowerPrice === "free" || lowerPrice === "$0" || lowerPrice === "0") {
    return 10;
  }

  const numbers = priceRange.match(/\d+/g);
  if (!numbers || numbers.length === 0) return 5;

  const maxPrice = Math.max(...numbers.map(Number));

  if (maxPrice <= 20) return 7;
  if (maxPrice <= 50) return 5;
  if (maxPrice <= 100) return 3;
  return 0;
}

/**
 * Calculate relationship fit score (0-10 points)
 */
function calculateRelationshipScore(
  category: Category,
  relationshipStatus: RelationshipStatus | null
): number {
  if (!relationshipStatus) return 5;

  if (relationshipStatus === "COUPLE") {
    return COUPLE_FRIENDLY_CATEGORIES.has(category) ? 10 : 5;
  }

  return SINGLES_FRIENDLY_CATEGORIES.has(category) ? 10 : 5;
}

/**
 * Calculate feedback-based score adjustment (-20 to +20 points)
 */
function calculateFeedbackScore(
  event: EventForScoring,
  feedback?: UserFeedbackData
): number {
  if (!feedback) return 0;

  let score = 0;

  // Category boosts/reductions
  const moreCount = feedback.moreCategories.get(event.category) || 0;
  const lessCount = feedback.lessCategories.get(event.category) || 0;
  score += moreCount * 5 - lessCount * 5;

  // Venue boosts/reductions
  const venueMore = feedback.moreVenues.get(event.venueName) || 0;
  const venueLess = feedback.lessVenues.get(event.venueName) || 0;
  score += venueMore * 8 - venueLess * 8;

  // Clamp to -20 to +20
  return Math.max(-20, Math.min(20, score));
}

/**
 * Check if event matches user constraints and return score adjustment
 */
function calculateConstraintScore(
  event: EventForScoring,
  constraints?: UserConstraintsData
): number {
  if (!constraints) return 0;

  let score = 0;

  // Day preference check
  if (constraints.preferredDays.length > 0) {
    const eventDay = DAY_MAP[event.startTime.getDay()];
    if (constraints.preferredDays.includes(eventDay)) {
      score += 10;
    }
  }

  // Time preference check
  if (constraints.preferredTimes.length > 0) {
    const hour = event.startTime.getHours();
    const timeOfDay = getTimeOfDay(hour);
    if (constraints.preferredTimes.includes(timeOfDay)) {
      score += 10;
    }
  }

  // Neighborhood preference
  if (
    constraints.neighborhoods.length > 0 &&
    event.neighborhood &&
    constraints.neighborhoods.includes(event.neighborhood)
  ) {
    score += 15;
  }

  // Home neighborhood bonus
  if (
    constraints.homeNeighborhood &&
    event.neighborhood === constraints.homeNeighborhood
  ) {
    score += 5;
  }

  // Budget filtering (return large negative if over budget)
  if (constraints.budgetMax !== "ANY") {
    const eventPrice = parsePrice(event.priceRange);
    const maxBudget = getBudgetValue(constraints.budgetMax);
    if (eventPrice > maxBudget) {
      score -= 50; // Heavily penalize over-budget events
    }
  }

  // Free events only
  if (constraints.freeEventsOnly) {
    const lowerPrice = event.priceRange.toLowerCase();
    if (
      lowerPrice !== "free" &&
      lowerPrice !== "$0" &&
      lowerPrice !== "0"
    ) {
      score -= 100; // Filter out non-free events
    }
  }

  return score;
}

/**
 * Calculate diversity penalty for over-represented categories/venues
 */
function calculateDiversityScore(
  event: EventForScoring,
  feedViews?: FeedViewData
): number {
  if (!feedViews) return 0;

  let score = 0;

  // Penalize events seen many times without interaction
  const seenCount = feedViews.seenCounts.get(event.id) || 0;
  const hasInteracted = feedViews.interactedEventIds.has(event.id);

  if (seenCount >= 3 && !hasInteracted) {
    score -= seenCount * 3; // -3 per view after 3 views without interaction
  }

  return score;
}

/**
 * Calculate trending score for popular events
 */
function calculateTrendingScore(
  event: EventForScoring,
  globalTrending?: Set<string>
): number {
  if (globalTrending?.has(event.id)) {
    return 15;
  }
  if (event.saveCount && event.saveCount >= 10) {
    return 10;
  }
  if (event.saveCount && event.saveCount >= 5) {
    return 5;
  }
  return 0;
}

// ============================================================================
// DETAILED PREFERENCES SCORING
// ============================================================================

/**
 * Calculate companion match score based on detailed preferences (-10 to +25 points)
 * Boosts events that match user's companion preferences
 */
function calculateCompanionScore(
  event: EventForScoring,
  detailedPrefs?: DetailedPreferencesData
): number {
  if (!detailedPrefs) return 0;

  let score = 0;
  const tags = new Set(event.tags.map((t) => t.toLowerCase()));

  // Solo-friendly scoring
  if (detailedPrefs.goingSolo && detailedPrefs.goingSolo > 0) {
    const hasSoloTag = Array.from(tags).some((tag) => SOLO_FRIENDLY_TAGS.has(tag));
    if (hasSoloTag) {
      score += detailedPrefs.goingSolo * 5; // Up to 25 points
    }
  }

  // Date-friendly scoring
  if (detailedPrefs.goingDate && detailedPrefs.goingDate > 0) {
    const hasDateTag = Array.from(tags).some((tag) => DATE_FRIENDLY_TAGS.has(tag));
    if (hasDateTag || COUPLE_FRIENDLY_CATEGORIES.has(event.category)) {
      score += detailedPrefs.goingDate * 5;
    }
  }

  // Friends-friendly scoring
  if (detailedPrefs.goingFriends && detailedPrefs.goingFriends > 0) {
    const hasFriendsTag = Array.from(tags).some((tag) => FRIENDS_FRIENDLY_TAGS.has(tag));
    if (hasFriendsTag || FRIENDS_FRIENDLY_CATEGORIES.has(event.category)) {
      score += detailedPrefs.goingFriends * 5;
    }
  }

  // Family-friendly scoring
  if (detailedPrefs.goingFamily && detailedPrefs.goingFamily > 0) {
    const hasFamilyTag = Array.from(tags).some((tag) => FAMILY_FRIENDLY_TAGS.has(tag));
    if (hasFamilyTag || FAMILY_FRIENDLY_CATEGORIES.has(event.category)) {
      score += detailedPrefs.goingFamily * 5;
    }
  }

  // Cap the score to prevent extreme boosts from multiple matches
  return Math.min(score, 25);
}

/**
 * Calculate timing match score based on detailed preferences (-5 to +20 points)
 */
function calculateDetailedTimingScore(
  event: EventForScoring,
  detailedPrefs?: DetailedPreferencesData
): number {
  if (!detailedPrefs) return 0;

  let score = 0;
  const eventDay = event.startTime.getDay();
  const eventHour = event.startTime.getHours();

  // Weekday vs weekend scoring
  const isWeekend = eventDay === 0 || eventDay === 6;
  const isFriday = eventDay === 5;

  if (isWeekend || isFriday) {
    if (detailedPrefs.timeWeekend && detailedPrefs.timeWeekend > 0) {
      score += detailedPrefs.timeWeekend * 2; // Up to 10 points
    }
  } else {
    if (detailedPrefs.timeWeeknight && detailedPrefs.timeWeeknight > 0) {
      score += detailedPrefs.timeWeeknight * 2;
    }
  }

  // Time of day scoring
  if (eventHour >= 6 && eventHour < 12) {
    // Morning
    if (detailedPrefs.timeMorning && detailedPrefs.timeMorning > 0) {
      score += detailedPrefs.timeMorning * 2;
    }
  } else if (eventHour >= 12 && eventHour < 17) {
    // Daytime
    if (detailedPrefs.timeDaytime && detailedPrefs.timeDaytime > 0) {
      score += detailedPrefs.timeDaytime * 2;
    }
  } else if (eventHour >= 17 && eventHour < 21) {
    // Evening
    if (detailedPrefs.timeEvening && detailedPrefs.timeEvening > 0) {
      score += detailedPrefs.timeEvening * 2;
    }
  } else {
    // Late night (21+ or before 6)
    if (detailedPrefs.timeLateNight && detailedPrefs.timeLateNight > 0) {
      score += detailedPrefs.timeLateNight * 2;
    }
  }

  return Math.min(score, 20);
}

/**
 * Calculate budget match score/penalty (-15 to +5 points)
 */
function calculateDetailedBudgetScore(
  event: EventForScoring,
  detailedPrefs?: DetailedPreferencesData
): number {
  if (!detailedPrefs || detailedPrefs.budget === "ANY") return 0;

  const eventPrice = parsePrice(event.priceRange);
  const maxBudget = getBudgetValue(detailedPrefs.budget);

  // Event is free - bonus for budget-conscious users
  if (eventPrice === 0) {
    return 5;
  }

  // Event is within budget
  if (eventPrice <= maxBudget) {
    return 0;
  }

  // Event is over budget - apply penalty
  return -15;
}

/**
 * Calculate vibe match score based on detailed preferences (0 to +20 points)
 */
function calculateVibeScore(
  event: EventForScoring,
  detailedPrefs?: DetailedPreferencesData
): number {
  if (!detailedPrefs) return 0;

  let score = 0;
  const tags = new Set(event.tags.map((t) => t.toLowerCase()));

  // Check for chill vibe matches
  if (detailedPrefs.vibeChill && detailedPrefs.vibeChill > 0) {
    const hasChillTag = Array.from(tags).some((tag) => CHILL_VIBE_TAGS.has(tag));
    if (hasChillTag) {
      score += detailedPrefs.vibeChill * 4; // Up to 20 points
    }
  }

  // Check for moderate vibe matches
  if (detailedPrefs.vibeModerate && detailedPrefs.vibeModerate > 0) {
    const hasModerateTag = Array.from(tags).some((tag) => MODERATE_VIBE_TAGS.has(tag));
    if (hasModerateTag) {
      score += detailedPrefs.vibeModerate * 4;
    }
  }

  // Check for high-energy vibe matches
  if (detailedPrefs.vibeHighEnergy && detailedPrefs.vibeHighEnergy > 0) {
    const hasHighEnergyTag = Array.from(tags).some((tag) => HIGH_ENERGY_VIBE_TAGS.has(tag));
    if (hasHighEnergyTag) {
      score += detailedPrefs.vibeHighEnergy * 4;
    }
  }

  // Cap the score
  return Math.min(score, 20);
}

/**
 * Calculate social intent match score (0 to +15 points)
 */
function calculateSocialScore(
  event: EventForScoring,
  detailedPrefs?: DetailedPreferencesData
): number {
  if (!detailedPrefs || detailedPrefs.socialIntent === "EITHER") return 0;

  const tags = new Set(event.tags.map((t) => t.toLowerCase()));

  if (detailedPrefs.socialIntent === "MEET_PEOPLE") {
    // Boost social/meetup events
    const hasSocialTag = Array.from(tags).some((tag) => SOCIAL_MEETUP_TAGS.has(tag));
    if (hasSocialTag) {
      return 15;
    }
    // Moderate boost for generally social categories
    if (["BARS", "LIVE_MUSIC", "FITNESS"].includes(event.category)) {
      return 8;
    }
  } else if (detailedPrefs.socialIntent === "OWN_THING") {
    // Boost solo-friendly events
    const hasSoloTag = Array.from(tags).some((tag) => SOLO_ACTIVITY_TAGS.has(tag));
    if (hasSoloTag) {
      return 15;
    }
    // Moderate boost for solo-friendly categories
    if (["COFFEE", "ART", "OUTDOORS"].includes(event.category)) {
      return 8;
    }
  }

  return 0;
}

/**
 * Calculate dog-friendly score (0 to +20 points)
 * Boosts events that are dog-friendly when user has a dog
 */
function calculateDogFriendlyScore(
  event: EventForScoring,
  detailedPrefs?: DetailedPreferencesData
): number {
  if (!detailedPrefs || !detailedPrefs.hasDog) return 0;

  if (event.isDogFriendly) {
    // Strong boost for dog-friendly events
    return 20;
  }

  // Check if place is dog-friendly
  // (place data might include isDogFriendly field)
  // For now, no penalty for non-dog-friendly events
  return 0;
}

/**
 * Calculate sober-friendly score (-15 to +20 points)
 * Boosts events that are sober-friendly when user prefers them
 * Penalizes bar-centric events when user avoids bars
 */
function calculateSoberFriendlyScore(
  event: EventForScoring,
  detailedPrefs?: DetailedPreferencesData
): number {
  if (!detailedPrefs) return 0;

  let score = 0;

  // Boost for sober-friendly events
  if (detailedPrefs.preferSoberFriendly) {
    if (event.isAlcoholFree) {
      score += 20; // Strong boost for alcohol-free events
    } else if (event.isDrinkingOptional) {
      score += 15; // Good boost for drinking optional events
    }
  }

  // Penalty for bar-centric events when user avoids bars
  if (detailedPrefs.avoidBars && event.category === "BARS") {
    score -= 15;
  }

  return score;
}

// ============================================================================
// RECOMMENDATION REASON GENERATION
// ============================================================================

/**
 * Generate a human-readable recommendation reason
 */
function generateRecommendationReason(
  event: EventForScoring,
  breakdown: ScoreBreakdown,
  context: ScoringContext
): { reason: string; reasonType: ReasonType } {
  const reasons: Array<{ reason: string; reasonType: ReasonType; priority: number }> = [];

  // Category match reason
  const categoryPref = context.preferences.categories.get(event.category);
  if (categoryPref?.type === "LIKE" && categoryPref.intensity >= 3) {
    const categoryName = event.category.replace(/_/g, " ").toLowerCase();
    const saveCount = context.interactions?.savedCategories.get(event.category) || 0;
    if (saveCount > 0) {
      reasons.push({
        reason: `Because you saved ${saveCount} ${categoryName} event${saveCount > 1 ? "s" : ""}`,
        reasonType: "CATEGORY_MATCH",
        priority: 10,
      });
    } else {
      reasons.push({
        reason: `Matches your love for ${categoryName}`,
        reasonType: "CATEGORY_MATCH",
        priority: 8,
      });
    }
  }

  // Neighborhood match
  if (
    event.neighborhood &&
    context.interactions?.topNeighborhoods.includes(event.neighborhood)
  ) {
    reasons.push({
      reason: `Popular in ${event.neighborhood}, your top neighborhood`,
      reasonType: "NEIGHBORHOOD_MATCH",
      priority: 9,
    });
  }

  // Trending
  if (breakdown.trendingScore >= 10) {
    reasons.push({
      reason: "Trending this week",
      reasonType: "TRENDING",
      priority: 7,
    });
  }

  // Weekend preference
  const day = event.startTime.getDay();
  if (day === 5 || day === 6 || day === 0) {
    if (
      context.constraints?.preferredDays.includes("FRIDAY") ||
      context.constraints?.preferredDays.includes("SATURDAY") ||
      context.constraints?.preferredDays.includes("SUNDAY")
    ) {
      reasons.push({
        reason: "Matches your weekend preference",
        reasonType: "WEEKEND_PREFERENCE",
        priority: 6,
      });
    }
  }

  // Time preference
  if (context.constraints?.preferredTimes.length) {
    const hour = event.startTime.getHours();
    const timeOfDay = getTimeOfDay(hour);
    if (context.constraints.preferredTimes.includes(timeOfDay)) {
      const timeLabel = timeOfDay.toLowerCase().replace("_", " ");
      reasons.push({
        reason: `Perfect for your ${timeLabel} plans`,
        reasonType: "TIME_PREFERENCE",
        priority: 5,
      });
    }
  }

  // Venue favorite
  if (context.feedback?.moreVenues.has(event.venueName)) {
    reasons.push({
      reason: `At ${event.venueName}, a venue you love`,
      reasonType: "VENUE_FAVORITE",
      priority: 8,
    });
  }

  // High rated
  const avgRating = getAverageRating(event.googleRating, event.appleRating);
  if (avgRating && avgRating >= 4.5) {
    reasons.push({
      reason: `Highly rated (${avgRating.toFixed(1)} stars)`,
      reasonType: "HIGH_RATED",
      priority: 4,
    });
  }

  // Free event
  const lowerPrice = event.priceRange.toLowerCase();
  if (lowerPrice === "free" || lowerPrice === "$0") {
    reasons.push({
      reason: "Free event",
      reasonType: "FREE_EVENT",
      priority: 3,
    });
  }

  // Detailed preferences reasons
  if (breakdown.companionScore >= 15) {
    const detailedPrefs = context.detailedPreferences;
    if (detailedPrefs) {
      if (detailedPrefs.goingDate && detailedPrefs.goingDate >= 3) {
        reasons.push({
          reason: "Perfect for date night",
          reasonType: "DATE_NIGHT_MATCH",
          priority: 9,
        });
      }
      if (detailedPrefs.goingFriends && detailedPrefs.goingFriends >= 3) {
        reasons.push({
          reason: "Great for going with friends",
          reasonType: "FRIENDS_MATCH",
          priority: 9,
        });
      }
      if (detailedPrefs.goingFamily && detailedPrefs.goingFamily >= 3) {
        reasons.push({
          reason: "Family-friendly outing",
          reasonType: "FAMILY_MATCH",
          priority: 9,
        });
      }
      if (detailedPrefs.goingSolo && detailedPrefs.goingSolo >= 3) {
        reasons.push({
          reason: "Great for solo adventures",
          reasonType: "SOLO_MATCH",
          priority: 8,
        });
      }
    }
  }

  // Vibe match reason
  if (breakdown.vibeScore >= 12) {
    const detailedPrefs = context.detailedPreferences;
    if (detailedPrefs) {
      if (detailedPrefs.vibeChill && detailedPrefs.vibeChill >= 3) {
        reasons.push({
          reason: "Matches your chill vibe",
          reasonType: "VIBE_MATCH",
          priority: 7,
        });
      }
      if (detailedPrefs.vibeHighEnergy && detailedPrefs.vibeHighEnergy >= 3) {
        reasons.push({
          reason: "High energy, just how you like it",
          reasonType: "VIBE_MATCH",
          priority: 7,
        });
      }
    }
  }

  // Social intent reason
  if (breakdown.socialScore >= 10) {
    const detailedPrefs = context.detailedPreferences;
    if (detailedPrefs?.socialIntent === "MEET_PEOPLE") {
      reasons.push({
        reason: "Great for meeting new people",
        reasonType: "SOCIAL_MATCH",
        priority: 8,
      });
    } else if (detailedPrefs?.socialIntent === "OWN_THING") {
      reasons.push({
        reason: "Perfect for doing your own thing",
        reasonType: "SOCIAL_MATCH",
        priority: 7,
      });
    }
  }

  // Budget match reason
  if (breakdown.budgetScore >= 5) {
    reasons.push({
      reason: "Budget-friendly choice",
      reasonType: "BUDGET_MATCH",
      priority: 4,
    });
  }

  // Dog-friendly match reason
  if (breakdown.dogFriendlyScore >= 15) {
    reasons.push({
      reason: "Bring your pup!",
      reasonType: "DOG_FRIENDLY_MATCH",
      priority: 9,
    });
  }

  // Sober-friendly match reason
  if (breakdown.soberFriendlyScore >= 15) {
    reasons.push({
      reason: "Great without drinking",
      reasonType: "SOBER_FRIENDLY_MATCH",
      priority: 8,
    });
  }

  // Sort by priority and return highest
  reasons.sort((a, b) => b.priority - a.priority);

  if (reasons.length > 0) {
    return { reason: reasons[0].reason, reasonType: reasons[0].reasonType };
  }

  // Default reason
  return {
    reason: "Recommended for you",
    reasonType: "SIMILAR_TASTE",
  };
}

// ============================================================================
// DIVERSITY ENFORCEMENT
// ============================================================================

/**
 * Apply diversity rules to scored events
 * - Max 3 events per category in top 20
 * - Max 2 events from same venue
 * - Ensure at least 1 exploration pick
 * - Ensure at least 1 trending pick
 */
export function applyDiversityRules(
  events: ScoredEvent[],
  context: ScoringContext
): ScoredEvent[] {
  const TOP_N = 20;
  const MAX_PER_CATEGORY = 3;
  const MAX_PER_VENUE = 2;

  const categoryCounts = new Map<Category, number>();
  const venueCounts = new Map<string, number>();
  const diversifiedTop: ScoredEvent[] = [];
  const remaining: ScoredEvent[] = [];

  // First pass: collect diverse top events
  for (const event of events) {
    if (diversifiedTop.length >= TOP_N) {
      remaining.push(event);
      continue;
    }

    const categoryCount = categoryCounts.get(event.category) || 0;
    const venueCount = venueCounts.get(event.venueName) || 0;

    if (categoryCount >= MAX_PER_CATEGORY || venueCount >= MAX_PER_VENUE) {
      remaining.push(event);
      continue;
    }

    diversifiedTop.push(event);
    categoryCounts.set(event.category, categoryCount + 1);
    venueCounts.set(event.venueName, venueCount + 1);
  }

  // Ensure exploration pick (category user hasn't interacted with much)
  if (context.constraints?.discoveryMode || Math.random() < 0.2) {
    const explorationEvent = findExplorationEvent(remaining, context);
    if (explorationEvent) {
      explorationEvent.isExplorationPick = true;
      explorationEvent.recommendationReason = "Try something new?";
      explorationEvent.reasonType = "EXPLORATION";
      // Insert at position 5-10
      const insertPos = Math.min(5 + Math.floor(Math.random() * 5), diversifiedTop.length);
      diversifiedTop.splice(insertPos, 0, explorationEvent);
      if (diversifiedTop.length > TOP_N) {
        diversifiedTop.pop();
      }
    }
  }

  // Ensure trending pick
  const hasTrending = diversifiedTop.some((e) => e.isTrendingPick);
  if (!hasTrending) {
    const trendingEvent = remaining.find(
      (e) => e.scoreBreakdown.trendingScore >= 10
    );
    if (trendingEvent) {
      trendingEvent.isTrendingPick = true;
      // Insert at position 3-5
      const insertPos = Math.min(3 + Math.floor(Math.random() * 2), diversifiedTop.length);
      diversifiedTop.splice(insertPos, 0, trendingEvent);
      if (diversifiedTop.length > TOP_N) {
        diversifiedTop.pop();
      }
    }
  }

  return [...diversifiedTop, ...remaining];
}

function findExplorationEvent(
  events: ScoredEvent[],
  context: ScoringContext
): ScoredEvent | undefined {
  const userCategories = new Set(context.interactions?.savedCategories.keys() || []);

  // Find event in category user hasn't explored
  return events.find((event) => !userCategories.has(event.category));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 12) return "MORNING";
  if (hour >= 12 && hour < 17) return "AFTERNOON";
  if (hour >= 17 && hour < 21) return "EVENING";
  return "LATE_NIGHT";
}

function parsePrice(priceRange: string): number {
  const lowerPrice = priceRange.toLowerCase();
  if (lowerPrice === "free" || lowerPrice === "$0" || lowerPrice === "0") {
    return 0;
  }
  const numbers = priceRange.match(/\d+/g);
  if (!numbers || numbers.length === 0) return 50; // Default medium price
  return Math.max(...numbers.map(Number));
}

function getBudgetValue(budget: BudgetPreference): number {
  switch (budget) {
    case "FREE":
      return 0;
    case "UNDER_25":
      return 25;
    case "UNDER_50":
      return 50;
    case "UNDER_100":
      return 100;
    case "ANY":
      return Infinity;
  }
}

function getAverageRating(
  googleRating: number | null,
  appleRating: number | null
): number | null {
  if (googleRating && appleRating) {
    return (googleRating + appleRating) / 2;
  }
  return googleRating || appleRating || null;
}

// Accessor for discoveryMode from context
interface ScoringContextWithDiscovery extends ScoringContext {
  discoveryMode?: boolean;
}

// ============================================================================
// MAIN SCORING FUNCTIONS
// ============================================================================

/**
 * Score a single event based on user context
 */
export function scoreEvent(
  event: EventForScoring,
  context: ScoringContext
): ScoredEvent {
  // Check if hidden
  if (context.feedback?.hiddenEventIds.has(event.id)) {
    return {
      ...event,
      score: -1000, // Will be filtered out
      scoreBreakdown: {
        categoryScore: 0,
        timeScore: 0,
        priceScore: 0,
        relationshipScore: 0,
        feedbackScore: -1000,
        constraintScore: 0,
        diversityScore: 0,
        trendingScore: 0,
        companionScore: 0,
        timingScore: 0,
        budgetScore: 0,
        vibeScore: 0,
        socialScore: 0,
        dogFriendlyScore: 0,
        soberFriendlyScore: 0,
      },
      recommendationReason: "",
      reasonType: "CATEGORY_MATCH",
    };
  }

  const categoryScore = calculateCategoryScore(event.category, context.preferences);
  const timeScore = calculateTimeScore(event.startTime);
  const priceScore = calculatePriceScore(event.priceRange);
  const relationshipScore = calculateRelationshipScore(
    event.category,
    context.preferences.relationshipStatus
  );
  const feedbackScore = calculateFeedbackScore(event, context.feedback);
  const constraintScore = calculateConstraintScore(event, context.constraints);
  const diversityScore = calculateDiversityScore(event, context.feedViews);
  const trendingScore = calculateTrendingScore(event, context.globalTrending);

  // Detailed preferences scores
  const companionScore = calculateCompanionScore(event, context.detailedPreferences);
  const timingScore = calculateDetailedTimingScore(event, context.detailedPreferences);
  const budgetScore = calculateDetailedBudgetScore(event, context.detailedPreferences);
  const vibeScore = calculateVibeScore(event, context.detailedPreferences);
  const socialScore = calculateSocialScore(event, context.detailedPreferences);

  // Lifestyle preference scores
  const dogFriendlyScore = calculateDogFriendlyScore(event, context.detailedPreferences);
  const soberFriendlyScore = calculateSoberFriendlyScore(event, context.detailedPreferences);

  const breakdown: ScoreBreakdown = {
    categoryScore,
    timeScore,
    priceScore,
    relationshipScore,
    feedbackScore,
    constraintScore,
    diversityScore,
    trendingScore,
    companionScore,
    timingScore,
    budgetScore,
    vibeScore,
    socialScore,
    dogFriendlyScore,
    soberFriendlyScore,
  };

  const totalScore =
    categoryScore +
    timeScore +
    priceScore +
    relationshipScore +
    feedbackScore +
    constraintScore +
    diversityScore +
    trendingScore +
    companionScore +
    timingScore +
    budgetScore +
    vibeScore +
    socialScore +
    dogFriendlyScore +
    soberFriendlyScore;

  const { reason, reasonType } = generateRecommendationReason(event, breakdown, context);

  return {
    ...event,
    score: totalScore,
    scoreBreakdown: breakdown,
    recommendationReason: reason,
    reasonType,
    isTrendingPick: trendingScore >= 10,
  };
}

/**
 * Score and sort a list of events by relevance with diversity rules
 */
export function scoreAndRankEvents(
  events: EventForScoring[],
  context: ScoringContext
): ScoredEvent[] {
  // Score all events
  const scored = events
    .map((event) => scoreEvent(event, context))
    .filter((event) => event.score > -100) // Filter hidden events
    .sort((a, b) => b.score - a.score);

  // Apply diversity rules
  return applyDiversityRules(scored, context);
}

/**
 * Build user preferences from Prisma preference records
 */
export function buildUserPreferences(
  preferences: Array<{
    category: Category;
    preferenceType: "LIKE" | "DISLIKE";
    intensity: number;
  }>,
  relationshipStatus: RelationshipStatus | null
): UserPreferences {
  const categoriesMap = new Map<
    Category,
    { type: "LIKE" | "DISLIKE"; intensity: number }
  >();

  for (const pref of preferences) {
    categoriesMap.set(pref.category, {
      type: pref.preferenceType,
      intensity: pref.intensity,
    });
  }

  return {
    categories: categoriesMap,
    relationshipStatus,
  };
}

/**
 * Build feedback data from Prisma records
 */
export function buildFeedbackData(
  feedback: Array<{
    eventId: string;
    feedbackType: FeedbackType;
    category: Category | null;
    venueName: string | null;
  }>
): UserFeedbackData {
  const moreCategories = new Map<Category, number>();
  const lessCategories = new Map<Category, number>();
  const moreVenues = new Map<string, number>();
  const lessVenues = new Map<string, number>();
  const hiddenEventIds = new Set<string>();

  for (const fb of feedback) {
    if (fb.feedbackType === "HIDE") {
      hiddenEventIds.add(fb.eventId);
      continue;
    }

    if (fb.category) {
      if (fb.feedbackType === "MORE") {
        moreCategories.set(fb.category, (moreCategories.get(fb.category) || 0) + 1);
      } else if (fb.feedbackType === "LESS") {
        lessCategories.set(fb.category, (lessCategories.get(fb.category) || 0) + 1);
      }
    }

    if (fb.venueName) {
      if (fb.feedbackType === "MORE") {
        moreVenues.set(fb.venueName, (moreVenues.get(fb.venueName) || 0) + 1);
      } else if (fb.feedbackType === "LESS") {
        lessVenues.set(fb.venueName, (lessVenues.get(fb.venueName) || 0) + 1);
      }
    }
  }

  return {
    moreCategories,
    lessCategories,
    moreVenues,
    lessVenues,
    hiddenEventIds,
  };
}

/**
 * Build constraints data from Prisma record
 */
export function buildConstraintsData(
  constraints: {
    preferredDays: DayOfWeek[];
    preferredTimes: TimeOfDay[];
    budgetMax: BudgetPreference;
    neighborhoods: string[];
    homeNeighborhood: string | null;
    freeEventsOnly: boolean;
    discoveryMode: boolean;
  } | null
): UserConstraintsData | undefined {
  if (!constraints) return undefined;

  return {
    preferredDays: constraints.preferredDays,
    preferredTimes: constraints.preferredTimes,
    budgetMax: constraints.budgetMax,
    neighborhoods: constraints.neighborhoods,
    homeNeighborhood: constraints.homeNeighborhood,
    freeEventsOnly: constraints.freeEventsOnly,
    discoveryMode: constraints.discoveryMode,
  };
}

/**
 * Build feed view data from Prisma records
 */
export function buildFeedViewData(
  views: Array<{
    eventId: string;
    seenCount: number;
    interacted: boolean;
  }>
): FeedViewData {
  const seenCounts = new Map<string, number>();
  const interactedEventIds = new Set<string>();

  for (const view of views) {
    seenCounts.set(view.eventId, view.seenCount);
    if (view.interacted) {
      interactedEventIds.add(view.eventId);
    }
  }

  return { seenCounts, interactedEventIds };
}

/**
 * Build detailed preferences data from Prisma record
 */
export function buildDetailedPreferencesData(
  prefs: {
    goingSolo: number | null;
    goingDate: number | null;
    goingFriends: number | null;
    goingFamily: number | null;
    timeWeeknight: number | null;
    timeWeekend: number | null;
    timeMorning: number | null;
    timeDaytime: number | null;
    timeEvening: number | null;
    timeLateNight: number | null;
    budget: BudgetPreference;
    vibeChill: number | null;
    vibeModerate: number | null;
    vibeHighEnergy: number | null;
    socialIntent: SocialIntent;
    hasDog?: boolean;
    dogFriendlyOnly?: boolean;
    preferSoberFriendly?: boolean;
    avoidBars?: boolean;
  } | null
): DetailedPreferencesData | undefined {
  if (!prefs) return undefined;

  return {
    goingSolo: prefs.goingSolo,
    goingDate: prefs.goingDate,
    goingFriends: prefs.goingFriends,
    goingFamily: prefs.goingFamily,
    timeWeeknight: prefs.timeWeeknight,
    timeWeekend: prefs.timeWeekend,
    timeMorning: prefs.timeMorning,
    timeDaytime: prefs.timeDaytime,
    timeEvening: prefs.timeEvening,
    timeLateNight: prefs.timeLateNight,
    budget: prefs.budget,
    vibeChill: prefs.vibeChill,
    vibeModerate: prefs.vibeModerate,
    vibeHighEnergy: prefs.vibeHighEnergy,
    socialIntent: prefs.socialIntent,
    hasDog: prefs.hasDog ?? false,
    dogFriendlyOnly: prefs.dogFriendlyOnly ?? false,
    preferSoberFriendly: prefs.preferSoberFriendly ?? false,
    avoidBars: prefs.avoidBars ?? false,
  };
}

/**
 * Build interaction data from user's history
 */
export function buildInteractionData(
  interactions: Array<{
    event: {
      category: Category;
      neighborhood: string | null;
    };
    goingWith: GoingWith | null;
  }>
): UserInteractionData {
  const savedCategories = new Map<Category, number>();
  const neighborhoodCounts = new Map<string, number>();
  const goingWithHistory = new Map<GoingWith, number>();

  for (const interaction of interactions) {
    // Count categories
    const category = interaction.event.category;
    savedCategories.set(category, (savedCategories.get(category) || 0) + 1);

    // Count neighborhoods
    const neighborhood = interaction.event.neighborhood;
    if (neighborhood) {
      neighborhoodCounts.set(
        neighborhood,
        (neighborhoodCounts.get(neighborhood) || 0) + 1
      );
    }

    // Count going with types
    if (interaction.goingWith) {
      goingWithHistory.set(
        interaction.goingWith,
        (goingWithHistory.get(interaction.goingWith) || 0) + 1
      );
    }
  }

  // Get top neighborhoods
  const sortedNeighborhoods = Array.from(neighborhoodCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  return {
    savedCategories,
    topNeighborhoods: sortedNeighborhoods,
    goingWithHistory,
  };
}

// ============================================================================
// GOING WITH SCORING
// ============================================================================

/**
 * Adjust event score based on "going with" selection
 */
export function adjustScoreForGoingWith(
  event: ScoredEvent,
  goingWith: GoingWith
): ScoredEvent {
  let adjustment = 0;

  switch (goingWith) {
    case "DATE":
      if (COUPLE_FRIENDLY_CATEGORIES.has(event.category)) adjustment += 15;
      if (
        event.tags.some((tag) =>
          DATE_FRIENDLY_TAGS.has(tag.toLowerCase())
        )
      ) {
        adjustment += 10;
      }
      break;

    case "FRIENDS":
      if (FRIENDS_FRIENDLY_CATEGORIES.has(event.category)) adjustment += 15;
      break;

    case "FAMILY":
      if (FAMILY_FRIENDLY_CATEGORIES.has(event.category)) adjustment += 15;
      break;

    case "SOLO":
      // Solo activities: coffee, art, fitness work well
      if (["COFFEE", "ART", "FITNESS", "OUTDOORS"].includes(event.category)) {
        adjustment += 10;
      }
      break;
  }

  return {
    ...event,
    score: event.score + adjustment,
    recommendationReason:
      adjustment > 10
        ? `Great for ${goingWith.toLowerCase()} plans`
        : event.recommendationReason,
    reasonType: adjustment > 10 ? "GOING_WITH_MATCH" : event.reasonType,
  };
}
