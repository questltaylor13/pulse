/**
 * Places Ingestion Script for Pulse App
 *
 * This script fetches places from Google Places API and stores them in the database.
 * It searches for places by category in the Denver area with quality filters.
 *
 * Usage:
 *   npm run places:ingest
 *   npm run places:ingest -- --category=restaurant
 *   npm run places:ingest -- --limit=20
 *   npm run places:ingest -- --dry-run
 *
 * Environment Variables Required:
 *   GOOGLE_PLACES_API_KEY - Your Google Places API key
 *   DATABASE_URL - PostgreSQL connection string
 */

import { PrismaClient, Category } from "@prisma/client";
import {
  getPlaceDetails,
  calculateCombinedScore,
  extractNeighborhood,
  getPhotoUrl,
} from "../lib/google-places";

const prisma = new PrismaClient();

// Denver center coordinates
const DENVER_CENTER = { lat: 39.7392, lng: -104.9903 };
const SEARCH_RADIUS = 24140; // ~15 miles in meters

// Category definitions with quality filters
const CATEGORIES = [
  {
    key: "restaurant",
    query: "restaurants Denver",
    type: "restaurant",
    minRating: 4.2,
    minReviews: 100,
    category: "RESTAURANT" as Category,
  },
  {
    key: "bar",
    query: "bars Denver",
    type: "bar",
    minRating: 4.2,
    minReviews: 50,
    category: "BARS" as Category,
  },
  {
    key: "coffee",
    query: "coffee shops Denver",
    type: "cafe",
    minRating: 4.3,
    minReviews: 75,
    category: "COFFEE" as Category,
  },
  {
    key: "brewery",
    query: "breweries Denver",
    type: "bar", // Google doesn't have brewery type
    minRating: 4.2,
    minReviews: 50,
    category: "BARS" as Category,
  },
  {
    key: "art",
    query: "art galleries Denver",
    type: "art_gallery",
    minRating: 4.0,
    minReviews: 25,
    category: "ART" as Category,
  },
  {
    key: "museum",
    query: "museums Denver",
    type: "museum",
    minRating: 4.0,
    minReviews: 50,
    category: "ART" as Category,
  },
  {
    key: "park",
    query: "parks Denver",
    type: "park",
    minRating: 4.0,
    minReviews: 100,
    category: "OUTDOORS" as Category,
  },
  {
    key: "music_venue",
    query: "live music venues Denver",
    type: "night_club",
    minRating: 4.0,
    minReviews: 50,
    category: "LIVE_MUSIC" as Category,
  },
  {
    key: "bowling",
    query: "bowling alleys Denver",
    type: "bowling_alley",
    minRating: 4.0,
    minReviews: 50,
    category: "ACTIVITY_VENUE" as Category,
  },
  {
    key: "theater",
    query: "movie theaters Denver",
    type: "movie_theater",
    minRating: 4.0,
    minReviews: 75,
    category: "ACTIVITY_VENUE" as Category,
  },
  {
    key: "gym",
    query: "gyms Denver",
    type: "gym",
    minRating: 4.0,
    minReviews: 50,
    category: "FITNESS" as Category,
  },
  {
    key: "yoga",
    query: "yoga studios Denver",
    type: "gym",
    minRating: 4.3,
    minReviews: 30,
    category: "FITNESS" as Category,
  },
];

interface IngestionOptions {
  category?: string;
  limit?: number;
  dryRun?: boolean;
  verbose?: boolean;
}

interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  business_status?: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiKey(): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY environment variable is not set");
  }
  return apiKey;
}

