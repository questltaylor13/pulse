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

    // Do303 uses schema.org microdata with itemtype="http://schema.org/Event"
    $('[itemtype="http://schema.org/Event"]').each((_, el) => {
      try {
        const $el = $(el);

        // Title: first itemprop="name" that isn't inside a Place
        const $place = $el.find('[itemtype="http://schema.org/Place"]');
        const placeNameText = $place.find('[itemprop="name"]').first().text().trim();

        // Get event name - find itemprop="name" NOT inside the Place scope
        let title = "";
        $el.find('[itemprop="name"]').each((_, nameEl) => {
          const t = $(nameEl).text().trim();
          if (t && t !== placeNameText && !title) {
            title = t;
          }
        });
        if (!title || title.length < 3) return;

        // URL: event link
        const linkEl = $el.find("a[href*='/events/20']").first();
        const href = linkEl.attr("href") || "";
        const sourceUrl = href.startsWith("http") ? href : `https://do303.com${href}`;

        // Start time: itemprop="startDate" with datetime attribute
        const startDateEl = $el.find('[itemprop="startDate"]');
        const datetimeStr = startDateEl.attr("datetime") || startDateEl.attr("content") || "";
        const startTime = datetimeStr ? new Date(datetimeStr) : null;
        if (!startTime || isNaN(startTime.getTime())) return;

        // Venue from Place schema
        const venueName = placeNameText || "";

        // Address from Place schema
        const street = $place.find('[itemprop="streetAddress"]').attr("content") || "";
        const locality = $place.find('[itemprop="addressLocality"]').attr("content") || "";
        const region = $place.find('[itemprop="addressRegion"]').attr("content") || "";
        const address = [street, locality, region].filter(Boolean).join(", ") || "Denver, CO";

        // Image from background-image CSS
        let imageUrl: string | undefined;
        $el.find("[style*='background-image']").each((_, imgEl) => {
          if (imageUrl) return;
          const style = $(imgEl).attr("style") || "";
          const match = style.match(/background-image:\s*url\('(https:\/\/assets[^']+)'\)/);
          if (match) imageUrl = match[1];
        });

        events.push({
          title,
          description: "",
          category: classifyEvent(title, venueName),
          tags: extractTags(title, venueName),
          venueName,
          address,
          startTime,
          priceRange: "Check source",
          source: SOURCE,
          sourceUrl,
          externalId: stableId(sourceUrl),
          imageUrl,
        });
      } catch {
        // skip individual parse failures
      }
    });

    if (events.length === 0) {
      errors.push("Do303: no events found via schema.org microdata");
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
