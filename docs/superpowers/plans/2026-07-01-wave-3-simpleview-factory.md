# Simpleview RSS Scraper Factory (Front Range only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Collapse the three byte-for-byte-identical Simpleview RSS scrapers (`visit-estes-park`, `visit-golden`, `visit-steamboat-chamber`) into one `makeSimpleviewScraper(config)` factory with fixture-driven parity tests, then register the towns via a `SIMPLEVIEW_FEEDS` loop and add Fort Collins + Colorado Springs *only* if their `/event/rss/` endpoints curl-verify.

**Architecture:** A new `lib/scrapers/regional/simpleview.ts` exports a `SimpleviewScraperConfig` interface, a pure per-item pipeline (`parseItems` → `parseDateRange` → `cleanDescription` → `categoryFromRssTag` → `buildEvents`) exposed through an `_internals` bag (same pattern as `visit-denver.ts`), a `makeSimpleviewScraper(config): Scraper` factory (same shape as `makeIcsScraper` in `ics.ts`), and a `SIMPLEVIEW_FEEDS` config array. `lib/scrapers/index.ts` replaces the three named imports/rows with a `for (const feed of SIMPLEVIEW_FEEDS)` loop (mirroring the existing `CIVIC_ICS_FEEDS` loop). The three original files are deleted only after an old-vs-new parity test proves identical `ScrapedEvent[]` output over a captured fixture.

**Tech Stack:** Next.js 14.2.10 App Router, Prisma 5.22 + Postgres (Neon), vitest, TypeScript.

