/**
 * Wave 6A — occurrence identity at ingest.
 *
 * Two bugs are closed here, and they are easy to conflate.
 *
 * 1. NULL externalId defeated the unique index. `externalId` was nullable and
 *    the index was (externalId, source). Postgres treats NULLs as DISTINCT in a
 *    unique index, so the constraint could not stop duplicate NULL rows — every
 *    permalink-less red-rocks event was re-created on every nightly run, and the
 *    database was powerless to notice. The fix is to stop having NULLs, so the
 *    invariant is enforced by a constraint rather than by application code that
 *    someone has to remember to keep correct.
 *
 * 2. startTime was payload, not identity. That let Westword's series-URL row
 *    mutate its startTime forward every night, dragging a three-week-old rating
 *    onto this week's edition and then suppressing the event from that user's
 *    feed forever.
 *
 * The occurrence key is (source, externalId, occurrenceDate) — the DAY, not the
 * instant. Sources wobble the reported start time; keying on the exact timestamp
 * would mint a fresh duplicate every night, which is bug 1 wearing a hat.
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { denverDateKey } from "@/lib/time/denver";
import { isSeriesV1Enabled } from "@/lib/ranking/flags";
import { deriveSeriesKey } from "./key";
import type { ScrapedEvent } from "@/lib/scrapers/types";

/**
 * The occurrence's stable id, guaranteed non-empty.
 *
 * When a source supplies its own id we keep it — even Westword's series-stable
 * one, because `occurrenceDate` supplies the per-night dimension. When a source
 * supplies nothing, we synthesize from the series identity, which is stable
 * across scrapes in a way that a row's cuid never was.
 */
export function resolveExternalId(event: ScrapedEvent, seriesKey: string): string {
  if (event.externalId) return event.externalId;
  const material = `${event.source}|${seriesKey}`;
  return `syn_${createHash("sha256").update(material).digest("hex").slice(0, 16)}`;
}

/**
 * The Denver calendar day of an instant, as a UTC-midnight Date — the shape
 * Postgres `DATE` round-trips through Prisma without timezone surprises.
 */
export function occurrenceDateOf(startTime: Date): Date {
  return new Date(`${denverDateKey(startTime)}T00:00:00.000Z`);
}

/**
 * Which series exist in this batch, and what evidence says so.
 *
 * A series is asserted on one of two grounds, and only these two:
 *
 *  - the source told us ("Every Sunday" — Westword parses this already and, until
 *    now, threw it away), or
 *  - the batch itself contains the same seriesKey on two DIFFERENT nights, which
 *    is what catches do303's per-occurrence rows, since they carry no recurrence
 *    hint at all.
 *
 * Deliberately NOT asserted from a single occurrence: one Tuesday trivia is
 * indistinguishable from a one-off pub quiz, and inventing a series for every
 * event would make the concept meaningless.
 *
 * Pure — takes rows, returns decisions. The DB write is the caller's job.
 */
export function planSeries(
  events: Array<Pick<ScrapedEvent, "title" | "venueName" | "startTime" | "category"> & { cadence?: string }>
): Map<string, { title: string; venueName: string; category: ScrapedEvent["category"]; cadence: string | null }> {
  const groups = new Map<
    string,
    { title: string; venueName: string; category: ScrapedEvent["category"]; cadence: string | null; dates: Set<string> }
  >();

  for (const e of events) {
    const key = deriveSeriesKey(e.title, e.venueName);
    const g = groups.get(key) ?? {
      title: e.title,
      venueName: e.venueName,
      category: e.category,
      cadence: e.cadence ?? null,
      dates: new Set<string>(),
    };
    g.dates.add(denverDateKey(e.startTime));
    // A cadence from any occurrence speaks for the series.
    if (!g.cadence && e.cadence) g.cadence = e.cadence;
    groups.set(key, g);
  }

  const planned = new Map<
    string,
    { title: string; venueName: string; category: ScrapedEvent["category"]; cadence: string | null }
  >();
  for (const [key, g] of groups) {
    const isSeries = Boolean(g.cadence) || g.dates.size >= 2;
    if (!isSeries) continue;
    planned.set(key, {
      title: g.title,
      venueName: g.venueName,
      category: g.category,
      cadence: g.cadence,
    });
  }
  return planned;
}

/**
 * Upsert the batch's series and return seriesKey → seriesId.
 *
 * Flag-gated: with SERIES_V1_ENABLED off this returns an empty map, so every
 * occurrence links to nothing and the app behaves exactly as pre-Wave-6.
 */
export async function attachSeries(
  cityId: string,
  events: ScrapedEvent[]
): Promise<Map<string, string>> {
  if (!isSeriesV1Enabled()) return new Map();

  const planned = planSeries(events);
  const out = new Map<string, string>();

  for (const [seriesKey, s] of planned) {
    const row = await prisma.eventSeries.upsert({
      where: { seriesKey },
      update: {
        // Titles drift as sources reformat; keep the most recent one, but never
        // let a drifting title change the identity — that is seriesKey's job.
        title: s.title,
        venueName: s.venueName,
        category: s.category,
        ...(s.cadence ? { cadence: s.cadence } : {}),
      },
      create: {
        cityId,
        seriesKey,
        title: s.title,
        venueName: s.venueName,
        category: s.category,
        cadence: s.cadence,
      },
      select: { id: true },
    });
    out.set(seriesKey, row.id);
  }

  return out;
}
