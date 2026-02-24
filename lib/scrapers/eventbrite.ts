import { ScrapedEvent, ScraperResult } from "./types";
import { classifyEvent, extractTags } from "./classify";

const SOURCE = "eventbrite";
const BASE_URL = "https://www.eventbriteapi.com/v3/events/search/";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapEvent(event: any, venue: any): ScrapedEvent | null {
  try {
    const title: string = event.name?.text;
    if (!title) return null;

    const venueName: string = venue?.name || "";

    // Build address from venue fields
    const addr = venue?.address;
    const addressParts = [
      addr?.address_1,
      addr?.city,
      addr?.region,
    ].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(", ") : "Denver, CO";

    const startTime = new Date(event.start?.utc);
    if (isNaN(startTime.getTime())) return null;

    const endTime = event.end?.utc ? new Date(event.end.utc) : undefined;

    const category = classifyEvent(title, venueName);
    const tags = extractTags(title, venueName);

    const priceRange = event.is_free ? "Free" : "Check source";

    return {
      title,
      description: (event.description?.text || "").slice(0, 500),
      category,
      tags,
      venueName,
      address,
      startTime,
      endTime: endTime && !isNaN(endTime.getTime()) ? endTime : undefined,
      priceRange,
      source: SOURCE,
      sourceUrl: event.url,
      externalId: event.id,
      imageUrl: event.logo?.url,
    };
  } catch {
    return null;
  }
}

async function fetchVenues(
  venueIds: string[],
  token: string
): Promise<Map<string, any>> {
  const venues = new Map<string, any>();
  // Batch fetch venues (Eventbrite has no batch endpoint, so fetch in parallel)
  const unique = [...new Set(venueIds.filter(Boolean))];

  const results = await Promise.allSettled(
    unique.map(async (id) => {
      const res = await fetch(
        `https://www.eventbriteapi.com/v3/venues/${id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        venues.set(id, data);
      }
    })
  );

  // Silently ignore individual venue fetch failures
  void results;
  return venues;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function scrapeEventbrite(): Promise<ScraperResult> {
  const token = process.env.EVENTBRITE_TOKEN;
  if (!token) {
    return { source: SOURCE, events: [], errors: [] };
  }

  const errors: string[] = [];
  const events: ScrapedEvent[] = [];

  try {
    const now = new Date();
    const rangeStart = now.toISOString().split(".")[0];

    const params = new URLSearchParams({
      "location.address": "Denver,CO",
      "location.within": "25mi",
      "start_date.range_start": rangeStart,
      expand: "venue",
    });

    const res = await fetch(`${BASE_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      errors.push(`Eventbrite: HTTP ${res.status}`);
      return { source: SOURCE, events, errors };
    }

    const data = await res.json();
    const rawEvents = data.events;
    if (!rawEvents || rawEvents.length === 0) {
      errors.push("Eventbrite: no events found for Denver");
      return { source: SOURCE, events, errors };
    }

    // If venue data was expanded inline, use it directly
    // Otherwise, fetch venues separately
    const needVenueFetch = rawEvents.some(
      (e: any) => !e.venue && e.venue_id
    );

    let venueMap = new Map<string, any>();
    if (needVenueFetch) {
      const venueIds = rawEvents
        .map((e: any) => e.venue_id)
        .filter(Boolean);
      venueMap = await fetchVenues(venueIds, token);
    }

    for (const raw of rawEvents) {
      const venue = raw.venue || venueMap.get(raw.venue_id) || null;
      const mapped = mapEvent(raw, venue);
      if (mapped) events.push(mapped);
    }

    // Handle pagination
    let nextUrl = data.pagination?.has_more_items
      ? `${BASE_URL}?${params}&page=${2}`
      : null;
    let pageNum = 2;

    while (nextUrl && pageNum <= 5) {
      const pageRes = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!pageRes.ok) break;

      const pageData = await pageRes.json();
      const pageEvents = pageData.events;
      if (!pageEvents || pageEvents.length === 0) break;

      const needFetch = pageEvents.some(
        (e: any) => !e.venue && e.venue_id
      );
      if (needFetch) {
        const ids = pageEvents.map((e: any) => e.venue_id).filter(Boolean);
        const moreVenues = await fetchVenues(ids, token);
        for (const [k, v] of moreVenues) venueMap.set(k, v);
      }

      for (const raw of pageEvents) {
        const venue = raw.venue || venueMap.get(raw.venue_id) || null;
        const mapped = mapEvent(raw, venue);
        if (mapped) events.push(mapped);
      }

      pageNum++;
      nextUrl = pageData.pagination?.has_more_items
        ? `${BASE_URL}?${params}&page=${pageNum}`
        : null;
    }
  } catch (error) {
    errors.push(
      `Eventbrite: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return { source: SOURCE, events, errors };
}
