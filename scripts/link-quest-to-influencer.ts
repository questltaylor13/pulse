import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function linkQuestToInfluencer() {
  console.log("Linking Quest user to questtaylor influencer profile...\n");

  // Find Quest's user account by email
  const questUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { contains: "quest", mode: "insensitive" } },
        { name: { contains: "quest", mode: "insensitive" } },
        { username: { contains: "quest", mode: "insensitive" } },
      ],
    },
  });

  if (!questUser) {
    console.log("Could not find Quest's user account.");
    console.log("\nSearching for all users...");
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true, username: true },
    });
    console.log("Users in database:");
    allUsers.forEach((u) => {
      console.log(`  - ${u.name || "No name"} (${u.email}) @${u.username || "no-username"}`);
    });
    return;
  }

  console.log(`Found Quest user: ${questUser.name} (${questUser.email}) - ID: ${questUser.id}`);

  // Find the questtaylor influencer
  const influencer = await prisma.influencer.findFirst({
    where: {
      OR: [
        { handle: "questtaylor" },
        { displayName: { contains: "Quest", mode: "insensitive" } },
      ],
    },
  });

  if (!influencer) {
    console.log("\nCould not find questtaylor influencer profile.");
    console.log("\nSearching for all influencers...");
    const allInfluencers = await prisma.influencer.findMany({
      select: { id: true, displayName: true, handle: true, userId: true },
    });
    console.log("Influencers in database:");
    allInfluencers.forEach((i) => {
      console.log(`  - ${i.displayName} (handle: ${i.handle}) - userId: ${i.userId || "NOT LINKED"}`);
    });
    return;
  }

  console.log(`Found influencer: ${influencer.displayName} (handle: ${influencer.handle}) - ID: ${influencer.id}`);

  if (influencer.userId) {
    console.log(`\nInfluencer is already linked to user ID: ${influencer.userId}`);
    if (influencer.userId === questUser.id) {
      console.log("The influencer is already correctly linked to Quest's account!");
    } else {
      console.log("The influencer is linked to a different user!");
    }
    return;
  }

  // Link the influencer to Quest's user account
  const updated = await prisma.influencer.update({
    where: { id: influencer.id },
    data: { userId: questUser.id },
  });

  console.log(`\nSuccessfully linked ${updated.displayName} influencer to Quest's user account!`);
  console.log(`Influencer ID: ${updated.id}`);
  console.log(`User ID: ${updated.userId}`);
}

linkQuestToInfluencer()
  .catch((e) => {
    console.error("Error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
