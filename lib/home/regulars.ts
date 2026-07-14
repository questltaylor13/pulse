/**
 * Wave 6A — "On again this week".
 *
 * DONE means DISCOVERED, not never-again. A rated series is pulled out of the
 * discovery pool (you have found it; it is not news), but a weekly you loved
 * vanishing from the app entirely is the opposite of what a taste engine should
 * do. So it gets its own surface: the next occurrence of each series you ranked
 * LIKED, ordered by how highly you ranked it.
 *
 * Beli's model, essentially — your ranked list is the record, and you return to
 * it deliberately rather than by stumbling across it in a discovery feed.
 *
 * Pure: takes ranked series + upcoming occurrences, returns what to render. The
 * queries are the caller's job.
 */

export interface RankedSeries {
  seriesId: string;
  title: string;
  venueName: string;
  cadence: string | null;
  /** The user's rank within its category. Lower is better. */
  rank: number;
}

export interface SeriesOccurrence {
  eventId: string;
  seriesId: string;
  startTime: Date;
  imageUrl: string | null;
}

export interface RegularItem {
  eventId: string;
  seriesId: string;
  title: string;
  venueName: string;
  cadence: string | null;
  rank: number;
  startTime: Date;
  imageUrl: string | null;
}

/** Occurrences beyond this are "someday", not "on again this week". */
export const REGULARS_HORIZON_DAYS = 7;

export function selectRegulars(
  ranked: RankedSeries[],
  occurrences: SeriesOccurrence[],
  now: Date = new Date(),
  horizonDays: number = REGULARS_HORIZON_DAYS
): RegularItem[] {
  const horizon = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  const bySeries = new Map<string, RankedSeries>(ranked.map((r) => [r.seriesId, r]));

  // The NEXT occurrence per series — not every occurrence. A series that runs
  // twice this week should appear once, as the soonest one; listing both would
  // make a heavy-cadence series crowd out everything else on the rail.
  const next = new Map<string, SeriesOccurrence>();
  for (const occ of occurrences) {
    if (!bySeries.has(occ.seriesId)) continue;
    if (occ.startTime < now || occ.startTime > horizon) continue;
    const incumbent = next.get(occ.seriesId);
    if (!incumbent || occ.startTime < incumbent.startTime) {
      next.set(occ.seriesId, occ);
    }
  }

  return [...next.values()]
    .map((occ) => {
      const series = bySeries.get(occ.seriesId)!;
      return {
        eventId: occ.eventId,
        seriesId: occ.seriesId,
        title: series.title,
        venueName: series.venueName,
        cadence: series.cadence,
        rank: series.rank,
        startTime: occ.startTime,
        imageUrl: occ.imageUrl,
      };
    })
    // Your favourite first. Rank, not recency: the rail is about YOUR taste
    // ordering, and sorting by soonest would bury your #1 behind whatever
    // happens to fall on a Monday.
    .sort((a, b) => a.rank - b.rank || a.startTime.getTime() - b.startTime.getTime());
}
