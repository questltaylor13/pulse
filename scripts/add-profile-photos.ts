/**
 * Add Profile Photos to Users and Creators
 *
 * This script adds Unsplash stock profile photos to:
 * - Demo users who don't have profile images
 * - Any creators without profile images
 * - Optionally updates creators with stock photos
 *
 * Usage: npx ts-node scripts/add-profile-photos.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Diverse professional headshot photos from Unsplash
const PROFILE_PHOTOS = [
  // Professional headshots - diverse group
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face", // Man with beard
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face", // Woman smiling
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face", // Man professional
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face", // Woman casual
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face", // Man glasses
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face", // Woman editorial
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=face", // Young man
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face", // Woman blonde
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face", // Man clean cut
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face", // Woman creative
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face", // Woman fashion
  "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop&crop=face", // Man casual
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=face", // Woman warm
  "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop&crop=face", // Man diverse
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face", // Woman professional
];

// Map specific photos to demo users for consistency
const DEMO_USER_PHOTOS: Record<string, string> = {
  "alex@demo.pulse": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
  "jordan@demo.pulse": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  "sam@demo.pulse": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=face",
  "taylor@demo.pulse": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
  "casey@demo.pulse": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
  "riley@demo.pulse": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face",
  "morgan@demo.pulse": "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop&crop=face",
  "drew@demo.pulse": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
  "avery@demo.pulse": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
  "jamie@demo.pulse": "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=face",
};

// Creator photos - using professional looking Unsplash photos
const CREATOR_PHOTOS: Record<string, string> = {
  "haleighwatts": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
  "maggieberra": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face",
  "questtaylor": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face",
};

async function addProfilePhotos() {
  console.log("Adding profile photos...\n");

  let usersUpdated = 0;
  let creatorsUpdated = 0;

  // 1. Update demo users
  console.log("Updating demo users...");
  for (const [email, photoUrl] of Object.entries(DEMO_USER_PHOTOS)) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        await prisma.user.update({
          where: { email },
          data: { profileImageUrl: photoUrl },
        });
        console.log(`  + ${user.name} - photo added`);
        usersUpdated++;
      }
    } catch (error) {
      console.error(`  ! Error updating ${email}:`, error);
    }
  }

  // 2. Update any users without profile images
  console.log("\nChecking for other users without photos...");
  const usersWithoutPhotos = await prisma.user.findMany({
    where: {
      profileImageUrl: null,
      email: { not: { contains: "@demo.pulse" } },
    },
  });

  let photoIndex = 0;
  for (const user of usersWithoutPhotos) {
    // Skip if this is a creator (they'll be handled separately)
    if (user.email === "quest@pulse.app") continue;

    const photoUrl = PROFILE_PHOTOS[photoIndex % PROFILE_PHOTOS.length];
    await prisma.user.update({
      where: { id: user.id },
      data: { profileImageUrl: photoUrl },
    });
    console.log(`  + ${user.name || user.email} - photo added`);
    usersUpdated++;
    photoIndex++;
  }

  // 3. Update creators/influencers
  console.log("\nUpdating creators...");
  for (const [handle, photoUrl] of Object.entries(CREATOR_PHOTOS)) {
    try {
      const creator = await prisma.influencer.findUnique({
        where: { handle },
      });

      if (creator) {
        await prisma.influencer.update({
          where: { handle },
          data: { profileImageUrl: photoUrl },
        });
        console.log(`  + ${creator.displayName} (@${handle}) - photo updated`);
        creatorsUpdated++;
      }
    } catch (error) {
      console.error(`  ! Error updating creator ${handle}:`, error);
    }
  }

  // 4. Check for any other creators without photos
  console.log("\nChecking for other creators without photos...");
  const creatorsWithoutPhotos = await prisma.influencer.findMany({
    where: {
      profileImageUrl: null,
    },
  });

  for (const creator of creatorsWithoutPhotos) {
    const photoUrl = PROFILE_PHOTOS[photoIndex % PROFILE_PHOTOS.length];
    await prisma.influencer.update({
      where: { id: creator.id },
      data: { profileImageUrl: photoUrl },
    });
    console.log(`  + ${creator.displayName} - photo added`);
    creatorsUpdated++;
    photoIndex++;
  }

  console.log("\n--- Summary ---");
  console.log(`  Users updated: ${usersUpdated}`);
  console.log(`  Creators updated: ${creatorsUpdated}`);
  console.log(`  Total: ${usersUpdated + creatorsUpdated}`);
}

async function main() {
  try {
    await addProfilePhotos();
    console.log("\nProfile photos added successfully!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
