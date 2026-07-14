/**
 * Wave 6A — series identity.
 *
 * deriveSeriesKey decides whether two Event rows are the same recurring thing.
 * Too loose and "Trivia Night" merges with "Trivia Night: Grand Finals"; too
 * tight and the series splits every time a source reformats its titles. These
 * tests are the contract.
 */

import { describe, it, expect } from "vitest";
import { deriveSeriesKey } from "@/lib/series/key";

describe("deriveSeriesKey", () => {
  it("gives the same key to the same series across weeks", () => {
    expect(deriveSeriesKey("Trivia Night", "Ratio Beerworks")).toBe(
      deriveSeriesKey("trivia night", "Ratio Beerworks")
    );
  });

  it("strips a leading weekday prefix", () => {
    const canonical = deriveSeriesKey("Trivia Night", "Ratio Beerworks");
    expect(deriveSeriesKey("Tuesday: Trivia Night", "Ratio Beerworks")).toBe(canonical);
    expect(deriveSeriesKey("Tue - Trivia Night", "Ratio Beerworks")).toBe(canonical);
  });

  it("strips a leading numeric date prefix", () => {
    const canonical = deriveSeriesKey("Trivia Night", "Ratio Beerworks");
    expect(deriveSeriesKey("7/15 - Trivia Night", "Ratio Beerworks")).toBe(canonical);
    expect(deriveSeriesKey("July 15: Trivia Night", "Ratio Beerworks")).toBe(canonical);
  });

  it("ignores punctuation and whitespace drift", () => {
    const canonical = deriveSeriesKey("Trivia Night", "Ratio Beerworks");
    expect(deriveSeriesKey("Trivia  Night!", "Ratio Beerworks")).toBe(canonical);
    expect(deriveSeriesKey("Trivia Night.", "Ratio  Beerworks")).toBe(canonical);
  });

  it("separates different series at the same venue", () => {
    expect(deriveSeriesKey("Trivia Night", "Ratio")).not.toBe(
      deriveSeriesKey("Open Mic", "Ratio")
    );
  });

  it("separates the same title at different venues", () => {
    expect(deriveSeriesKey("Trivia Night", "Ratio")).not.toBe(
      deriveSeriesKey("Trivia Night", "Mercury Cafe")
    );
  });

  it("does not collapse every date-only title into one series", () => {
    // A title that is ONLY a date would strip to "" — falling back to the raw
    // title keeps two such events apart instead of merging them into one
    // enormous bogus series.
    expect(deriveSeriesKey("7/15", "Ratio")).not.toBe(deriveSeriesKey("7/22", "Ratio"));
  });

  it("keeps a title that merely STARTS with a month-like word", () => {
    // "March" the month vs "March for Science" the event. Stripping the latter
    // would merge it with every other event at that venue.
    expect(deriveSeriesKey("March for Science", "Civic Center")).not.toBe(
      deriveSeriesKey("Rally", "Civic Center")
    );
  });

  it("returns a stable, url-safe token", () => {
    expect(deriveSeriesKey("Trivia Night", "Ratio Beerworks")).toMatch(/^[a-z0-9|-]+$/);
  });
});

describe("deriveSeriesKey — traps the review caught", () => {
  it("does NOT strip a word that merely BEGINS with a month name", () => {
    // "Decadence" starts with "Dec". A greedy month match turned it into "adence"
    // and then the delimiter stripped it entirely, merging Denver's NYE festival
    // with every other NYE event at that venue.
    expect(deriveSeriesKey("Decadence: NYE Festival", "Convention Center")).not.toBe(
      deriveSeriesKey("NYE Festival", "Convention Center")
    );
    expect(deriveSeriesKey("Mayday: The Musical", "Buell")).not.toBe(
      deriveSeriesKey("The Musical", "Buell")
    );
  });

  it("still strips a REAL month prefix", () => {
    expect(deriveSeriesKey("July 15: Trivia Night", "Ratio")).toBe(
      deriveSeriesKey("Trivia Night", "Ratio")
    );
  });

  it("treats 'The Ogden Theatre' and 'Ogden Theatre' as one venue", () => {
    // A leading article must not split a series. The scrapers' venue normalizer
    // already knew this; deriving our own second opinion was the bug.
    expect(deriveSeriesKey("Trivia", "The Ogden Theatre")).toBe(
      deriveSeriesKey("Trivia", "Ogden Theatre")
    );
  });
});
