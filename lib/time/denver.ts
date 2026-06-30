const DENVER_TZ = "America/Denver";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DENVER_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DENVER_TZ,
  hour: "numeric",
  minute: "2-digit",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DENVER_TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
});

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DENVER_TZ,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false,
});

function getDenverParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = partsFormatter.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  let hour = get("hour");
  if (hour === 24) hour = 0;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  };
}

// Given a wall-clock date in America/Denver, return the UTC Date that represents it.
function denverWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
): Date {
  // Strategy: treat target as if it were UTC, then compute Denver's UTC offset at
  // that instant and add it back. ms is handled separately so the offset math
  // stays on second boundaries (Intl format only exposes integer seconds).
  const asIfUtcNoMs = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const parts = getDenverParts(new Date(asIfUtcNoMs));
  const denverAsUtcNoMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  );
  const offsetMs = asIfUtcNoMs - denverAsUtcNoMs; // how far UTC is ahead of Denver at that instant
  return new Date(asIfUtcNoMs + offsetMs + ms);
}

export function denverDateKey(date: Date): string {
  return dateKeyFormatter.format(date);
}

export function endOfTodayDenver(now: Date = new Date()): Date {
  const { year, month, day } = getDenverParts(now);
  return denverWallClockToUtc(year, month, day, 23, 59, 59, 999);
}

export function startOfTodayDenver(now: Date = new Date()): Date {
  const { year, month, day } = getDenverParts(now);
  return denverWallClockToUtc(year, month, day, 0, 0, 0, 0);
}

export function formatTimeDenver(date: Date): string {
  return timeFormatter.format(date);
}

export function formatWeekdayDateDenver(date: Date): string {
  return weekdayFormatter.format(date);
}

export function isSameDenverDay(a: Date, b: Date): boolean {
  return denverDateKey(a) === denverDateKey(b);
}

export function addDaysDenver(date: Date, days: number): Date {
  const { year, month, day, hour, minute, second } = getDenverParts(date);
  return denverWallClockToUtc(year, month, day + days, hour, minute, second, 0);
}

/**
 * Day of week (0=Sunday .. 6=Saturday) for the Denver wall-clock day that
 * `date` falls on, regardless of the server timezone.
 */
export function denverWeekday(date: Date): number {
  const { year, month, day } = getDenverParts(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Denver midnight (00:00:00.000) of the first day of the week containing
 * `now`. `weekStartsOn` defaults to 0 (Sunday). DST-correct — builds on the
 * Denver wall-clock helpers rather than naive getDay()/setDate.
 */
export function startOfWeekDenver(now: Date = new Date(), weekStartsOn = 0): Date {
  const diff = (denverWeekday(now) - weekStartsOn + 7) % 7;
  return addDaysDenver(startOfTodayDenver(now), -diff);
}

/**
 * Denver 23:59:59.999 of the last day of the week containing `now`.
 * `weekStartsOn` defaults to 0 (Sunday). DST-correct.
 */
export function endOfWeekDenver(now: Date = new Date(), weekStartsOn = 0): Date {
  const start = startOfWeekDenver(now, weekStartsOn);
  return endOfTodayDenver(addDaysDenver(start, 6));
}
