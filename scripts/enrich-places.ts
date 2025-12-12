/**
 * AI Enrichment Script for Places
 *
 * This script uses OpenAI to generate Pulse-specific tags and descriptions
 * for places based on their Google Places data.
 *
 * Usage:
 *   npm run places:enrich
 *   npm run places:enrich -- --limit=10
 *   npm run places:enrich -- --category=restaurant
 *   npm run places:enrich -- --dry-run
 *
 * Environment Variables Required:
 *   OPENAI_API_KEY - Your OpenAI API key
 *   DATABASE_URL - PostgreSQL connection string
 */

import { PrismaClient, Category, Place } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Available tags for each category
const VIBE_TAGS = [
  "Trendy",
  "Cozy",
  "Upscale",
  "Casual",
  "Romantic",
  "Lively",
  "Chill",
  "Hip",
  "Classic",
  "Eclectic",
  "Artsy",
  "Intimate",
  "Energetic",
  "Relaxed",
  "Sophisticated",
  "Funky",
  "Industrial",
  "Rustic",
  "Modern",
  "Vintage",
];

const COMPANION_TAGS = [
  "Solo-friendly",
  "Date Night",
  "Groups",
  "Family",
  "Friends",
  "Business",
  "Couples",
  "Girls Night",
  "Guys Night",
  "Team Outing",
];

const OCCASION_TAGS = [
  "Birthday",
  "Anniversary",
  "First Date",
  "Celebration",
  "Casual Hangout",
  "Special Occasion",
  "Weekend Brunch",
  "Happy Hour",
  "Late Night",
  "Sunday Funday",
  "Working Lunch",
  "Client Meeting",
];

const GOOD_FOR_TAGS = [
  "Quick Bite",
  "Long Dinner",
  "Drinks",
  "Coffee Meeting",
  "Work Remote",
  "People Watching",
  "Photos",
  "Live Music",
  "Dancing",
  "Outdoor Seating",
  "Dog-friendly",
  "Kids",
  "Vegetarian",
  "Vegan Options",
  "Gluten-free",
  "Late Night Eats",
];

interface EnrichmentOptions {
  limit?: number;
  category?: string;
  dryRun?: boolean;
  force?: boolean;
}

