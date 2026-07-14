/**
 * Wave 6A — series attachment at ingest.
 *
 * The pure occurrence-identity math lives in ./occurrence.ts and the pure
 * recurrence rule in ./detect.ts, neither of which imports Prisma — the seed
 * scripts and the admin route need the identity math and should not have to drag a
 * database client in behind it.
 *
 * What this module adds is the one thing that genuinely needs the database:
 * detection has to see HISTORY. do303 serves a single near-term listing page, so
 * two occurrences of the same weekly never appear in one scrape batch, and
 * batch-local detection would never fire for the source it was written to catch.
 * So the batch's dates are merged with the dates already stored under the same
 * seriesKey.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { denverDateKey } from "@/lib/time/denver";
import { isSeriesV1Enabled } from "@/lib/ranking/flags";
import { deriveSeriesKey } from "./key";
import { isRecurringSeries } from "./detect";
import type { ScrapedEvent } from "@/lib/scrapers/types";

interface SeriesCandidate {
  title: string;
  venueName: string;
  category: ScrapedEvent["category"];
  cadence: string | null;
  /** Carried up from the occurrences — see EventSeries.tags. */
  tags: Set<string>;
  /** Denver day keys for this series — from this batch AND from history. */
  days: Set<string>;
}

/** Group a batch by derived series key. Pure. */
export function groupBySeriesKey(
  events: Array<
    Pick<ScrapedEvent, "title" | "venueName" | "startTime" | "category" | "tags"> & {
      cadence?: string;
    }
  >
): Map<string, SeriesCandidate> {
  const groups = new Map<string, SeriesCandidate>();
  for (const e of events) {
    const key = deriveSeriesKey(e.title, e.venueName);
    const g = groups.get(key) ?? {
      title: e.title,
      venueName: e.venueName,
      category: e.category,
      cadence: e.cadence ?? null,
      tags: new Set<string>(),
      days: new Set<string>(),
    };
    g.days.add(denverDateKey(e.startTime));
    for (const t of e.tags ?? []) g.tags.add(t);
    // A cadence stated on any occurrence speaks for the whole series.
    if (!g.cadence && e.cadence) g.cadence = e.cadence;
    groups.set(key, g);
  }
  return groups;
}

/**
 * Upsert the batch's series and return seriesKey → seriesId.
 *
 * Flag-gated: with SERIES_V1_ENABLED off this returns an empty map, so occurrences
 * link to nothing and the app behaves exactly as pre-Wave-6. Ingest never writes a
 * null seriesId over an existing link (see lib/scrapers/index.ts), so a flag-off
 * scrape does not destroy the graph it built.
 */
export async function attachSeries(
  cityId: string,
  events: ScrapedEvent[]
): Promise<Map<string, string>> {
  if (!isSeriesV1Enabled()) return new Map();

  const groups = groupBySeriesKey(events);
  if (groups.size === 0) return new Map();

  // Merge in the days already known for these keys. THIS is what makes a weekly
  // detectable at all: tonight's batch has this Tuesday's trivia, and the database
  // has last Tuesday's.
  const known = await prisma.event.findMany({
    where: { seriesKey: { in: [...groups.keys()] } },
    select: { seriesKey: true, occurrenceDate: true },
  });
  for (const row of known) {
    if (!row.seriesKey || !row.occurrenceDate) continue;
    groups
      .get(row.seriesKey)
      ?.days.add(row.occurrenceDate.toISOString().slice(0, 10));
  }

  const out = new Map<string, string>();
  for (const [seriesKey, g] of groups) {
    if (!isRecurringSeries(g.days, g.cadence)) continue;

    const row = await prisma.eventSeries.upsert({
      where: { seriesKey },
      update: {
        // Titles drift as sources reformat; keep the most recent. Identity is
        // seriesKey's job, so a drifting title can never re-point the series.
        title: g.title,
        venueName: g.venueName,
        category: g.category,
        tags: [...g.tags],
        ...(g.cadence ? { cadence: g.cadence } : {}),
      },
      create: {
        cityId,
        seriesKey,
        title: g.title,
        venueName: g.venueName,
        category: g.category,
        cadence: g.cadence,
        tags: [...g.tags],
      },
      select: { id: true },
    });
    out.set(seriesKey, row.id);
  }

  // Adopt occurrences already in the database that belong to a series we just
  // asserted. Without this, only tonight's rows get linked — and last Tuesday's
  // trivia, the very evidence that proved the series exists, stays orphaned, so
  // both the regulars rail and the DONE-suppression miss it.
  for (const [seriesKey, seriesId] of out) {
    await prisma.event.updateMany({
      where: { seriesKey, seriesId: null },
      data: { seriesId },
    });
  }

  return out;
}
