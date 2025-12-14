/**
 * Seed demo friends for the friends going feature
 *
 * Usage: npx ts-node scripts/seed-friends.ts
 */

import { PrismaClient, FriendshipStatus, EventListStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Demo friends with realistic Denver personas
const DEMO_FRIENDS = [
  {
    name: "Alex Chen",
    username: "alexchen",
    email: "alex@demo.pulse",
    bio: "Software engineer by day, concert junkie by night. Always down for live music in RiNo.",
    profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex&backgroundColor=b6e3f4",
  },
  {
    name: "Jordan Martinez",
    username: "jordanm",
    email: "jordan@demo.pulse",
    bio: "Foodie exploring every corner of Denver. Currently obsessed with the LoHi restaurant scene.",
    profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=jordan&backgroundColor=ffd5dc",
  },
  {
    name: "Sam Williams",
    username: "samwilliams",
    email: "sam@demo.pulse",
    bio: "Art curator and gallery hopper. First Friday is my favorite day of the month.",
    profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sam&backgroundColor=d1d4f9",
  },
  {
    name: "Taylor Brooks",
    username: "taylorb",
    email: "taylor@demo.pulse",
    bio: "Fitness enthusiast and trail runner. Catch me at sunrise workouts or hiking 14ers.",
    profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=taylor&backgroundColor=c0aede",
  },
  {
    name: "Casey Johnson",
    username: "caseyj",
    email: "casey@demo.pulse",
    bio: "Bartender at a LoDo speakeasy. I know all the best happy hour spots.",
    profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=casey&backgroundColor=ffdfbf",
  },
  {
    name: "Riley Thompson",
    username: "rileyt",
    email: "riley@demo.pulse",
    bio: "New to Denver! Trying to meet people and explore the city. Coffee dates welcome!",
    profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=riley&backgroundColor=a0e7e5",
  },
  {
    name: "Morgan Davis",
    username: "morgand",
    email: "morgan@demo.pulse",
    bio: "Music producer and DJ. You'll find me at every electronic show in town.",
    profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=morgan&backgroundColor=b4f8c8",
  },
  {
    name: "Drew Anderson",
    username: "drewa",
    email: "drew@demo.pulse",
    bio: "Startup founder building in Boulder. Love supporting local pop-ups and new restaurants.",
    profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=drew&backgroundColor=fbe7c6",
  },
];

async function main() {
  console.log("Seeding demo friends...\n");

  // Find Quest's user account (the main user)
  const questUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: "quest@pulse.app" },
        { username: "questtaylor" },
      ],
    },
  });

  if (!questUser) {
    console.error("Quest user not found! Please run seed-quest-user.ts first.");
    process.exit(1);
  }

  console.log(`Found Quest user: ${questUser.name} (${questUser.id})\n`);

  // Get upcoming events to have friends save
  const upcomingEvents = await prisma.event.findMany({
    where: {
      startTime: {
        gte: new Date(),
      },
    },
    orderBy: { startTime: "asc" },
    take: 30,
  });

  if (upcomingEvents.length === 0) {
    console.error("No upcoming events found! Please seed events first.");
    process.exit(1);
  }

  console.log(`Found ${upcomingEvents.length} upcoming events\n`);

  const createdFriends: string[] = [];

  // Create or update demo friends
  for (const friendData of DEMO_FRIENDS) {
    const friend = await prisma.user.upsert({
      where: { email: friendData.email },
      update: {
        name: friendData.name,
        username: friendData.username,
        bio: friendData.bio,
        profileImageUrl: friendData.profileImageUrl,
        onboardingComplete: true,
      },
      create: {
        ...friendData,
        citySlug: "denver",
        onboardingComplete: true,
      },
    });

    createdFriends.push(friend.id);
    console.log(`Created/updated friend: ${friend.name} (@${friend.username})`);

    // Create friendship with Quest (if not exists)
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: questUser.id, addresseeId: friend.id },
          { requesterId: friend.id, addresseeId: questUser.id },
        ],
      },
    });

    if (!existingFriendship) {
      await prisma.friendship.create({
        data: {
          requesterId: friend.id,
          addresseeId: questUser.id,
          status: FriendshipStatus.ACCEPTED,
        },
      });
      console.log(`  -> Created friendship with Quest`);
    } else {
      // Update to ACCEPTED if pending
      if (existingFriendship.status !== FriendshipStatus.ACCEPTED) {
        await prisma.friendship.update({
          where: { id: existingFriendship.id },
          data: { status: FriendshipStatus.ACCEPTED },
        });
        console.log(`  -> Updated friendship to ACCEPTED`);
      }
    }
  }

  console.log("\n--- Assigning events to friends ---\n");

  // Have each friend save 2-5 random events
  for (let i = 0; i < createdFriends.length; i++) {
    const friendId = createdFriends[i];
    const friendData = DEMO_FRIENDS[i];

    // Pick random number of events (2-5)
    const numEvents = Math.floor(Math.random() * 4) + 2;

    // Shuffle and pick events
    const shuffledEvents = [...upcomingEvents].sort(() => Math.random() - 0.5);
    const selectedEvents = shuffledEvents.slice(0, numEvents);

    for (const event of selectedEvents) {
      // Create or update event status (WANT = going to this event)
      await prisma.eventUserStatus.upsert({
        where: {
          userId_eventId: {
            userId: friendId,
            eventId: event.id,
          },
        },
        update: {
          status: EventListStatus.WANT,
        },
        create: {
          userId: friendId,
          eventId: event.id,
          status: EventListStatus.WANT,
        },
      });
    }

    console.log(`${friendData.name} is going to ${numEvents} events`);
  }

  // Summary
  console.log("\n========================================");
  console.log("Demo Friends Seeded Successfully!");
  console.log("========================================\n");
  console.log(`Created ${DEMO_FRIENDS.length} demo friends:`);
  for (const friend of DEMO_FRIENDS) {
    console.log(`  - ${friend.name} (@${friend.username})`);
  }
  console.log("\nAll friends are now connected to Quest and have saved events.");
  console.log("Check the feed to see 'Friends Going' badges on event cards!");
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