interface PlaceEnrichment {
  vibeTags: string[];
  companionTags: string[];
  occasionTags: string[];
  goodForTags: string[];
  pulseDescription: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPrompt(place: Place): string {
  const priceIndicator = place.priceLevel
    ? "$".repeat(place.priceLevel)
    : "Unknown price";

  return `You are a Denver local helping categorize a venue for a social discovery app called Pulse.

Based on the following information about this place, provide:
1. vibeTags: 2-4 tags describing the atmosphere/vibe (choose from: ${VIBE_TAGS.join(", ")})
2. companionTags: 2-3 tags for who this place is good for (choose from: ${COMPANION_TAGS.join(", ")})
3. occasionTags: 2-3 tags for what occasions fit this place (choose from: ${OCCASION_TAGS.join(", ")})
4. goodForTags: 2-4 tags for what this place is good for (choose from: ${GOOD_FOR_TAGS.join(", ")})
5. pulseDescription: A fun, engaging 1-2 sentence description written in a casual, friendly tone that captures what makes this place special. Focus on the experience, not just facts.

Place Information:
- Name: ${place.name}
- Category: ${place.category || "Unknown"}
- Address: ${place.address}
- Neighborhood: ${place.neighborhood || "Denver"}
- Price Level: ${priceIndicator}
- Google Rating: ${place.googleRating || "Unknown"} (${place.googleReviewCount || 0} reviews)
- Types: ${place.types.join(", ")}
${place.website ? `- Website: ${place.website}` : ""}

Respond in JSON format only:
{
  "vibeTags": ["tag1", "tag2"],
  "companionTags": ["tag1", "tag2"],
  "occasionTags": ["tag1", "tag2"],
  "goodForTags": ["tag1", "tag2"],
  "pulseDescription": "Your description here"
}`;
}

async function enrichPlace(place: Place): Promise<PlaceEnrichment | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: buildPrompt(place),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error(`No response content for ${place.name}`);
      return null;
    }

    const enrichment = JSON.parse(content) as PlaceEnrichment;

    // Validate and filter tags to only include valid options
    enrichment.vibeTags = enrichment.vibeTags.filter((t) =>
      VIBE_TAGS.includes(t)
    );
    enrichment.companionTags = enrichment.companionTags.filter((t) =>
      COMPANION_TAGS.includes(t)
    );
    enrichment.occasionTags = enrichment.occasionTags.filter((t) =>
      OCCASION_TAGS.includes(t)
    );
    enrichment.goodForTags = enrichment.goodForTags.filter((t) =>
      GOOD_FOR_TAGS.includes(t)
    );

    return enrichment;
  } catch (error) {
    console.error(
      `Error enriching ${place.name}:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function enrichPlaces(options: EnrichmentOptions = {}): Promise<void> {
  const { limit, category, dryRun = false, force = false } = options;

  console.log("\n=== Pulse Places AI Enrichment ===\n");
  console.log(
    `Options: limit=${limit || "none"}, category=${category || "all"}, dryRun=${dryRun}, force=${force}\n`
  );

  // Build query
  const where: Record<string, unknown> = {};

  // Only enrich places that haven't been enriched yet (unless force)
  if (!force) {
    where.pulseDescription = null;
  }

  if (category) {
    const categoryMap: Record<string, Category> = {
      restaurant: "RESTAURANT",
      bar: "BARS",
      coffee: "COFFEE",
      outdoors: "OUTDOORS",
      fitness: "FITNESS",
      art: "ART",
      live_music: "LIVE_MUSIC",
      activity: "ACTIVITY_VENUE",
    };

    if (!categoryMap[category]) {
      console.error(`Unknown category: ${category}`);
      console.log(`Available categories: ${Object.keys(categoryMap).join(", ")}`);
      process.exit(1);
    }

    where.category = categoryMap[category];
  }

  // Fetch places to enrich
  const places = await prisma.place.findMany({
    where,
    orderBy: { combinedScore: "desc" },
    take: limit,
  });

  console.log(`Found ${places.length} places to enrich\n`);

  let enriched = 0;
  let failed = 0;

  for (const place of places) {
    console.log(`Processing: ${place.name}`);

    if (dryRun) {
      console.log(`  [DRY RUN] Would enrich with AI`);
      enriched++;
      continue;
    }

    const enrichment = await enrichPlace(place);

    if (enrichment) {
      await prisma.place.update({
        where: { id: place.id },
        data: {
          vibeTags: enrichment.vibeTags,
          companionTags: enrichment.companionTags,
          occasionTags: enrichment.occasionTags,
          goodForTags: enrichment.goodForTags,
          pulseDescription: enrichment.pulseDescription,
        },
      });

      console.log(`  Enriched: ${enrichment.vibeTags.join(", ")}`);
      console.log(`  Description: ${enrichment.pulseDescription.substring(0, 80)}...`);
      enriched++;
    } else {
      failed++;
    }

    // Respect rate limits
    await delay(500);
  }

  console.log("\n=== Enrichment Complete ===\n");
  console.log(`Total processed: ${places.length}`);
  console.log(`Enriched: ${enriched}`);
  console.log(`Failed: ${failed}`);
}

// Parse command line arguments
function parseArgs(): EnrichmentOptions {
  const args = process.argv.slice(2);
  const options: EnrichmentOptions = {};

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--category=")) {
      options.category = arg.split("=")[1];
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--force") {
      options.force = true;
    }
  }

  return options;
}

// Main execution
const options = parseArgs();

enrichPlaces(options)
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
