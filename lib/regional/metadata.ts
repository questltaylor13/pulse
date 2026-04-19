import { DRIVE_TIMES_FROM_DENVER, lookupDriveTime } from "./drive-times";
import { OUTSIDE_DENVER_REGIONS } from "../queries/events";
import type { EventRegion } from "@prisma/client";

export interface RegionalFields {
  region: EventRegion;
  townName: string | null;
  isDayTrip: boolean;
  isWeekendTrip: boolean;
  driveTimeFromDenver: number | null;
  driveNote: string | null;
}

/**
 * Derive regional metadata from a free-text town/neighborhood string.
 * Shared by the Phase 0 backfill and Phase 1–3 regional scrapers so there
 * is exactly one town → fields mapping in the codebase.
 *
 * Unknown towns default to DENVER_METRO with null extras.
 */
export function deriveRegionalFields(
  town: string | null | undefined
): RegionalFields {
  const dt = lookupDriveTime(town);
  if (!dt) {
    return {
      region: "DENVER_METRO",
      townName: null,
      isDayTrip: false,
      isWeekendTrip: false,
      driveTimeFromDenver: null,
      driveNote: null,
    };
  }
  return {
    region: dt.region,
    townName: town ?? null,
    isDayTrip: dt.isDayTrip,
    isWeekendTrip: dt.isWeekendTrip,
    driveTimeFromDenver: dt.minutes,
    driveNote: dt.driveNote,
  };
}

// Invariant: every member of the legacy OUTSIDE_DENVER_REGIONS whitelist
// must also exist in the canonical DRIVE_TIMES_FROM_DENVER table. Without
// this, the backfill silently misclassifies a row and the home feed's
// neighborhood-fallback path keeps surfacing rows that the region-based
// path can't. Runs once per process on module load.
(function assertOutsideDenverRegionsAreKnown(): void {
  const keys = new Set(Object.keys(DRIVE_TIMES_FROM_DENVER).map((k) => k.toLowerCase()));
  const missing = OUTSIDE_DENVER_REGIONS.filter((r) => !keys.has(r.toLowerCase()));
  if (missing.length > 0) {
    throw new Error(
      `lib/regional/drive-times.ts is missing entries that appear in OUTSIDE_DENVER_REGIONS: ${missing.join(", ")}. Add them to DRIVE_TIMES_FROM_DENVER.`
    );
  }
})();
