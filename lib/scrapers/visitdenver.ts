import * as cheerio from "cheerio";
import { ScrapedEvent, ScraperResult } from "./types";
import { fetchPage } from "./fetch-utils";
import { classifyEvent, extractTags } from "./classify";
import { createHash } from "crypto";

const SOURCE = "visitdenver";
const EVENTS_URL = "https://www.denver.org/events/";

function stableId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// JSON-LD parser
// ---------------------------------------------------------------------------

interface JsonLdEvent {
  "@type"?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  url?: string;
  image?: string | string[] | { url?: string };
  location?:
    | {
        name?: string;
        address?:
          | string
          | {
              streetAddress?: string;
              addressLocality?: string;
              addressRegion?: string;
            };
      }
    | {
        name?: string;
        address?:
          | string
          | {
              streetAddress?: string;
              addressLocality?: string;
              addressRegion?: string;
            };
      }[];
  offers?:
    | { price?: string; priceCurrency?: string }
    | { price?: string; priceCurrency?: string }[];
}

function parseJsonLdEvents(html: string): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).text();
      const data = JSON.parse(raw);

      const items: JsonLdEvent[] = [];
      if (Array.isArray(data)) items.push(...data);
      else if (data["@graph"] && Array.isArray(data["@graph"]))
        items.push(...data["@graph"]);
      else items.push(data);

      for (const item of items) {
        if (item["@type"] !== "Event") continue;
        if (!item.name || !item.startDate) continue;

        const title = item.name;
        const description = item.description || "";
        const startTime = new Date(item.startDate);
        if (isNaN(startTime.getTime())) continue;

        const endTime = item.endDate ? new Date(item.endDate) : undefined;
        const sourceUrl = item.url || EVENTS_URL;

        let imageUrl: string | undefined;
        if (typeof item.image === "string") imageUrl = item.image;
        else if (Array.isArray(item.image)) imageUrl = item.image[0];
        else if (item.image?.url) imageUrl = item.image.url;

        let venueName = "";
        let address = "";
        const loc = Array.isArray(item.location)
          ? item.location[0]
          : item.location;
        if (loc) {
          venueName = loc.name || "";
          if (typeof loc.address === "string") {
            address = loc.address;
          } else if (loc.address) {
            address = [
              loc.address.streetAddress,
              loc.address.addressLocality,
              loc.address.addressRegion,
            ]
              .filter(Boolean)
              .join(", ");
          }
        }

        let priceRange = "Check source";
        if (item.offers) {
          const offer = Array.isArray(item.offers)
            ? item.offers[0]
            : item.offers;
          if (offer?.price === "0" || offer?.price === "0.00") {
            priceRange = "Free";
          } else if (offer?.price) {
            priceRange = `$${offer.price}`;
          }
        }

        events.push({
          title,
          description: description.slice(0, 500),
          category: classifyEvent(title, description),
          tags: extractTags(title, description),
          venueName,
          address: address || "Denver, CO",
          startTime,
          endTime: endTime && !isNaN(endTime.getTime()) ? endTime : undefined,
          priceRange,
          source: SOURCE,
          sourceUrl,
          externalId: stableId(sourceUrl),
          imageUrl,
        });
      }
    } catch {
      // skip malformed JSON-LD blocks
    }
  });

  return events;
}

// ---------------------------------------------------------------------------
// DOM fallback — Visit Denver uses a custom CMS
// ---------------------------------------------------------------------------

function parseDomEvents(html: string): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];

  // Visit Denver event card selectors
  $(".event-card, .listing-item, .events-list-item, [class*='event']").each(
    (_, el) => {
      try {
        const $el = $(el);

        // Title
        const titleEl = $el.find("h2 a, h3 a, .event-title a, a.title").first();
        const title = titleEl.text().trim();
        if (!title || title.length < 3) return;

        // URL
        const href = titleEl.attr("href") || "";
        const sourceUrl = href.startsWith("http")
          ? href
          : `https://www.denver.org${href}`;

        // Date
        const dateEl = $el.find(
          "time[datetime], .event-date, .date, [class*='date']",
        );
        const dateStr = dateEl.attr("datetime") || dateEl.text().trim();
        const startTime = new Date(dateStr);
        if (isNaN(startTime.getTime())) return;

        // Venue
        const venueName = $el
          .find(".venue, .location, [class*='venue'], [class*='location']")
          .first()
          .text()
          .trim();

        // Description
        const description = $el
          .find(".description, .summary, p")
          .first()
          .text()
          .trim()
          .slice(0, 500);

        // Image
        const imageUrl =
          $el.find("img").first().attr("src") ||
          $el.find("img").first().attr("data-src") ||
          undefined;

        events.push({
          title,
          description,
          category: classifyEvent(title, description),
          tags: extractTags(title, description),
          venueName: venueName || "",
          address: "Denver, CO",
          startTime,
          priceRange: "Check source",
          source: SOURCE,
          sourceUrl,
          externalId: stableId(sourceUrl),
          imageUrl,
        });
      } catch {
        // skip individual event parse failures
      }
    },
  );

  return events;
}

// ---------------------------------------------------------------------------
// Public scraper
// ---------------------------------------------------------------------------

export async function scrapeVisitDenver(): Promise<ScraperResult> {
  const errors: string[] = [];

  try {
    const html = await fetchPage(EVENTS_URL);

    // Try JSON-LD first
    let events = parseJsonLdEvents(html);

    // Fall back to DOM parsing
    if (events.length === 0) {
      events = parseDomEvents(html);
    }

    if (events.length === 0) {
      errors.push("Visit Denver: no events found via JSON-LD or DOM parsing");
    }

    return { source: SOURCE, events, errors };
  } catch (error) {
    return {
      source: SOURCE,
      events: [],
      errors: [
        `Visit Denver: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}
