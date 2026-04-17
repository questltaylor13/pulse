/**
 * CLI for managing isLocalFavorite on places.
 * Companion to set-editors-pick.ts — no admin UI in Phase 2.
 *
 * Usage:
 *   npx tsx scripts/set-local-favorite.ts --list
 *   npx tsx scripts/set-local-favorite.ts --set <placeId> [placeId ...]
 *   npx tsx scripts/set-local-favorite.ts --clear <placeId> [placeId ...]
 *   npx tsx scripts/set-local-favorite.ts --recompute-heuristic
 *   npx tsx scripts/set-local-favorite.ts --help
 *
 * Reads DATABASE_URL from .env.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function list() {
  const favorites = await prisma.place.findMany({
    where: { isLocalFavorite: true },
    select: {
      id: true,
      name: true,
      neighborhood: true,
      googleRating: true,
      googleReviewCount: true,
      touristTrapScore: true,
    },
    orderBy: [{ googleRating: "desc" }, { googleReviewCount: "desc" }],
  });

  if (favorites.length === 0) {
    console.log("No local favorites flagged.");
    return;
  }

  console.log(`${favorites.length} local favorite(s):\n`);
  for (const p of favorites) {
    const rating = p.googleRating?.toFixed(1) ?? "n/a";
    const reviews = p.googleReviewCount ?? 0;
    const trap = p.touristTrapScore != null ? p.touristTrapScore.toFixed(2) : "n/a";
    const hood = p.neighborhood ? ` (${p.neighborhood})` : "";
    console.log(
      `  ${p.id}  ★${rating} (${reviews} reviews)  trap=${trap}  ${p.name}${hood}`
    );
  }
}

async function setFavorites(ids: string[], value: boolean) {
  if (ids.length === 0) {
    console.error("No place IDs provided.");
    process.exit(1);
  }

  const result = await prisma.place.updateMany({
    where: { id: { in: ids } },
    data: { isLocalFavorite: value },
  });

  console.log(
    `${value ? "Flagged" : "Unflagged"} ${result.count} place(s) as local favorite.`
  );
}

async function recomputeHeuristic() {
  // Only flag places that aren't already flagged (don't unflip manually set ones)
  const result = await prisma.place.updateMany({
    where: {
      isLocalFavorite: false,
      googleRating: { gte: 4.5 },
      googleReviewCount: { gte: 100 },
      OR: [
        { touristTrapScore: { lte: 0.3 } },
        { touristTrapScore: null },
      ],
    },
    data: { isLocalFavorite: true },
  });

  console.log(
    `Heuristic applied: flagged ${result.count} new local favorite(s).`
  );
  console.log(
    "  Criteria: googleRating >= 4.5 AND googleReviewCount >= 100 AND (touristTrapScore <= 0.3 OR null)"
  );
}

function printHelp() {
  console.log("Usage:");
  console.log("  npx tsx scripts/set-local-favorite.ts --list");
  console.log(
    "  npx tsx scripts/set-local-favorite.ts --set <placeId> [placeId ...]"
  );
  console.log(
    "  npx tsx scripts/set-local-favorite.ts --clear <placeId> [placeId ...]"
  );
  console.log("  npx tsx scripts/set-local-favorite.ts --recompute-heuristic");
  console.log("  npx tsx scripts/set-local-favorite.ts --help");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("--list")) return list();
  if (args.includes("--recompute-heuristic")) return recomputeHeuristic();

  if (args.includes("--set")) {
    const ids = args.filter((a) => !a.startsWith("--"));
    return setFavorites(ids, true);
  }

  if (args.includes("--clear")) {
    const ids = args.filter((a) => !a.startsWith("--"));
    return setFavorites(ids, false);
  }

  console.error("Unknown command. Use --help for usage.");
  process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
