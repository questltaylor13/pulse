import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import * as cheerio from "cheerio";

// Westword's parser isn't currently exported separately — re-create the
// extraction here against the fixture. This mirrors what scrapeWestword's
// parseDomEvents does without importing the network layer.

const FIX = path.resolve(__dirname, "../../../tests/fixtures/scrapers");
const html = readFileSync(path.join(FIX, "westword-listing.html"), "utf8");

describe("Westword listing fixture", () => {
  it("contains a.event-item elements (current selector still matches)", () => {
    const $ = cheerio.load(html);
    const items = $("a.event-item");
    expect(items.length).toBeGreaterThanOrEqual(10);
  });

  it("each event card has the expected sub-selectors populated", () => {
    const $ = cheerio.load(html);
    const items = $("a.event-item");
    let withTitle = 0;
    let withVenue = 0;
    let withOccurrences = 0;
    items.each((_, el) => {
      const $el = $(el);
      if ($el.find(".event-title").text().trim().length > 0) withTitle++;
      if ($el.find(".location-name").text().trim().length > 0) withVenue++;
      if ($el.find(".event-occurrences").text().trim().length > 0)
        withOccurrences++;
    });
    expect(withTitle).toBe(items.length);
    expect(withVenue).toBeGreaterThan(items.length / 2);
    expect(withOccurrences).toBe(items.length);
  });

  // Diagnostic regression guard: if Westword ever ships static pagination
  // or schema.org markup, this test will fail and remind us to expand the
  // scraper. Currently the page uses JS-driven infinite scroll.
  it("documents the JS-render ceiling: static fetch yields ≤12 events and no pagination", () => {
    const $ = cheerio.load(html);
    const items = $("a.event-item");
    expect(items.length).toBeLessThanOrEqual(12);

    const hasNextPageLink = $('a[href*="page/2"], a[href*="?page=2"], a.next, .pagination a').length > 0;
    const hasEventLdJson =
      $('script[type="application/ld+json"]')
        .map((_, s) => $(s).contents().text())
        .get()
        .some((t) => t.includes('"@type":"Event"') || t.includes('"@type": "Event"'));

    // If either of these flips true, time to revisit the scraper.
    expect(hasNextPageLink).toBe(false);
    expect(hasEventLdJson).toBe(false);
  });
});
