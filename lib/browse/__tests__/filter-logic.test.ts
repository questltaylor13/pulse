import { describe, it, expect } from "vitest";
import { matchesTimeOfDay } from "@/lib/browse/filter-logic";

describe("matchesTimeOfDay", () => {
  it("empty selection is unconstrained (matches any hour)", () => {
    expect(matchesTimeOfDay(3, [])).toBe(true);
    expect(matchesTimeOfDay(14, [])).toBe(true);
  });

  it("maps hours to the right bucket", () => {
    expect(matchesTimeOfDay(8, ["morning"])).toBe(true);
    expect(matchesTimeOfDay(14, ["afternoon"])).toBe(true);
    expect(matchesTimeOfDay(19, ["evening"])).toBe(true);
    expect(matchesTimeOfDay(23, ["late-night"])).toBe(true);
    expect(matchesTimeOfDay(2, ["late-night"])).toBe(true); // wraps past midnight
  });

  it("excludes hours outside the selected buckets", () => {
    expect(matchesTimeOfDay(8, ["evening"])).toBe(false);
    expect(matchesTimeOfDay(14, ["morning", "late-night"])).toBe(false);
  });

  it("matches when the hour is in ANY selected bucket", () => {
    expect(matchesTimeOfDay(19, ["morning", "evening"])).toBe(true);
  });

  it("respects bucket boundaries (12 is afternoon, not morning; 17 is evening)", () => {
    expect(matchesTimeOfDay(12, ["morning"])).toBe(false);
    expect(matchesTimeOfDay(12, ["afternoon"])).toBe(true);
    expect(matchesTimeOfDay(17, ["afternoon"])).toBe(false);
    expect(matchesTimeOfDay(17, ["evening"])).toBe(true);
  });
});
