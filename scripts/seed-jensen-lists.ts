/**
 * Seed Jensen's pre-made lists
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-jensen-lists.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LISTS = [
  {
    name: "Weekend Ideas",
    description: "Things I want to try",
    shareSlug: "jensen-weekend-ideas",
    items: [
      { title: "Archery Games Denver", note: null },
      { title: "Denver Bouldering Club", note: null },
      { title: "Red Rocks Fitness \u2014 Stair Workout", note: null },
      { title: "Meow Wolf Denver \u2014 Convergence Station", note: null },
      { title: "Mile Hi Pickleball", note: null },
    ],
  },
  {
    name: "Date Night Ideas",
    description: "Fun stuff to do together",
    shareSlug: "jensen-date-nights",
    items: [
      { title: "Community Clay Denver", note: "Pottery date night. Way more fun than dinner and a movie." },
      { title: "Meow Wolf Denver \u2014 Convergence Station", note: "2-3 hours of exploring surreal art together." },
      { title: "EscapeWorks Denver", note: "Speakeasy room. Work together to solve puzzles." },
      { title: "All Out Smash", note: "Splatter paint room. Create art, make a mess, laugh a lot." },
      { title: "Comedy Works Downtown", note: "Classic date. Great comics, intimate venue." },
    ],
  },
];

async function main() {
  console.log("Seeding Jensen's pre-made lists...\n");

  const jensen = await prisma.user.findUnique({ where: { email: "jensen@pulse.app" } });
  if (!jensen) throw new Error("Jensen not found");

  // Build event title lookup
  const events = await prisma.event.findMany({
    where: { source: "pulse-curated" },
    select: { id: true, title: true },
  });
  const eventByTitle = new Map(events.map((e) => [e.title, e.id]));

  for (const listDef of LISTS) {
    // Find or create list
    let list = await prisma.list.findUnique({ where: { shareSlug: listDef.shareSlug } });
    if (list) {
      list = await prisma.list.update({
        where: { id: list.id },
        data: { name: listDef.name, description: listDef.description },
      });
    } else {
      list = await prisma.list.create({
        data: {
          userId: jensen.id,
          name: listDef.name,
          description: listDef.description,
          isPublic: false,
          shareSlug: listDef.shareSlug,
        },
      });
    }

    let order = 0;
    for (const item of listDef.items) {
      const eventId = eventByTitle.get(item.title);
      if (!eventId) {
        console.log("  SKIP (not found): " + item.title);
        continue;
      }

      const existing = await prisma.listItem.findUnique({
        where: { listId_eventId: { listId: list.id, eventId } },
      });
      if (!existing) {
        await prisma.listItem.create({
          data: {
            listId: list.id,
            eventId,
            order,
            notes: item.note,
          },
        });
      }
      order++;
    }

    console.log("  \"" + listDef.name + "\": " + order + " items");
  }

  console.log("\nJensen's lists seeded!");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
