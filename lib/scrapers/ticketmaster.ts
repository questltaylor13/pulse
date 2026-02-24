import { Category } from "@prisma/client";
import { ScrapedEvent, ScraperResult } from "./types";
import { classifyEvent, extractTags } from "./classify";

const SOURCE = "ticketmaster";
const BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json";

/** Map Ticketmaster segment names to our Category enum */
function mapSegmentToCategory(segment?: string): Category | null {
  switch (segment) {
    case "Music":
      return "LIVE_MUSIC";
    case "Sports":
      return "FITNESS";
    case "Arts & Theatre":
      return "ART";
    case "Comedy": // not a real TM segment, but appears as genre
      return "ART";
    default:
      return null;
  }
}

function pickImage(images?: { url: string; ratio?: string; width?: number }[]): string | undefined {
  if (!images || images.length === 0) return undefined;

  // Prefer 16_9 ratio around 640px wide
  const preferred = images.find(
    (img) => img.ratio === "16_9" && img.width && img.width >= 500 && img.width <= 800
  );
  if (preferred) return preferred.url;

  // Fallback: any 16_9
  const any16x9 = images.find((img) => img.ratio === "16_9");
  if (any16x9) return any16x9.url;

  return images[0].url;
}

function formatPrice(priceRanges?: { min?: number; max?: number; currency?: string }[]): string {
  if (!priceRanges || priceRanges.length === 0) return "Check source";
  const range = priceRanges[0];
  if (range.min != null && range.max != null) {
    if (range.min === 0 && range.max === 0) return "Free";
    if (range.min === range.max) return `$${range.min}`;
    return `$${range.min}-$${range.max}`;
  }
  if (range.min != null) return `$${range.min}+`;
  if (range.max != null) return `Up to $${range.max}`;
  return "Check source";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapEvent(event: any): ScrapedEvent | null {
  try {
    const title: string = event.name;
    if (!title) return null;

    const venue = event._embedded?.venues?.[0];
    const venueName: string = venue?.name || "";

    // Build address from venue fields
    const addressParts = [
      venue?.address?.line1,
      venue?.city?.name,
      venue?.state?.stateCode,
    ].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(", ") : "Denver, CO";

    // Parse dates
    const startRaw = event.dates?.start?.dateTime || event.dates?.start?.localDate;
    if (!startRaw) return null;
    const startTime = new Date(startRaw);
    if (isNaN(startTime.getTime())) return null;

    const endRaw = event.dates?.end?.dateTime;
    const endTime = endRaw ? new Date(endRaw) : undefined;

    // Classification — prefer Ticketmaster segment, fall back to our classifier
    const segment = event.classifications?.[0]?.segment?.name;
    const genre = event.classifications?.[0]?.genre?.name;
    const subGenre = event.classifications?.[0]?.subGenre?.name;

    const tmCategory = mapSegmentToCategory(segment);
    // Also check genre for comedy (Ticketmaster lists comedy under Arts & Theatre)
    const genreCategory = genre === "Comedy" ? ("ART" as Category) : null;
    const category = tmCategory || genreCategory || classifyEvent(title, venueName);

    // Tags — combine our extraction with TM genre/subgenre
    const tags = extractTags(title, venueName);
    if (genre && genre !== "Undefined" && genre !== "Other") {
      const genreTag = genre.toLowerCase().replace(/\s+/g, "-");
      if (!tags.includes(genreTag)) tags.push(genreTag);
    }
    if (subGenre && subGenre !== "Undefined" && subGenre !== "Other") {
      const subTag = subGenre.toLowerCase().replace(/\s+/g, "-");
      if (!tags.includes(subTag)) tags.push(subTag);
    }

    return {
      title,
      description: event.info || event.pleaseNote || "",
      category,
      tags,
      venueName,
      address,
      startTime,
      endTime: endTime && !isNaN(endTime.getTime()) ? endTime : undefined,
      priceRange: formatPrice(event.priceRanges),
      source: SOURCE,
      sourceUrl: event.url,
      externalId: event.id,
      imageUrl: pickImage(event.images),
    };
  } catch {
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function scrapeTicketmaster(): Promise<ScraperResult> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    return { source: SOURCE, events: [], errors: [] };
  }

  const errors: string[] = [];
  const events: ScrapedEvent[] = [];

  try {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startDateTime = now.toISOString().split(".")[0] + "Z";
    const endDateTime = end.toISOString().split(".")[0] + "Z";

    let page = 0;
    let totalPages = 1;

    while (page < totalPages && page < 5) {
      const params = new URLSearchParams({
        city: "Denver",
        stateCode: "CO",
        startDateTime,
        endDateTime,
        size: "100",
        page: String(page),
        apikey: apiKey,
      });

      const res = await fetch(`${BASE_URL}?${params}`);
      if (!res.ok) {
        errors.push(`Ticketmaster: HTTP ${res.status} on page ${page}`);
        break;
      }

      const data = await res.json();
      const embedded = data._embedded?.events;
      if (!embedded || embedded.length === 0) break;

      for (const raw of embedded) {
        const mapped = mapEvent(raw);
        if (mapped) events.push(mapped);
      }

      totalPages = data.page?.totalPages ?? 1;
      page++;
    }

    if (events.length === 0 && errors.length === 0) {
      errors.push("Ticketmaster: no events found for Denver");
    }
  } catch (error) {
    errors.push(
      `Ticketmaster: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return { source: SOURCE, events, errors };
}
