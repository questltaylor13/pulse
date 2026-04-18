import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { ScrapedEvent, ScraperResult } from "../types";
import { fetchPage } from "../fetch-utils";
import { classifyEvent, extractTags } from "../classify";

const SOURCE = "pikes-peak-center";
const RSS_URL = "https://www.pikespeakcenter.com/events/rss/";
const TOWN = "Colorado Springs";

function stableId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function stripHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pikes Peak Center's RSS feed uses the `ev` namespace with <ev:startdate>
 * and <ev:location> tags — a proper event feed, not a blog feed. One of the
 * cleanest regional event sources we've found.
 */
export async function scrapePikesPeakCenter(): Promise<ScraperResult> {
  const errors: string[] = [];
  try {
    const xml = await fetchPage(RSS_URL, 15_000);
    const $ = cheerio.load(xml, { xmlMode: true });
    const events: ScrapedEvent[] = [];
    const now = Date.now();

    $("item").each((_, el) => {
      const $el = $(el);
      const title = $el.find("title").first().text().trim();
      const link = $el.find("link").first().text().trim();
      const startRaw =
        $el.find("ev\\:startdate, startdate").first().text().trim() ||
        $el.find("dc\\:date, date").first().text().trim();
      const endRaw = $el.find("ev\\:enddate, enddate").first().text().trim();
      const location =
        $el.find("ev\\:location, location").first().text().trim() ||
        "Pikes Peak Center";
      const descriptionRaw = $el.find("description").first().text();

      if (!title || !link || !startRaw) return;

      const startTime = new Date(startRaw);
      if (isNaN(startTime.getTime())) return;
      if (startTime.getTime() < now - 6 * 60 * 60 * 1000) return;

      const endTime = endRaw ? new Date(endRaw) : undefined;
      const validEnd = endTime && !isNaN(endTime.getTime()) && endTime.getTime() > startTime.getTime() ? endTime : undefined;

      const description = stripHtml(descriptionRaw).slice(0, 500) || `At ${location} in Colorado Springs.`;
      const venueName = location || "Pikes Peak Center";
      const category = classifyEvent(title, venueName);
      const tags = extractTags(title, venueName);

      events.push({
        title,
        description,
        category,
        tags,
        venueName,
        address: "190 S Cascade Ave, Colorado Springs, CO 80903",
        neighborhood: TOWN,
        startTime,
        endTime: validEnd,
        priceRange: "$$$",
        source: SOURCE,
        sourceUrl: link,
        externalId: stableId(link),
      });
    });

    if (events.length === 0) {
      errors.push("pikes-peak-center: RSS returned no future items");
    }
    return { source: SOURCE, events, errors };
  } catch (error) {
    return {
      source: SOURCE,
      events: [],
      errors: [
        `pikes-peak-center: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}
