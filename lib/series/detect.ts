/**
 * Wave 6A — what counts as a recurring series. PURE.
 *
 * Two ways to get this wrong, and the first version got both:
 *
 * 1. **Looking only at one scrape batch.** do303 serves a single near-term
 *    listing page, so two occurrences of the same weekly trivia never appear in
 *    one batch. Batch-local detection therefore never fires for the very source
 *    it was written to catch. Detection must see HISTORY — hence Event.seriesKey
 *    is stored, and the caller merges known dates from the database.
 *
 * 2. **Treating bare repetition as recurrence.** Red Rocks lists months ahead, so
 *    a two-night artist run is the same title at the same venue on two dates —
 *    identical, to a naive rule, to a weekly. Asserting a series there would make
 *    a one-off concert run into a "regular": rating night one would suppress night
 *    two from discovery and park a rock show on the "On again this week" rail.
 *
 * So repetition alone is not evidence. A *cadence* is (the source said so), and so
 * is repetition at a plausible RECURRENCE INTERVAL — a week, a fortnight, a month.
 * Consecutive nights are a run, not a rhythm.
 */

/** A gap shorter than this is a multi-night run, not a recurrence. */
export const MIN_RECURRENCE_GAP_DAYS = 6;

const DAY_MS = 86_400_000;

/**
 * Does this set of occurrence days look like a rhythm rather than a run?
 *
 * Judged on the SMALLEST gap: one pair of consecutive nights is enough to reveal a
 * run, and a genuine weekly never has two occurrences a day apart.
 */
export function hasRecurrenceRhythm(
  dayKeys: Iterable<string>,
  minGapDays: number = MIN_RECURRENCE_GAP_DAYS
): boolean {
  const days = [...new Set(dayKeys)]
    .map((k) => new Date(`${k}T00:00:00.000Z`).getTime())
    .sort((a, b) => a - b);

  if (days.length < 2) return false;

  let smallestGap = Infinity;
  for (let i = 1; i < days.length; i++) {
    smallestGap = Math.min(smallestGap, (days[i] - days[i - 1]) / DAY_MS);
  }
  return smallestGap >= minGapDays;
}

/**
 * The verdict for one candidate series.
 *
 * `cadence` short-circuits everything: if Westword says "Every Sunday", that is a
 * statement of recurrence from the source and no amount of date arithmetic beats
 * it. Otherwise the dates have to show a rhythm.
 */
export function isRecurringSeries(
  dayKeys: Iterable<string>,
  cadence: string | null | undefined
): boolean {
  if (cadence) return true;
  return hasRecurrenceRhythm(dayKeys);
}
