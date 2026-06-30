import { describe, it, expect } from "vitest";
import {
  denverWeekday,
  startOfWeekDenver,
  endOfWeekDenver,
} from "@/lib/time/denver";

// Denver: MST = UTC-7 (winter), MDT = UTC-6 (summer).
// 2026 DST: spring-forward Sun Mar 8, fall-back Sun Nov 1.

describe("denverWeekday", () => {
  it("returns 0=Sunday .. 6=Saturday for the Denver wall-clock day", () => {
    // 2026-07-15T18:00:00Z = 12:00 MDT Wednesday
    expect(denverWeekday(new Date("2026-07-15T18:00:00Z"))).toBe(3);
    // 2026-07-12T18:00:00Z = 12:00 MDT Sunday
    expect(denverWeekday(new Date("2026-07-12T18:00:00Z"))).toBe(0);
  });

  it("uses the Denver day even when UTC has already rolled to the next date", () => {
    // 2026-07-16T03:00:00Z = 21:00 MDT Wednesday (still Wed in Denver)
    expect(denverWeekday(new Date("2026-07-16T03:00:00Z"))).toBe(3);
  });
});

describe("startOfWeekDenver / endOfWeekDenver — summer MDT (Sunday-start)", () => {
  const now = new Date("2026-07-15T18:00:00Z"); // Wed Jul 15 noon MDT

  it("starts at Denver midnight of the preceding Sunday", () => {
    // Sun Jul 12 00:00 MDT = 06:00 UTC
    expect(startOfWeekDenver(now).toISOString()).toBe("2026-07-12T06:00:00.000Z");
  });

  it("ends at Denver 23:59:59.999 of the following Saturday", () => {
    // Sat Jul 18 23:59:59.999 MDT = Jul 19 05:59:59.999 UTC
    expect(endOfWeekDenver(now).toISOString()).toBe("2026-07-19T05:59:59.999Z");
  });
});

describe("week boundaries across DST spring-forward (week of Mar 8 2026)", () => {
  const now = new Date("2026-03-10T18:00:00Z"); // Tue Mar 10, after spring-forward

  it("week start is Denver midnight Sun Mar 8 in MST (UTC-7)", () => {
    // midnight Mar 8 is before the 2am transition => MST => 07:00 UTC
    expect(startOfWeekDenver(now).toISOString()).toBe("2026-03-08T07:00:00.000Z");
  });

  it("week end is Denver 23:59:59.999 Sat Mar 14 in MDT (UTC-6)", () => {
    expect(endOfWeekDenver(now).toISOString()).toBe("2026-03-15T05:59:59.999Z");
  });
});

describe("week boundaries across DST fall-back (week of Nov 1 2026)", () => {
  const now = new Date("2026-11-03T18:00:00Z"); // Tue Nov 3, after fall-back

  it("week start is Denver midnight Sun Nov 1 in MDT (UTC-6)", () => {
    // midnight Nov 1 is before the 2am fall-back => MDT => 06:00 UTC
    expect(startOfWeekDenver(now).toISOString()).toBe("2026-11-01T06:00:00.000Z");
  });

  it("week end is Denver 23:59:59.999 Sat Nov 7 in MST (UTC-7)", () => {
    expect(endOfWeekDenver(now).toISOString()).toBe("2026-11-08T06:59:59.999Z");
  });
});
