/**
 * Generate AI Influencer Avatars
 *
 * This script uses OpenAI's DALL-E to generate stylized avatars for fictional influencers.
 * The avatars are saved to public/influencers/<handle>.png
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-influencer-avatars.ts
 *
 * Requirements:
 *   - OPENAI_API_KEY env var must be set
 *   - Influencers must already exist in the database (run seed first without avatars)
 *
 * Important:
 *   - Avatars are stylized/illustrated to avoid generating real-looking people
 *   - No real people, celebrities, or copyrighted characters are depicted
 */

import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const prisma = new PrismaClient();

// Avatar style prompts by influencer vibe
const AVATAR_STYLES: Record<string, string> = {
  datenight: "A warm, romantic illustrated avatar of a stylized person with a soft smile, elegant evening attire, warm lighting, digital art style, no real human features",
  outdoors: "An adventurous illustrated avatar of a stylized athletic person, outdoor gear, mountains in background, warm sunlight, digital art cartoon style, no real human features",
  music: "A cool illustrated avatar of a stylized music lover with headphones, neon lights, urban nightlife aesthetic, digital art style, no real human features",
  foodie: "A friendly illustrated avatar of a stylized chef or food enthusiast, warm kitchen colors, artisanal aesthetic, digital art cartoon style, no real human features",
  budget: "A cheerful illustrated avatar of a stylized savvy shopper, casual style, bright colors, friendly expression, digital art cartoon style, no real human features",
  culture: "A thoughtful illustrated avatar of a stylized art enthusiast, gallery setting, sophisticated aesthetic, muted colors, digital art style, no real human features",
  wellness: "A serene illustrated avatar of a stylized wellness guide, calm expression, natural colors, meditation aesthetic, digital art cartoon style, no real human features",
  nightlife: "An energetic illustrated avatar of a stylized party person, club lighting, vibrant colors, confident pose, digital art style, no real human features",
};

// Influencer data with vibes
const INFLUENCERS = [
  {
    handle: "denverdate",
    displayName: "Denver Date Night",
    vibe: "datenight",
  },
  {
    handle: "milehighoutdoors",
    displayName: "Mile High Outdoors",
    vibe: "outdoors",
  },
  {
    handle: "denverbeats",
    displayName: "Denver Beats",
    vibe: "music",
  },
  {
    handle: "5280foodie",
    displayName: "5280 Foodie",
    vibe: "foodie",
  },
  {
    handle: "freeinflyover",
    displayName: "Free in Flyover",
    vibe: "budget",
  },
  {
    handle: "artdenver",
    displayName: "Art Denver",
    vibe: "culture",
  },
  {
    handle: "denverwellness",
    displayName: "Denver Wellness",
    vibe: "wellness",
  },
  {
    handle: "lodonights",
    displayName: "LoDo Nights",
    vibe: "nightlife",
  },
];

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(filepath, () => {}); // Delete the file on error
        reject(err);
      });
  });
}

async function generateAvatar(
  openai: OpenAI,
  handle: string,
  vibe: string
): Promise<string | null> {
  const stylePrompt = AVATAR_STYLES[vibe] || AVATAR_STYLES.culture;
  const outputDir = path.join(process.cwd(), "public", "influencers");
  const outputPath = path.join(outputDir, `${handle}.png`);

  // Check if avatar already exists
  if (fs.existsSync(outputPath)) {
    console.log(`  Avatar already exists for @${handle}, skipping...`);
    return `/influencers/${handle}.png`;
  }

  console.log(`  Generating avatar for @${handle} (${vibe})...`);

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `${stylePrompt}. Square profile picture format, centered composition, clean background.`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      console.error(`  No image URL returned for @${handle}`);
      return null;
    }

    // Download and save the image
    await downloadImage(imageUrl, outputPath);
    console.log(`  Saved avatar to ${outputPath}`);

    return `/influencers/${handle}.png`;
  } catch (error) {
    console.error(`  Failed to generate avatar for @${handle}:`, error);
    return null;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("GENERATE INFLUENCER AVATARS");
  console.log("=".repeat(60));

  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("\nError: OPENAI_API_KEY environment variable is not set.");
    console.log("\nTo run this script, set the OPENAI_API_KEY in your .env file:");
    console.log("  OPENAI_API_KEY=sk-...");
    console.log("\nAlternatively, you can use placeholder avatars by skipping this script.");
    process.exit(1);
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), "public", "influencers");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("\nGenerating avatars...\n");

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const influencer of INFLUENCERS) {
    const imagePath = await generateAvatar(openai, influencer.handle, influencer.vibe);

    if (imagePath) {
      // Update database with image path
      try {
        await prisma.influencer.update({
          where: { handle: influencer.handle },
          data: { profileImageUrl: imagePath },
        });
        generated++;
      } catch (error) {
        console.log(`  Influencer @${influencer.handle} not found in database, skipping DB update`);
        skipped++;
      }
    } else if (fs.existsSync(path.join(outputDir, `${influencer.handle}.png`))) {
      skipped++;
    } else {
      failed++;
    }

    // Rate limiting - wait 1 second between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(60));
  console.log("AVATAR GENERATION COMPLETE");
  console.log("=".repeat(60));
  console.log(`\n  Generated: ${generated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`\nAvatars saved to: public/influencers/`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
