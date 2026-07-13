/**
 * Wave 4 Rate & Rank — seed UserRankedEntry rows from existing Beli stars
 * (UserItemStatus.rating on DONE rows), so rating history becomes ranked
 * lists on day one. Mapping per plan decision D9: 4–5★ LIKED, 3★ FINE,
 * 1–2★ DISLIKED; within a bucket higher stars first, then earlier updatedAt.
 *
 * Idempotent: a (user, category) that already has ANY ranked entries is
 * skipped entirely (logged) — this script is meant to run once, before
 * RATE_RANK_ENABLED is flipped; after that the live flow owns ordering.
 * Re-running is safe and a no-op.
 *
 * Usage: npm run rank:backfill
 */

import { PrismaClient } from "@prisma/client";
import { planBackfill, type BackfillInput } from "../lib/rank-engine/backfill";

const prisma = new PrismaClient();

async function main() {
  console.log("\nSeeding ranked entries from existing star ratings...\n");

  const rated = await prisma.userItemStatus.findMany({
    where: {
      status: "DONE",
      rating: { not: null },
      OR: [
        { eventId: { not: null } },
        { placeId: { not: null } },
        { discoveryId: { not: null } },
      ],
    },
    include: {
      event: {
        select: { title: true, imageUrl: true, category: true, townName: true, neighborhood: true },
      },
      place: {
        select: { name: true, primaryImageUrl: true, category: true, townName: true, neighborhood: true },
      },
      discovery: { select: { title: true, category: true, townName: true } },
    },
  });
  console.log(`  Rated DONE rows found: ${rated.length}`);

  const byUser = new Map<string, BackfillInput[]>();
  for (const row of rated) {
    let input: BackfillInput | null = null;
    if (row.eventId) {
      input = {
        refKind: "event",
        refId: row.eventId,
        rating: row.rating!,
        updatedAt: row.updatedAt,
        contentCategory: row.event?.category ?? row.itemCategorySnapshot,
        title: row.event?.title ?? row.itemTitleSnapshot,
        imageUrl: row.event?.imageUrl ?? null,
        town: row.event?.townName ?? row.event?.neighborhood ?? row.itemTownSnapshot,
      };
    } else if (row.placeId) {
      input = {
        refKind: "place",
        refId: row.placeId,
        rating: row.rating!,
        updatedAt: row.updatedAt,
        contentCategory: row.place?.category ?? row.itemCategorySnapshot,
        title: row.place?.name ?? row.itemTitleSnapshot,
        imageUrl: row.place?.primaryImageUrl ?? null,
        town: row.place?.townName ?? row.place?.neighborhood ?? row.itemTownSnapshot,
      };
    } else if (row.discoveryId) {
      input = {
        refKind: "discovery",
        refId: row.discoveryId,
        rating: row.rating!,
        updatedAt: row.updatedAt,
        contentCategory: row.discovery?.category ?? row.itemCategorySnapshot,
        title: row.discovery?.title ?? row.itemTitleSnapshot,
        imageUrl: null,
        town: row.discovery?.townName ?? row.itemTownSnapshot,
      };
    }
    if (!input) continue;
    const list = byUser.get(row.userId) ?? [];
    list.push(input);
    byUser.set(row.userId, list);
  }

  let created = 0;
  let skippedCategories = 0;
  for (const [userId, rows] of byUser) {
    const plan = planBackfill(rows);
    for (const categoryPlan of plan) {
      const existing = await prisma.userRankedEntry.count({
        where: { userId, category: categoryPlan.category },
      });
      if (existing > 0) {
        console.log(
          `  ~ skip user=${userId} category=${categoryPlan.category} (${existing} entries already exist)`
        );
        skippedCategories++;
        continue;
      }
      await prisma.userRankedEntry.createMany({
        data: categoryPlan.entries.map((e) => ({
          userId,
          eventId: e.refKind === "event" ? e.refId : null,
          placeId: e.refKind === "place" ? e.refId : null,
          discoveryId: e.refKind === "discovery" ? e.refId : null,
          category: categoryPlan.category,
          sentiment: e.sentiment,
          position: e.position,
          score: e.score,
          isPlacementConfirmed: true,
          titleSnapshot: e.title,
          imageSnapshot: e.imageUrl,
          categorySnapshot: e.contentCategory,
        })),
      });
      created += categoryPlan.entries.length;
      console.log(
        `  + user=${userId} category=${categoryPlan.category}: ${categoryPlan.entries.length} entries`
      );
    }
  }

  console.log("\n--- Results ---");
  console.log(`  Entries created:            ${created}`);
  console.log(`  Categories skipped (exist): ${skippedCategories}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Ranked-entry backfill failed:", err);
    prisma.$disconnect();
    process.exitCode = 1;
  });
