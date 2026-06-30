import type { Prisma } from "@prisma/client";
import {
  addDaysDenver,
  denverDateKey,
  endOfTodayDenver,
  endOfWeekDenver,
  startOfTodayDenver,
  startOfWeekDenver,
} from "@/lib/time/denver";

/**
 * Where clause that excludes stale (past, non-recurring, archived) events
 * from any home-feed query. Used by all 4 Events-tab section queries.
 */
export function activeEventsWhere(now: Date = new Date()): Prisma.EventWhereInput {
  return {
    isArchived: false,
    status: "PUBLISHED",
    OR: [
      { isRecurring: true },
      { startTime: { gte: now } },
    ],
  };
}

/**
 * Denver nearby-region whitelist for the "Outside the city" section.
 *
 * Legacy path. Before PRD 2 Phase 0 this was the *only* way to classify
 * non-Denver content. After Phase 0 the canonical source is the
 * `Event.region` / `Place.region` enum populated from
 * `lib/regional/drive-times.ts`. This array is retained as a fallback so
 * rows that predate the backfill still surface correctly.
 *
 * When adding a town here, also add it to `DRIVE_TIMES_FROM_DENVER` in
 * `lib/regional/drive-times.ts` — a module-load assertion in
 * `lib/regional/metadata.ts` enforces that invariant.
 */
export const OUTSIDE_DENVER_REGIONS = [
  "Idaho Springs",
  "Morrison",
  "Boulder",
  "Golden",
  "Evergreen",
  "Estes Park",
  "Fort Collins",
  "Colorado Springs",
  "Palisade",
  "Breckenridge",
  "Vail",
  "Aspen",
];

const OUTSIDE_DENVER_REGIONS_ENUM: Prisma.EnumEventRegionFilter = {
  in: ["FRONT_RANGE", "MOUNTAIN_GATEWAY", "MOUNTAIN_DEST"],
};

/**
 * PRD 2 §5.3 — filter-chip scope.
 *   "near" (default, per PRD Open Question #1 answered ON) — Denver metro
 *          + Front Range + Mountain Gateway. Excludes weekend-trip mountain
 *          destinations so the main feed stays impulse-friendly.
 *   "all"  — everything including Mountain Destinations. For when the user
 *          wants to explore further.
 */
export type RegionalScope = "near" | "all";

export function regionalScopeWhere(scope: RegionalScope): Prisma.EventWhereInput {
  if (scope === "all") return {};
  return {
    region: { in: ["DENVER_METRO", "FRONT_RANGE", "MOUNTAIN_GATEWAY"] },
  };
}

export function regionalScopePlaceWhere(
  scope: RegionalScope
): Prisma.PlaceWhereInput {
  if (scope === "all") return {};
  return {
    region: { in: ["DENVER_METRO", "FRONT_RANGE", "MOUNTAIN_GATEWAY"] },
  };
}

export function outsideDenverWhere(): Prisma.EventWhereInput {
  return {
    OR: [
      { region: OUTSIDE_DENVER_REGIONS_ENUM },
      {
        AND: [
          { region: "DENVER_METRO" },
          { neighborhood: { in: OUTSIDE_DENVER_REGIONS } },
        ],
      },
    ],
  };
}

export function outsideDenverPlaceWhere(): Prisma.PlaceWhereInput {
  return {
    OR: [
      { region: OUTSIDE_DENVER_REGIONS_ENUM },
      {
        AND: [
          { region: "DENVER_METRO" },
          { neighborhood: { in: OUTSIDE_DENVER_REGIONS } },
        ],
      },
    ],
  };
}

/**
 * Friday 12:00 local → Sunday 23:59 local for the upcoming (or current) weekend.
 * Denver is UTC-6/-7 but we operate in server UTC; the window is generous
 * enough that DST drift is immaterial.
 */
