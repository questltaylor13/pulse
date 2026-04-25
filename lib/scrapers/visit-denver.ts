import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { ScrapedEvent, ScraperResult } from "./types";
import { fetchPage } from "./fetch-utils";
import { classifyEvent, extractTags } from "./classify";
import type { Category } from "@prisma/client";

const SOURCE = "visit-denver";
const BASE = "https://visitdenver.com";
const LIST_URL = `${BASE}/events/`;

// Diagnosed 2026-04-25: the Simpleview RSS feed (/event/rss/) misses the
// short-window events (earliest entry was 7+ days out, 0 events for "today").
// /events/calendar/ is fully JS-rendered — useless for static fetch. The
// /events/ root page lists ~49 unique event URLs inline. Each detail page
// carries a clean schema.org ld+json Event block with startDate, endDate,
// location, image, and description. We list -> fan out concurrently to
// detail pages -> parse ld+json.

// Cap detail-page fetches per run to stay within PER_SCRAPER_TIMEOUT (10s).
// 30 pages * ~150ms warm CDN / concurrency 5 ~= 1s. Listing order is
// "featured first" so we get the highest-signal events when we slice.
const MAX_DETAIL_FETCHES = 30;
const DETAIL_CONCURRENCY = 5;
const JITTER_MS = 150;

function stableId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

const SKIP_TITLE_RX =
  /\b(conference|convention|seminar|symposium|summit|training|meeting|exposition)\b/i;
const SKIP_URL_RX = /\/conventions?_\d+/i;

interface LdJsonEvent {
  "@type"?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  image?: string;
  url?: string;
  location?: {
    name?: string;
    address?: {
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
    };
  };
}

function parseEventUrlsFromListing(html: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $('a[href*="/event/"]').each((_, el) => {
    const href = ($(el).attr("href") || "").split("?")[0];
    if (/^\/event\/[a-zA-Z0-9%-]+\/\d+\/?$/.test(href)) {
      urls.add(`${BASE}${href}`);
    }
  });
  return Array.from(urls);
}

function parseLdJson(html: string): LdJsonEvent | null {
  const $ = cheerio.load(html);
  let parsed: LdJsonEvent | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (parsed) return;
    const raw = $(el).contents().text();
    try {
      const obj = JSON.parse(raw);
      const candidate = Array.isArray(obj)
        ? obj.find((o: LdJsonEvent) => o["@type"] === "Event")
        : obj;
      if (candidate && candidate["@type"] === "Event") {
        parsed = candidate as LdJsonEvent;
      }
    } catch {
      // ignore broken json
    }
  });
  return parsed;
}

function buildAddress(loc?: LdJsonEvent["location"]): string {
  if (!loc?.address) return "Denver, CO";
  const a = loc.address;
  const street = a.streetAddress?.trim();
  const city = a.addressLocality?.trim() || "Denver";
  const region = a.addressRegion?.trim() || "CO";
  const zip = a.postalCode?.trim();
  const cityRegion = `${city}, ${region}${zip ? ` ${zip}` : ""}`;
  return [street, cityRegion].filter(Boolean).join(", ");
}

// Convert "2026-05-02" or full ISO datetime into a Date. Date-only values
// are anchored at 19:00 Mountain Time (DST-aware) — most VD events are
// evening, and same-day bucketing in the home feed is what we care about.
export function parseEventDate(s: string | undefined): Date | null {
  if (!s) return null;
  if (s.includes("T")) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  const isDST = mm >= 3 && mm <= 10;
  const offset = isDST ? 6 : 7;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd, 19 + offset, 0, 0));
  return isNaN(d.getTime()) ? null : d;
}

const VD_CATEGORY_RULES: [RegExp, Category][] = [
  [/food|drink|dining|restaurant/i, "FOOD"],
  [/music|concert/i, "LIVE_MUSIC"],
  [/art|museum|visual|gallery|theater|theatre|performing/i, "ART"],
  [/festival|holiday|seasonal/i, "SEASONAL"],
  [/sport|fitness|outdoor/i, "OUTDOORS"],
  [/comedy/i, "COMEDY"],
  [/nightlife|bar|club/i, "BARS"],
  [/family|kids/i, "SOCIAL"],
];

function categorize(title: string, description: string, venue: string): Category {
  const haystack = `${title} ${description}`;
  for (const [rx, cat] of VD_CATEGORY_RULES) {
    if (rx.test(haystack)) return cat;
  }
  return classifyEvent(title, venue);
}

async function fetchInBatches<T>(
  items: string[],
  handler: (url: string) => Promise<T | null>,
  concurrency: number,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((u) => handler(u).catch(() => null)),
    );
    for (const r of results) if (r) out.push(r);
    if (i + concurrency < items.length) {
      const wait = JITTER_MS + Math.floor(Math.random() * JITTER_MS);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return out;
}

export function buildEventFromLdJson(
  ld: LdJsonEvent,
  url: string,
  now = Date.now(),
): ScrapedEvent | null {
  if (!ld?.name) return null;
  if (SKIP_TITLE_RX.test(ld.name)) return null;
  if (SKIP_URL_RX.test(url)) return null;

  const start = parseEventDate(ld.startDate);
  const end = parseEventDate(ld.endDate);
  if (!start) return null;

  // Drop past events; keep ongoing exhibits (start in past, end in future).
  const oneDayMs = 24 * 60 * 60 * 1000;
  const isOngoing = end && end.getTime() > now && start.getTime() < now;
  if (start.getTime() < now - oneDayMs && !isOngoing) return null;

  const venueName = ld.location?.name?.trim() || "See VisitDenver listing";
  const description = (ld.description || "").trim() || "Featured via VisitDenver.";
  const category = categorize(ld.name, description, venueName);
  const tags = extractTags(ld.name, venueName);

  return {
    title: ld.name,
    description,
    category,
    tags,
    venueName,
    address: buildAddress(ld.location),
    startTime: isOngoing ? new Date(Math.max(now, start.getTime())) : start,
    endTime: end && end.getTime() > start.getTime() ? end : undefined,
    priceRange: "$$",
    source: SOURCE,
    sourceUrl: url,
    externalId: stableId(url),
    imageUrl: ld.image?.trim() || undefined,
  };
}

export async function scrapeVisitDenver(): Promise<ScraperResult> {
  const errors: string[] = [];
  try {
    const listingHtml = await fetchPage(LIST_URL, 6_000);
    const eventUrls = parseEventUrlsFromListing(listingHtml).slice(
      0,
      MAX_DETAIL_FETCHES,
    );

    if (eventUrls.length === 0) {
      return {
        source: SOURCE,
        events: [],
        errors: ["visit-denver: no event links found on /events/"],
      };
    }

    const now = Date.now();
    const events = await fetchInBatches(
      eventUrls,
      async (url): Promise<ScrapedEvent | null> => {
        try {
          const detail = await fetchPage(url, 5_000);
          const ld = parseLdJson(detail);
          if (!ld) return null;
          return buildEventFromLdJson(ld, url, now);
        } catch {
          return null;
        }
      },
      DETAIL_CONCURRENCY,
    );

    if (events.length === 0) {
      errors.push(
        "visit-denver: no future-dated events extracted from /events/ detail pages",
      );
    }

    return { source: SOURCE, events, errors };
  } catch (error) {
    return {
      source: SOURCE,
      events: [],
      errors: [
        `visit-denver: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}

// Exported for tests
export const _internals = {
  parseEventUrlsFromListing,
  parseLdJson,
  buildEventFromLdJson,
  parseEventDate,
};
