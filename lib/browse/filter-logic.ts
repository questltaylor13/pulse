/**
 * Pure browse-filter predicates (Wave 2). Kept side-effect-free so they're
 * unit-testable; the DB wiring lives in ./fetch-browse.ts.
 */

/**
 * Does an event at the given Denver-local hour fall in any of the selected
 * time-of-day buckets? Empty selection = no constraint (true). Used as a
 * post-fetch filter because Prisma can't filter by hour-of-day without raw SQL.
 *
 *   morning     05:00–11:59
 *   afternoon   12:00–16:59
 *   evening     17:00–21:59
 *   late-night  22:00–04:59
 */
export function matchesTimeOfDay(hour: number, selected: string[]): boolean {
  if (!selected.length) return true;
  return selected.some((slot) => {
    switch (slot) {
      case "morning":
        return hour >= 5 && hour < 12;
      case "afternoon":
        return hour >= 12 && hour < 17;
      case "evening":
        return hour >= 17 && hour < 22;
      case "late-night":
        return hour >= 22 || hour < 5;
      default:
        return false;
    }
  });
}
