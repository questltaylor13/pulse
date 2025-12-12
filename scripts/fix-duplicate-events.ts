/**
 * Script to find and remove duplicate events
 *
 * Duplicates are identified by matching:
 * - title (normalized)
 * - venueName (normalized)
 * - startTime (same day)
 *
 * The oldest event (by createdAt) is kept, newer duplicates are removed.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fix-duplicate-events.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fix-duplicate-events.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface DuplicateGroup {
  key: string;
  events: Array<{
    id: string;
    title: string;
    venueName: string;
    startTime: Date;
    createdAt: Date;
  }>;
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " "); // Normalize whitespace
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function findDuplicates(): Promise<DuplicateGroup[]> {
  const events = await prisma.event.findMany({
    select: {
      id: true,
      title: true,
      venueName: true,
      startTime: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by normalized title + venue + date
  const groups = new Map<string, DuplicateGroup["events"]>();

  for (const event of events) {
    const key = `${normalizeString(event.title)}|${normalizeString(event.venueName)}|${getDateKey(event.startTime)}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(event);
  }

  // Filter to only groups with duplicates
  const duplicates: DuplicateGroup[] = [];
  for (const [key, events] of groups) {
    if (events.length > 1) {
      duplicates.push({ key, events });
    }
  }

  return duplicates;
}

async function removeDuplicates(dryRun: boolean = true): Promise<void> {
  console.log("\n=== Duplicate Event Cleanup ===\n");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE (will delete)"}\n`);

  const duplicates = await findDuplicates();

  if (duplicates.length === 0) {
    console.log("No duplicate events found!");
    return;
  }

  console.log(`Found ${duplicates.length} groups of duplicate events:\n`);

  let totalToRemove = 0;
  const idsToRemove: string[] = [];

  for (const group of duplicates) {
    console.log(`--- Duplicate Group ---`);
    console.log(`Key: ${group.key}`);
    console.log(`Events (${group.events.length}):`);

    // Keep the first (oldest) event, mark others for removal
    const [keep, ...remove] = group.events;

    console.log(`  KEEP: [${keep.id}] "${keep.title}" at ${keep.venueName}`);
    console.log(`         Created: ${keep.createdAt.toISOString()}`);

    for (const event of remove) {
      console.log(`  REMOVE: [${event.id}] "${event.title}" at ${event.venueName}`);
      console.log(`          Created: ${event.createdAt.toISOString()}`);
      idsToRemove.push(event.id);
      totalToRemove++;
    }
    console.log();
  }

  console.log(`\nTotal duplicates to remove: ${totalToRemove}`);

  if (dryRun) {
    console.log("\n[DRY RUN] No events were deleted. Run without --dry-run to delete.\n");
  } else {
    console.log("\nDeleting duplicate events...");

    // First, delete related records (ListItems, EventViews, UserActivity, etc.)
    await prisma.listItem.deleteMany({
      where: { eventId: { in: idsToRemove } },
    });

    await prisma.eventView.deleteMany({
      where: { eventId: { in: idsToRemove } },
    });

    await prisma.userActivity.deleteMany({
      where: { eventId: { in: idsToRemove } },
    });

    await prisma.userFeedback.deleteMany({
      where: { eventId: { in: idsToRemove } },
    });

    // Now delete the events
    const result = await prisma.event.deleteMany({
      where: { id: { in: idsToRemove } },
    });

    console.log(`Deleted ${result.count} duplicate events.\n`);
  }
}

// Parse args
const dryRun = process.argv.includes("--dry-run");

removeDuplicates(dryRun)
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