async function searchPlaces(
  query: string,
  type: string,
  pageToken?: string
): Promise<{ results: PlaceSearchResult[]; nextPageToken?: string }> {
  const apiKey = getApiKey();

  const params = new URLSearchParams({
    query,
    location: `${DENVER_CENTER.lat},${DENVER_CENTER.lng}`,
    radius: SEARCH_RADIUS.toString(),
    type,
    key: apiKey,
  });

  if (pageToken) {
    params.append("pagetoken", pageToken);
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    if (data.status === "INVALID_REQUEST" && pageToken) {
      // Page token not ready yet, return empty
      return { results: [] };
    }
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ""}`);
  }

  return {
    results: data.results || [],
    nextPageToken: data.next_page_token,
  };
}

async function searchAllPages(
  query: string,
  type: string,
  maxPages: number = 3
): Promise<PlaceSearchResult[]> {
  const allResults: PlaceSearchResult[] = [];
  let nextPageToken: string | undefined;
  let page = 0;

  do {
    if (nextPageToken) {
      // Google requires a delay before using the next page token
      await delay(2000);
    }

    const { results, nextPageToken: newToken } = await searchPlaces(
      query,
      type,
      nextPageToken
    );

    allResults.push(...results);
    nextPageToken = newToken;
    page++;

    console.log(`  Page ${page}: ${results.length} results`);
  } while (nextPageToken && page < maxPages);

  return allResults;
}

async function ingestPlaces(options: IngestionOptions = {}): Promise<void> {
  const { category, limit, dryRun = false, verbose = false } = options;

  console.log("\n=== Pulse Places Ingestion ===\n");
  console.log(`Options: category=${category || "all"}, limit=${limit || "none"}, dryRun=${dryRun}\n`);

  const categoriesToProcess = category
    ? CATEGORIES.filter((c) => c.key === category)
    : CATEGORIES;

  if (category && categoriesToProcess.length === 0) {
    console.error(`Unknown category: ${category}`);
    console.log(`Available categories: ${CATEGORIES.map((c) => c.key).join(", ")}`);
    process.exit(1);
  }

  let totalProcessed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFiltered = 0;

  for (const catConfig of categoriesToProcess) {
    console.log(`\n--- Processing ${catConfig.key} ---\n`);
    console.log(`Query: "${catConfig.query}"`);
    console.log(`Min rating: ${catConfig.minRating}, Min reviews: ${catConfig.minReviews}\n`);

    try {
      // Search for places
      const results = await searchAllPages(catConfig.query, catConfig.type, 2);
      console.log(`\nTotal results: ${results.length}`);

      // Filter by quality criteria
      const qualifiedResults = results.filter((place) => {
        const rating = place.rating || 0;
        const reviews = place.user_ratings_total || 0;
        const isOpen = place.business_status !== "CLOSED_PERMANENTLY";

        if (!isOpen) {
          if (verbose) console.log(`  Filtered (closed): ${place.name}`);
          return false;
        }
        if (rating < catConfig.minRating) {
          if (verbose) console.log(`  Filtered (rating ${rating} < ${catConfig.minRating}): ${place.name}`);
          totalFiltered++;
          return false;
        }
        if (reviews < catConfig.minReviews) {
          if (verbose) console.log(`  Filtered (reviews ${reviews} < ${catConfig.minReviews}): ${place.name}`);
          totalFiltered++;
          return false;
        }
        return true;
      });

      console.log(`Qualified after filtering: ${qualifiedResults.length} (filtered out: ${results.length - qualifiedResults.length})`);

      // Deduplicate by place_id
      const seenIds = new Set<string>();
      const uniqueResults = qualifiedResults.filter((place) => {
        if (seenIds.has(place.place_id)) return false;
        seenIds.add(place.place_id);
        return true;
      });

      // Sort by combined score and optionally limit
      const sortedResults = uniqueResults.sort((a, b) => {
        const scoreA = (a.rating || 0) * Math.log10((a.user_ratings_total || 1) + 1);
        const scoreB = (b.rating || 0) * Math.log10((b.user_ratings_total || 1) + 1);
        return scoreB - scoreA;
      });

      const resultsToProcess = limit ? sortedResults.slice(0, limit) : sortedResults;
      console.log(`\nProcessing ${resultsToProcess.length} places...\n`);

      for (const result of resultsToProcess) {
        totalProcessed++;

        if (verbose) {
          console.log(`Processing: ${result.name}`);
        }

        try {
          // Check if place already exists
          const existing = await prisma.place.findUnique({
            where: { googlePlaceId: result.place_id },
          });

          if (existing) {
            if (verbose) {
              console.log(`  Exists: ${result.name} - updating...`);
            }

            if (!dryRun) {
              // Update existing place with fresh data
              const details = await getPlaceDetails(result.place_id);
              const combinedScore = calculateCombinedScore(
                details.rating,
                details.userRatingsTotal
              );

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
              totalUpdated++;
            } else {
              console.log(`  [DRY RUN] Would update: ${result.name}`);
              totalUpdated++;
            }

            await delay(300);
            continue;
          }

          if (dryRun) {
            console.log(`  [DRY RUN] Would create: ${result.name} (${result.rating} stars, ${result.user_ratings_total} reviews)`);
            totalCreated++;
            continue;
          }

          // Fetch detailed information
          const details = await getPlaceDetails(result.place_id);

          // Calculate combined score
          const combinedScore = calculateCombinedScore(
            details.rating,
            details.userRatingsTotal
          );

          // Extract neighborhood
          const neighborhood = extractNeighborhood(details.formattedAddress);

          // Get primary photo URL if available
          const primaryImageUrl = details.photos?.[0]
            ? getPhotoUrl(details.photos[0].photoReference, 800)
            : null;

          // Create the place record
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
              category: catConfig.category,
              googleDataFetchedAt: new Date(),
            },
          });

          console.log(`  Created: ${details.name} (${details.rating} stars, ${details.userRatingsTotal} reviews, score: ${combinedScore?.toFixed(2) || "N/A"})`);
          totalCreated++;

          // Respect rate limits
          await delay(500);
        } catch (error) {
          console.error(`  Error processing ${result.name}: ${error instanceof Error ? error.message : error}`);
        }
      }
    } catch (error) {
      console.error(`Error processing ${catConfig.key}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log("\n=== Ingestion Complete ===\n");
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Created: ${totalCreated}`);
  console.log(`Updated: ${totalUpdated}`);
  console.log(`Skipped (filtered): ${totalFiltered}`);
}

// Parse command line arguments
function parseArgs(): IngestionOptions {
  const args = process.argv.slice(2);
  const options: IngestionOptions = {};

  for (const arg of args) {
    if (arg.startsWith("--category=")) {
      options.category = arg.split("=")[1];
    } else if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    }
  }

  return options;
}

// Main execution
const options = parseArgs();

ingestPlaces(options)
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
