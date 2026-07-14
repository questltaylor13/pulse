import { describe, it, expect } from "vitest";
import { hasRecurrenceRhythm, isRecurringSeries } from "@/lib/series/detect";

describe("hasRecurrenceRhythm", () => {
  it("accepts a weekly", () => {
    expect(hasRecurrenceRhythm(["2026-07-14", "2026-07-21", "2026-07-28"])).toBe(true);
  });

  it("accepts a fortnightly and a monthly", () => {
    expect(hasRecurrenceRhythm(["2026-07-01", "2026-07-15"])).toBe(true);
    expect(hasRecurrenceRhythm(["2026-07-04", "2026-08-01"])).toBe(true); // First Friday
  });

  it("REJECTS a two-night concert run", () => {
    // The Red Rocks case, and the reason bare repetition is not evidence. A
    // two-night artist run is the same title at the same venue on two dates —
    // identical, to a naive rule, to a weekly. Asserting a series here would park
    // a rock show on the "On again this week" rail and suppress night two from
    // discovery because you rated night one.
    expect(hasRecurrenceRhythm(["2026-07-14", "2026-07-15"])).toBe(false);
  });

  it("REJECTS a three-night run", () => {
    expect(
      hasRecurrenceRhythm(["2026-07-14", "2026-07-15", "2026-07-16"])
    ).toBe(false);
  });

  it("rejects a weekly that also has a consecutive-night pair", () => {
    // Judged on the SMALLEST gap: one pair of consecutive nights reveals a run,
    // and a genuine weekly never has two occurrences a day apart.
    expect(
      hasRecurrenceRhythm(["2026-07-14", "2026-07-15", "2026-07-21"])
    ).toBe(false);
  });

  it("needs at least two distinct days", () => {
    expect(hasRecurrenceRhythm(["2026-07-14"])).toBe(false);
    expect(hasRecurrenceRhythm([])).toBe(false);
    expect(hasRecurrenceRhythm(["2026-07-14", "2026-07-14"])).toBe(false);
  });
});

describe("isRecurringSeries", () => {
  it("trusts a stated cadence over any date arithmetic", () => {
    // If Westword says "Every Sunday", that is the source asserting recurrence.
    // One occurrence is enough.
    expect(isRecurringSeries(["2026-07-14"], "Every Sunday")).toBe(true);
  });

  it("falls back to rhythm when no cadence is stated", () => {
    expect(isRecurringSeries(["2026-07-14", "2026-07-21"], null)).toBe(true);
    expect(isRecurringSeries(["2026-07-14", "2026-07-15"], null)).toBe(false);
  });
});
