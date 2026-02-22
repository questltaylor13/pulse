import * as cheerio from "cheerio";
import { ScrapedEvent, ScraperResult } from "./types";
import { fetchPage } from "./fetch-utils";
import { classifyEvent, extractTags } from "./classify";
import { createHash } from "crypto";

const SOURCE = "303magazine";
const EVENTS_URL = "https://303magazine.com/events/";

function stableId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

interface JsonLdEvent {
  "@type"?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  url?: string;
  image?: string | string[] | { url?: string };
  location?:
    | { name?: string; address?: string | { streetAddress?: string; addressLocality?: string; addressRegion?: string } }
    | { name?: string; address?: string | { streetAddress?: string; addressLocality?: string; addressRegion?: string } }[];
  offers?: { price?: string; priceCurrency?: string; url?: string } | { price?: string; priceCurrency?: string }[];
}

function parseJsonLdEvents(html: string): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).text();
      const data = JSON.parse(raw);

      const items: JsonLdEvent[] = [];
      if (Array.isArray(data)) {
        items.push(...data);
      } else if (data["@graph"] && Array.isArray(data["@graph"])) {
        items.push(...data["@graph"]);
      } else {
        items.push(data);
      }

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
        const loc = Array.isArray(item.location) ? item.location[0] : item.location;
        if (loc) {
          venueName = loc.name || "";
          if (typeof loc.address === "string") {
            address = loc.address;
          } else if (loc.address) {
            address = [loc.address.streetAddress, loc.address.addressLocality, loc.address.addressRegion]
              .filter(Boolean)
              .join(", ");
          }
        }

        let priceRange = "Check source";
        if (item.offers) {
          const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
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
          address,
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

function parseDomEvents(html: string): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];

  // The Events Calendar plugin common selectors
  $(".tribe-events-calendar-list__event, .tribe-common-g-row, .type-tribe_events").each((_, el) => {
    try {
      const $el = $(el);

      const titleEl =
        $el.find(".tribe-events-calendar-list__event-title a, .tribe-events-list-event-title a, h2 a, h3 a").first();
      const title = titleEl.text().trim();
      if (!title) return;

      const sourceUrl = titleEl.attr("href") || EVENTS_URL;

      const timeEl = $el.find("time[datetime], .tribe-events-schedule, .tribe-events-calendar-list__event-datetime");
      const dateStr = timeEl.attr("datetime") || timeEl.text().trim();
      const startTime = new Date(dateStr);
      if (isNaN(startTime.getTime())) return;

      const venueName = $el
        .find(".tribe-events-venue-details a, .tribe-venue, .tribe-events-calendar-list__event-venue")
        .first()
        .text()
        .trim();

      const description = $el
        .find(".tribe-events-list-event-description, .tribe-events-calendar-list__event-description")
        .first()
        .text()
        .trim()
        .slice(0, 500);

      const imageUrl =
        $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || undefined;

      events.push({
        title,
        description,
        category: classifyEvent(title, description),
        tags: extractTags(title, description),
        venueName,
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
  });

  return events;
}

export async function scrape303Magazine(): Promise<ScraperResult> {
  const errors: string[] = [];

  try {
    const html = await fetchPage(EVENTS_URL);

    // Try JSON-LD first (most reliable)
    let events = parseJsonLdEvents(html);

    // Fall back to DOM parsing
    if (events.length === 0) {
      events = parseDomEvents(html);
    }

    if (events.length === 0) {
      errors.push("303 Magazine: no events found via JSON-LD or DOM parsing");
    }

    return { source: SOURCE, events, errors };
  } catch (error) {
    return {
      source: SOURCE,
      events: [],
      errors: [
        `303 Magazine: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}
