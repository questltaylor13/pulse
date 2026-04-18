import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";
import { ScrapedEvent, ScraperResult, Scraper } from "./types";
import { scrapeDenverEvents } from "./denver-events";
import { scrapeWestword } from "./westword";
import { scrapeTicketmaster } from "./ticketmaster";
import { scrapeEventbrite } from "./eventbrite";
import { scrapeRedRocks } from "./red-rocks";
import { scrapeVisitDenver } from "./visit-denver";
import { enrichEvent } from "@/lib/enrich-event";

// Note: 303magazine disabled 2026-04-18. The site migrated away from a
// structured event calendar (JSON-LD Event schema) to a JS-rendered Tribe
// Events Calendar widget on top of blog posts. Would require Puppeteer +
// selector rewrite for ~1 future event per scrape. Not worth it; do303 +
// westword + red-rocks + visit-denver already cover the same ground. Keep
// lib/scrapers/303magazine.ts for reference but leave it unwired.
const scrapers: { name: string; fn: Scraper }[] = [
  { name: "do303", fn: scrapeDenverEvents },
  { name: "westword", fn: scrapeWestword },
  { name: "red-rocks", fn: scrapeRedRocks },
  { name: "visit-denver", fn: scrapeVisitDenver },
];

// Conditionally include API scrapers when credentials are configured
if (process.env.TICKETMASTER_API_KEY) {
  scrapers.push({ name: "ticketmaster", fn: scrapeTicketmaster });
}
if (process.env.EVENTBRITE_TOKEN) {
  scrapers.push({ name: "eventbrite", fn: scrapeEventbrite });
}

const PER_SCRAPER_TIMEOUT = 10_000;

async function runWithTimeout(
  name: string,
  fn: Scraper
): Promise<ScraperResult> {
  return Promise.race([
    fn(),
    new Promise<ScraperResult>((resolve) =>
      setTimeout(
        () =>
          resolve({
            source: name,
            events: [],
            errors: [`${name}: timed out after ${PER_SCRAPER_TIMEOUT / 1000}s`],
          }),
        PER_SCRAPER_TIMEOUT
      )
    ),
  ]);
}

/** Normalize a title for cross-source deduplication */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/^(presents?:\s*|live:\s*)/i, "")
    .replace(/\s+/g, " ");
}

/** Normalize a venue string — loose enough that "Red Rocks" matches
 *  "Red Rocks Amphitheatre" but strict enough that "The Ogden" and
 *  "The Gothic" don't collapse. */
