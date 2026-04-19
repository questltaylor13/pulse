import type { EventRegion } from "@prisma/client";

export interface DriveTime {
  minutes: number;
  driveNote: string;
  region: EventRegion;
  isDayTrip: boolean;
  isWeekendTrip: boolean;
}

/**
 * Static lookup of approximate drive times from downtown Denver for every
 * town Pulse surfaces outside the metro. Intentionally not Google Maps —
 * precision isn't worth the API call or the cache headache. Values are
 * honest averages; the driveNote carries the nuance ("can be bad in ski
 * traffic").
 *
 * Canonical source for the regional expansion. `OUTSIDE_DENVER_REGIONS`
 * in `lib/queries/events.ts` MUST be a subset of these keys — a runtime
 * assertion in `metadata.ts` enforces that invariant.
 *
 * Extend as needed when a new scraper is built for a town not listed here.
 */
export const DRIVE_TIMES_FROM_DENVER: Readonly<Record<string, DriveTime>> = {
  // Front Range hubs (Tier 1)
  Boulder: {
    minutes: 45,
    driveNote: "Easy drive up US-36",
    region: "FRONT_RANGE",
    isDayTrip: true,
    isWeekendTrip: false,
  },
  Golden: {
    minutes: 25,
    driveNote: "Quick hop west",
    region: "FRONT_RANGE",
    isDayTrip: true,
    isWeekendTrip: false,
  },
  "Fort Collins": {
    minutes: 75,
    driveNote: "Straight shot up I-25",
    region: "FRONT_RANGE",
    isDayTrip: true,
    isWeekendTrip: false,
  },
  "Colorado Springs": {
    minutes: 75,
    driveNote: "Down I-25, easy drive",
    region: "FRONT_RANGE",
    isDayTrip: true,
    isWeekendTrip: false,
  },
  Morrison: {
    minutes: 30,
    driveNote: "Quick hop west — Red Rocks territory",
    region: "FRONT_RANGE",
    isDayTrip: true,
    isWeekendTrip: false,
  },

  // Mountain gateway (Tier 2)
  Evergreen: {
    minutes: 45,
    driveNote: "Mountain vibes, close in",
    region: "MOUNTAIN_GATEWAY",
    isDayTrip: true,
    isWeekendTrip: false,
  },
  "Estes Park": {
    minutes: 90,
    driveNote: "Scenic — allow extra time summer weekends",
    region: "MOUNTAIN_GATEWAY",
    isDayTrip: true,
    isWeekendTrip: false,
  },
  Nederland: {
    minutes: 55,
    driveNote: "Canyon drive from Boulder",
    region: "MOUNTAIN_GATEWAY",
    isDayTrip: true,
    isWeekendTrip: false,
  },
  "Idaho Springs": {
    minutes: 45,
    driveNote: "I-70 west, watch weekend traffic",
    region: "MOUNTAIN_GATEWAY",
    isDayTrip: true,
    isWeekendTrip: false,
  },
  Georgetown: {
    minutes: 55,
    driveNote: "I-70 west, worth the stop",
    region: "MOUNTAIN_GATEWAY",
    isDayTrip: true,
    isWeekendTrip: false,
  },
  "Winter Park": {
    minutes: 90,
    driveNote: "Over Berthoud Pass, winter driving in season",
    region: "MOUNTAIN_GATEWAY",
    isDayTrip: true,
    isWeekendTrip: false,
  },

  // Mountain destinations (Tier 3)
  Breckenridge: {
    minutes: 105,
    driveNote: "I-70 can be brutal on ski weekends",
    region: "MOUNTAIN_DEST",
    isDayTrip: false,
    isWeekendTrip: true,
  },
  Keystone: {
    minutes: 100,
    driveNote: "I-70, same ski traffic caveat",
    region: "MOUNTAIN_DEST",
    isDayTrip: false,
    isWeekendTrip: true,
  },
  Vail: {
    minutes: 115,
    driveNote: "Worth the drive, watch for I-70 closures",
    region: "MOUNTAIN_DEST",
    isDayTrip: false,
    isWeekendTrip: true,
  },
  "Beaver Creek": {
    minutes: 125,
    driveNote: "Just past Vail",
    region: "MOUNTAIN_DEST",
    isDayTrip: false,
    isWeekendTrip: true,
  },
  "Steamboat Springs": {
    minutes: 180,
    driveNote: "Worth it for a weekend, not a day",
    region: "MOUNTAIN_DEST",
    isDayTrip: false,
    isWeekendTrip: true,
  },
  "Crested Butte": {
    minutes: 240,
    driveNote: "Full weekend commitment — remote and magical",
    region: "MOUNTAIN_DEST",
    isDayTrip: false,
    isWeekendTrip: true,
  },
  Aspen: {
    minutes: 210,
    driveNote: "Long drive, worth it for the right event",
    region: "MOUNTAIN_DEST",
    isDayTrip: false,
    isWeekendTrip: true,
  },
  Telluride: {
    minutes: 360,
    driveNote: "Basically a flight — plan a real weekend",
    region: "MOUNTAIN_DEST",
    isDayTrip: false,
    isWeekendTrip: true,
  },
  Palisade: {
    minutes: 240,
    driveNote: "Peach country — long but worth it at harvest",
    region: "MOUNTAIN_DEST",
    isDayTrip: false,
    isWeekendTrip: true,
  },
};

/**
 * Case-insensitive lookup. Returns null if town isn't in the table — caller
 * should fall back to `region: DENVER_METRO` defaults via deriveRegionalFields().
 */
export function lookupDriveTime(town: string | null | undefined): DriveTime | null {
  if (!town) return null;
  const direct = DRIVE_TIMES_FROM_DENVER[town];
  if (direct) return direct;
  const lowered = town.toLowerCase();
  for (const [name, dt] of Object.entries(DRIVE_TIMES_FROM_DENVER)) {
    if (name.toLowerCase() === lowered) return dt;
  }
  return null;
}
