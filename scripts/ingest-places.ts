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

import { PrismaClient } from "@prisma/client";
import {
  getPlaceDetails,
  calculateCombinedScore,
  extractNeighborhood,
  getPhotoUrl,
  searchPlacesAllPages,
} from "../lib/google-places";
import {
  CATEGORIES,
  type CategoryConfig,
} from "../lib/places-refresh";

const prisma = new PrismaClient();

interface IngestionOptions {
  category?: string;
  limit?: number;
  dryRun?: boolean;
  verbose?: boolean;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      // Search for places using the shared utility
      const results = await searchPlacesAllPages(catConfig.query, {
        type: catConfig.type,
        maxPages: 2,
      });
      console.log(`\nTotal results: ${results.length}`);

      // Filter by quality criteria
      const qualifiedResults = results.filter((place) => {
        const rating = place.rating || 0;
        const reviews = place.userRatingsTotal || 0;
        const isOpen = place.businessStatus !== "CLOSED_PERMANENTLY";

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
        if (seenIds.has(place.placeId)) return false;
        seenIds.add(place.placeId);
        return true;
      });

      // Sort by combined score and optionally limit
      const sortedResults = uniqueResults.sort((a, b) => {
        const scoreA = (a.rating || 0) * Math.log10((a.userRatingsTotal || 1) + 1);
        const scoreB = (b.rating || 0) * Math.log10((b.userRatingsTotal || 1) + 1);
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
            where: { googlePlaceId: result.placeId },
          });

          if (existing) {
            if (verbose) {
              console.log(`  Exists: ${result.name} - updating...`);
            }

            if (!dryRun) {
              // Update existing place with fresh data
              const details = await getPlaceDetails(result.placeId);
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
            console.log(`  [DRY RUN] Would create: ${result.name} (${result.rating} stars, ${result.userRatingsTotal} reviews)`);
            totalCreated++;
            continue;
          }

          // Fetch detailed information
          const details = await getPlaceDetails(result.placeId);

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