export function upcomingWeekendRange(now: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(now);
  const dow = d.getDay(); // 0=Sun, 5=Fri, 6=Sat
  let daysUntilFri = (5 - dow + 7) % 7;
  // If today is Fri/Sat/Sun, use the current weekend (daysUntilFri stays 0 for Fri, negative otherwise).
  if (dow === 5) daysUntilFri = 0;
  if (dow === 6) daysUntilFri = -1;
  if (dow === 0) daysUntilFri = -2;
  const start = new Date(d);
  start.setDate(d.getDate() + daysUntilFri);
  start.setHours(12, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 2); // Sunday
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function endOfTodayLocal(now: Date = new Date()): Date {
  return endOfTodayDenver(now);
}

/**
 * User-selectable date filter for the Events tab.
 *   "tomorrow" / "weekend" — single-day(ish) preset chips.
 *   "thisWeek" / "nextWeek" / "next7" — multi-day ranges → rendered as a
 *      day-grouped agenda rather than one horizontal rail.
 *   "specific" — user-picked calendar date in Denver wall-clock.
 *   "range" — an explicit inclusive start..end span (Denver wall-clock days).
 * "today" is represented as `null` (the implicit default — no URL param).
 */
export type SelectedDateFilter =
  | { kind: "tomorrow" }
  | { kind: "weekend" }
  | { kind: "thisWeek" }
  | { kind: "nextWeek" }
  | { kind: "next7" }
  | { kind: "specific"; date: Date }
  | { kind: "range"; start: Date; end: Date };

/**
 * Multi-day filters render as a vertical day-grouped agenda; single-day and
 * weekend filters render as the existing single horizontal rail.
 */
export function isAgendaFilter(filter: SelectedDateFilter): boolean {
  return (
    filter.kind === "thisWeek" ||
    filter.kind === "nextWeek" ||
    filter.kind === "next7" ||
    filter.kind === "range"
  );
}

/**
 * Full-Denver-day window for an arbitrary calendar date.
 * `date` is interpreted as the Denver wall-clock day it falls on.
 */
export function denverDateRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfTodayDenver(date),
    end: endOfTodayDenver(date),
  };
}

/** Parse "YYYY-MM-DD" to a Date anchored at noon UTC (avoids day-flip in any tz). */
function parseIsoDateNoon(raw: string | undefined): Date | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Parse the `date` URL param into a SelectedDateFilter, or null for the
 * implicit "today" default. Invalid / fully-past values return null.
 *
 * Accepted forms:
 *   - "tomorrow" / "weekend"
 *   - "this-week" / "next-week" / "next-7"
 *   - "YYYY-MM-DD" (single calendar date, Denver wall-clock)
 *   - "YYYY-MM-DD..YYYY-MM-DD" (inclusive range, Denver wall-clock days)
 */
export function parseDateFilter(
  raw: string | undefined,
  now: Date = new Date(),
): SelectedDateFilter | null {
  if (!raw) return null;
  if (raw === "tomorrow") return { kind: "tomorrow" };
  if (raw === "weekend") return { kind: "weekend" };
  if (raw === "this-week") return { kind: "thisWeek" };
  if (raw === "next-week") return { kind: "nextWeek" };
  if (raw === "next-7") return { kind: "next7" };

  // Explicit inclusive range.
  if (raw.includes("..")) {
    const [rawStart, rawEnd] = raw.split("..");
    const start = parseIsoDateNoon(rawStart);
    const end = parseIsoDateNoon(rawEnd);
    if (!start || !end) return null;
    if (denverDateKey(end) < denverDateKey(start)) return null; // inverted
    if (denverDateKey(end) < denverDateKey(now)) return null; // entirely past
    return { kind: "range", start, end };
  }

  const date = parseIsoDateNoon(raw);
  if (!date) return null;
  // Reject past single dates (the single-day filter only goes forward).
  if (denverDateKey(date) < denverDateKey(now)) return null;
  return { kind: "specific", date };
}

/**
 * Resolve a SelectedDateFilter to a concrete { start, end } window in UTC.
 * Reuses the DST-correct Denver helpers so every window honors Denver
 * wall-clock day boundaries (incl. across spring-forward / fall-back).
 */
export function resolveDateFilterRange(
  filter: SelectedDateFilter,
  now: Date = new Date(),
): { start: Date; end: Date } {
  switch (filter.kind) {
    case "weekend":
      return upcomingWeekendRange(now);
    case "tomorrow":
      return denverDateRange(addDaysDenver(now, 1));
    case "thisWeek":
      // Today through the end of the current week (forward-only).
      return { start: startOfTodayDenver(now), end: endOfWeekDenver(now) };
    case "nextWeek": {
      const inNextWeek = addDaysDenver(now, 7);
      return { start: startOfWeekDenver(inNextWeek), end: endOfWeekDenver(inNextWeek) };
    }
    case "next7":
      return {
        start: startOfTodayDenver(now),
        end: endOfTodayDenver(addDaysDenver(now, 6)),
      };
    case "range":
      return { start: startOfTodayDenver(filter.start), end: endOfTodayDenver(filter.end) };
    case "specific":
      return denverDateRange(filter.date);
  }
}
