import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { ScrapedEvent, ScraperResult } from "../types";
import { fetchPage } from "../fetch-utils";
import { classifyEvent, extractTags } from "../classify";

const SOURCE = "chautauqua";
const EVENTS_URL = "https://www.chautauqua.com/events/list/";
const TOWN = "Boulder"; // Colorado Chautauqua sits on Chautauqua Park in Boulder proper.

function stableId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

/**
 * Parse Tribe Events Calendar DOM blocks on Chautauqua's /events/list/ page.
 * Each event renders as an <article class="tribe_events ..."> with a
 * <time datetime="YYYY-MM-DD"> for the date tag, a <time datetime="HH:MM">
 * for the start time, and a detail-page link.
 */
function parseEvents(html: string): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];
  const now = Date.now();

  $("article.tribe_events").each((_, el) => {
    const $art = $(el);

    // Title + detail URL
    const titleLink = $art.find("a.tribe-events-pro-photo__event-title-link, h3 a, .tribe-events-calendar-list__event-title-link").first();
    let title = titleLink.text().trim();
    let url = titleLink.attr("href");

    // Some Tribe layouts put the title-bearing link on the date-recurring-link
    // if there isn't a dedicated h3; fall back to the first event/... anchor.
    if (!url) {
      url = $art.find('a[href*="/event/"]').first().attr("href");
    }
    if (!title) {
      // Fall back to a nearby heading or the URL slug
      title = $art.find("h3, h4, .tribe-events-calendar-list__event-title").first().text().trim();
    }
    if (!title && url) {
      const slug = url.split("/").filter(Boolean).pop() ?? "";
      title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    if (!title || !url) return;

    // Date: the outer <time datetime="YYYY-MM-DD"> on the date tag
    const dateStr = $art.find('time[datetime]').first().attr("datetime");
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;

    // Time: the inner <time datetime="HH:MM">
    const timeStr = $art.find('time[datetime]').eq(1).attr("datetime");
    let hours = 19; // default 7pm
    let minutes = 0;
    if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [h, m] = timeStr.split(":").map(Number);
      hours = h;
      minutes = m;
    }

    // Anchor at wall-clock Mountain Time. Denver DST ~Mar–Nov (UTC-6 MDT,
    // UTC-7 MST). Day-bucket precision is plenty here.
    const [y, mo, d] = dateStr.split("-").map(Number);
    const isDST = mo >= 3 && mo <= 10;
    const offset = isDST ? 6 : 7;
    const startTime = new Date(Date.UTC(y, mo - 1, d, hours + offset, minutes, 0));
    if (isNaN(startTime.getTime())) return;
    if (startTime.getTime() < now - 6 * 60 * 60 * 1000) return;

    // Image (optional) — either <img data-src> inside the card or inline
    // background-image style on the details wrapper.
    let imageUrl = $art.find("img").first().attr("data-src") || $art.find("img").first().attr("src");
    if (!imageUrl) {
      const bg = $art.find("[style*='background-image']").first().attr("style") ?? "";
      const m = bg.match(/url\(['"]?([^'")]+)['"]?\)/);
      if (m) imageUrl = m[1];
    }

    const description = $art.find(".tribe-events-calendar-list__event-description, .tribe-events-pro-photo__event-description").first().text().trim();

    const venueName = "Colorado Chautauqua";
    const category = classifyEvent(title, venueName);
    const tags = extractTags(title, venueName);

    events.push({
      title,
      description: description || "At the Colorado Chautauqua in Boulder.",
      category,
      tags,
      venueName,
      address: "900 Baseline Rd, Boulder, CO 80302",
      neighborhood: TOWN,
      startTime,
      priceRange: "$$",
      source: SOURCE,
      sourceUrl: url,
      externalId: stableId(url),
      imageUrl,
    });
  });

  return events;
}

export async function scrapeChautauqua(): Promise<ScraperResult> {
  const errors: string[] = [];
  try {
    const html = await fetchPage(EVENTS_URL, 15_000);
    const events = parseEvents(html);
    if (events.length === 0) {
      errors.push("chautauqua: no events parsed from Tribe list DOM");
    }
    return { source: SOURCE, events, errors };
  } catch (error) {
    return {
      source: SOURCE,
      events: [],
      errors: [
        `chautauqua: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}
