import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { ScrapedEvent, ScraperResult } from "./types";
import { fetchPage } from "./fetch-utils";
import { classifyEvent, extractTags } from "./classify";
import type { Category } from "@prisma/client";

const SOURCE = "visit-denver";
const RSS_URL = "https://www.visitdenver.com/event/rss/";

function stableId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

/**
 * Visit Denver's Simpleview CMS exposes a public RSS feed that bypasses the
 * client-side widget + Akamai-protected JSON API. Each <item> carries title,
 * link, one or more <category> tags, and a CDATA description containing the
 * event's date range (MM/DD/YYYY) and a short blurb.
 *
 * The <pubDate> is always end-of-day on the event's *last* day (it's the
 * feed's expiry marker, not the start time), so we parse the real dates out
 * of the description body.
 */

const DATE_RX = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;

interface RawItem {
  title: string;
  link: string;
  categories: string[];
  pubDate: string;
  descriptionHtml: string;
}

function parseItems(rssXml: string): RawItem[] {
  const $ = cheerio.load(rssXml, { xmlMode: true });
  const items: RawItem[] = [];

  $("item").each((_, el) => {
    const $el = $(el);
    const title = $el.find("title").first().text().trim();
    const link = $el.find("link").first().text().trim();
    const pubDate = $el.find("pubDate").first().text().trim();
    const categories = $el
      .find("category")
      .map((_, c) => $(c).text().trim())
      .get()
      .filter(Boolean);
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
    // Anchor at 19:00 Mountain Time — most Denver events are evening.
    // MT is UTC-6 (DST) ~Mar–Nov, UTC-7 otherwise. We use a flat offset
    // that's close enough for day-bucketing in the feed.
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
  // Strip HTML, collapse whitespace, drop leading date-range text
  const $ = cheerio.load(`<div>${descriptionHtml}</div>`);
  const text = $("div").text().replace(/\s+/g, " ").trim();
  // Remove standalone "MM/DD/YYYY to MM/DD/YYYY - " prefixes
  return text.replace(/^\d{2}\/\d{2}\/\d{4}(?:\s*to\s*\d{2}\/\d{2}\/\d{4})?\s*-\s*/i, "").trim();
}

function categoryFromRssTag(tags: string[], title: string, venue: string): Category {
  const joined = tags.join(" ").toLowerCase();
  if (/food|drink|dining|restaurant/.test(joined)) return "FOOD";
  if (/music|concert/.test(joined)) return "LIVE_MUSIC";
  if (/art|museum|visual|gallery|theater|theatre|performing/.test(joined)) return "ART";
  if (/festival|holiday|seasonal/.test(joined)) return "SEASONAL";
  if (/sport|fitness|outdoor/.test(joined)) return "OUTDOORS";
  if (/comedy/.test(joined)) return "COMEDY";
  if (/nightlife|bar|club/.test(joined)) return "BARS";
  if (/family|kids/.test(joined)) return "SOCIAL";
  // Fall back to the cross-source classifier
  return classifyEvent(title, venue);
}

export async function scrapeVisitDenver(): Promise<ScraperResult> {
  const errors: string[] = [];
  try {
    const rss = await fetchPage(RSS_URL, 15_000);
    const items = parseItems(rss);

    const events: ScrapedEvent[] = [];
    const now = Date.now();

    for (const item of items) {
      // VisitDenver's RSS mixes in their convention/meeting calendar. URLs
      // like /event/.../conventions_XXXXX/ are B2B — skip them entirely.
      if (/\/conventions?_\d+/i.test(item.link)) continue;
      if (/\b(conference|convention|seminar|symposium|summit|training|meeting|exposition)\b/i.test(item.title)) {
        continue;
      }
      const { start, end } = parseDateRange(item.descriptionHtml);
      // Effective event date: use start if future, else end if future (multi-
      // day / ongoing exhibits), else skip.
      let effectiveStart: Date | null = null;
      if (start && start.getTime() > now - 24 * 60 * 60 * 1000) effectiveStart = start;
      else if (end && end.getTime() > now) effectiveStart = new Date(Math.max(now, end.getTime() - 60 * 60 * 1000));
      if (!effectiveStart) continue;

      const description = cleanDescription(item.descriptionHtml) || "Featured via VisitDenver.";
      const venueName = "See VisitDenver listing";
      const category = categoryFromRssTag(item.categories, item.title, venueName);
      const tags = Array.from(
        new Set([...extractTags(item.title, venueName), ...item.categories.map((c) => c.toLowerCase().replace(/\s+/g, "-"))])
      );

      events.push({
        title: item.title,
        description,
        category,
        tags,
        venueName,
        address: "Denver, CO",
        startTime: effectiveStart,
        endTime: end && end.getTime() > effectiveStart.getTime() ? end : undefined,
        priceRange: "$$",
        source: SOURCE,
        sourceUrl: item.link,
        externalId: stableId(item.link),
      });
    }

    if (events.length === 0) {
      errors.push("visit-denver: RSS feed returned no future-dated items");
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
