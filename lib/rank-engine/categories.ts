/**
 * Wave 4 Rate & Rank — content Category → RankCategory mapping.
 *
 * Comparisons need comparable items: 15 content categories would fragment a
 * solo user's ranked lists, so ranking happens in 6 coarse buckets. Events
 * and places co-rank in the same bucket (a pickleball event and a pickleball
 * venue both land in ACTIVE). UserRankedEntry.categorySnapshot preserves the
 * original content category, so changing this mapping later is a re-mapping
 * script, not data loss.
 */

import { RankCategory } from "@prisma/client";
import type { Category } from "@prisma/client";

const CATEGORY_TO_RANK: Record<Category, RankCategory> = {
  RESTAURANT: RankCategory.RESTAURANTS,
  FOOD: RankCategory.RESTAURANTS,
  BARS: RankCategory.BARS,
  COFFEE: RankCategory.COFFEE,
  ACTIVITY_VENUE: RankCategory.ACTIVE,
  FITNESS: RankCategory.ACTIVE,
  OUTDOORS: RankCategory.ACTIVE,
  WELLNESS: RankCategory.ACTIVE,
  ART: RankCategory.ARTS,
  LIVE_MUSIC: RankCategory.ARTS,
  COMEDY: RankCategory.ARTS,
  SEASONAL: RankCategory.EXPERIENCES,
  POPUP: RankCategory.EXPERIENCES,
  SOCIAL: RankCategory.EXPERIENCES,
  OTHER: RankCategory.EXPERIENCES,
};

/**
 * Map a content category (Event/Place/Discovery `.category`) to its rank
 * bucket. Accepts loose string input because Place.category is nullable and
 * snapshots are plain strings.
 */
export function toRankCategory(
  category: string | null | undefined
): RankCategory {
  if (!category) return RankCategory.EXPERIENCES;
  return CATEGORY_TO_RANK[category as Category] ?? RankCategory.EXPERIENCES;
}

export const RANK_CATEGORY_LABELS: Record<RankCategory, string> = {
  RESTAURANTS: "Restaurants",
  BARS: "Bars & Nightlife",
  COFFEE: "Coffee",
  ACTIVE: "Activities",
  ARTS: "Arts & Shows",
  EXPERIENCES: "Experiences",
};

const RANK_CATEGORY_TO_SLUG: Record<RankCategory, string> = {
  RESTAURANTS: "restaurants",
  BARS: "bars",
  COFFEE: "coffee",
  ACTIVE: "activities",
  ARTS: "arts",
  EXPERIENCES: "experiences",
};

const SLUG_TO_RANK_CATEGORY: Record<string, RankCategory> = Object.fromEntries(
  Object.entries(RANK_CATEGORY_TO_SLUG).map(([rc, slug]) => [
    slug,
    rc as RankCategory,
  ])
);

export function rankCategorySlug(category: RankCategory): string {
  return RANK_CATEGORY_TO_SLUG[category];
}

export function rankCategoryFromSlug(slug: string): RankCategory | null {
  return SLUG_TO_RANK_CATEGORY[slug] ?? null;
}
