import { describe, it, expect } from "vitest";
import { formatAgo } from "@/lib/time/relative";

const NOW = new Date("2026-07-13T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatAgo", () => {
  it("collapses anything under a minute to 'just now'", () => {
    expect(formatAgo(ago(0), NOW)).toBe("just now");
    expect(formatAgo(ago(30_000), NOW)).toBe("just now");
  });

  it("steps through minutes, hours, and days", () => {
    expect(formatAgo(ago(5 * MIN), NOW)).toBe("5m ago");
    expect(formatAgo(ago(3 * HOUR), NOW)).toBe("3h ago");
    expect(formatAgo(ago(2 * DAY), NOW)).toBe("2d ago");
  });

  it("falls back to an absolute date past a week — '63d ago' tells nobody anything", () => {
    expect(formatAgo(ago(60 * DAY), NOW)).toMatch(/May/);
  });

  it("never renders a negative age for a clock-skewed future timestamp", () => {
    expect(formatAgo(new Date(NOW.getTime() + 5 * MIN), NOW)).toBe("just now");
  });

  it("returns empty string for an unparseable input rather than 'NaN ago'", () => {
    expect(formatAgo("not a date", NOW)).toBe("");
  });
});
