import type { Prisma } from "@prisma/client";
import { endOfTodayDenver } from "@/lib/time/denver";

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
