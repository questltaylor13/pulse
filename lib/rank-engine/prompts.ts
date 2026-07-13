/**
 * Wave 4 Rate & Rank — "rate your recent" prompts (decision D10).
 *
 * Computed on read (Hobby plan = daily crons, so no timely push exists):
 * WANT'd events whose start time passed within the last 14 days, plus
 * WANT'd places saved more than 14 days ago. Dismissal stamps
 * UserItemStatus.promptDismissedAt ("Didn't go") — WANT is kept, no PASS
 * taste-penalty for simply not making it out. Rating converts the row to
 * DONE, which removes it from this query naturally.
 */

import { prisma } from "@/lib/prisma";

export interface RatePrompt {
  statusId: string;
  ref: { eventId: string } | { placeId: string };
  kind: "event" | "place";
  title: string;
  imageUrl: string | null;
  /** e.g. "last Friday" context line — event start or save date. */
  whenLabel: string;
}

export const MAX_PROMPTS = 2;
const WINDOW_DAYS = 14;

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export async function fetchRatePrompts(userId: string): Promise<RatePrompt[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [eventRows, placeRows] = await Promise.all([
    prisma.userItemStatus.findMany({
      where: {
        userId,
        status: "WANT",
        promptDismissedAt: null,
        eventId: { not: null },
        event: { startTime: { gte: windowStart, lt: now } },
      },
      orderBy: { event: { startTime: "desc" } },
      take: MAX_PROMPTS,
      select: {
        id: true,
        eventId: true,
        itemTitleSnapshot: true,
        event: { select: { title: true, imageUrl: true, startTime: true } },
      },
    }),
    prisma.userItemStatus.findMany({
      where: {
        userId,
        status: "WANT",
        promptDismissedAt: null,
        placeId: { not: null },
        updatedAt: { lt: windowStart },
      },
      orderBy: { updatedAt: "asc" },
      take: MAX_PROMPTS,
      select: {
        id: true,
        placeId: true,
        updatedAt: true,
        itemTitleSnapshot: true,
        place: { select: { name: true, primaryImageUrl: true } },
      },
    }),
  ]);

  const prompts: RatePrompt[] = [];
  for (const row of eventRows) {
    if (!row.eventId) continue;
    prompts.push({
      statusId: row.id,
      ref: { eventId: row.eventId },
      kind: "event",
      title: row.event?.title ?? row.itemTitleSnapshot ?? "this event",
      imageUrl: row.event?.imageUrl ?? null,
      whenLabel: row.event ? formatWhen(row.event.startTime) : "recently",
    });
  }
  for (const row of placeRows) {
    if (!row.placeId) continue;
    prompts.push({
      statusId: row.id,
      ref: { placeId: row.placeId },
      kind: "place",
      title: row.place?.name ?? row.itemTitleSnapshot ?? "this spot",
      imageUrl: row.place?.primaryImageUrl ?? null,
      whenLabel: `saved ${formatWhen(row.updatedAt)}`,
    });
  }
  // Events first (time-bound memory fades fastest), cap total.
  return prompts.slice(0, MAX_PROMPTS);
}
