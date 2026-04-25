import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";
import { ScrapedEvent, ScraperResult, Scraper } from "./types";
import { scrapeDenverEvents } from "./denver-events";
import { scrapeWestword } from "./westword";
import { scrapeTicketmaster } from "./ticketmaster";
import { scrapeEventbrite } from "./eventbrite";
import { scrapeRedRocks } from "./red-rocks";
import { scrapeVisitDenver } from "./visit-denver";
import { scrapeChautauqua } from "./regional/chautauqua";
import { scrapePikesPeakCenter } from "./regional/pikes-peak-center";
import { scrapeVisitEstesPark } from "./regional/visit-estes-park";
import { scrapeVisitGolden } from "./regional/visit-golden";
import { scrapeVisitSteamboatChamber } from "./regional/visit-steamboat-chamber";
import { enrichEvent } from "@/lib/enrich-event";
import { deriveRegionalFields } from "@/lib/regional/metadata";
import { denverDateKey } from "@/lib/time/denver";
import { prioritize } from "./source-priority";
import { isProSportsEvent } from "./exclusions";

// Note: 303magazine disabled 2026-04-18. The site migrated away from a
// structured event calendar (JSON-LD Event schema) to a JS-rendered Tribe
// Events Calendar widget on top of blog posts. Would require Puppeteer +
// selector rewrite for ~1 future event per scrape. Not worth it; do303 +
// westword + red-rocks + visit-denver already cover the same ground. Keep
// lib/scrapers/303magazine.ts for reference but leave it unwired.
const scrapers: { name: string; fn: Scraper }[] = [
  // Denver core
  { name: "do303", fn: scrapeDenverEvents },
  { name: "westword", fn: scrapeWestword },
  { name: "red-rocks", fn: scrapeRedRocks },
  { name: "visit-denver", fn: scrapeVisitDenver },
  // Regional — PRD 2 Phase 1
  { name: "chautauqua", fn: scrapeChautauqua },
  { name: "pikes-peak-center", fn: scrapePikesPeakCenter },
  // Regional — PRD 2 Phase 2 (Simpleview RSS feeds)
  { name: "visit-estes-park", fn: scrapeVisitEstesPark },
  { name: "visit-golden", fn: scrapeVisitGolden },
  // Regional — PRD 2 Phase 3 (Mountain destinations, Simpleview RSS).
  // Crested Butte / Vail / Aspen / Telluride are handled by the LLM research
  // pipeline (scripts/research-mountain-events.ts) since their event feeds
  // are unstructured or bot-protected.
  { name: "visit-steamboat-chamber", fn: scrapeVisitSteamboatChamber },
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
    .replace(/\b(at|the|and|amphitheatre|amphitheater|theater|theatre|ballroom|auditorium|hall|club|live|room|park)\b/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function deduplicateEvents(events: ScrapedEvent[]): ScrapedEvent[] {
  const seen = new Map<string, ScrapedEvent>();

  for (const event of events) {
    // Key = normalizedTitle | normalizedVenue | Denver-local YYYY-MM-DD.
    // Using the Denver date (not UTC .toISOString().slice(0,10)) prevents
    // late-evening events from splitting across two UTC days when different
    // scrapers anchor differently. Same title at different venues on the
    // same day is NOT a duplicate (PRD 1 §F #3).
    const key = `${normalizeTitle(event.title)}|${normalizeVenue(event.venueName)}|${denverDateKey(event.startTime)}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, event);
    } else {
      // Collision: pick the higher-priority source. Lets Quest tune the
      // winner by reordering lib/scrapers/source-priority.ts.
      seen.set(key, prioritize(existing, event));
    }
  }

  return Array.from(seen.values());
}

// Budget (in seconds) reserved for inline enrichment after scraping.
// PRD 2 Phase 4 tuning: raised the function-time assumption from 60s to
// 270s so big insert runs (like the Phase 1/2 91- and 37-event waves)
// still get their scores persisted inline. Match the scrape-and-revalidate
// cron's maxDuration=300 with a safety margin.
const ENRICHMENT_TIME_BUDGET = 15;
const FUNCTION_TIME_LIMIT = 270;

// Events below this quality score get archived at enrichment time (they
// remain in the DB for analytics, but the feed's `activeEventsWhere()`
// filter excludes isArchived=true). Tunable without redeploy. PRD 1 §1.3
// specifies 5 as the default.
const QUALITY_CUTOFF = Number(process.env.PULSE_QUALITY_CUTOFF ?? 5);

// Higher cutoff specifically for non-Denver events. Regional events ask more
// of the user (drive time), so the bar is higher per PRD 2 §4.2. Default 6.
const REGIONAL_CUTOFF = Number(process.env.PULSE_REGIONAL_CUTOFF ?? 6);

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

    // PRD 2 Phase 6 — per-source run metadata. We record one ScraperRun row
  // per scraper after all upserts + enrichment have finished (keyed by
  // source, not by event). Duration captures scrape-only time (not the
  // orchestrator's upsert phase, which is shared).
  const perSourceMeta = new Map<string, { durationMs: number; rawCount: number; errors: string[] }>();

  for (const scraper of scrapers) {
    const perSourceStart = Date.now();
    try {
      const result = await runWithTimeout(scraper.name, scraper.fn);
      allResults.push(result);
      perSourceMeta.set(scraper.name, {
        durationMs: Date.now() - perSourceStart,
        rawCount: result.events.length,
        errors: result.errors,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      allResults.push({ source: scraper.name, events: [], errors: [msg] });
      perSourceMeta.set(scraper.name, {
        durationMs: Date.now() - perSourceStart,
        rawCount: 0,
        errors: [msg],
      });
    }
  }

  // Drop pro-sports events at ingest (before dedup) so they never reach
  // the DB — fans already know when their team plays and the surface is
  // dominated by tickets-for-sale rather than discovery value. See
  // lib/scrapers/exclusions.ts for the team list. Per-source attribution
  // feeds ScraperRun.droppedCount below.
  const sportsDroppedBySource = new Map<string, number>();
  const sportsDroppedTitles: string[] = [];
  for (const result of allResults) {
    for (const ev of result.events) {
      if (isProSportsEvent(ev.title, ev.description)) {
        sportsDroppedBySource.set(result.source, (sportsDroppedBySource.get(result.source) ?? 0) + 1);
        if (sportsDroppedTitles.length < 5) sportsDroppedTitles.push(`${result.source}: ${ev.title}`);
      }
    }
  }
  const proSportsDropped = Array.from(sportsDroppedBySource.values()).reduce((s, n) => s + n, 0);
  if (proSportsDropped > 0) {
    console.info(
      `[runAllScrapers] dropped ${proSportsDropped} pro-sports event(s) pre-dedup: ${sportsDroppedTitles.join("; ")}`,
    );
  }

  const allEvents = allResults
    .flatMap((r) => r.events)
    .filter((e) => !isProSportsEvent(e.title, e.description));
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

    // PRD 2 Phase 1: auto-tag regional metadata from the static drive-time
    // table based on the scraper's neighborhood value. Keeps scrapers simple
    // (they just set neighborhood="Boulder" etc.) while region/driveTime/
    // driveNote/isDayTrip/isWeekendTrip get derived centrally.
    const regional = deriveRegionalFields(event.neighborhood);

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
          region: regional.region,
          townName: regional.townName,
          isDayTrip: regional.isDayTrip,
          isWeekendTrip: regional.isWeekendTrip,
          driveTimeFromDenver: regional.driveTimeFromDenver,
          driveNote: regional.driveNote,
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
          region: regional.region,
          townName: regional.townName,
          isDayTrip: regional.isDayTrip,
          isWeekendTrip: regional.isWeekendTrip,
          driveTimeFromDenver: regional.driveTimeFromDenver,
          driveNote: regional.driveNote,
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

  if (hasOpenAIKey && newEventIds.length > 0 && elapsedSeconds < FUNCTION_TIME_LIMIT - ENRICHMENT_TIME_BUDGET) {
    const newEvents = await prisma.event.findMany({
      where: { id: { in: newEventIds } },
    });

    for (const ev of newEvents) {
      // Check time budget before each call (~1.5s per call)
      if ((Date.now() - startTime) / 1000 > FUNCTION_TIME_LIMIT - 5) break;

      const isRegional = ev.region !== "DENVER_METRO";
      try {
        const result = await enrichEvent({
          title: ev.title,
          description: ev.description,
          venueName: ev.venueName,
          category: ev.category,
          tags: ev.tags,
          priceRange: ev.priceRange,
          neighborhood: ev.neighborhood,
          townName: ev.townName,
          driveTimeFromDenver: ev.driveTimeFromDenver,
          isRegional,
        });

        if (!result) continue;

        const mergedTags = Array.from(new Set([...ev.tags, ...result.tags]));
        const overrideCategory = coerceCategory(result.category);

        // PRD 1 §1.3 quality gate — applies to every event.
        const belowQualityCutoff =
          typeof result.qualityScore === "number" &&
          result.qualityScore < QUALITY_CUTOFF;

        // PRD 2 §4.2 worth-the-drive gate — applies only to regional events.
        // Bar is higher because the user has to drive there.
        const belowRegionalCutoff =
          isRegional &&
          typeof result.worthTheDriveScore === "number" &&
          result.worthTheDriveScore < REGIONAL_CUTOFF;

        const shouldArchive = belowQualityCutoff || belowRegionalCutoff;

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
            qualityScore: result.qualityScore ?? undefined,
            noveltyScore: result.noveltyScore ?? undefined,
            oneLiner: result.oneLiner ?? undefined,
            // PRD 2 §4.1: persist worth-the-drive for regional events only.
            worthTheDriveScore: result.worthTheDriveScore ?? undefined,
            ...(overrideCategory ? { category: overrideCategory } : {}),
            ...(shouldArchive ? { isArchived: true } : {}),
          },
        });
        enriched++;
        if (shouldArchive) dropped++;
      } catch {
        // Don't let enrichment failures break the scraper
      }
    }
  }

  // PRD 2 Phase 6 — persist one ScraperRun row per source. Per-source
  // insert/update/enriched/dropped counts are approximated proportionally
  // from the totals; precise attribution would require per-source upsert
  // tracking which isn't worth the extra DB calls. Wrapped in try/catch so
  // a logging failure never breaks the scrape.
  try {
    const rowsBySource = new Map<string, number>();
    for (const r of allResults) {
      rowsBySource.set(r.source, r.events.length);
    }
    const sumRaw = Array.from(rowsBySource.values()).reduce((s, n) => s + n, 0) || 1;

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    for (const [source, meta] of perSourceMeta.entries()) {
      const rawCount = meta.rawCount;
      const weight = rawCount / sumRaw;
      const sportsDropped = sportsDroppedBySource.get(source) ?? 0;

      // Coverage-anomaly check (PR 2 step 9). Compute against PRIOR runs
      // only — the new row is inserted with the computed flag below.
      // Cold-start guard: ≥7 succeeded runs in the 14d window AND median
      // ≥5. Without this, the median lags after a coverage fix's volume
      // jump and produces 14 days of false-clean signals.
      const priorRuns = await prisma.scraperRun.findMany({
        where: { source, succeeded: true, startedAt: { gte: fourteenDaysAgo } },
        select: { rawCount: true },
      });
      let coverageAnomaly = false;
      if (priorRuns.length >= 7) {
        const counts = priorRuns.map((r) => r.rawCount).sort((a, b) => a - b);
        const mid = Math.floor(counts.length / 2);
        const median =
          counts.length % 2 === 0 ? (counts[mid - 1] + counts[mid]) / 2 : counts[mid];
        if (median >= 5 && rawCount < 0.5 * median) {
          coverageAnomaly = true;
        }
      }

      await prisma.scraperRun.create({
        data: {
          source,
          durationMs: meta.durationMs,
          rawCount,
          insertedCount: Math.round(inserted * weight),
          updatedCount: Math.round(updated * weight),
          enrichedCount: Math.round(enriched * weight),
          droppedCount: Math.round(dropped * weight) + sportsDropped,
          errorCount: meta.errors.length,
          errors: meta.errors.slice(0, 5),
          succeeded: meta.errors.length === 0 || rawCount > 0,
          coverageAnomaly,
        },
      });
    }
  } catch (logErr) {
    console.error("[runAllScrapers] failed to write ScraperRun:", logErr);
  }

  return {
    total: deduplicated.length,
    inserted,
    updated,
    enriched,
    dropped: dropped + proSportsDropped,
    errors: allErrors,
  };
}
