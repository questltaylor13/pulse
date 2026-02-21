/**
 * Create Quest Taylor user account linked to influencer profile
 *
 * Usage: npx ts-node scripts/seed-quest-user.ts
 */

import { PrismaClient, DenverTenure } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Quest Taylor's full profile data
const QUEST_PROFILE = {
  name: "Quest",
  username: "questtaylor",
  profileImageUrl: "/images/creators/quest.jpg",
  bio: `Hi! I'm Quest, founder of Pulse. While I'm not originally from Denver, I've been lucky enough to call it home for the last 5 years. I've lived in a few different places and spent a lot of time on the road, but Denver is the city that really taught me how to balance going out with friends and staying active.

I love anything that mixes sports, movement, good food, and fun people. One night I'm down for a workout or getting outside, the next I'm trying a new restaurant or saying yes to plans I didn't expect. Pulse came out of wanting an easier way to find experiences that make life feel less routine and more alive.

I'm excited to share the things that make this city fun, energizing, and worth exploring.`,
  denverTenure: DenverTenure.FIVE_PLUS_YEARS,
  isInfluencer: true,
  isAdmin: true,
  onboardingComplete: true,
};

async function main() {
  console.log("Creating/updating Quest Taylor founder account...\n");

  const email = "quest@pulse.app";
  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 10);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log("User already exists, updating with full profile data...");
    await prisma.user.update({
      where: { email },
      data: {
        ...QUEST_PROFILE,
        passwordHash,
      },
    });
    console.log("User updated with founder profile!");
  } else {
    await prisma.user.create({
      data: {
        email,
        ...QUEST_PROFILE,
        passwordHash,
        citySlug: "denver",
      },
    });
    console.log("User created with founder profile!");
  }

  console.log("\n--- Quest Taylor Profile ---");
  console.log(`Name: ${QUEST_PROFILE.name}`);
  console.log(`Username: @${QUEST_PROFILE.username}`);
  console.log(`Profile Image: ${QUEST_PROFILE.profileImageUrl}`);
  console.log(`Is Founder/Influencer: Yes`);
  console.log(`Is Admin: Yes`);

  console.log("\n--- Login Details ---");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log("\nYou can now log in at http://localhost:3000/auth/login");
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
