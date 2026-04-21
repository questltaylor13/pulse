/**
 * Editorial seed for the Hidden Gems Engine (PRD 3 Phase 0).
 *
 * Seeds 13 hand-curated Discoveries in Pulse voice across all three subtypes
 * (HIDDEN_GEM, NICHE_ACTIVITY, SEASONAL_TIP). These records serve three jobs:
 *   1. Validate the Discovery schema end-to-end.
 *   2. Give later enrichment prompts real in-brand examples to anchor voice.
 *   3. Guarantee the Hidden Gems tab isn't empty on day one.
 *
 * All records are sourceType = EDITORIAL and pre-verified (Quest has personally
 * verified these). Quality score is pinned at 9 — editorial picks are top shelf
 * and should beat any automated-pipeline candidate that meets the ≥6 threshold.
 *
 * Idempotent: reruns update existing records matched by exact title.
 *
 * Usage:
 *   npm run discoveries:seed
 */

import {
  PrismaClient,
  Category,
  DiscoverySource,
  DiscoveryStatus,
  DiscoverySubtype,
  EventRegion,
} from "@prisma/client";
import { lookupDriveTime } from "../lib/regional/drive-times";

const prisma = new PrismaClient();

interface DiscoverySeed {
  title: string;
  description: string;
  subtype: DiscoverySubtype;
  category: Category;
  neighborhood?: string;
  townName?: string;
  region?: EventRegion; // Only needed when town isn't in DRIVE_TIMES_FROM_DENVER
  latitude?: number;
  longitude?: number;
  seasonHint?: string;
  sourceUrl?: string;
  tags: string[];
}

const SEEDS: DiscoverySeed[] = [
  // ---- HIDDEN GEMS (7) --------------------------------------------------
  {
    title: "The Sloan's Lake sunset bench",
    description:
      "The northwest corner bench, right where the path bends toward the boathouse. Mountains framed behind the city skyline, nobody on it after 7pm. Bring a friend and a canned something — it's the best free date in Denver.",
    subtype: "HIDDEN_GEM",
    category: "OUTDOORS",
    neighborhood: "West Highland",
    townName: "Denver",
    region: "DENVER_METRO",
    latitude: 39.7536,
    longitude: -105.0489,
    tags: ["free", "date-worthy", "sunset", "denver"],
  },
  {
    title: "The Milk Market basement bar",
    description:
      "Tucked under the food hall in Dairy Block — almost nobody clocks the stairs down. Dim, tiny, great bartenders. Order the mezcal flight and thank me later.",
    subtype: "HIDDEN_GEM",
    category: "BARS",
    neighborhood: "RiNo",
    townName: "Denver",
    region: "DENVER_METRO",
    latitude: 39.7536,
    longitude: -104.9976,
    tags: ["bars", "hidden", "date-worthy", "denver"],
  },
  {
    title: "The Santa Fe art alley",
    description:
      "The alley between 9th and 10th off Santa Fe is every square inch wheatpaste and murals, and it rotates constantly. Go on any First Friday walk-off when the crowd thins and you can actually look at it.",
    subtype: "HIDDEN_GEM",
    category: "ART",
    neighborhood: "Art District on Santa Fe",
    townName: "Denver",
    region: "DENVER_METRO",
    latitude: 39.7275,
    longitude: -105.0055,
    tags: ["free", "art", "street-art", "denver"],
  },
  {
    title: "Lookout Mountain before 9am",
    description:
      "Buffalo Bill's grave is the tourist excuse. The actual move is the 20-minute climb up Lariat Loop on a weekday morning before 9am — you'll have the overlook to yourself and the city sits below you like a map.",
    subtype: "HIDDEN_GEM",
    category: "OUTDOORS",
    townName: "Golden",
    latitude: 39.7308,
    longitude: -105.2389,
    tags: ["free", "outdoors", "morning", "regional"],
  },
  {
    title: "The Nederland dive that time forgot",
    description:
      "Pioneer Inn. Unchanged since the 70s, perfect après-ski energy, and the best cheeseburger above 8,000 feet. Go for the burger, stay because somebody's playing pool and it's suddenly midnight.",
    subtype: "HIDDEN_GEM",
    category: "BARS",
    townName: "Nederland",
    latitude: 39.9614,
    longitude: -105.5108,
    tags: ["bars", "mountain", "regional", "food"],
  },
  {
    title: "The quiet corner of Cheesman",
    description:
      "Southeast side of the park, by the pavilion steps. Locals read, nobody frisbees, and the mountain views on a clear evening will stop you mid-sentence. Best on a weekday at golden hour.",
    subtype: "HIDDEN_GEM",
    category: "OUTDOORS",
    neighborhood: "Capitol Hill",
    townName: "Denver",
    region: "DENVER_METRO",
    latitude: 39.7331,
    longitude: -104.9669,
    tags: ["free", "outdoors", "denver", "sunset"],
  },
  {
    title: "Little Man Ice Cream at 9:45pm",
    description:
      "Everyone knows the line at Little Man. Nobody knows the line is basically gone at 9:45, fifteen minutes before close. Salted Oreo in a waffle cone, every single time.",
    subtype: "HIDDEN_GEM",
    category: "FOOD",
    neighborhood: "LoHi",
    townName: "Denver",
    region: "DENVER_METRO",
    latitude: 39.7584,
    longitude: -105.0108,
    tags: ["food", "late-night", "denver", "cheap"],
  },

  // ---- NICHE ACTIVITIES (4) ---------------------------------------------
  {
    title: "Denver Curling Club open nights",
    description:
      "Thursday 'Learn to Curl' drop-ins at the Ice Ranch in Littleton. $30 gets you two hours and the most polite crowd in Denver. Wear layers, clean shoes, and bring somebody you're trying to impress.",
    subtype: "NICHE_ACTIVITY",
    category: "FITNESS",
    neighborhood: "Littleton",
    townName: "Denver",
    region: "DENVER_METRO",
    seasonHint: "Thursday evenings, October through April",
    sourceUrl: "https://denvercurlingclub.com/",
    tags: ["group-friendly", "beginner", "date-worthy", "denver"],
  },
  {
    title: "Cheesman Park Run Club",
    description:
      "Thursday 6am at the pavilion. Four miles, all paces welcome, coffee after. It's the unofficial entry point to every other running club in Denver — show up once, you'll have new friends by 7am.",
    subtype: "NICHE_ACTIVITY",
    category: "FITNESS",
    neighborhood: "Capitol Hill",
    townName: "Denver",
    region: "DENVER_METRO",
    seasonHint: "Thursday 6am, year-round",
    tags: ["free", "group-friendly", "morning", "denver"],
  },
  {
    title: "Denver Dodgeball League summer signups",
    description:
      "Signups open mid-April, league plays Tuesdays in Wash Park. The dodgeball is fine — the actual product is the patio crowd at Dos Luces after each match. You'll leave with a group chat.",
    subtype: "NICHE_ACTIVITY",
    category: "SOCIAL",
    townName: "Denver",
    region: "DENVER_METRO",
    seasonHint: "April signups for summer season",
    tags: ["group-friendly", "social", "denver", "summer"],
  },
  {
    title: "Colorado Mountain Club weeknight hikes",
    description:
      "CMC's year-round trip calendar is sorted by difficulty. The Tuesday B-level hikes are how half the transplants in Denver actually made friends — show up to three, you'll know a crew.",
    subtype: "NICHE_ACTIVITY",
    category: "OUTDOORS",
    townName: "Denver",
    region: "DENVER_METRO",
    seasonHint: "Year-round, weeknight and weekend trips",
    sourceUrl: "https://www.cmc.org/",
    tags: ["group-friendly", "outdoors", "regional", "social"],
  },

  // ---- SEASONAL TIPS (2) ------------------------------------------------
  {
    title: "Chatfield sunflower fields in late August",
    description:
      "Two weeks, maybe three. Chatfield Farms, early morning before the bees wake up, bring a real camera. It's the closest thing Denver has to a pilgrimage — everyone you know will be there, and that's the point.",
    subtype: "SEASONAL_TIP",
    category: "SEASONAL",
    townName: "Denver",
    region: "DENVER_METRO",
    seasonHint: "Late August, two to three weeks",
    sourceUrl: "https://botanicgardens.org/chatfield-farms",
    tags: ["seasonal", "outdoors", "free-ish", "denver"],
  },
  {
    title: "Larimer Square ice-skating opens around Thanksgiving",
    description:
      "Free, no reservation, runs through February. Go on a Wednesday night when the blocks are quiet and the string lights do all the work — it's the one Denver winter thing that always delivers.",
    subtype: "SEASONAL_TIP",
    category: "SEASONAL",
    neighborhood: "LoDo",
    townName: "Denver",
    region: "DENVER_METRO",
    latitude: 39.7479,
    longitude: -104.9995,
    seasonHint: "Thanksgiving through February",
    tags: ["free", "seasonal", "denver", "winter"],
  },
];

