/**
 * Wave 6A — promote an occurrence ref to its series.
 *
 * Rating one Tuesday's trivia should rate THE trivia, not the particular row
 * that happens to represent this week. So the write path resolves an event that
 * belongs to a series into a series ref before it touches UserItemStatus or
 * UserRankedEntry.
 *
 * The promotion is deliberately SERVER-SIDE. The UI keeps sending `{ eventId }`
 * exactly as it always has — a client that has never heard of series still rates
 * them correctly, and there is no way for a stale client to write a rating at the
 * wrong grain.
 *
 * Flag-gated: with SERIES_V1_ENABLED off, every ref passes through untouched and
 * ratings attach to the event row exactly as pre-Wave-6.
 */

import { prisma } from "@/lib/prisma";
import { isSeriesV1Enabled } from "@/lib/ranking/flags";

/** The series this event belongs to, or null for a one-off. */
export async function seriesIdForEvent(eventId: string): Promise<string | null> {
  if (!isSeriesV1Enabled()) return null;
  try {
    const row = await prisma.event.findUnique({
      where: { id: eventId },
      select: { seriesId: true },
    });
    return row?.seriesId ?? null;
  } catch (err) {
    // A lookup failure must not fail the rating. Falling back to the event ref
    // records an honest rating at the wrong grain, which is strictly better than
    // recording none at all.
    console.warn("[series.seriesIdForEvent] failed:", err);
    return null;
  }
}
