import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const editors = await prisma.influencer.upsert({
    where: { handle: "pulse-editors" },
    update: {},
    create: {
      handle: "pulse-editors",
      displayName: "Pulse Editors",
      bio: "Editorial picks from the Pulse team. We live here, we go out a lot, and we have opinions.",
      profileImageUrl:
        "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&h=200&q=70",
      coverImageUrl:
        "https://images.unsplash.com/photo-1546156929-a4c0ac411f47?auto=format&fit=crop&w=1200&q=70",
      isFeaturedCreator: true,
      isDenverNative: true,
      specialties: ["hidden gems", "date nights", "seasonal picks"],
      preferredCategories: [],
      funFacts: [],
    },
  });
  console.log(`Upserted Pulse Editors: ${editors.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