function normalizeVenue(venue: string): string {
  return venue
    .toLowerCase()
    .trim()
    .replace(/\b(the|amphitheatre|amphitheater|theater|theatre|ballroom|auditorium|hall|club|live|room)\b/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function deduplicateEvents(events: ScrapedEvent[]): ScrapedEvent[] {
  const seen = new Map<string, ScrapedEvent>();

  for (const event of events) {
    // Key = normalizedTitle | normalizedVenue | YYYY-MM-DD. Same title at
    // different venues on the same day is NOT a duplicate (see PRD 1 §F #3).
    const key = `${normalizeTitle(event.title)}|${normalizeVenue(event.venueName)}|${event.startTime.toISOString().slice(0, 10)}`;
    if (!seen.has(key)) {
      seen.set(key, event);
    }
  }

  return Array.from(seen.values());
}

// Budget (in seconds) reserved for inline enrichment after scraping
const ENRICHMENT_TIME_BUDGET = 15;

// Events below this quality score get archived at enrichment time (they
// remain in the DB for analytics, but the feed's `activeEventsWhere()`
// filter excludes isArchived=true). Tunable without redeploy. PRD 1 §1.3
// specifies 5 as the default.
const QUALITY_CUTOFF = Number(process.env.PULSE_QUALITY_CUTOFF ?? 5);

const VALID_CATEGORIES: ReadonlySet<Category> = new Set<Category>([
  "ART",
  "LIVE_MUSIC",
  "BARS",
  "FOOD",
  "COFFEE",
  "OUTDOORS",
  "FITNESS",
  "SEASONAL",
  "POPUP",
  "OTHER",
  "RESTAURANT",
  "ACTIVITY_VENUE",
  "COMEDY",
  "SOCIAL",
  "WELLNESS",
]);

function coerceCategory(raw: string | null | undefined): Category | null {
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/[\s-]+/g, "_") as Category;
  return VALID_CATEGORIES.has(upper) ? upper : null;
}

export async function runAllScrapers(): Promise<{
  total: number;
  inserted: number;
  updated: number;
  enriched: number;
  dropped: number;
  errors: string[];
}> {
  const startTime = Date.now();
  const allResults: ScraperResult[] = [];

  for (const scraper of scrapers) {
    try {
      const result = await runWithTimeout(scraper.name, scraper.fn);
      allResults.push(result);
    } catch (error) {
      allResults.push({
        source: scraper.name,
        events: [],
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    }
  }

  const allEvents = allResults.flatMap((r) => r.events);
  const allErrors = allResults.flatMap((r) => r.errors);
  const deduplicated = deduplicateEvents(allEvents);

  let inserted = 0;
  let updated = 0;
  const newEventIds: string[] = [];

  // Get the default city ID (Denver)
  const city = await prisma.city.findFirst({ where: { name: "Denver" } });
  if (!city) {
    return { total: 0, inserted: 0, updated: 0, enriched: 0, dropped: 0, errors: [...allErrors, "Denver city not found in database"] };
  }

  for (const event of deduplicated) {
    const existing = event.externalId
      ? await prisma.event.findFirst({
          where: { externalId: event.externalId, source: event.source },
        })
      : null;

    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: {
          title: event.title,
          description: event.description,
          category: event.category,
          tags: event.tags,
          venueName: event.venueName,
          address: event.address,
          neighborhood: event.neighborhood,
          startTime: event.startTime,
          endTime: event.endTime,
          priceRange: event.priceRange,
          sourceUrl: event.sourceUrl,
          imageUrl: event.imageUrl,
        },
      });
      updated++;
    } else {
      const created = await prisma.event.create({
        data: {
          cityId: city.id,
          title: event.title,
          description: event.description,
          category: event.category,
          tags: event.tags,
          venueName: event.venueName,
          address: event.address,
          neighborhood: event.neighborhood,
          startTime: event.startTime,
          endTime: event.endTime,
          priceRange: event.priceRange,
          source: event.source,
          sourceUrl: event.sourceUrl,
          externalId: event.externalId,
          imageUrl: event.imageUrl,
        },
      });
      newEventIds.push(created.id);
      inserted++;
    }
  }

  // -----------------------------------------------------------------------
  // Inline enrichment for newly inserted events (if time remains)
  // -----------------------------------------------------------------------
  let enriched = 0;
  let dropped = 0;
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  if (hasOpenAIKey && newEventIds.length > 0 && elapsedSeconds < 60 - ENRICHMENT_TIME_BUDGET) {
    const newEvents = await prisma.event.findMany({
      where: { id: { in: newEventIds } },
    });

    for (const ev of newEvents) {
      // Check time budget before each call (~1.5s per call)
      if ((Date.now() - startTime) / 1000 > 60 - 5) break;

      try {
        const result = await enrichEvent({
          title: ev.title,
          description: ev.description,
          venueName: ev.venueName,
          category: ev.category,
          tags: ev.tags,
          priceRange: ev.priceRange,
          neighborhood: ev.neighborhood,
        });

        if (!result) continue;

        const mergedTags = Array.from(new Set([...ev.tags, ...result.tags]));
        const overrideCategory = coerceCategory(result.category);
        const belowCutoff =
          typeof result.qualityScore === "number" &&
          result.qualityScore < QUALITY_CUTOFF;

        await prisma.event.update({
          where: { id: ev.id },
          data: {
            // Pre-existing persisted fields
            description: result.description || ev.description,
            tags: mergedTags,
            vibeTags: result.vibeTags,
            companionTags: result.companionTags,
            isDogFriendly: result.isDogFriendly,
            isDrinkingOptional: result.isDrinkingOptional,
            isAlcoholFree: result.isAlcoholFree,
            // PRD 1 §F #5 — persist the scores the model returns so the
            // quality filter and the "weird"/"offbeat" rails can read them.
            qualityScore: result.qualityScore ?? undefined,
            noveltyScore: result.noveltyScore ?? undefined,
            oneLiner: result.oneLiner ?? undefined,
            // Only override category if the model returned a known enum value.
            ...(overrideCategory ? { category: overrideCategory } : {}),
            // PRD 1 §1.3 — gate low-quality events out of the feed. We archive
            // instead of deleting so analytics can inspect what got dropped.
            ...(belowCutoff ? { isArchived: true } : {}),
          },
        });
        enriched++;
        if (belowCutoff) dropped++;
      } catch {
        // Don't let enrichment failures break the scraper
      }
    }
  }

  return { total: deduplicated.length, inserted, updated, enriched, dropped, errors: allErrors };
}
