import { describe, it, expect } from "vitest";
import {
  selectRegulars,
  type RankedSeries,
  type SeriesOccurrence,
} from "@/lib/home/regulars";

const NOW = new Date("2026-07-14T12:00:00Z");
const inDays = (d: number, h = 0) =>
  new Date(NOW.getTime() + d * 86_400_000 + h * 3_600_000);

const trivia: RankedSeries = {
  seriesId: "s_trivia",
  title: "Trivia Night",
  venueName: "Ratio Beerworks",
  cadence: "Every Tuesday",
  rank: 2,
};
const openMic: RankedSeries = {
  seriesId: "s_mic",
  title: "Open Mic",
  venueName: "Mercury Cafe",
  cadence: "Every Wednesday",
  rank: 7,
};

const occ = (
  seriesId: string,
  startTime: Date,
  eventId = `e_${seriesId}_${startTime.toISOString()}`
): SeriesOccurrence => ({ eventId, seriesId, startTime, imageUrl: null });

describe("selectRegulars", () => {
  it("returns the next occurrence of each ranked series", () => {
    const items = selectRegulars(
      [trivia, openMic],
      [occ("s_trivia", inDays(1)), occ("s_mic", inDays(2))],
      NOW
    );
    expect(items.map((i) => i.seriesId)).toEqual(["s_trivia", "s_mic"]);
  });

  it("orders by YOUR rank, not by whichever happens to be soonest", () => {
    // The rail is about taste ordering. Sorting by soonest would bury your #1
    // behind whatever falls on a Monday.
    const items = selectRegulars(
      [trivia, openMic],
      [occ("s_mic", inDays(1)), occ("s_trivia", inDays(3))],
      NOW
    );
    expect(items.map((i) => i.seriesId)).toEqual(["s_trivia", "s_mic"]);
  });

  it("shows a series ONCE even when it runs twice this week", () => {
    // Listing every occurrence would let a heavy-cadence series crowd out the
    // whole rail.
    const items = selectRegulars(
      [trivia],
      [occ("s_trivia", inDays(4)), occ("s_trivia", inDays(1))],
      NOW
    );
    expect(items).toHaveLength(1);
    expect(items[0].startTime).toEqual(inDays(1)); // the soonest one
  });

  it("ignores occurrences beyond the horizon", () => {
    expect(selectRegulars([trivia], [occ("s_trivia", inDays(10))], NOW)).toEqual([]);
  });

  it("ignores occurrences already in the past", () => {
    expect(selectRegulars([trivia], [occ("s_trivia", inDays(-1))], NOW)).toEqual([]);
  });

  it("ignores series the user hasn't ranked", () => {
    expect(selectRegulars([], [occ("s_trivia", inDays(1))], NOW)).toEqual([]);
  });

  it("carries the cadence through, so the card can say 'Every Tuesday'", () => {
    const items = selectRegulars([trivia], [occ("s_trivia", inDays(1))], NOW);
    expect(items[0].cadence).toBe("Every Tuesday");
  });
});
