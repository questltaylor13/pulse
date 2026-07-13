/**
 * Wave 4 Rate & Rank — repair script. Re-derives every user's per-category
 * positions and scores from scratch (bucket order, stable within buckets by
 * current position). Idempotent; safe to run any time. Fixes drift from
 * torn flows, races, or future score-formula changes.
 *
 * Usage: npm run rank:repair
 */

import { PrismaClient } from "@prisma/client";
import { recomputeCategory } from "../lib/rank-engine/service";

const prisma = new PrismaClient();

async function main() {
  console.log("\nRecomputing rank positions + scores for all users...\n");

  const pairs = await prisma.userRankedEntry.groupBy({
    by: ["userId", "category"],
    _count: { _all: true },
  });
  console.log(`  (user, category) pairs found: ${pairs.length}`);

  let done = 0;
  for (const pair of pairs) {
    await recomputeCategory(pair.userId, pair.category);
    done++;
    console.log(
      `  ✓ user=${pair.userId} category=${pair.category} (${pair._count._all} entries)`
    );
  }

  console.log(`\n--- Recomputed ${done} categories ---`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Rank repair failed:", err);
    prisma.$disconnect();
    process.exitCode = 1;
  });
