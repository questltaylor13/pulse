/**
 * Wave 6A — occurrence identity at ingest.
 *
 * The bug being closed: externalId was nullable and the unique index was
 * (externalId, source). Postgres treats NULLs as DISTINCT in a unique index, so
 * the constraint could not stop duplicate NULL rows — every permalink-less
 * red-rocks event was re-created on every nightly run, and the constraint was
 * powerless to notice.
 *
 * Adding startTime to the key does NOT fix that on its own: (source, NULL, t)
 * still never collides with itself. The fix is to stop having NULLs, so the
 * database enforces the invariant instead of application code someone has to
 * remember to keep correct. These tests are that guarantee.
 */

import { describe, it, expect } from "vitest";
import { resolveExternalId, occurrenceDateOf } from "@/lib/series/occurrence";
import type { ScrapedEvent } from "@/lib/scrapers/types";

function ev(overrides: Partial<ScrapedEvent> = {}): ScrapedEvent {
  return {
    title: "Trivia Night",
    description: "",
    category: "SOCIAL",
    tags: [],
    venueName: "Ratio Beerworks",
    address: "2920 Larimer St",
    startTime: new Date("2026-07-14T19:00:00-06:00"),
    priceRange: "Free",
    source: "westword",
    ...overrides,
  };
}

describe("resolveExternalId", () => {
  it("uses the source's own id when it has one", () => {
    expect(resolveExternalId(ev({ externalId: "abc123" }), "trivia-night|ratio")).toBe("abc123");
  });

  it("synthesizes a deterministic id when the source supplies none", () => {
    const a = resolveExternalId(ev({ externalId: undefined }), "trivia-night|ratio");
    const b = resolveExternalId(ev({ externalId: undefined }), "trivia-night|ratio");
    expect(a).toBe(b);
    expect(a).toMatch(/^syn_[a-f0-9]{16}$/);
  });

  it("NEVER returns a falsy id — a NULL defeats the unique index entirely", () => {
    // This is the whole point. If this ever returns null/"", the duplicate-row
    // bug is back and the database cannot see it.
    expect(resolveExternalId(ev({ externalId: undefined }), "x|y")).toBeTruthy();
    expect(resolveExternalId(ev({ externalId: "" }), "x|y")).toBeTruthy();
  });

  it("gives two different series at one venue different ids", () => {
    const trivia = resolveExternalId(ev({ externalId: undefined }), "trivia-night|ratio");
    const openMic = resolveExternalId(ev({ externalId: undefined }), "open-mic|ratio");
    expect(trivia).not.toBe(openMic);
  });

  it("is stable across scrapes — the id does not vary with the occurrence", () => {
    // The per-night dimension is occurrenceDate's job, not the id's. A synthesized
    // id that also encoded the date would work, but it would make the id churn for
    // no reason and hide which column actually carries occurrence identity.
    const a = resolveExternalId(
      ev({ externalId: undefined, startTime: new Date("2026-07-14T19:00:00-06:00") }),
      "trivia-night|ratio"
    );
    const b = resolveExternalId(
      ev({ externalId: undefined, startTime: new Date("2026-07-21T19:00:00-06:00") }),
      "trivia-night|ratio"
    );
    expect(a).toBe(b);
  });
});

describe("occurrenceDateOf", () => {
  it("separates two different nights of the same series", () => {
    const week1 = occurrenceDateOf(new Date("2026-07-14T19:00:00-06:00"));
    const week2 = occurrenceDateOf(new Date("2026-07-21T19:00:00-06:00"));
    expect(week1.getTime()).not.toBe(week2.getTime());
  });

  it("collapses time-of-day drift within one night", () => {
    // THE point. Sources wobble the reported start time — 7:00pm on one scrape,
    // 7:05pm on the next. Keying occurrence identity on the exact instant would
    // mint a fresh duplicate row every single night: the duplicate-row bug in a
    // different hat.
    const a = occurrenceDateOf(new Date("2026-07-14T19:00:00-06:00"));
    const b = occurrenceDateOf(new Date("2026-07-14T20:30:00-06:00"));
    expect(a.getTime()).toBe(b.getTime());
  });

  it("uses the DENVER day, not the UTC day", () => {
    // 9pm Denver on the 14th is 03:00 UTC on the 15th. A UTC-day key would file
    // a Tuesday-night trivia as Wednesday and split the series in half.
    const denverTuesdayNight = new Date("2026-07-14T21:00:00-06:00");
    expect(occurrenceDateOf(denverTuesdayNight).toISOString()).toBe(
      "2026-07-14T00:00:00.000Z"
    );
  });
});
