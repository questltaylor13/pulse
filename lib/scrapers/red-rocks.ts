import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { ScrapedEvent, ScraperResult } from "./types";
import { fetchPage } from "./fetch-utils";
import { extractTags } from "./classify";

const SOURCE = "red-rocks";
const EVENTS_URL = "https://www.redrocksonline.com/events/";

const MONTH_MAP: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

function stableId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

/**
 * Parse a date string like "Fri, Apr 17, 6:30 pm" combined with "April 2026"
 * (from data-month) into a single Date.
 */
function parseEventDate(
  dateText: string,
  dataMonth: string | undefined
): Date | null {
  if (!dateText) return null;

  // Year comes from data-month ("April 2026"); fall back to current year
  const yearMatch = (dataMonth ?? "").match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();

  // Extract month + day from the date text
  // Match: "Apr 17" or "April 17"
  const mdMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2})/);
  if (!mdMatch) return null;
  const month = MONTH_MAP[mdMatch[1].toLowerCase()];
  if (month === undefined) return null;
  const day = Number(mdMatch[2]);
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;

  // Extract time: "6:30 pm" or "7 pm" or "12:00 AM"
  const timeMatch = dateText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  let hours = 19; // default 7pm — typical show time
  let minutes = 0;
  if (timeMatch) {
    hours = Number(timeMatch[1]) % 12;
    if (timeMatch[3].toLowerCase() === "pm") hours += 12;
    minutes = timeMatch[2] ? Number(timeMatch[2]) : 0;
  }

  // Build in America/Denver (server may be UTC); we store the wall-clock time
  // as an ISO string anchored to Mountain Time. Approx MT offset: UTC-6 (MDT)
  // mid-April through October, UTC-7 (MST) otherwise. Good enough for the
  // feed's day-bucketing; we don't need minute-precision here.
  const isDST = month >= 2 && month <= 10; // roughly Mar-Nov
  const offsetHours = isDST ? 6 : 7;
  const date = new Date(Date.UTC(year, month, day, hours + offsetHours, minutes, 0));
  if (isNaN(date.getTime())) return null;
  return date;
}

function pickImage($img: cheerio.Cheerio<any>): string | undefined {
  const candidates = [
    $img.attr("data-webp-image"),
    $img.attr("data-image"),
    $img.attr("src"),
  ];
  for (const c of candidates) {
    if (c && !c.startsWith("data:")) return c;
  }
  return undefined;
}

function parseListingPage(html: string): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];
  const now = new Date();

  $(".card.card-event").each((_, el) => {
    const $card = $(el);
    const permalink = $card.attr("data-permalink");
    const dataMonth = $card.attr("data-month");

    const title = $card.find(".card-title").first().text().trim();
    const dateText = $card.find(".card-content .date").first().text().trim();
    const supportText = $card.find(".card-content p").first().text().trim();

    if (!title || !dateText) return;
    const startTime = parseEventDate(dateText, dataMonth);
    if (!startTime) return;

    // Skip events that already started (day-resolution) so we don't pollute
    // the feed with yesterday's show if the listing is slow to update.
    if (startTime.getTime() < now.getTime() - 6 * 60 * 60 * 1000) return;

    const imageUrl = pickImage($card.find(".card-image img").first());
    const ticketUrl = $card.find(".card-bottom .buttons a").first().attr("href");

    const description = supportText
      ? `With ${supportText}`
      : `Live at Red Rocks Amphitheatre — ${dateText}.`;

    const tags = extractTags(title, "Red Rocks Amphitheatre");

    events.push({
      title,
      description,
      category: "LIVE_MUSIC",
      tags,
      venueName: "Red Rocks Amphitheatre",
      address: "18300 W Alameda Pkwy, Morrison, CO 80465",
      neighborhood: "Morrison",
      startTime,
      priceRange: "$$$",
      source: SOURCE,
      sourceUrl: permalink || ticketUrl,
      externalId: permalink ? stableId(permalink) : undefined,
      imageUrl,
    });
  });

  return events;
}

export async function scrapeRedRocks(): Promise<ScraperResult> {
  const errors: string[] = [];
  try {
    const html = await fetchPage(EVENTS_URL, 15_000);
    const events = parseListingPage(html);
    if (events.length === 0) {
      errors.push("Red Rocks: no events parsed from listing page");
    }
    return { source: SOURCE, events, errors };
  } catch (error) {
    return {
      source: SOURCE,
      events: [],
      errors: [
        `Red Rocks: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}
