/**
 * Fill missing images on events using curated Unsplash photos per category.
 * Uses multiple images per category for visual variety.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fill-missing-images.ts
 */

import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

// Multiple images per category for variety (Unsplash, Denver/Colorado themed)
const CATEGORY_IMAGES: Record<Category, string[]> = {
  LIVE_MUSIC: [
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
    "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80",
    "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80",
  ],
  ART: [
    "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800&q=80",
    "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&q=80",
    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&q=80",
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&q=80",
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80",
  ],
  FOOD: [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
  ],
  RESTAURANT: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80",
    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80",
    "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=800&q=80",
  ],
  BARS: [
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80",
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80",
    "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80",
  ],
  COFFEE: [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80",
    "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=800&q=80",
  ],
  OUTDOORS: [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    "https://images.unsplash.com/photo-1533577116850-9cc66cad8a9b?w=800&q=80",
    "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
    "https://images.unsplash.com/photo-1469521669194-babb45599def?w=800&q=80",
  ],
  FITNESS: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
    "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80",
    "https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=800&q=80",
  ],
  SEASONAL: [
    "https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800&q=80",
    "https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?w=800&q=80",
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&q=80",
    "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&q=80",
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
  ],
  POPUP: [
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
    "https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=800&q=80",
    "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800&q=80",
    "https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=800&q=80",
    "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800&q=80",
  ],
  ACTIVITY_VENUE: [
    "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    "https://images.unsplash.com/photo-1585951237313-1979e4df7385?w=800&q=80",
    "https://images.unsplash.com/photo-1562077772-3bd90f8a62bf?w=800&q=80",
    "https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800&q=80",
  ],
  OTHER: [
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
    "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80",
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80",
    "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80",
  ],
  COMEDY: [
    "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80",
    "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80",
    "https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=800&q=80",
    "https://images.unsplash.com/photo-1496024840928-4c417adf211d?w=800&q=80",
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80",
  ],
  SOCIAL: [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
    "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80",
    "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80",
    "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80",
    "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&q=80",
  ],
  WELLNESS: [
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
    "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80",
    "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&q=80",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
    "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?w=800&q=80",
  ],
};

// Title-specific overrides for curated events that deserve unique images
const TITLE_IMAGE_OVERRIDES: Record<string, string> = {
  "Denver Bouldering Club": "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80",
  "Movement RiNo": "https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=800&q=80",
  "The Spot Denver": "https://images.unsplash.com/photo-1601224876411-666c908e5598?w=800&q=80",
  "Mile Hi Pickleball": "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80",
  "Denver Curling Club": "https://images.unsplash.com/photo-1569517904440-e4386c879f66?w=800&q=80",
  "Archery Games Denver": "https://images.unsplash.com/photo-1510925758641-869d353cecc7?w=800&q=80",
  "Bear Creek Archery": "https://images.unsplash.com/photo-1510925758641-869d353cecc7?w=800&q=80",
  "Bad Axe Throwing": "https://images.unsplash.com/photo-1590502593747-42a996133562?w=800&q=80",
  "EscapeWorks Denver": "https://images.unsplash.com/photo-1562077772-3bd90f8a62bf?w=800&q=80",
  "iFly Indoor Skydiving": "https://images.unsplash.com/photo-1534766555764-ce878a4e947b?w=800&q=80",
  "Red Rocks Park": "https://images.unsplash.com/photo-1570641963303-92ce4845ed4c?w=800&q=80",
  "Colorado Mountain Club": "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80",
  "Meow Wolf Denver": "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80",
  "Denver Art Museum": "https://images.unsplash.com/photo-1566054757930-1b67fb985a81?w=800&q=80",
  "Comedy Works Downtown": "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80",
  "RISE Comedy": "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80",
  "Cooldown Running Club": "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80",
  "Brunch Running": "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80",
  "Community Clay Denver": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
  "Rocky Mountain Paddleboard": "https://images.unsplash.com/photo-1499242611767-cf8b9be02854?w=800&q=80",
  "Denver Clayroom": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
  "Chicken N Pickle": "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80",
  "All Out Smash": "https://images.unsplash.com/photo-1590502593747-42a996133562?w=800&q=80",
};

async function main() {
  console.log("Filling missing images on events...\n");

  const events = await prisma.event.findMany({
    where: { imageUrl: null },
    select: { id: true, title: true, venueName: true, category: true },
  });

  console.log("Found " + events.length + " events without images\n");

  let filled = 0;
  const categoryCounters = new Map<Category, number>();

  for (const event of events) {
    // Check for title-specific override first
    let imageUrl: string | null = null;

    for (const [key, url] of Object.entries(TITLE_IMAGE_OVERRIDES)) {
      if (event.title.includes(key) || event.venueName.includes(key)) {
        imageUrl = url;
        break;
      }
    }

    // Fall back to category-based image with rotation
    if (!imageUrl) {
      const images = CATEGORY_IMAGES[event.category] || CATEGORY_IMAGES.OTHER;
      const idx = (categoryCounters.get(event.category) || 0) % images.length;
      imageUrl = images[idx];
      categoryCounters.set(event.category, idx + 1);
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { imageUrl },
    });
    filled++;
  }

  console.log("Filled " + filled + " events with images");

  // Also fill Item table images
  const items = await prisma.item.findMany({
    where: { imageUrl: null },
    select: { id: true, title: true, venueName: true, category: true },
  });

  let itemsFilled = 0;
  const itemCategoryCounters = new Map<Category, number>();

  for (const item of items) {
    let imageUrl: string | null = null;

    for (const [key, url] of Object.entries(TITLE_IMAGE_OVERRIDES)) {
      if (item.title.includes(key) || item.venueName.includes(key)) {
        imageUrl = url;
        break;
      }
    }

    if (!imageUrl) {
      const images = CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES.OTHER;
      const idx = (itemCategoryCounters.get(item.category) || 0) % images.length;
      imageUrl = images[idx];
      itemCategoryCounters.set(item.category, idx + 1);
    }

    await prisma.item.update({
      where: { id: item.id },
      data: { imageUrl },
    });
    itemsFilled++;
  }

  console.log("Filled " + itemsFilled + " items with images");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