## Global Constraints
- TDD: write the failing test first; `tsc --noEmit` + `npm test` + `next build` must stay green.
- Prisma migrations are ADDITIVE + applied to prod MANUALLY via `prisma migrate deploy` (Vercel build only runs `prisma generate && next build`; the consolidated baseline breaks migrate dev's shadow DB — hand-write migration SQL like `prisma/migrations/20260630230000_add_beli_rating`). *(No migration in this item — Simpleview is a pure code refactor + config additions.)*
- Hobby plan: daily crons only — no new cron slots; fold into existing crons. *(No cron change in this item; feeds run inside the existing `runAllScrapers` loop.)*
- No new recurring paid services. Precision-first for any matching (a wrong link is worse than none).
- **Front Range only (item-specific, from the spec):** Only the 3 Simpleview-RSS-shaped scrapers are in scope. The bespoke scrapers (`pikes-peak-center`, `chautauqua`, `visit-denver`) stay untouched. Mountain towns (Vail/Aspen/Breckenridge/Crested Butte/Telluride) are **out of scope** — they are already routed to the LLM research pipeline in `index.ts` because their feeds are bot-protected/unstructured.
- **Parity before delete (item-specific):** re-express the 3 known feeds and prove output parity against a captured fixture *before* deleting the originals. This is a pure refactor with zero intended behavior change on real feeds.
- **Unverified feeds stay OUT (item-specific):** an unverified/404 feed registers a zero-count source and trips the coverage-anomaly alert. Fort Collins / Colorado Springs are added *only after* `curl` confirms their `/event/rss/` returns future-dated `<item>`s — otherwise their config rows stay commented out (same doctrine as the empty `CIVIC_ICS_FEEDS`).
- Test harness is pure-unit vitest (`vitest.config.ts`: happy-dom, globals, `@` alias → repo root). There is no Prisma-backed test harness — test the pure parsers/factory in isolation; verify the `index.ts` wiring via `tsc`/`next build`.
- Work happens on branch `feature/overhaul-wave-3` (per the spec header). Confirm with `git branch --show-current` before the first commit; `git checkout -b feature/overhaul-wave-3` if not present.

---

### Task 1: Simpleview factory + pure internals + fixture-driven unit tests

Build the new factory file and its unit tests. The 3 original scrapers remain in place and unwired — this task only adds the new module and proves its pure functions in isolation.

**Files:**
- Create: `tests/fixtures/scrapers/simpleview-golden.xml` (test data; a representative Simpleview `/event/rss/` capture, used generically for all towns)
- Create: `lib/scrapers/regional/simpleview.ts` (factory + config type + pure internals + `_internals` bag + `SIMPLEVIEW_FEEDS`)
- Create (test): `lib/scrapers/__tests__/simpleview.test.ts`
- Read for patterns: `lib/scrapers/ics.ts` (factory shape, lines 123-184), `lib/scrapers/__tests__/visit-denver.test.ts` (fixture load + `_internals` pattern, lines 1-9), `lib/scrapers/types.ts` (`ScrapedEvent`/`Scraper`)

**Interfaces:**
- Consumes: `fetchPage(url: string, timeoutMs?: number): Promise<string>` from `../fetch-utils`; `classifyEvent(title: string, venueName: string): Category` and `extractTags(title: string, venueName: string): string[]` from `../classify`; `ScrapedEvent`, `Scraper` from `../types`; `Category` from `@prisma/client`.
- Produces:
  - `interface SimpleviewScraperConfig { source: string; feedUrl: string; town: string; venueName: string; descriptionFallback: string; priceRange: string; address?: string; extraCategoryKeywords?: Partial<Record<Category, string[]>>; }`
  - `function makeSimpleviewScraper(config: SimpleviewScraperConfig): Scraper`
  - `const SIMPLEVIEW_FEEDS: SimpleviewScraperConfig[]` (the 3 verbatim feeds)
  - `const _internals` bag: `{ parseItems, parseDateRange, cleanDescription, categoryFromRssTag, stableId, buildEvents, DEFAULT_CATEGORY_KEYWORDS, CATEGORY_CHECK_ORDER, CONVENTION_TITLE_RX }`
  - Internal pure signatures:
    - `parseItems(rssXml: string): RawItem[]` where `RawItem = { title; link; categories: string[]; pubDate; descriptionHtml }`
    - `parseDateRange(descriptionHtml: string): { start: Date | null; end: Date | null }`
    - `cleanDescription(descriptionHtml: string): string`
    - `categoryFromRssTag(tags: string[], title: string, venue: string, extra?: Partial<Record<Category, string[]>>): Category`
    - `stableId(url: string): string`
    - `buildEvents(rssXml: string, config: SimpleviewScraperConfig, now: number): ScrapedEvent[]`

Steps:

- [ ] **Create the fixture.** Write `tests/fixtures/scrapers/simpleview-golden.xml` exactly (dates chosen relative to a frozen `now = 2026-07-05T12:00:00Z`: a future single-date item, a future date-range item, an ongoing item, a future food item, a convention-by-title item, a convention-by-URL item, a past item):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Visit Golden Events</title>
    <item>
      <title>Summer Concert Series</title>
      <link>https://www.visitgolden.com/event/summer-concert-series/101/</link>
      <pubDate>Mon, 01 Jun 2026 00:00:00 -0600</pubDate>
      <category>Music</category>
      <category>Concerts</category>
      <description><![CDATA[07/15/2026 - Live music in downtown Golden every Friday night.]]></description>
    </item>
    <item>
      <title>Clear Creek Rafting Weekend</title>
      <link>https://www.visitgolden.com/event/clear-creek-rafting/102/</link>
      <pubDate>Mon, 01 Jun 2026 00:00:00 -0600</pubDate>
      <category>Outdoor Recreation</category>
      <description><![CDATA[07/18/2026 to 07/20/2026 - Guided rafting trips down Clear Creek.]]></description>
    </item>
    <item>
      <title>Spring Art Exhibit</title>
      <link>https://www.visitgolden.com/event/spring-art-exhibit/103/</link>
      <pubDate>Mon, 01 Jun 2026 00:00:00 -0600</pubDate>
      <category>Art</category>
      <description><![CDATA[06/01/2026 to 08/30/2026 - A season-long gallery exhibit.]]></description>
    </item>
    <item>
      <title>Craft Beer Festival</title>
      <link>https://www.visitgolden.com/event/craft-beer-festival/104/</link>
      <pubDate>Mon, 01 Jun 2026 00:00:00 -0600</pubDate>
      <category>Food &amp; Drink</category>
      <description><![CDATA[07/22/2026 - Local breweries pour their best.]]></description>
    </item>
    <item>
      <title>Annual Business Convention</title>
      <link>https://www.visitgolden.com/event/business-convention/105/</link>
      <pubDate>Mon, 01 Jun 2026 00:00:00 -0600</pubDate>
      <category>Business</category>
      <description><![CDATA[07/25/2026 - A regional trade convention.]]></description>
    </item>
    <item>
      <title>Rotary Gala</title>
      <link>https://www.visitgolden.com/event/conventions_555/</link>
      <pubDate>Mon, 01 Jun 2026 00:00:00 -0600</pubDate>
      <category>Community</category>
      <description><![CDATA[07/26/2026 - Annual fundraiser gala.]]></description>
    </item>
    <item>
      <title>Winter Snowshoe Outing</title>
      <link>https://www.visitgolden.com/event/winter-snowshoe/106/</link>
      <pubDate>Mon, 01 Jan 2026 00:00:00 -0700</pubDate>
      <category>Community</category>
      <description><![CDATA[01/10/2026 - A past winter outing.]]></description>
    </item>
  </channel>
</rss>
```

- [ ] **Write the failing unit test.** Create `lib/scrapers/__tests__/simpleview.test.ts` with the ACTUAL test code below. It imports from the not-yet-created module, so it fails at import (RED):

```ts
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
```

- [ ] **Run the test — expect FAIL (module missing).** Command: `npm test -- simpleview` — expect `Failed to resolve import "@/lib/scrapers/regional/simpleview"`.

- [ ] **Implement the factory.** Create `lib/scrapers/regional/simpleview.ts` with this ACTUAL code. The pure functions are lifted verbatim from the 3 originals; the only generalizations are (a) `categoryFromRssTag` built from `DEFAULT_CATEGORY_KEYWORDS` + per-town `extraCategoryKeywords`, and (b) the convention-title regex is the **union** of the three drifted originals (see the decision note in Task 3):

```ts
/**
 * Wave 3 — one factory for the Simpleview-CMS "/event/rss/" feeds (Estes Park,
 * Golden, Steamboat Springs today; Front Range towns as they verify). Replaces
 * three byte-for-byte-identical scrapers. The per-item pipeline is reproduced
 * verbatim (fetchPage → cheerio xmlMode parseItems → convention/meeting skip →
 * parseDateRange MM/DD/YYYY from the description CDATA anchored to 19:00 MT →
 * cleanDescription → categoryFromRssTag). Pure functions are exposed via
 * `_internals` for unit + parity tests, mirroring visit-denver.ts / ics.ts.
 *
 * pubDate on these feeds is an EXPIRY marker, not the event start — dates are
 * parsed out of the description CDATA. See the old visit-denver.ts rationale.
 */

import * as cheerio from "cheerio";
import { createHash } from "crypto";
import type { Category } from "@prisma/client";
import type { ScrapedEvent, Scraper } from "../types";
import { fetchPage } from "../fetch-utils";
import { classifyEvent, extractTags } from "../classify";

export interface SimpleviewScraperConfig {
  /** Unique source key (also written to ScraperRun.source + SOURCE_PRIORITY). */
  source: string;
  /** Public Simpleview /event/rss/ URL. */
  feedUrl: string;
  /** Town name; MUST be a DRIVE_TIMES_FROM_DENVER key so deriveRegionalFields
   *  supplies region/drive-time. Also used as `neighborhood` and (by default)
   *  the address `${town}, CO`. */
  town: string;
  venueName: string;
  descriptionFallback: string;
  priceRange: string;
  /** Defaults to `${town}, CO`. */
  address?: string;
  /** Town-specific keywords appended to DEFAULT_CATEGORY_KEYWORDS per category. */
  extraCategoryKeywords?: Partial<Record<Category, string[]>>;
}

const DATE_RX = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;

// Union of the three drifted originals. Strict superset — only ever skips MORE
// convention/B2B noise, never fewer real events (precision-first). Non-global
// so repeated .test() calls are stateless.
const CONVENTION_TITLE_RX =
  /\b(conference|convention|seminar|symposium|symposia|summit|training|meeting|exposition)\b/i;

// Category keywords common to all three original scrapers (their intersection).
const DEFAULT_CATEGORY_KEYWORDS: Partial<Record<Category, string[]>> = {
  FOOD: ["food", "drink", "dining", "restaurant"],
  LIVE_MUSIC: ["music", "concert"],
  ART: ["art", "museum", "visual", "gallery", "theater", "theatre", "performing"],
  SEASONAL: ["festival", "holiday", "seasonal"],
  OUTDOORS: ["sport", "fitness", "outdoor", "hike", "trail"],
  COMEDY: ["comedy"],
  BARS: ["nightlife", "bar", "club"],
  SOCIAL: ["family", "kids"],
};

// Fixed evaluation order — first match wins (reproduces the originals' if-chain).
const CATEGORY_CHECK_ORDER: Category[] = [
  "FOOD",
  "LIVE_MUSIC",
  "ART",
  "SEASONAL",
  "OUTDOORS",
  "COMEDY",
  "BARS",
  "SOCIAL",
];

interface RawItem {
  title: string;
  link: string;
  categories: string[];
  pubDate: string;
  descriptionHtml: string;
}

function stableId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function parseItems(rssXml: string): RawItem[] {
  const $ = cheerio.load(rssXml, { xmlMode: true });
  const items: RawItem[] = [];
  $("item").each((_, el) => {
    const $el = $(el);
    const title = $el.find("title").first().text().trim();
    const link = $el.find("link").first().text().trim();
    const pubDate = $el.find("pubDate").first().text().trim();
    const categories = $el.find("category").map((_, c) => $(c).text().trim()).get().filter(Boolean);
    const descriptionHtml = $el.find("description").first().text();
    if (!title || !link) return;
    items.push({ title, link, categories, pubDate, descriptionHtml });
  });
  return items;
}

function parseDateRange(descriptionHtml: string): { start: Date | null; end: Date | null } {
  const matches = Array.from(descriptionHtml.matchAll(DATE_RX));
  if (matches.length === 0) return { start: null, end: null };
  const toDate = (m: RegExpMatchArray) => {
    const mm = Number(m[1]);
    const dd = Number(m[2]);
    const yyyy = Number(m[3]);
    if (!mm || !dd || !yyyy || mm > 12 || dd > 31) return null;
    const isDST = mm >= 3 && mm <= 10;
    const offset = isDST ? 6 : 7;
    const d = new Date(Date.UTC(yyyy, mm - 1, dd, 19 + offset, 0, 0));
    return isNaN(d.getTime()) ? null : d;
  };
  const start = toDate(matches[0]);
  const end = matches.length > 1 ? toDate(matches[matches.length - 1]) : null;
  return { start, end };
}

function cleanDescription(descriptionHtml: string): string {
  const $ = cheerio.load(`<div>${descriptionHtml}</div>`);
  const text = $("div").text().replace(/\s+/g, " ").trim();
  return text.replace(/^\d{2}\/\d{2}\/\d{4}(?:\s*to\s*\d{2}\/\d{2}\/\d{4})?\s*-\s*/i, "").trim();
}

function categoryFromRssTag(
  tags: string[],
  title: string,
  venue: string,
  extra: Partial<Record<Category, string[]>> = {},
): Category {
  const joined = tags.join(" ").toLowerCase();
  for (const cat of CATEGORY_CHECK_ORDER) {
    const words = [...(DEFAULT_CATEGORY_KEYWORDS[cat] ?? []), ...(extra[cat] ?? [])];
    if (words.length === 0) continue;
    if (new RegExp(words.join("|")).test(joined)) return cat;
  }
  return classifyEvent(title, venue);
}

/** Pure item→ScrapedEvent pipeline. `now` injected for deterministic tests. */
function buildEvents(rssXml: string, config: SimpleviewScraperConfig, now: number): ScrapedEvent[] {
  const items = parseItems(rssXml);
  const address = config.address ?? `${config.town}, CO`;
  const events: ScrapedEvent[] = [];

  for (const item of items) {
    if (/\/conventions?_\d+/i.test(item.link)) continue;
    if (CONVENTION_TITLE_RX.test(item.title)) continue;

    const { start, end } = parseDateRange(item.descriptionHtml);
    let effectiveStart: Date | null = null;
    if (start && start.getTime() > now - 24 * 60 * 60 * 1000) effectiveStart = start;
    else if (end && end.getTime() > now) effectiveStart = new Date(Math.max(now, end.getTime() - 60 * 60 * 1000));
    if (!effectiveStart) continue;

    const description = cleanDescription(item.descriptionHtml) || config.descriptionFallback;
    const venueName = config.venueName;
    const category = categoryFromRssTag(item.categories, item.title, venueName, config.extraCategoryKeywords);
    const tags = Array.from(
      new Set([
        ...extractTags(item.title, venueName),
        ...item.categories.map((c) => c.toLowerCase().replace(/\s+/g, "-")),
      ]),
    );

    events.push({
      title: item.title,
      description,
      category,
      tags,
      venueName,
      address,
      neighborhood: config.town,
      startTime: effectiveStart,
      endTime: end && end.getTime() > effectiveStart.getTime() ? end : undefined,
      priceRange: config.priceRange,
      source: config.source,
      sourceUrl: item.link,
      externalId: stableId(item.link),
    });
  }

  return events;
}

/** Build a Scraper from a Simpleview feed config. */
export function makeSimpleviewScraper(config: SimpleviewScraperConfig): Scraper {
  return async () => {
    try {
      const rss = await fetchPage(config.feedUrl, 15_000);
      const events = buildEvents(rss, config, Date.now());
      const errors =
        events.length === 0 ? [`${config.source}: RSS feed returned no future-dated items`] : [];
      return { source: config.source, events, errors };
    } catch (error) {
      return {
        source: config.source,
        events: [],
        errors: [`${config.source}: ${error instanceof Error ? error.message : "Unknown error"}`],
      };
    }
  };
}

/** The 3 existing feeds re-expressed verbatim (Front Range + Steamboat).
 *  extraCategoryKeywords reproduces each town's category-keyword drift over
 *  the shared DEFAULT set; address defaults to `${town}, CO`. */
export const SIMPLEVIEW_FEEDS: SimpleviewScraperConfig[] = [
  {
    source: "visit-estes-park",
    feedUrl: "https://www.visitestespark.com/event/rss/",
    town: "Estes Park",
    venueName: "See Visit Estes Park listing",
    descriptionFallback: "Featured via Visit Estes Park.",
    priceRange: "$$",
    extraCategoryKeywords: {
      OUTDOORS: ["recreation", "rmnp", "national park"],
    },
  },
  {
    source: "visit-golden",
    feedUrl: "https://www.visitgolden.com/event/rss/",
    town: "Golden",
    venueName: "See Visit Golden listing",
    descriptionFallback: "Featured via Visit Golden.",
    priceRange: "$$",
    extraCategoryKeywords: {
      FOOD: ["brewery", "beer"],
      OUTDOORS: ["recreation", "clear creek", "raft", "kayak"],
    },
  },
  {
    source: "visit-steamboat-chamber",
    feedUrl: "https://www.steamboatchamber.com/event/rss/",
    town: "Steamboat Springs",
    venueName: "See Steamboat Springs listing",
    descriptionFallback: "Featured via Steamboat Springs Chamber.",
    priceRange: "$$$",
    extraCategoryKeywords: {
      FOOD: ["brewery", "beer", "wine"],
      SEASONAL: ["winter", "summer"],
      OUTDOORS: ["bike", "ski", "snowboard", "race", "rodeo", "hot spring"],
    },
  },
];

export const _internals = {
  parseItems,
  parseDateRange,
  cleanDescription,
  categoryFromRssTag,
  stableId,
  buildEvents,
  DEFAULT_CATEGORY_KEYWORDS,
  CATEGORY_CHECK_ORDER,
  CONVENTION_TITLE_RX,
};
```

- [ ] **Run the test — expect PASS.** Command: `npm test -- simpleview` — all `simpleview.test.ts` cases green.

- [ ] **Typecheck.** Command: `npx tsc --noEmit` — expect no errors (the new file and its config must typecheck; note the 3 originals still exist and are still imported by `index.ts`, which is fine).

- [ ] **Commit.** Command:
```
git add lib/scrapers/regional/simpleview.ts lib/scrapers/__tests__/simpleview.test.ts tests/fixtures/scrapers/simpleview-golden.xml && git commit -m "Wave 3: Simpleview RSS scraper factory + fixture-driven unit tests"
```

---

### Task 2: Parity test — old scrapers vs new factory (the gate before deletion)

Prove the factory reproduces each original's `ScrapedEvent[]` byte-for-byte over the same fixture, with `fetchPage` mocked and time frozen so both sides see the same `now`. This test intentionally references the soon-to-be-deleted originals; it is removed in Task 3 once its job is done.

**Files:**
- Create (test): `lib/scrapers/__tests__/simpleview-parity.test.ts`
- Consumes: the three originals (`scrapeVisitEstesPark`, `scrapeVisitGolden`, `scrapeVisitSteamboatChamber`), `makeSimpleviewScraper` + `SIMPLEVIEW_FEEDS`, mocked `fetchPage`.

**Interfaces:**
- Consumes: `Scraper` result shape `{ source: string; events: ScrapedEvent[]; errors: string[] }` from each old scraper and from `makeSimpleviewScraper(config)()`.
- Produces: no exports (assertion-only).

Steps:

- [ ] **Write the failing parity test.** Create `lib/scrapers/__tests__/simpleview-parity.test.ts`. Both the originals and the factory import `fetchPage` from the same resolved module, so one `vi.mock` covers both; fake timers freeze `Date.now()` for both sides. ACTUAL code:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

vi.mock("@/lib/scrapers/fetch-utils", () => ({ fetchPage: vi.fn() }));

import { fetchPage } from "@/lib/scrapers/fetch-utils";
import { makeSimpleviewScraper, SIMPLEVIEW_FEEDS } from "@/lib/scrapers/regional/simpleview";
import { scrapeVisitEstesPark } from "@/lib/scrapers/regional/visit-estes-park";
import { scrapeVisitGolden } from "@/lib/scrapers/regional/visit-golden";
import { scrapeVisitSteamboatChamber } from "@/lib/scrapers/regional/visit-steamboat-chamber";

const FIX = path.resolve(__dirname, "../../../tests/fixtures/scrapers");
const xml = readFileSync(path.join(FIX, "simpleview-golden.xml"), "utf8");

const PAIRS = [
  ["visit-estes-park", scrapeVisitEstesPark],
  ["visit-golden", scrapeVisitGolden],
  ["visit-steamboat-chamber", scrapeVisitSteamboatChamber],
] as const;

describe("Simpleview factory parity with the original scrapers", () => {
  beforeEach(() => {
    (fetchPage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(xml);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  for (const [source, oldFn] of PAIRS) {
    it(`${source}: factory output equals the original over the same feed`, async () => {
      const config = SIMPLEVIEW_FEEDS.find((f) => f.source === source)!;
      const oldResult = await oldFn();
      const newResult = await makeSimpleviewScraper(config)();
      expect(newResult.source).toBe(oldResult.source);
      expect(newResult.errors).toEqual(oldResult.errors);
      expect(newResult.events).toEqual(oldResult.events);
    });
  }
});
```

- [ ] **Run the parity test — expect PASS.** Command: `npm test -- simpleview-parity`. If any pair diverges, STOP and reconcile the factory (do NOT delete originals until this is green). Expected: 3 passing cases. (Note: the fixture's only convention item uses the shared word "convention" and its convention-by-URL item matches `/conventions_\d+/`, so the union `CONVENTION_TITLE_RX` produces identical skips to each original on this fixture.)

- [ ] **Full suite + typecheck sanity.** Commands: `npm test` then `npx tsc --noEmit` — both green.

- [ ] **Commit.** Command:
```
git add lib/scrapers/__tests__/simpleview-parity.test.ts && git commit -m "Wave 3: parity test proving Simpleview factory matches the 3 originals"
```

---

### Task 3: Wire the factory into index.ts, delete the 3 originals, retire the parity test

With parity proven, register the feeds via a loop, delete the originals, and remove the now-obsolete parity test (it references deleted modules). `SOURCE_PRIORITY` is unchanged here — all 3 sources already appear in it (`source-priority.ts` lines 15-27), so this stays a zero-behavior-change refactor.

**Files:**
- Modify: `lib/scrapers/index.ts` — imports (lines 13-15), scraper registry rows (lines 38-45), add `SIMPLEVIEW_FEEDS` loop (near the `CIVIC_ICS_FEEDS` loop, lines 65-68)
- Delete: `lib/scrapers/regional/visit-estes-park.ts`, `lib/scrapers/regional/visit-golden.ts`, `lib/scrapers/regional/visit-steamboat-chamber.ts`
- Delete (test): `lib/scrapers/__tests__/simpleview-parity.test.ts`
- Unchanged: `lib/scrapers/source-priority.ts` (all 3 sources already present)

**Interfaces:**
- Consumes: `makeSimpleviewScraper(config: SimpleviewScraperConfig): Scraper`, `SIMPLEVIEW_FEEDS: SimpleviewScraperConfig[]` from `./regional/simpleview`.
- Produces: `scrapers` array entries `{ name: feed.source, fn: makeSimpleviewScraper(feed) }` for each feed.

**Decision note (record in the commit / PR):** the three originals' convention-title regexes had drifted (`visit-estes-park` had `summit` but not `symposia`; `visit-golden` had `symposia` but not `summit`; `visit-steamboat-chamber` had neither). The factory uses their **union**. This is a deliberate, precision-safe consolidation: the union is a strict superset, so it can only skip *more* convention/B2B noise, never suppress a real event that a town previously surfaced. The parity test (Task 2) confirms identical output on the captured fixture. If a future real-feed capture reveals a legitimate divergence, add an optional `conventionTitleRx?: RegExp` to `SimpleviewScraperConfig` (default `CONVENTION_TITLE_RX`).

Steps:

- [ ] **Replace the three named imports** in `lib/scrapers/index.ts`. Old (lines 13-15):
```ts
import { scrapeVisitEstesPark } from "./regional/visit-estes-park";
import { scrapeVisitGolden } from "./regional/visit-golden";
import { scrapeVisitSteamboatChamber } from "./regional/visit-steamboat-chamber";
```
New (single import):
```ts
import { makeSimpleviewScraper, SIMPLEVIEW_FEEDS } from "./regional/simpleview";
```

- [ ] **Remove the three Simpleview registry rows** from the `scrapers` array. Old (lines 38-45, keep `chautauqua`/`pikes-peak-center`):
```ts
  // Regional — PRD 2 Phase 2 (Simpleview RSS feeds)
  { name: "visit-estes-park", fn: scrapeVisitEstesPark },
  { name: "visit-golden", fn: scrapeVisitGolden },
  // Regional — PRD 2 Phase 3 (Mountain destinations, Simpleview RSS).
  // Crested Butte / Vail / Aspen / Telluride are handled by the LLM research
  // pipeline (scripts/research-mountain-events.ts) since their event feeds
  // are unstructured or bot-protected.
  { name: "visit-steamboat-chamber", fn: scrapeVisitSteamboatChamber },
```
New (the array now ends after `pikes-peak-center`):
```ts
  // Regional — PRD 2 Phase 1
  { name: "chautauqua", fn: scrapeChautauqua },
  { name: "pikes-peak-center", fn: scrapePikesPeakCenter },
];
```
(The `];` on line 46 stays; just delete the 7 lines above it that made up the two Simpleview blocks.)

- [ ] **Add the SIMPLEVIEW_FEEDS loop.** Insert it immediately after the API-scraper conditionals (after line 54, before the `CIVIC_ICS_FEEDS` block on line 56). Registry/run order does not affect dedup (dedup uses `SOURCE_PRIORITY`, not array order):
```ts
// Wave 3 — the Simpleview /event/rss/ feeds (Estes Park, Golden, Steamboat)
// collapsed into one factory (lib/scrapers/regional/simpleview.ts). Drop a
// VERIFIED /event/rss/ feed in as a SIMPLEVIEW_FEEDS config row (and add its
// `source` to SOURCE_PRIORITY) and it becomes a scraper automatically — same
// doctrine as CIVIC_ICS_FEEDS below. Mountain towns (Vail/Aspen/Breck) stay on
// the LLM research pipeline; their feeds are bot-protected/unstructured.
for (const feed of SIMPLEVIEW_FEEDS) {
  scrapers.push({ name: feed.source, fn: makeSimpleviewScraper(feed) });
}
```

- [ ] **Delete the three originals and the parity test.** Command:
```
git rm lib/scrapers/regional/visit-estes-park.ts lib/scrapers/regional/visit-golden.ts lib/scrapers/regional/visit-steamboat-chamber.ts lib/scrapers/__tests__/simpleview-parity.test.ts
```

- [ ] **Confirm nothing else imports the deleted scrapers.** Command: `rg -n "visit-estes-park|visit-golden|visit-steamboat-chamber" lib scripts app --glob '!**/simpleview*'` — expect only string literals in `lib/scrapers/source-priority.ts` (the SOURCE_PRIORITY entries — those are the `source` keys, which are still valid) and any comment references. Expect **no** remaining `import` statements pointing at the deleted files.

- [ ] **Run the full test suite — expect PASS.** Command: `npm test` — `simpleview.test.ts` still green; no broken imports from the removed parity test.

- [ ] **Typecheck — expect PASS.** Command: `npx tsc --noEmit`.

- [ ] **Build — expect PASS.** Command: `npm run build` (runs `prisma generate && next build`). This is the integration check for the `index.ts` wiring since there is no DB test harness.

- [ ] **Commit.** Command:
```
git add lib/scrapers/index.ts && git commit -m "Wave 3: register Simpleview feeds via SIMPLEVIEW_FEEDS loop; delete the 3 originals

Union convention-title regex is a deliberate precision-safe superset of the 3 drifted originals; parity proven on fixture before deletion."
```

---

### Task 4: Curl-verify Fort Collins + Colorado Springs, add rows iff verified

Front Range expansion. Add the two towns **only** after their `/event/rss/` endpoints curl-verify as live Simpleview feeds returning future-dated items. If either fails to verify, its config row stays commented out (unverified feeds trip the coverage-anomaly alert — same doctrine as the empty `CIVIC_ICS_FEEDS`). Both towns already exist as `DRIVE_TIMES_FROM_DENVER` keys (`lib/regional/drive-times.ts` lines 40 "Fort Collins", 47 "Colorado Springs"), so `deriveRegionalFields` supplies region/drive-time automatically — no drive-times change.

**Files:**
- Modify: `lib/scrapers/regional/simpleview.ts` — append the two config rows to `SIMPLEVIEW_FEEDS` (commented until verified)
- Modify: `lib/scrapers/source-priority.ts` — add `"fort-collins"` and `"colorado-springs"` to `SOURCE_PRIORITY` (lines 15-27), placed **below** `"pikes-peak-center"` so the bespoke Pikes Peak Center venue wins any Colorado Springs town-feed collision (dedup won't collapse different `venueName`s, so priority is the lever — per the spec's risk note)

**Interfaces:** same `SimpleviewScraperConfig` shape as Task 1; no new signatures.

Steps:

- [ ] **Curl-verify Fort Collins.** Command:
```
curl -sSL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" "https://www.visitftcollins.com/event/rss/" | head -c 3000
```
ACCEPT iff: HTTP 200 XML, contains `<item>` blocks, and at least one `<description>` contains an MM/DD/YYYY date at or after today (2026-07-01). REJECT if it 404s, redirects to an HTML (non-RSS) page, returns zero `<item>`s, or all dates are past. Record the outcome.

- [ ] **Curl-verify Colorado Springs.** Command:
```
curl -sSL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" "https://www.visitcos.com/event/rss/" | head -c 3000
```
Same ACCEPT/REJECT criteria. Record the outcome. (If the base host differs, also try the canonical Simpleview host reported by a `curl -sSLI` redirect trace before rejecting.)

- [ ] **Append the config rows to `SIMPLEVIEW_FEEDS`** in `lib/scrapers/regional/simpleview.ts` (insert before the closing `];`). Leave each row **commented out** unless its curl step ACCEPTED. Uncomment only the verified town(s):
```ts
  // Wave 3 — Front Range expansion. Uncomment ONLY after curl-verifying that
  // the /event/rss/ endpoint returns future-dated <item>s (an unverified feed
  // registers a zero-count source and trips the coverage-anomaly alert).
  // {
  //   source: "fort-collins",
  //   feedUrl: "https://www.visitftcollins.com/event/rss/",
  //   town: "Fort Collins",
  //   venueName: "See Visit Fort Collins listing",
  //   descriptionFallback: "Featured via Visit Fort Collins.",
  //   priceRange: "$$",
  //   extraCategoryKeywords: {
  //     FOOD: ["brewery", "beer"],
  //     OUTDOORS: ["recreation", "poudre", "horsetooth"],
  //   },
  // },
  // {
  //   source: "colorado-springs",
  //   feedUrl: "https://www.visitcos.com/event/rss/",
  //   town: "Colorado Springs",
  //   venueName: "See Visit Colorado Springs listing",
  //   descriptionFallback: "Featured via Visit Colorado Springs.",
  //   priceRange: "$$",
  //   extraCategoryKeywords: {
  //     OUTDOORS: ["recreation", "garden of the gods", "pikes peak", "hike"],
  //   },
  // },
```

- [ ] **Add the verified sources to `SOURCE_PRIORITY`** in `lib/scrapers/source-priority.ts`. Insert below `"visit-steamboat-chamber"` and above `"ticketmaster"` (keeps `pikes-peak-center` ranked higher so it wins any Colorado Springs collision). Add only the town(s) you uncommented above. Old (lines 23-25):
```ts
  "visit-estes-park",
  "visit-steamboat-chamber",
  "ticketmaster",
```
New (example, both verified):
```ts
  "visit-estes-park",
  "visit-steamboat-chamber",
  "fort-collins",
  "colorado-springs",
  "ticketmaster",
```
NOTE: the registry-invariant test from Task 1 (`registers every feed source in SOURCE_PRIORITY`) asserts that any *uncommented* `SIMPLEVIEW_FEEDS` source appears in `SOURCE_PRIORITY` — keep them in sync. Commented rows contribute nothing to `SIMPLEVIEW_FEEDS`, so they need no `SOURCE_PRIORITY` entry.

- [ ] **Run the suite — expect PASS.** Command: `npm test -- simpleview` — the registry-invariant tests confirm every active feed source is in `SOURCE_PRIORITY`, has a unique key, and uses a known drive-times town (Fort Collins / Colorado Springs both resolve via `deriveRegionalFields`).

- [ ] **Typecheck + build — expect PASS.** Commands: `npx tsc --noEmit` then `npm run build`.

- [ ] **Commit.** Use a message that reflects the actual verification outcome. If both verified:
```
git add lib/scrapers/regional/simpleview.ts lib/scrapers/source-priority.ts && git commit -m "Wave 3: add Fort Collins + Colorado Springs Simpleview feeds (curl-verified)"
```
If neither/only one verified, commit the commented rows + note in the message which towns stayed out and why (feed 404 / no future items), e.g.:
```
git add lib/scrapers/regional/simpleview.ts && git commit -m "Wave 3: stage Front Range Simpleview rows (Fort Collins/Colorado Springs feeds unverified — left commented)"
```

---

## Final verification (before merge/deploy)

- [ ] `npm test` — full suite green.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run build` — clean (`prisma generate && next build`).
- [ ] Adversarial diff review: confirm (a) the 3 originals are gone and nothing imports them, (b) the union convention regex decision is documented, (c) `SIMPLEVIEW_FEEDS` sources ↔ `SOURCE_PRIORITY` are in sync, (d) any unverified Front Range row is commented out.
- [ ] Deploy is manual `vercel --prod` (owner). No migration, no new cron, no new recurring cost in this item.

## Key file references (absolute paths)

- New factory: `/Users/questtaylor/Documents/apps/pulse-app/pulse/lib/scrapers/regional/simpleview.ts`
- New unit test: `/Users/questtaylor/Documents/apps/pulse-app/pulse/lib/scrapers/__tests__/simpleview.test.ts`
- New fixture: `/Users/questtaylor/Documents/apps/pulse-app/pulse/tests/fixtures/scrapers/simpleview-golden.xml`
- Temporary parity test (created Task 2, deleted Task 3): `/Users/questtaylor/Documents/apps/pulse-app/pulse/lib/scrapers/__tests__/simpleview-parity.test.ts`
- Wiring: `/Users/questtaylor/Documents/apps/pulse-app/pulse/lib/scrapers/index.ts` (imports 13-15, registry 38-45, loop near 56-68)
- Priority: `/Users/questtaylor/Documents/apps/pulse-app/pulse/lib/scrapers/source-priority.ts` (array 15-27)
- Deleted originals: `/Users/questtaylor/Documents/apps/pulse-app/pulse/lib/scrapers/regional/{visit-estes-park,visit-golden,visit-steamboat-chamber}.ts`
- Pattern precedents: `/Users/questtaylor/Documents/apps/pulse-app/pulse/lib/scrapers/ics.ts` (factory), `/Users/questtaylor/Documents/apps/pulse-app/pulse/lib/scrapers/__tests__/visit-denver.test.ts` (`_internals` + fixture load)
- Regional derive: `/Users/questtaylor/Documents/apps/pulse-app/pulse/lib/regional/metadata.ts`; town keys in `/Users/questtaylor/Documents/apps/pulse-app/pulse/lib/regional/drive-times.ts`