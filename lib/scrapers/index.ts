import { prisma } from "@/lib/prisma";
import { ScrapedEvent, ScraperResult, Scraper } from "./types";
import { scrape303Magazine } from "./303magazine";
import { scrapeDenverEvents } from "./denver-events";
import { scrapeWestword } from "./westword";
import { scrapeVisitDenver } from "./visitdenver";
import { enrichEvent } from "@/lib/enrich-event";

const scrapers: { name: string; fn: Scraper }[] = [
  { name: "303magazine", fn: scrape303Magazine },
  { name: "do303", fn: scrapeDenverEvents },
  { name: "westword", fn: scrapeWestword },
  { name: "visitdenver", fn: scrapeVisitDenver },
];

const PER_SCRAPER_TIMEOUT = 15_000;

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

function deduplicateEvents(events: ScrapedEvent[]): ScrapedEvent[] {
  const seen = new Map<string, ScrapedEvent>();

  for (const event of events) {
    const key = `${event.title.toLowerCase().trim()}|${event.startTime.toISOString().slice(0, 10)}`;
    if (!seen.has(key)) {
      seen.set(key, event);
    }
  }

  return Array.from(seen.values());
}

// Budget (in seconds) reserved for inline enrichment after scraping
const ENRICHMENT_TIME_BUDGET = 15;

export async function runAllScrapers(): Promise<{
  total: number;
  inserted: number;
  updated: number;
  enriched: number;
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
    return { total: 0, inserted: 0, updated: 0, enriched: 0, errors: [...allErrors, "Denver city not found in database"] };
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

        if (result) {
          const mergedTags = Array.from(new Set([...ev.tags, ...result.tags]));
          await prisma.event.update({
            where: { id: ev.id },
            data: {
              description: result.description || ev.description,
              tags: mergedTags,
              vibeTags: result.vibeTags,
              companionTags: result.companionTags,
              isDogFriendly: result.isDogFriendly,
              isDrinkingOptional: result.isDrinkingOptional,
              isAlcoholFree: result.isAlcoholFree,
            },
          });
          enriched++;
        }
      } catch {
        // Don't let enrichment failures break the scraper
      }
    }
  }

  return { total: deduplicated.length, inserted, updated, enriched, errors: allErrors };
}
