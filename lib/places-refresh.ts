/**
 * Shared places refresh logic used by both the cron job and the CLI script.
 */

import { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getPlaceDetails,
  calculateCombinedScore,
  extractNeighborhood,
  getPhotoUrl,
  searchPlacesAllPages,
  type PlaceSearchResult,
} from "@/lib/google-places";

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

export interface CategoryConfig {
  key: string;
  query: string;
  type: string;
  minRating: number;
  minReviews: number;
  category: Category;
}

export const CATEGORIES: CategoryConfig[] = [
  { key: "restaurant", query: "restaurants Denver", type: "restaurant", minRating: 4.2, minReviews: 100, category: "RESTAURANT" },
  { key: "bar", query: "bars Denver", type: "bar", minRating: 4.2, minReviews: 50, category: "BARS" },
  { key: "coffee", query: "coffee shops Denver", type: "cafe", minRating: 4.3, minReviews: 75, category: "COFFEE" },
  { key: "brewery", query: "breweries Denver", type: "bar", minRating: 4.2, minReviews: 50, category: "BARS" },
  { key: "art", query: "art galleries Denver", type: "art_gallery", minRating: 4.0, minReviews: 25, category: "ART" },
  { key: "museum", query: "museums Denver", type: "museum", minRating: 4.0, minReviews: 50, category: "ART" },
  { key: "park", query: "parks Denver", type: "park", minRating: 4.0, minReviews: 100, category: "OUTDOORS" },
  { key: "music_venue", query: "live music venues Denver", type: "night_club", minRating: 4.0, minReviews: 50, category: "LIVE_MUSIC" },
  { key: "bowling", query: "bowling alleys Denver", type: "bowling_alley", minRating: 4.0, minReviews: 50, category: "ACTIVITY_VENUE" },
  { key: "theater", query: "movie theaters Denver", type: "movie_theater", minRating: 4.0, minReviews: 75, category: "ACTIVITY_VENUE" },
  { key: "gym", query: "gyms Denver", type: "gym", minRating: 4.0, minReviews: 50, category: "FITNESS" },
  { key: "yoga", query: "yoga studios Denver", type: "gym", minRating: 4.3, minReviews: 30, category: "FITNESS" },
];

/** Map from chunk index to the category keys it processes. */
export const CHUNK_MAP: Record<number, string[]> = {
  0: ["restaurant", "bar", "coffee", "brewery"],
  1: ["art", "museum", "park", "music_venue"],
  2: ["bowling", "theater", "gym", "yoga"],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function filterByQuality(
  results: PlaceSearchResult[],
  config: CategoryConfig,
): PlaceSearchResult[] {
  return results.filter((place) => {
    const rating = place.rating ?? 0;
    const reviews = place.userRatingsTotal ?? 0;
    const isOpen = place.businessStatus !== "CLOSED_PERMANENTLY";
    return isOpen && rating >= config.minRating && reviews >= config.minReviews;
  });
}

function dedup(results: PlaceSearchResult[]): PlaceSearchResult[] {
  const seen = new Set<string>();
  return results.filter((p) => {
    if (seen.has(p.placeId)) return false;
    seen.add(p.placeId);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Core refresh for a single category
// ---------------------------------------------------------------------------

export interface RefreshCategoryResult {
  key: string;
  searched: number;
  qualified: number;
  created: number;
  updated: number;
  errors: number;
}

export async function refreshPlaceCategory(
  config: CategoryConfig,
): Promise<RefreshCategoryResult> {
  const stats: RefreshCategoryResult = {
    key: config.key,
    searched: 0,
    qualified: 0,
    created: 0,
    updated: 0,
    errors: 0,
  };

  // Search Google Places (up to 2 pages — 40 results)
  const results = await searchPlacesAllPages(config.query, {
    type: config.type,
    maxPages: 2,
  });
  stats.searched = results.length;

  // Filter by quality, deduplicate, and sort by combined score
  const qualified = dedup(filterByQuality(results, config)).sort((a, b) => {
    const scoreA = (a.rating ?? 0) * Math.log10((a.userRatingsTotal ?? 1) + 1);
    const scoreB = (b.rating ?? 0) * Math.log10((b.userRatingsTotal ?? 1) + 1);
    return scoreB - scoreA;
  });
  stats.qualified = qualified.length;

  for (const result of qualified) {
    try {
      const existing = await prisma.place.findUnique({
        where: { googlePlaceId: result.placeId },
      });

      if (existing) {
        // Update existing place with fresh data
        const details = await getPlaceDetails(result.placeId);
        const combinedScore = calculateCombinedScore(details.rating, details.userRatingsTotal);

        await prisma.place.update({
          where: { id: existing.id },
          data: {
            googleRating: details.rating,
            googleReviewCount: details.userRatingsTotal,
            combinedScore,
            priceLevel: details.priceLevel,
            openingHours: details.openingHours as object | undefined,
            googleDataFetchedAt: new Date(),
          },
        });
        stats.updated++;
        await delay(300);
        continue;
      }

      // Create new place
      const details = await getPlaceDetails(result.placeId);
      const combinedScore = calculateCombinedScore(details.rating, details.userRatingsTotal);
      const neighborhood = extractNeighborhood(details.formattedAddress);
      const primaryImageUrl = details.photos?.[0]
        ? getPhotoUrl(details.photos[0].photoReference, 800)
        : null;

      await prisma.place.create({
        data: {
          googlePlaceId: details.placeId,
          name: details.name,
          address: details.formattedAddress,
          lat: details.lat,
          lng: details.lng,
          googleMapsUrl: details.googleMapsUrl,
          googleRating: details.rating,
          googleReviewCount: details.userRatingsTotal,
          combinedScore,
          priceLevel: details.priceLevel,
          types: details.types,
          phoneNumber: details.formattedPhoneNumber,
          website: details.website,
          openingHours: details.openingHours as object | undefined,
          primaryImageUrl,
          neighborhood,
          citySlug: "denver",
          category: config.category,
          googleDataFetchedAt: new Date(),
        },
      });
      stats.created++;
      await delay(500);
    } catch (error) {
      console.error(
        `Error processing ${result.name}: ${error instanceof Error ? error.message : error}`,
      );
      stats.errors++;
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Refresh a chunk (subset) of categories
// ---------------------------------------------------------------------------

export interface RefreshChunkResult {
  chunk: string[];
  categories: RefreshCategoryResult[];
  totalCreated: number;
  totalUpdated: number;
  totalErrors: number;
}

export async function refreshPlacesChunk(
  categoryKeys: string[],
): Promise<RefreshChunkResult> {
  const configs = CATEGORIES.filter((c) => categoryKeys.includes(c.key));

  const categoryResults: RefreshCategoryResult[] = [];
  for (const config of configs) {
    console.log(`[places-refresh] Processing category: ${config.key}`);
    const result = await refreshPlaceCategory(config);
    categoryResults.push(result);
    console.log(
      `[places-refresh] ${config.key}: searched=${result.searched} qualified=${result.qualified} created=${result.created} updated=${result.updated} errors=${result.errors}`,
    );
  }

  return {
    chunk: categoryKeys,
    categories: categoryResults,
    totalCreated: categoryResults.reduce((s, r) => s + r.created, 0),
    totalUpdated: categoryResults.reduce((s, r) => s + r.updated, 0),
    totalErrors: categoryResults.reduce((s, r) => s + r.errors, 0),
  };
}
