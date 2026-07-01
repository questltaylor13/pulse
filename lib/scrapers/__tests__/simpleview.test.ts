import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { _internals, SIMPLEVIEW_FEEDS } from "@/lib/scrapers/regional/simpleview";
import { classifyEvent } from "@/lib/scrapers/classify";
import { SOURCE_PRIORITY } from "@/lib/scrapers/source-priority";
import { deriveRegionalFields } from "@/lib/regional/metadata";

const FIX = path.resolve(__dirname, "../../../tests/fixtures/scrapers");
const fixtureXml = readFileSync(path.join(FIX, "simpleview-golden.xml"), "utf8");
const NOW = new Date("2026-07-05T12:00:00Z").getTime();
const GOLDEN = SIMPLEVIEW_FEEDS.find((f) => f.source === "visit-golden")!;

describe("parseItems", () => {
  it("extracts every <item> with title, link, categories and description", () => {
    const items = _internals.parseItems(fixtureXml);
    expect(items).toHaveLength(7);
    const first = items[0];
    expect(first.title).toBe("Summer Concert Series");
    expect(first.link).toBe("https://www.visitgolden.com/event/summer-concert-series/101/");
    expect(first.categories).toEqual(["Music", "Concerts"]);
    expect(first.descriptionHtml).toContain("07/15/2026");
  });
});

describe("parseDateRange", () => {
  it("parses a single MM/DD/YYYY as summer MDT 19:00 (UTC-6)", () => {
    const { start, end } = _internals.parseDateRange("07/15/2026 - Live music");
    expect(start?.toISOString()).toBe("2026-07-16T01:00:00.000Z");
    expect(end).toBeNull();
  });
  it("parses a range using first as start and last as end", () => {
    const { start, end } = _internals.parseDateRange("07/18/2026 to 07/20/2026 - Rafting");
    expect(start?.toISOString()).toBe("2026-07-19T01:00:00.000Z");
    expect(end?.toISOString()).toBe("2026-07-21T01:00:00.000Z");
  });
  it("uses winter MST 19:00 (UTC-7) for January dates", () => {
    const { start } = _internals.parseDateRange("01/10/2026 - Snowshoe");
    expect(start?.toISOString()).toBe("2026-01-11T02:00:00.000Z");
  });
  it("returns nulls when no date is present", () => {
    expect(_internals.parseDateRange("no date here")).toEqual({ start: null, end: null });
  });
});

describe("cleanDescription", () => {
  it("strips a leading single date prefix", () => {
    expect(_internals.cleanDescription("07/15/2026 - Live music downtown")).toBe("Live music downtown");
  });
  it("strips a leading date-range prefix", () => {
    expect(_internals.cleanDescription("07/18/2026 to 07/20/2026 - Rafting trips")).toBe("Rafting trips");
  });
});

describe("categoryFromRssTag", () => {
  it("classifies base keywords without any extras", () => {
    expect(_internals.categoryFromRssTag(["Music"], "Show", "Venue")).toBe("LIVE_MUSIC");
    expect(_internals.categoryFromRssTag(["Food & Drink"], "x", "v")).toBe("FOOD");
    expect(_internals.categoryFromRssTag(["Art"], "x", "v")).toBe("ART");
  });
  it("only maps a town-specific keyword when the town adds it via extraCategoryKeywords", () => {
    const tags = ["Brewery"];
    expect(_internals.categoryFromRssTag(tags, "Meetup", "See listing")).toBe(
      classifyEvent("Meetup", "See listing"),
    );
    expect(_internals.categoryFromRssTag(tags, "Meetup", "See listing", { FOOD: ["brewery"] })).toBe("FOOD");
  });
  it("checks SEASONAL before OUTDOORS (winter maps to SEASONAL when both added)", () => {
    expect(
      _internals.categoryFromRssTag(["Winter Ski"], "x", "v", { SEASONAL: ["winter"], OUTDOORS: ["ski"] }),
    ).toBe("SEASONAL");
  });
});

describe("stableId", () => {
  it("is a stable 16-char lowercase hex of the URL", () => {
    const a = _internals.stableId("https://x/y/1/");
    expect(a).toMatch(/^[a-f0-9]{16}$/);
    expect(_internals.stableId("https://x/y/1/")).toBe(a);
  });
});

describe("buildEvents", () => {
  it("keeps only future/ongoing items, skipping conventions and past items", () => {
    const events = _internals.buildEvents(fixtureXml, GOLDEN, NOW);
    expect(events.map((e) => e.title).sort()).toEqual([
      "Clear Creek Rafting Weekend",
      "Craft Beer Festival",
      "Spring Art Exhibit",
      "Summer Concert Series",
    ]);
  });
  it("maps categories and stamps config fields onto each ScrapedEvent", () => {
    const byTitle = Object.fromEntries(
      _internals.buildEvents(fixtureXml, GOLDEN, NOW).map((e) => [e.title, e]),
    );
    expect(byTitle["Summer Concert Series"].category).toBe("LIVE_MUSIC");
    expect(byTitle["Craft Beer Festival"].category).toBe("FOOD");
    expect(byTitle["Spring Art Exhibit"].category).toBe("ART");
    expect(byTitle["Clear Creek Rafting Weekend"].category).toBe("OUTDOORS");
    const e = byTitle["Summer Concert Series"];
    expect(e.venueName).toBe("See Visit Golden listing");
    expect(e.address).toBe("Golden, CO");
    expect(e.neighborhood).toBe("Golden");
    expect(e.priceRange).toBe("$$");
    expect(e.source).toBe("visit-golden");
    expect(e.sourceUrl).toBe("https://www.visitgolden.com/event/summer-concert-series/101/");
    expect(e.externalId).toMatch(/^[a-f0-9]{16}$/);
    expect(e.startTime.toISOString()).toBe("2026-07-16T01:00:00.000Z");
  });
});

describe("SIMPLEVIEW_FEEDS registry invariants", () => {
  it("has unique source keys", () => {
    const sources = SIMPLEVIEW_FEEDS.map((f) => f.source);
    expect(new Set(sources).size).toBe(sources.length);
  });
  it("registers every feed source in SOURCE_PRIORITY", () => {
    for (const f of SIMPLEVIEW_FEEDS) expect(SOURCE_PRIORITY).toContain(f.source);
  });
  it("uses a town that is a known drive-times key (regional fields derive)", () => {
    for (const f of SIMPLEVIEW_FEEDS) expect(deriveRegionalFields(f.town).townName).toBe(f.town);
  });
});
