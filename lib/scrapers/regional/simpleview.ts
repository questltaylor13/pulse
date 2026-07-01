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
