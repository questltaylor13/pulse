import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

// Unsplash stock photos by category - Denver/Colorado themed where possible
const EVENT_PHOTOS: Record<Category, string[]> = {
  LIVE_MUSIC: [
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80", // Concert crowd
    "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80", // Guitar performance
    "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80", // Music festival
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80", // Concert lights
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80", // Stage performance
  ],
  ART: [
    "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800&q=80", // Art gallery
    "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&q=80", // Abstract art
    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&q=80", // Art exhibition
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&q=80", // Modern art
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80", // Street art
  ],
  FOOD: [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80", // Fine dining
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80", // Food platter
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80", // Pancakes
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80", // Healthy bowl
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80", // Pizza
  ],
  RESTAURANT: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80", // Restaurant interior
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80", // Restaurant dining
    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&q=80", // Outdoor dining
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80", // Upscale restaurant
    "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=800&q=80", // Cozy restaurant
  ],
  BARS: [
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80", // Bar interior
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80", // Cocktails
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80", // Bar with bottles
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80", // Wine bar
    "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80", // Craft beer
  ],
  COFFEE: [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80", // Coffee shop
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80", // Latte art
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80", // Coffee beans
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80", // Coffee cup
    "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=800&q=80", // Espresso
  ],
  OUTDOORS: [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80", // Mountains
    "https://images.unsplash.com/photo-1533577116850-9cc66cad8a9b?w=800&q=80", // Colorado mountains
    "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80", // Hiking trail
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", // Forest path
    "https://images.unsplash.com/photo-1469521669194-babb45599def?w=800&q=80", // Park scenery
  ],
  FITNESS: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80", // Gym
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80", // Yoga class
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80", // Group fitness
    "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80", // Modern gym
    "https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=800&q=80", // Running
  ],
  SEASONAL: [
    "https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800&q=80", // Fall festival
    "https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?w=800&q=80", // Holiday lights
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&q=80", // Festival decorations
    "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&q=80", // Summer event
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80", // Outdoor festival
  ],
  POPUP: [
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80", // Food truck
    "https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=800&q=80", // Pop-up market
    "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800&q=80", // Street market
    "https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=800&q=80", // Night market
    "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800&q=80", // Pop-up shop
  ],
  ACTIVITY_VENUE: [
    "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&q=80", // Bowling
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", // Arcade
    "https://images.unsplash.com/photo-1585951237313-1979e4df7385?w=800&q=80", // Mini golf
    "https://images.unsplash.com/photo-1562077772-3bd90f8a62bf?w=800&q=80", // Escape room
    "https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800&q=80", // Game night
  ],
  OTHER: [
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80", // Event lighting
    "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80", // Celebration
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80", // Conference
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80", // Party
    "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80", // Social gathering
  ],
};

// Place photos by category
const PLACE_PHOTOS: Record<Category, string[]> = {
  RESTAURANT: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80",
    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80",
    "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=800&q=80",
  ],
  FOOD: [
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
    "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=800&q=80",
    "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&q=80",
    "https://images.unsplash.com/photo-1494859802809-d069c3b71a8a?w=800&q=80",
    "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80",
  ],
  COFFEE: [
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80",
    "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&q=80",
    "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&q=80",
    "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800&q=80",
    "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=800&q=80",
  ],
  BARS: [
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80",
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80",
    "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=800&q=80",
    "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&q=80",
  ],
  FITNESS: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
    "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80",
  ],
  ART: [
    "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800&q=80",
    "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&q=80",
    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&q=80",
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&q=80",
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80",
  ],
  LIVE_MUSIC: [
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=800&q=80",
    "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800&q=80",
    "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80",
  ],
  OUTDOORS: [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    "https://images.unsplash.com/photo-1533577116850-9cc66cad8a9b?w=800&q=80",
    "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80",
    "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&q=80",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
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
};

function getRandomPhoto(photos: string[]): string {
  return photos[Math.floor(Math.random() * photos.length)];
}

async function main() {
  console.log("Adding stock photos to events and places...\n");

  // Update events without images
  const events = await prisma.event.findMany({
    where: { imageUrl: null },
    select: { id: true, category: true },
  });

  console.log(`Found ${events.length} events without images`);

  for (const event of events) {
    const photos = EVENT_PHOTOS[event.category] || EVENT_PHOTOS.OTHER;
    const imageUrl = getRandomPhoto(photos);

    await prisma.event.update({
      where: { id: event.id },
      data: { imageUrl },
    });
  }

  console.log(`Updated ${events.length} events with images\n`);

  // Update places without images
  const places = await prisma.place.findMany({
    where: { primaryImageUrl: null },
    select: { id: true, category: true },
  });

  console.log(`Found ${places.length} places without images`);

  for (const place of places) {
    const category = place.category || "OTHER";
    const photos = PLACE_PHOTOS[category] || PLACE_PHOTOS.OTHER;
    const imageUrl = getRandomPhoto(photos);

    await prisma.place.update({
      where: { id: place.id },
      data: { primaryImageUrl: imageUrl },
    });
  }

  console.log(`Updated ${places.length} places with images\n`);

  // Update items without images (based on their category)
  const items = await prisma.item.findMany({
    where: { imageUrl: null },
    select: { id: true, category: true },
  });

  console.log(`Found ${items.length} items without images`);

  for (const item of items) {
    const photos = EVENT_PHOTOS[item.category] || EVENT_PHOTOS.OTHER;
    const imageUrl = getRandomPhoto(photos);

    await prisma.item.update({
      where: { id: item.id },
      data: { imageUrl },
    });
  }

  console.log(`Updated ${items.length} items with images\n`);

  console.log("Done! Stock photos have been added.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
