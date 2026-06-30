import { describe, it, expect } from "vitest";
import { parseDateFilter, resolveDateFilterRange } from "@/lib/queries/events";
import { denverDateKey } from "@/lib/time/denver";

const NOW = new Date("2026-07-15T18:00:00Z"); // Wed Jul 15 noon MDT

describe("parseDateFilter — multi-day tokens", () => {
  it("parses this-week / next-week / next-7", () => {
    expect(parseDateFilter("this-week", NOW)).toEqual({ kind: "thisWeek" });
    expect(parseDateFilter("next-week", NOW)).toEqual({ kind: "nextWeek" });
    expect(parseDateFilter("next-7", NOW)).toEqual({ kind: "next7" });
  });

  it("parses an explicit YYYY-MM-DD..YYYY-MM-DD range", () => {
    const f = parseDateFilter("2026-07-20..2026-07-25", NOW);
    expect(f?.kind).toBe("range");
    if (f?.kind === "range") {
      expect(denverDateKey(f.start)).toBe("2026-07-20");
      expect(denverDateKey(f.end)).toBe("2026-07-25");
    }
  });

  it("rejects an inverted or malformed range", () => {
    expect(parseDateFilter("2026-07-25..2026-07-20", NOW)).toBeNull(); // end < start
    expect(parseDateFilter("2026-07-20..garbage", NOW)).toBeNull();
  });

  it("still parses existing tokens and rejects the past", () => {
    expect(parseDateFilter("tomorrow", NOW)).toEqual({ kind: "tomorrow" });
    expect(parseDateFilter("weekend", NOW)).toEqual({ kind: "weekend" });
    expect(parseDateFilter("2020-01-01", NOW)).toBeNull();
  });
});

describe("resolveDateFilterRange — multi-day kinds (summer MDT)", () => {
  it("thisWeek spans today 00:00 Denver through end of Saturday", () => {
    const { start, end } = resolveDateFilterRange({ kind: "thisWeek" }, NOW);
    expect(start.toISOString()).toBe("2026-07-15T06:00:00.000Z"); // Wed Jul 15 00:00 MDT
    expect(end.toISOString()).toBe("2026-07-19T05:59:59.999Z"); // Sat Jul 18 23:59 MDT
  });

  it("nextWeek spans the full following Sun..Sat", () => {
    const { start, end } = resolveDateFilterRange({ kind: "nextWeek" }, NOW);
    expect(start.toISOString()).toBe("2026-07-19T06:00:00.000Z"); // Sun Jul 19 00:00 MDT
    expect(end.toISOString()).toBe("2026-07-26T05:59:59.999Z"); // Sat Jul 25 23:59 MDT
  });

  it("next7 spans today through 6 days out (7-day window)", () => {
    const { start, end } = resolveDateFilterRange({ kind: "next7" }, NOW);
    expect(start.toISOString()).toBe("2026-07-15T06:00:00.000Z"); // Wed Jul 15 00:00 MDT
    expect(end.toISOString()).toBe("2026-07-22T05:59:59.999Z"); // Tue Jul 21 23:59 MDT
  });

  it("range spans full Denver days from start to end", () => {
    const f = parseDateFilter("2026-07-20..2026-07-25", NOW)!;
    const { start, end } = resolveDateFilterRange(f, NOW);
    expect(start.toISOString()).toBe("2026-07-20T06:00:00.000Z"); // Jul 20 00:00 MDT
    expect(end.toISOString()).toBe("2026-07-26T05:59:59.999Z"); // Jul 25 23:59 MDT
  });
});
