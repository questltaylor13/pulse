import { prisma } from "@/lib/prisma";
import { ScrapedEvent, ScraperResult, Scraper } from "./types";
import { scrape303Magazine } from "./303magazine";
import { scrapeDenverEvents } from "./denver-events";

const scrapers: { name: string; fn: Scraper }[] = [
  { name: "303magazine", fn: scrape303Magazine },
  { name: "do303", fn: scrapeDenverEvents },
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

export async function runAllScrapers(): Promise<{
  total: number;
  inserted: number;
  updated: number;
  errors: string[];
}> {
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

  // Get the default city ID (Denver)
  const city = await prisma.city.findFirst({ where: { name: "Denver" } });
  if (!city) {
    return { total: 0, inserted: 0, updated: 0, errors: [...allErrors, "Denver city not found in database"] };
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
      await prisma.event.create({
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
      inserted++;
    }
  }

  return { total: deduplicated.length, inserted, updated, errors: allErrors };
}
