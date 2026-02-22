import * as cheerio from "cheerio";
import { ScrapedEvent, ScraperResult } from "./types";
import { fetchPage } from "./fetch-utils";
import { classifyEvent, extractTags } from "./classify";
import { createHash } from "crypto";

const SOURCE = "do303";
const EVENTS_URL = "https://do303.com/events";

function stableId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export async function scrapeDenverEvents(): Promise<ScraperResult> {
  const errors: string[] = [];

  try {
    const html = await fetchPage(EVENTS_URL);
    const $ = cheerio.load(html);
    const events: ScrapedEvent[] = [];

    // Do303 event cards — look for event links with year-based URL patterns
    const eventLinks = new Set<string>();

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      // Match /events/YYYY/... or full URLs containing /events/YYYY/
      if (/\/events\/20\d{2}\//.test(href)) {
        const fullUrl = href.startsWith("http") ? href : `https://do303.com${href}`;
        eventLinks.add(fullUrl);
      }
    });

    // Parse event cards from the listing page
    $(".ds-listing, .ds-event-card, [class*='event-card'], [class*='listing']").each((_, el) => {
      try {
        const $el = $(el);

        const linkEl = $el.find("a[href*='/events/']").first();
        const sourceUrl = linkEl.attr("href") || "";
        const fullUrl = sourceUrl.startsWith("http") ? sourceUrl : `https://do303.com${sourceUrl}`;

        const title =
          $el.find(".ds-listing-event-title, h3, h2, [class*='title']").first().text().trim() ||
          linkEl.text().trim();
        if (!title || title.length < 3) return;

        const venueEl = $el.find("a[href*='/venues/'], [class*='venue']").first();
        const venueName = venueEl.text().trim();

        const timeText =
          $el.find(".ds-event-time, time, [class*='date'], [class*='time']").first().text().trim() ||
          $el.find("time").attr("datetime") ||
          "";

        let startTime: Date;
        const datetimeAttr = $el.find("time[datetime]").attr("datetime");
        if (datetimeAttr) {
          startTime = new Date(datetimeAttr);
        } else {
          // Try to extract date from URL pattern /events/YYYY/MM/DD/
          const urlMatch = fullUrl.match(/\/events\/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
          if (urlMatch) {
            // Default to noon Mountain time (19:00 UTC) when no specific time available
            startTime = new Date(
              Date.UTC(
                parseInt(urlMatch[1]),
                parseInt(urlMatch[2]) - 1,
                parseInt(urlMatch[3]),
                19, 0, 0
              )
            );
          } else {
            startTime = new Date(timeText);
          }
        }

        if (isNaN(startTime.getTime())) return;

        events.push({
          title,
          description: "",
          category: classifyEvent(title, venueName),
          tags: extractTags(title, venueName),
          venueName,
          address: "Denver, CO",
          startTime,
          priceRange: "Check source",
          source: SOURCE,
          sourceUrl: fullUrl,
          externalId: stableId(fullUrl),
        });
      } catch {
        // skip individual parse failures
      }
    });

    // If card parsing didn't work, try a broader approach using the collected links
    if (events.length === 0 && eventLinks.size > 0) {
      // Extract any event data from the page using a looser approach
      $("a[href*='/events/20']").each((_, el) => {
        try {
          const $a = $(el);
          const href = $a.attr("href") || "";
          const fullUrl = href.startsWith("http") ? href : `https://do303.com${href}`;

          // Get title from the link text or parent heading
          const title = $a.text().trim() || $a.closest("div").find("h2, h3, h4").first().text().trim();
          if (!title || title.length < 3 || title.length > 200) return;

          // Skip navigation links (usually short generic text)
          if (["events", "see all", "more", "view all"].includes(title.toLowerCase())) return;

          const urlMatch = fullUrl.match(/\/events\/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
          if (!urlMatch) return;

          const startTime = new Date(
            Date.UTC(
              parseInt(urlMatch[1]),
              parseInt(urlMatch[2]) - 1,
              parseInt(urlMatch[3]),
              2, 0, 0
            )
          );
          if (isNaN(startTime.getTime())) return;

          // Deduplicate by URL
          if (events.some((e) => e.sourceUrl === fullUrl)) return;

          events.push({
            title,
            description: "",
            category: classifyEvent(title, ""),
            tags: extractTags(title, ""),
            venueName: "",
            address: "Denver, CO",
            startTime,
            priceRange: "Check source",
            source: SOURCE,
            sourceUrl: fullUrl,
            externalId: stableId(fullUrl),
          });
        } catch {
          // skip
        }
      });
    }

    if (events.length === 0) {
      errors.push("Do303: no events found on listing page");
    }

    return { source: SOURCE, events, errors };
  } catch (error) {
    return {
      source: SOURCE,
      events: [],
      errors: [`Do303: ${error instanceof Error ? error.message : "Unknown error"}`],
    };
  }
}
