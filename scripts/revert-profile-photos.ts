/**
 * Revert Profile Photos
 * Usage: npx ts-node scripts/revert-profile-photos.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Reverting profile photos...\n");

  // 1. Remove photos from demo users
  const demoResult = await prisma.user.updateMany({
    where: { email: { contains: "@demo.pulse" } },
    data: { profileImageUrl: null },
  });
  console.log("Demo users reverted:", demoResult.count);

  // 2. Revert creators to original local paths
  await prisma.influencer.update({
    where: { handle: "haleighwatts" },
    data: { profileImageUrl: "/images/creators/haleigh.png" },
  });
  await prisma.influencer.update({
    where: { handle: "maggieberra" },
    data: { profileImageUrl: "/images/creators/maggie.png" },
  });
  await prisma.influencer.update({
    where: { handle: "questtaylor" },
    data: { profileImageUrl: "/images/creators/quest.jpg" },
  });
  console.log("Creators reverted: 3");

  // 3. Remove Unsplash photos from other users
  const otherResult = await prisma.user.updateMany({
    where: {
      profileImageUrl: { startsWith: "https://images.unsplash.com" },
    },
    data: { profileImageUrl: null },
  });
  console.log("Other users reverted:", otherResult.count);

  console.log("\nDone! Profile photos reverted.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
