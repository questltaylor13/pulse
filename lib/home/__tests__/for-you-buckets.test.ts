import { describe, it, expect } from "vitest";
import { bucketByHorizon, type ForYouMixedItem } from "@/lib/home/for-you-buckets";
import { endOfTodayLocal, upcomingWeekendRange } from "@/lib/queries/events";
import { addDaysDenver } from "@/lib/time/denver";

// Only kind + id + startTime are read by bucketByHorizon; cast a minimal shape.
const ev = (id: string, startMs: number): ForYouMixedItem =>
  ({ kind: "event", id, startTime: new Date(startMs).toISOString() } as unknown as ForYouMixedItem);

describe("bucketByHorizon — half-open bands", () => {
  const now = new Date("2026-06-01T18:00:00Z"); // Mon midday Denver (MDT = UTC-6)
  const eodMs = endOfTodayLocal(now).getTime();
  const { end: wkEnd } = upcomingWeekendRange(now);
  const wkEndMs = wkEnd.getTime();
  const nextWeekEndMs = addDaysDenver(wkEnd, 7).getTime();

  it("puts a tonight event in tonight only", () => {
    const b = bucketByHorizon([ev("t", now.getTime() + 60 * 60 * 1000)], now);
    expect(b.tonight.map((i) => i.id)).toContain("t");
    expect(b.weekend.map((i) => i.id)).not.toContain("t");
  });

  it("an event exactly at the weekend-end boundary lands in nextWeek, not weekend", () => {
    const b = bucketByHorizon([ev("boundary", wkEndMs)], now);
    expect(b.weekend.map((i) => i.id)).not.toContain("boundary");
    expect(b.nextWeek.map((i) => i.id)).toContain("boundary");
  });

  it("an event exactly at the nextWeek-end boundary lands in comingUp, not nextWeek", () => {
    const b = bucketByHorizon([ev("edge", nextWeekEndMs)], now);
    expect(b.nextWeek.map((i) => i.id)).not.toContain("edge");
    expect(b.comingUp.map((i) => i.id)).toContain("edge");
  });

  it("places (no startTime) never enter any event bucket", () => {
    const place = { kind: "place", id: "p1" } as unknown as ForYouMixedItem;
    const b = bucketByHorizon([place], now);
    expect(b.tonight.length + b.weekend.length + b.nextWeek.length + b.comingUp.length).toBe(0);
  });
});
