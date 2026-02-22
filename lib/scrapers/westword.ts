import * as cheerio from "cheerio";
import { ScrapedEvent, ScraperResult } from "./types";
import { fetchPage } from "./fetch-utils";
import { classifyEvent, extractTags } from "./classify";
import { createHash } from "crypto";

const SOURCE = "westword";
const EVENTS_URL = "https://www.westword.com/things-to-do/";

function stableId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

/**
 * Parse a Westword date string like "Sun., Feb 22, 1:00 pm" or
 * "Sun., Feb 22, 6:00 pm – 8:00 pm" or "Every Sunday, 10:30 AM"
 * into a Date. Returns null if unparseable.
 */
function parseWestwordDate(dateStr: string): { start: Date; end?: Date } | null {
  // Clean HTML entities
  const cleaned = dateStr.replace(/&#8211;/g, "–").replace(/\s+/g, " ").trim();

  // "Every <day>" recurring events — anchor to next occurrence
  const recurringMatch = cleaned.match(
    /every\s+(\w+),?\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i,
  );
  if (recurringMatch) {
    const dayName = recurringMatch[1];
    const timeStr = recurringMatch[2];
    const now = new Date();
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const targetDay = dayMap[dayName.toLowerCase()];
    if (targetDay === undefined) return null;

    const daysAhead = (targetDay - now.getDay() + 7) % 7 || 7;
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + daysAhead);

    const parsed = new Date(
      `${nextDate.toDateString()} ${timeStr}`,
    );
    return isNaN(parsed.getTime()) ? null : { start: parsed };
  }

  // "Mon., Feb 22, 1:00 pm" or "Mon., Feb 22, 1:00 pm – 3:00 pm"
  // Strip the day abbreviation prefix
  const withoutDay = cleaned.replace(/^\w+\.,?\s*/, "");
  const currentYear = new Date().getFullYear();

  // Split on dash for start/end
  const parts = withoutDay.split(/\s*[–-]\s*/);
  const startStr = `${parts[0]}, ${currentYear}`;
  const start = new Date(startStr);
  if (isNaN(start.getTime())) return null;

  let end: Date | undefined;
  if (parts[1]) {
    // End time might be just "8:00 pm" (same day) or a full date
    const endStr = parts[1].match(/^\d{1,2}:\d{2}\s*(?:AM|PM)$/i)
      ? `${parts[0].replace(/\d{1,2}:\d{2}\s*(?:AM|PM)/i, parts[1])}, ${currentYear}`
      : `${parts[1]}, ${currentYear}`;
    end = new Date(endStr);
    if (isNaN(end.getTime())) end = undefined;
  }

  return { start, end };
}

function parseDomEvents(html: string): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];

  $("a.event-item").each((_, el) => {
    try {
      const $el = $(el);

      // Title
      const title = $el.find(".event-title").text().trim();
      if (!title || title.length < 3) return;

      // URL
      const sourceUrl = $el.attr("href") || EVENTS_URL;

      // Date/time
      const dateStr = $el.find(".event-occurrences").text().trim();
      const parsed = parseWestwordDate(dateStr);
      if (!parsed) return;

      // Venue
      const venueName = $el.find(".location-name").text().trim();
      const address = $el.find(".location-address").text().trim() || "Denver, CO";

      // Neighborhood
      const neighborhoodText = $el.find(".location-neighbourhood strong").text().trim();
      const neighborhood = neighborhoodText || undefined;

      // Price
      const priceText = $el.find(".ticket-price").text().trim();
      const priceRange = priceText || "Check source";

      // Image (skip placeholder images)
      const imgEl = $el.find(".event-image img").first();
      const imgSrc = imgEl.attr("src") || undefined;
      const isPlaceholder = imgEl.hasClass("thumbnail-placeholder");
      const imageUrl = isPlaceholder ? undefined : imgSrc;

      events.push({
        title,
        description: "",
        category: classifyEvent(title, venueName),
        tags: extractTags(title, venueName),
        venueName: venueName || "",
        address,
        neighborhood,
        startTime: parsed.start,
        endTime: parsed.end,
        priceRange,
        source: SOURCE,
        sourceUrl,
        externalId: stableId(sourceUrl),
        imageUrl,
      });
    } catch {
      // skip individual event parse failures
    }
  });

  return events;
}

export async function scrapeWestword(): Promise<ScraperResult> {
  const errors: string[] = [];

  try {
    const html = await fetchPage(EVENTS_URL);
    const events = parseDomEvents(html);

    if (events.length === 0) {
      errors.push("Westword: no events found on /things-to-do/");
    }

    return { source: SOURCE, events, errors };
  } catch (error) {
    return {
      source: SOURCE,
      events: [],
      errors: [
        `Westword: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}
