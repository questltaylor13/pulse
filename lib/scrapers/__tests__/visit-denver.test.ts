import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { _internals } from "@/lib/scrapers/visit-denver";

const FIX = path.resolve(__dirname, "../../../tests/fixtures/scrapers");

const listingHtml = readFileSync(path.join(FIX, "visit-denver-events-list.html"), "utf8");
const detailHtml = readFileSync(path.join(FIX, "visit-denver-event-detail.html"), "utf8");

describe("VisitDenver listing parser", () => {
  it("extracts at least 40 unique event URLs from the /events/ listing", () => {
    const urls = _internals.parseEventUrlsFromListing(listingHtml);
    expect(urls.length).toBeGreaterThanOrEqual(40);
  });

  it("only emits canonical /event/<slug>/<id>/ URLs", () => {
    const urls = _internals.parseEventUrlsFromListing(listingHtml);
    for (const u of urls) {
      expect(u).toMatch(/^https:\/\/visitdenver\.com\/event\/[a-zA-Z0-9%-]+\/\d+\/?$/);
    }
  });

  it("dedups multiple links per event card (image + title + read-more)", () => {
    const urls = _internals.parseEventUrlsFromListing(listingHtml);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("VisitDenver ld+json parser", () => {
  it("extracts the schema.org Event block from a detail page", () => {
    const ld = _internals.parseLdJson(detailHtml);
    expect(ld).not.toBeNull();
    expect(ld?.name).toBe("Cinco de Mayo Festival");
    expect(ld?.startDate).toBe("2026-05-02");
    expect(ld?.endDate).toBe("2026-05-03");
    expect(ld?.location?.name).toBe("Civic Center Park");
  });

  it("returns null when no ld+json is present", () => {
    expect(_internals.parseLdJson("<html><body>no ld+json here</body></html>")).toBeNull();
  });

  it("ignores broken JSON gracefully", () => {
    const broken = `<script type="application/ld+json">{ "name": "broken</script>`;
    expect(_internals.parseLdJson(broken)).toBeNull();
  });
});

describe("VisitDenver buildEventFromLdJson", () => {
  const NOW = new Date("2026-04-25T17:00:00Z").getTime();
  const SAMPLE_URL = "https://visitdenver.com/event/cinco-de-mayo-festival/136372/";

  it("builds a valid ScrapedEvent from the fixture's ld+json", () => {
    const ld = _internals.parseLdJson(detailHtml)!;
    const ev = _internals.buildEventFromLdJson(ld, SAMPLE_URL, NOW);
    expect(ev).not.toBeNull();
    expect(ev!.title).toBe("Cinco de Mayo Festival");
    expect(ev!.venueName).toBe("Civic Center Park");
    expect(ev!.source).toBe("visit-denver");
    expect(ev!.sourceUrl).toBe(SAMPLE_URL);
    expect(ev!.externalId).toMatch(/^[a-f0-9]{16}$/);
    expect(ev!.startTime).toBeInstanceOf(Date);
    expect(ev!.endTime).toBeInstanceOf(Date);
    expect(ev!.startTime.getTime()).toBeGreaterThan(NOW);
  });

  it("anchors date-only startDate at 19:00 Mountain Time (DST in May)", () => {
    const ev = _internals.buildEventFromLdJson(
      { "@type": "Event", name: "Test", startDate: "2026-05-02" },
      "https://visitdenver.com/event/test/1/",
      NOW,
    );
    expect(ev).not.toBeNull();
    // 2026-05-02 19:00 MDT (UTC-6) = 2026-05-03 01:00 UTC
    expect(ev!.startTime.toISOString()).toBe("2026-05-03T01:00:00.000Z");
  });

  it("filters past events", () => {
    const past = _internals.buildEventFromLdJson(
      { "@type": "Event", name: "Past", startDate: "2026-04-20", endDate: "2026-04-21" },
      "https://visitdenver.com/event/past/1/",
      NOW,
    );
    expect(past).toBeNull();
  });

  it("keeps ongoing exhibits (start in past, end in future) and anchors start at now", () => {
    const ongoing = _internals.buildEventFromLdJson(
      { "@type": "Event", name: "Long Exhibit", startDate: "2026-04-01", endDate: "2026-05-30" },
      "https://visitdenver.com/event/exhibit/2/",
      NOW,
    );
    expect(ongoing).not.toBeNull();
    expect(ongoing!.startTime.getTime()).toBeGreaterThanOrEqual(NOW);
    expect(ongoing!.endTime).toBeInstanceOf(Date);
  });

  it("filters convention/seminar events by URL pattern", () => {
    const conv = _internals.buildEventFromLdJson(
      { "@type": "Event", name: "Annual Sales Meeting", startDate: "2026-05-01" },
      "https://visitdenver.com/event/conventions_12345/",
      NOW,
    );
    expect(conv).toBeNull();
  });

  it("filters convention/seminar events by title keywords", () => {
    const conf = _internals.buildEventFromLdJson(
      { "@type": "Event", name: "Tech Symposium 2026", startDate: "2026-05-01" },
      "https://visitdenver.com/event/tech-symposium/99/",
      NOW,
    );
    expect(conf).toBeNull();
  });

  it("returns null when name is missing", () => {
    const noName = _internals.buildEventFromLdJson(
      { "@type": "Event", startDate: "2026-05-01" },
      "https://visitdenver.com/event/x/1/",
      NOW,
    );
    expect(noName).toBeNull();
  });

  it("returns null when startDate is unparseable", () => {
    const bad = _internals.buildEventFromLdJson(
      { "@type": "Event", name: "Bad", startDate: "not-a-date" },
      "https://visitdenver.com/event/x/1/",
      NOW,
    );
    expect(bad).toBeNull();
  });
});
