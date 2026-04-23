/**
 * PRD 6 Phase 8 — Home feed latency bench.
 *
 * Pulls the first N user IDs with cache rows and times a fetchHomeFeed
 * call for each. Prints p50/p95/p99 so Phase 8.4 has a reproducible
 * measurement. Requires a running DB with seeded cache rows.
 *
 * Usage: `npx tsx scripts/bench-feed.ts [iterations]`
 */

import { prisma } from "@/lib/prisma";
import { fetchHomeFeed } from "@/components/home/fetch-home-feed";

const ITERATIONS = Number(process.argv[2] ?? 50);

async function main() {
  const users = await prisma.user.findMany({
    where: { rankedFeedCache: { isNot: null } },
    select: { id: true },
    take: 50,
  });
  if (users.length === 0) {
    console.error(
      "[bench-feed] no users with cache rows found — run /api/ranking/precompute first.",
    );
    process.exit(1);
  }

  const durations: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const user = users[i % users.length];
    const start = performance.now();
    await fetchHomeFeed("all", "near", user.id);
    durations.push(performance.now() - start);
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`${i + 1}/${ITERATIONS}... `);
    }
  }
  console.log("\n");

  durations.sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

  console.log("=== fetchHomeFeed bench ===");
  console.log(`iterations: ${ITERATIONS}`);
  console.log(`users sampled: ${users.length}`);
  console.log(`avg:  ${avg.toFixed(1)}ms`);
  console.log(`p50:  ${p50.toFixed(1)}ms  (target <150ms)`);
  console.log(`p95:  ${p95.toFixed(1)}ms  (target <200ms)`);
  console.log(`p99:  ${p99.toFixed(1)}ms  (target <500ms)`);

  if (p95 > 200) {
    console.error("[bench-feed] p95 exceeds Phase 8.4 target");
    process.exit(2);
  }
  process.exit(0);
}

main()
  .catch((err) => {
    console.error("[bench-feed] error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