function resolveRegion(seed: DiscoverySeed): EventRegion {
  if (seed.region) return seed.region;
  if (seed.townName) {
    const match = lookupDriveTime(seed.townName);
    if (match) return match.region;
  }
  return "DENVER_METRO";
}

async function seedDiscoveries() {
  console.log(`\nSeeding ${SEEDS.length} editorial Discoveries...\n`);
  let created = 0;
  let updated = 0;
  const verifiedAt = new Date();

  for (const seed of SEEDS) {
    const data = {
      title: seed.title,
      description: seed.description,
      subtype: seed.subtype,
      category: seed.category,
      neighborhood: seed.neighborhood ?? null,
      townName: seed.townName ?? null,
      region: resolveRegion(seed),
      latitude: seed.latitude ?? null,
      longitude: seed.longitude ?? null,
      seasonHint: seed.seasonHint ?? null,
      sourceType: "EDITORIAL" as DiscoverySource,
      sourceUrl: seed.sourceUrl ?? null,
      tags: seed.tags,
      qualityScore: 9,
      status: "ACTIVE" as DiscoveryStatus,
      verifiedAt,
    };

    const existing = await prisma.discovery.findFirst({
      where: { title: seed.title, sourceType: "EDITORIAL" },
      select: { id: true },
    });

    if (existing) {
      await prisma.discovery.update({ where: { id: existing.id }, data });
      updated++;
      console.log(`  Updated: ${seed.title}`);
    } else {
      await prisma.discovery.create({ data });
      created++;
      console.log(`  Created: ${seed.title}`);
    }
  }

  console.log("\n--- Seed Summary ---");
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Total:   ${SEEDS.length}`);

  const bySubtype = SEEDS.reduce<Record<string, number>>((acc, s) => {
    acc[s.subtype] = (acc[s.subtype] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\n--- By Subtype ---");
  for (const [k, v] of Object.entries(bySubtype)) console.log(`  ${k}: ${v}`);

  const byRegion = SEEDS.reduce<Record<string, number>>((acc, s) => {
    const region = resolveRegion(s);
    acc[region] = (acc[region] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\n--- By Region ---");
  for (const [k, v] of Object.entries(byRegion)) console.log(`  ${k}: ${v}`);
}

async function main() {
  try {
    await seedDiscoveries();
    console.log("\nSeed completed successfully!\n");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
