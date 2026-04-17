/**
 * Tiny CLI for flipping isEditorsPick on a set of events.
 * Intended for periodic editorial seeding — no admin UI in Phase 1.
 *
 * Usage:
 *   npx tsx scripts/set-editors-pick.ts <eventId> [eventId ...]     # flag as picks
 *   npx tsx scripts/set-editors-pick.ts --clear <eventId> [...]     # unflag
 *   npx tsx scripts/set-editors-pick.ts --list                      # show current picks
 *   npx tsx scripts/set-editors-pick.ts --auto-weekend              # auto-flag top 5 weekend events
 *
 * Reads DATABASE_URL from .env.
 */

import { PrismaClient } from "@prisma/client";
import { upcomingWeekendRange } from "../lib/queries/events";

const prisma = new PrismaClient();

async function list() {
  const picks = await prisma.event.findMany({
    where: { isEditorsPick: true, isArchived: false },
    select: { id: true, title: true, startTime: true, venueName: true, neighborhood: true },
    orderBy: { startTime: "asc" },
  });
  if (picks.length === 0) {
    console.log("No active editor's picks.");
    return;
  }
  console.log(`${picks.length} active editor's pick(s):`);
  for (const p of picks) {
    console.log(`  ${p.id}  ${p.startTime.toISOString().slice(0, 16)}  ${p.title}  — ${p.venueName}${p.neighborhood ? ` (${p.neighborhood})` : ""}`);
  }
}

async function setPicks(ids: string[], value: boolean) {
  if (ids.length === 0) {
    console.error("No event IDs provided.");
    process.exit(1);
  }
  const result = await prisma.event.updateMany({
    where: { id: { in: ids } },
    data: { isEditorsPick: value },
  });
  console.log(`${value ? "Flagged" : "Unflagged"} ${result.count} event(s).`);
}

async function autoWeekend() {
  const { start, end } = upcomingWeekendRange();
  const candidates = await prisma.event.findMany({
    where: {
      isArchived: false,
      status: "PUBLISHED",
      startTime: { gte: start, lte: end },
    },
    select: { id: true, title: true, noveltyScore: true, qualityScore: true },
    orderBy: [{ qualityScore: "desc" }, { noveltyScore: "desc" }],
    take: 5,
  });

  if (candidates.length === 0) {
    console.log("No candidate events this weekend. Nothing flipped.");
    return;
  }

  await prisma.event.updateMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    data: { isEditorsPick: true },
  });

  console.log(`Auto-flagged ${candidates.length} weekend event(s) as editor's pick:`);
  for (const c of candidates) console.log(`  ${c.id}  ${c.title}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log("Usage:");
    console.log("  npx tsx scripts/set-editors-pick.ts <eventId> [eventId ...]");
    console.log("  npx tsx scripts/set-editors-pick.ts --clear <eventId> [...]");
    console.log("  npx tsx scripts/set-editors-pick.ts --list");
    console.log("  npx tsx scripts/set-editors-pick.ts --auto-weekend");
    process.exit(0);
  }

  if (args.includes("--list")) return list();
  if (args.includes("--auto-weekend")) return autoWeekend();

  const clear = args.includes("--clear");
  const ids = args.filter((a) => !a.startsWith("--"));
  return setPicks(ids, !clear);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
