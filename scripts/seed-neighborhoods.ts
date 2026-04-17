/**
 * Idempotent seed script for Denver neighborhoods.
 * Upserts 12 neighborhoods by slug with editorial descriptions,
 * Unsplash cover photos, and computed placeCount from the Place table.
 *
 * Usage:
 *   npx tsx scripts/seed-neighborhoods.ts
 *
 * Reads DATABASE_URL from .env.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface NeighborhoodSeed {
  slug: string;
  name: string;
  description: string;
  coverImageUrl: string;
  displayOrder: number;
  nameVariations: string[]; // alternate names to match Place.neighborhood
}

const NEIGHBORHOODS: NeighborhoodSeed[] = [
  {
    slug: "rino",
    name: "RiNo",
    description:
      "Denver's most electric creative corridor — converted warehouses hide tasting rooms, murals repaint themselves seasonally, and every brewery seems to share a wall with an art studio. If you follow the street art, you'll find the best food trucks in the city. This is where Denver's creative class actually hangs out.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1619895862022-09114b41f16f?auto=format&fit=crop&w=800&q=70",
    displayOrder: 1,
    nameVariations: ["RiNo", "River North", "River North Art District", "RINO"],
  },
  {
    slug: "lodo",
    name: "LoDo",
    description:
      "The OG of downtown Denver — cobblestone-adjacent streets, Union Station's great hall, and the kind of energy that spills out of rooftop bars after a Rockies game. Historic brick facades house some of the city's best cocktail spots. Come for the game, stay for the late-night oyster bar.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1546156929-a4c0ac411f47?auto=format&fit=crop&w=800&q=70",
    displayOrder: 2,
    nameVariations: ["LoDo", "Lower Downtown", "LODO"],
  },
  {
    slug: "highlands",
    name: "Highlands",
    description:
      "Walkability that actually delivers — a tight grid of neighborhood restaurants, independent boutiques, and coffee shops where the baristas know your order. The views of downtown from the pedestrian bridge are unmatched. Highlands is the neighborhood that makes people move to Denver.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1605283176568-9b41fde3672e?auto=format&fit=crop&w=800&q=70",
    displayOrder: 3,
    nameVariations: ["Highlands", "The Highlands"],
  },
  {
    slug: "cap-hill",
    name: "Cap Hill",
    description:
      "Denver's most unapologetically eclectic neighborhood — dive bars sit next to James Beard nominees, used bookstores anchor every other block, and the nightlife runs the full spectrum. Historic mansions on tree-lined streets give way to the city's densest concentration of personality. This is where Denver stays weird.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=70",
    displayOrder: 4,
    nameVariations: ["Cap Hill", "Capitol Hill", "Capital Hill"],
  },
  {
    slug: "baker",
    name: "Baker",
    description:
      "South Broadway's beating heart — a mile-long strip of vintage shops, local coffee roasters, and restaurants that punch way above their price point. Baker keeps things unpretentious and reward the curious. The antique stores alone are worth the trip.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=800&q=70",
    displayOrder: 5,
    nameVariations: ["Baker", "South Broadway", "SoBo"],
  },
  {
    slug: "sloans-lake",
    name: "Sloan's Lake",
    description:
      "Denver's best-kept lakeside secret is finally getting its due — a growing restaurant scene rings the park, sunset runs circle the water, and the neighborhood still feels like it belongs to the people who live here. New spots open monthly without losing the chill factor. Perfect for a slow Sunday.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=70",
    displayOrder: 6,
    nameVariations: ["Sloan's Lake", "Sloans Lake", "Sloan Lake"],
  },
  {
    slug: "cherry-creek",
    name: "Cherry Creek",
    description:
      "Denver's upscale corridor does luxury without the pretense — world-class galleries neighbor independent boutiques, and the dining scene ranges from power-lunch steakhouses to inventive tasting menus. The Cherry Creek trail connects it all with a ribbon of green. This is where Denver dresses up.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1555436169-20e93ea9a7ff?auto=format&fit=crop&w=800&q=70",
    displayOrder: 7,
    nameVariations: ["Cherry Creek", "Cherry Creek North"],
  },
  {
    slug: "five-points",
    name: "Five Points",
    description:
      "The soul of Denver — a neighborhood built on jazz history and Black-owned businesses that's evolved into one of the city's most compelling cocktail and dining destinations. Welton Street carries decades of culture in every block. Come for the history, stay for the craft cocktails.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=70",
    displayOrder: 8,
    nameVariations: ["Five Points", "5 Points", "5Points"],
  },
  {
    slug: "lohi",
    name: "LoHi",
    description:
      "Lower Highlands packs more rooftop bars per block than anywhere in Denver — brunch is practically a sport here, and the views of downtown from every patio are absurd. The restaurant density is intense but the quality holds up. LoHi is where you take out-of-towners to impress them.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1617469767053-d3b523a0b982?auto=format&fit=crop&w=800&q=70",
    displayOrder: 9,
    nameVariations: ["LoHi", "Lower Highlands", "Lo-Hi", "LOHI"],
  },
  {
    slug: "santa-fe",
    name: "Santa Fe Art District",
    description:
      "Denver's gallery row comes alive on First Fridays — art walks spill between studios, murals cover entire building facades, and the creative energy is palpable year-round. Beyond the galleries, you'll find some of the city's best Mexican restaurants and quiet coffee shops. Art lives here full-time, not just opening night.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=800&q=70",
    displayOrder: 10,
    nameVariations: ["Santa Fe Art District", "Santa Fe", "Art District on Santa Fe"],
  },
  {
    slug: "berkeley",
    name: "Berkeley",
    description:
      "Tennyson Street is the main character here — a walkable stretch of local restaurants, indie bookshops, and ice cream spots that makes Berkeley one of Denver's best family-friendly neighborhoods. The vibe is relaxed and rooted, never trying too hard. It's the neighborhood where regulars outnumber visitors.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=70",
    displayOrder: 11,
    nameVariations: ["Berkeley", "Tennyson"],
  },
  {
    slug: "park-hill",
    name: "Park Hill",
    description:
      "Tree-lined streets and a genuine community feel set Park Hill apart — diverse dining anchors a neighborhood that's stayed true to its roots while welcoming thoughtful new additions. Block parties still happen here. If you want to understand Denver beyond downtown, start with Park Hill.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1516156008796-094e5b3acb38?auto=format&fit=crop&w=800&q=70",
    displayOrder: 12,
    nameVariations: ["Park Hill", "North Park Hill", "South Park Hill"],
  },
];

async function countPlaces(nameVariations: string[]): Promise<number> {
  const conditions = nameVariations.map((v) => ({
    neighborhood: { equals: v, mode: "insensitive" as const },
  }));

  try {
    return await prisma.place.count({
      where: { OR: conditions },
    });
  } catch {
    return 0;
  }
}

async function main() {
  console.log("Seeding 12 Denver neighborhoods...\n");

  let created = 0;
  let updated = 0;

  for (const n of NEIGHBORHOODS) {
    const placeCount = await countPlaces(n.nameVariations);

    const result = await prisma.neighborhood.upsert({
      where: { slug: n.slug },
      create: {
        slug: n.slug,
        name: n.name,
        description: n.description,
        coverImageUrl: n.coverImageUrl,
        placeCount,
        isFeatured: true,
        displayOrder: n.displayOrder,
      },
      update: {
        name: n.name,
        description: n.description,
        coverImageUrl: n.coverImageUrl,
        placeCount,
        isFeatured: true,
        displayOrder: n.displayOrder,
      },
    });

    // Check if it was just created (createdAt ~= updatedAt) or updated
    const isNew =
      Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
    if (isNew) created++;
    else updated++;

    console.log(
      `  ${isNew ? "Created" : "Updated"} ${n.name.padEnd(22)} (slug: ${n.slug.padEnd(12)}) placeCount: ${placeCount}`
    );
  }

  console.log(
    `\nDone. ${created} created, ${updated} updated, ${NEIGHBORHOODS.length} total.`
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
