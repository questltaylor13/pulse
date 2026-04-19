/**
 * Pulse Data Audit (Phase 0 of PRD/data-refresh-and-reliability.md)
 *
 * Read-only pass that measures scraper health, DB state, and feed coverage.
 * Writes a markdown report to audit-reports/YYYY-MM-DD-data-audit.md.
 *
 * Usage:
 *   AUDIT_CONFIRM=1 npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-data.ts
 *
 * By default the script runs Sections A, C, D, E, F (no writes).
 * Pass AUDIT_CONFIRM=1 to additionally run Section B (full production scrape,
 * which writes to the DB via runAllScrapers()).
 *
 * Environment variables:
 *   DATABASE_URL           Required. Must point at production for a real audit.
 *   AUDIT_CONFIRM=1        Opt-in to the write pass (Section B).
 *   TICKETMASTER_API_KEY   Optional; scraper reports "not configured" if missing.
 *   EVENTBRITE_TOKEN       Optional; same.
 *   OPENAI_API_KEY         Optional; needed for Section B enrichment only.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import { scrapeDenverEvents } from "../lib/scrapers/denver-events";
import { scrapeWestword } from "../lib/scrapers/westword";
import { scrapeTicketmaster } from "../lib/scrapers/ticketmaster";
import { scrapeEventbrite } from "../lib/scrapers/eventbrite";
import { scrapeRedRocks } from "../lib/scrapers/red-rocks";
import { scrapeVisitDenver } from "../lib/scrapers/visit-denver";
import { scrapeChautauqua } from "../lib/scrapers/regional/chautauqua";
import { scrapePikesPeakCenter } from "../lib/scrapers/regional/pikes-peak-center";
import { scrapeVisitEstesPark } from "../lib/scrapers/regional/visit-estes-park";
import { scrapeVisitGolden } from "../lib/scrapers/regional/visit-golden";
import { scrapeVisitSteamboatChamber } from "../lib/scrapers/regional/visit-steamboat-chamber";
import { ScraperResult, Scraper } from "../lib/scrapers/types";
import { runAllScrapers } from "../lib/scrapers/index";

import {
  activeEventsWhere,
  endOfTodayLocal,
  outsideDenverWhere,
  outsideDenverPlaceWhere,
  upcomingWeekendRange,
  OUTSIDE_DENVER_REGIONS,
} from "../lib/queries/events";
import {
  RAIL_CATEGORIES,
  eventWhereForCategory,
  placeWhereForCategory,
  type RailCategory,
} from "../lib/home/category-filters";
import {
  PLACES_RAIL_CATEGORIES,
  placeWhereForPlacesRail,
  type PlacesRailCategory,
} from "../lib/home/places-rail-filters";
import {
  localFavoritesWhere,
  dateNightPlacesWhere,
  groupFriendlyPlacesWhere,
  workFriendlyPlacesWhere,
} from "../lib/home/places-section-filters";

const prisma = new PrismaClient();

const SCRAPE_TIMEOUT_MS = 15_000;
const AUDIT_CONFIRM = process.env.AUDIT_CONFIRM === "1";
const TODAY = new Date();
const TODAY_ISO = TODAY.toISOString().slice(0, 10);
const REPORT_DIR = join(process.cwd(), "audit-reports");
const REPORT_PATH = join(REPORT_DIR, `${TODAY_ISO}-data-audit.md`);

// ----------------------------------------------------------------------------
// Section A — Scraper health
// ----------------------------------------------------------------------------

interface ScraperHealth {
  name: string;
  status: "ok" | "empty" | "error" | "not configured";
  rawCount: number;
  errors: string[];
  durationMs: number;
  sampleTitles: string[];
  requiresEnv?: string;
  notes?: string;
}

async function runScraperWithTimeout(
  name: string,
  fn: Scraper,
  timeoutMs: number
): Promise<ScraperResult> {
  return Promise.race<ScraperResult>([
    fn(),
    new Promise<ScraperResult>((resolve) =>
      setTimeout(
        () =>
          resolve({
            source: name,
            events: [],
            errors: [`${name}: timed out after ${timeoutMs / 1000}s`],
          }),
        timeoutMs
      )
    ),
  ]);
}

async function probeScraper(
  name: string,
  fn: Scraper,
  opts: { requiresEnv?: string } = {}
): Promise<ScraperHealth> {
  if (opts.requiresEnv && !process.env[opts.requiresEnv]) {
    return {
      name,
      status: "not configured",
      rawCount: 0,
      errors: [],
      durationMs: 0,
      sampleTitles: [],
      requiresEnv: opts.requiresEnv,
      notes: `env var ${opts.requiresEnv} not set`,
    };
  }

  const t0 = Date.now();
  let result: ScraperResult;
  try {
    result = await runScraperWithTimeout(name, fn, SCRAPE_TIMEOUT_MS);
  } catch (e) {
    return {
      name,
      status: "error",
      rawCount: 0,
      errors: [e instanceof Error ? e.message : String(e)],
      durationMs: Date.now() - t0,
      sampleTitles: [],
    };
  }
  const durationMs = Date.now() - t0;

  const rawCount = result.events.length;
  const sampleTitles = result.events.slice(0, 3).map((e) => e.title);

  let status: ScraperHealth["status"];
  if (result.errors.length > 0 && rawCount === 0) status = "error";
  else if (rawCount === 0) status = "empty"; // silently broken — the PRD's primary symptom
  else status = "ok";

  return {
    name,
    status,
    rawCount,
    errors: result.errors,
    durationMs,
    sampleTitles,
  };
}

async function runSectionA(): Promise<ScraperHealth[]> {
  console.log("\n== Section A — Scraper health ==");
  const probes: Array<{ name: string; fn: Scraper; requiresEnv?: string }> = [
    // Denver core
    { name: "do303", fn: scrapeDenverEvents },
    { name: "westword", fn: scrapeWestword },
    { name: "red-rocks", fn: scrapeRedRocks },
    { name: "visit-denver", fn: scrapeVisitDenver },
    // Regional (PRD 2 Phase 1)
    { name: "chautauqua", fn: scrapeChautauqua },
    { name: "pikes-peak-center", fn: scrapePikesPeakCenter },
    // Regional (PRD 2 Phase 2)
    { name: "visit-estes-park", fn: scrapeVisitEstesPark },
    { name: "visit-golden", fn: scrapeVisitGolden },
    // Regional (PRD 2 Phase 3 — mountain destinations)
    { name: "visit-steamboat-chamber", fn: scrapeVisitSteamboatChamber },
    // API-gated
    { name: "ticketmaster", fn: scrapeTicketmaster, requiresEnv: "TICKETMASTER_API_KEY" },
    { name: "eventbrite", fn: scrapeEventbrite, requiresEnv: "EVENTBRITE_TOKEN" },
  ];

  const results: ScraperHealth[] = [];
  for (const p of probes) {
    process.stdout.write(`  - ${p.name} ... `);
    const r = await probeScraper(p.name, p.fn, { requiresEnv: p.requiresEnv });
    console.log(`${r.status} (raw=${r.rawCount}, ${r.durationMs}ms)`);
    results.push(r);
  }
  return results;
}

// ----------------------------------------------------------------------------
// Section B — Pipeline full run (opt-in)
// ----------------------------------------------------------------------------

interface PipelineRun {
  ran: boolean;
  reason?: string;
  total?: number;
  inserted?: number;
  updated?: number;
  enriched?: number;
  dropped?: number;
  errors?: string[];
  eventsBefore?: number;
  eventsAfter?: number;
  durationMs?: number;
}

async function runSectionB(sumRaw: number): Promise<PipelineRun> {
  console.log("\n== Section B — Pipeline full run ==");
  if (!AUDIT_CONFIRM) {
    console.log("  skipped (set AUDIT_CONFIRM=1 to run the production scrape)");
    return { ran: false, reason: "AUDIT_CONFIRM not set — Section B skipped" };
  }

  console.log(
    `  AUDIT_CONFIRM=1 detected — running runAllScrapers() against ${redactedDbUrl()}`
  );

  const eventsBefore = await prisma.event.count();
  const t0 = Date.now();
  const result = await runAllScrapers();
  const durationMs = Date.now() - t0;
  const eventsAfter = await prisma.event.count();

  console.log(
    `  total=${result.total} inserted=${result.inserted} updated=${result.updated} enriched=${result.enriched} dropped=${result.dropped} errors=${result.errors.length} (${durationMs}ms)`
  );

  return {
    ran: true,
    ...result,
    eventsBefore,
    eventsAfter,
    durationMs,
  };
}

function redactedDbUrl(): string {
  const url = process.env.DATABASE_URL || "";
  try {
    const u = new URL(url);
    return `${u.protocol}//***@${u.host}${u.pathname}`;
  } catch {
    return "DATABASE_URL not set or invalid";
  }
}

// ----------------------------------------------------------------------------
// Section C — Database state
// ----------------------------------------------------------------------------

interface DbState {
  eventsTotal: number;
  eventsFuture: number;
  eventsArchived: number;
  eventsPublished: number;
  eventsByCategory: Record<string, number>;
  eventsBySource: Record<string, number>;
  eventsWithQualityScore: number;
  eventsWithOneLiner: number;
  eventsWithNoveltyScore: number;
  oldestFutureStart: string | null;
  newestFutureStart: string | null;
  placesTotal: number;
  placesByCategory: Record<string, number>;
  placesByOpeningStatus: Record<string, number>;
  placesLocalFavorite: number;
  placesIsNew: number;
  placesOpenedLast45d: number;
  placesLastUpdated: string | null;
  placesOldestUpdate: string | null;
  neighborhoodsTotal: number;
  neighborhoodsFeatured: number;
}

async function runSectionC(now: Date): Promise<DbState> {
  console.log("\n== Section C — Database state ==");
  const activeWhere = activeEventsWhere(now);
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

  const [
    eventsTotal,
    eventsFuture,
    eventsArchived,
    eventsPublished,
    categoryGroups,
    sourceGroups,
    eventsWithQualityScore,
    eventsWithOneLiner,
    eventsWithNoveltyScore,
    oldestFuture,
    newestFuture,
    placesTotal,
    placeCategoryGroups,
    placeOpeningStatusGroups,
    placesLocalFavorite,
    placesIsNew,
    placesOpenedLast45d,
    placeLastUpdated,
    placeOldestUpdate,
    neighborhoodsTotal,
    neighborhoodsFeatured,
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: activeWhere }),
    prisma.event.count({ where: { isArchived: true } }),
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.event.groupBy({ by: ["category"], _count: true, where: activeWhere }),
    prisma.event.groupBy({ by: ["source"], _count: true, where: activeWhere }),
    prisma.event.count({ where: { qualityScore: { not: null } } }),
    prisma.event.count({ where: { oneLiner: { not: null } } }),
    prisma.event.count({ where: { noveltyScore: { not: null } } }),
    prisma.event.findFirst({
      where: activeWhere,
      orderBy: { startTime: "asc" },
      select: { startTime: true },
    }),
    prisma.event.findFirst({
      where: activeWhere,
      orderBy: { startTime: "desc" },
      select: { startTime: true },
    }),
    prisma.place.count(),
    prisma.place.groupBy({ by: ["category"], _count: true }),
    prisma.place.groupBy({ by: ["openingStatus"], _count: true }),
    prisma.place.count({ where: { isLocalFavorite: true } }),
    prisma.place.count({ where: { isNew: true } }),
    prisma.place.count({ where: { openedDate: { gte: fortyFiveDaysAgo } } }),
    prisma.place.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.place.findFirst({
      orderBy: { updatedAt: "asc" },
      select: { updatedAt: true },
    }),
    prisma.neighborhood.count(),
    prisma.neighborhood.count({ where: { isFeatured: true } }),
  ]);

  const eventsByCategory: Record<string, number> = {};
  for (const g of categoryGroups) {
    eventsByCategory[String(g.category)] = (g._count as unknown as number) ?? 0;
  }
  const eventsBySource: Record<string, number> = {};
  for (const g of sourceGroups) {
    eventsBySource[g.source] = (g._count as unknown as number) ?? 0;
  }
  const placesByCategory: Record<string, number> = {};
  for (const g of placeCategoryGroups) {
    placesByCategory[String(g.category ?? "null")] =
      (g._count as unknown as number) ?? 0;
  }
  const placesByOpeningStatus: Record<string, number> = {};
  for (const g of placeOpeningStatusGroups) {
    placesByOpeningStatus[String(g.openingStatus ?? "null")] =
      (g._count as unknown as number) ?? 0;
  }

  const state: DbState = {
    eventsTotal,
    eventsFuture,
    eventsArchived,
    eventsPublished,
    eventsByCategory,
    eventsBySource,
    eventsWithQualityScore,
    eventsWithOneLiner,
    eventsWithNoveltyScore,
    oldestFutureStart: oldestFuture?.startTime.toISOString() ?? null,
    newestFutureStart: newestFuture?.startTime.toISOString() ?? null,
    placesTotal,
    placesByCategory,
    placesByOpeningStatus,
    placesLocalFavorite,
    placesIsNew,
    placesOpenedLast45d,
    placesLastUpdated: placeLastUpdated?.updatedAt.toISOString() ?? null,
    placesOldestUpdate: placeOldestUpdate?.updatedAt.toISOString() ?? null,
    neighborhoodsTotal,
    neighborhoodsFeatured,
  };
  console.log(
    `  events: total=${state.eventsTotal} future=${state.eventsFuture} archived=${state.eventsArchived}`
  );
  console.log(
    `  enrichment persist: qualityScore=${state.eventsWithQualityScore} oneLiner=${state.eventsWithOneLiner} noveltyScore=${state.eventsWithNoveltyScore}`
  );
  console.log(
    `  places: total=${state.placesTotal} localFav=${state.placesLocalFavorite} isNew=${state.placesIsNew} opened<45d=${state.placesOpenedLast45d}`
  );
  console.log(
    `  neighborhoods: total=${state.neighborhoodsTotal} featured=${state.neighborhoodsFeatured}`
  );
  return state;
}

// ----------------------------------------------------------------------------
// Section D — Feed-surface coverage
// ----------------------------------------------------------------------------

interface EventsSurfaceRow {
  cat: RailCategory;
  today: number;
  weekend: number;
  newInDenver: number;
  outsideEvents: number;
  outsidePlaces: number;
}

interface PlacesSurfaceRow {
  cat: PlacesRailCategory;
  newInDenver: number;
  neighborhoods: number;
  localFavorites: number;
  dateNight: number;
  goodForGroups: number;
  workFriendly: number;
}

async function runSectionD(
  now: Date
): Promise<{ events: EventsSurfaceRow[]; places: PlacesSurfaceRow[] }> {
  console.log("\n== Section D — Feed-surface coverage ==");
  const eodToday = endOfTodayLocal(now);
  const { start: weekendStart, end: weekendEnd } = upcomingWeekendRange(now);
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

  const events: EventsSurfaceRow[] = [];
  for (const cat of RAIL_CATEGORIES) {
    const eventCat = eventWhereForCategory(cat);
    const placeCat = placeWhereForCategory(cat);
    const [today, weekend, newInDenver, outsideEvents, outsidePlaces] =
      await Promise.all([
        prisma.event.count({
          where: {
            AND: [
              activeEventsWhere(now),
              eventCat,
              { startTime: { gte: now, lte: eodToday } },
            ],
          },
        }),
        prisma.event.count({
          where: {
            AND: [
              activeEventsWhere(now),
              eventCat,
              { startTime: { gte: weekendStart, lte: weekendEnd } },
            ],
          },
        }),
        prisma.place.count({
          where: {
            AND: [
              placeCat,
              {
                OR: [{ isNew: true }, { openedDate: { gte: fortyFiveDaysAgo } }],
              },
            ],
          },
        }),
        prisma.event.count({
          where: { AND: [activeEventsWhere(now), eventCat, outsideDenverWhere()] },
        }),
        prisma.place.count({
          where: { AND: [placeCat, outsideDenverPlaceWhere()] },
        }),
      ]);
    events.push({ cat, today, weekend, newInDenver, outsideEvents, outsidePlaces });
  }

  const places: PlacesSurfaceRow[] = [];
  for (const cat of PLACES_RAIL_CATEGORIES) {
    const placeCat = placeWhereForPlacesRail(cat);
    const [newInDenver, neighborhoods, localFavorites, dateNight, goodForGroups, workFriendly] =
      await Promise.all([
        prisma.place.count({
          where: {
            AND: [
              placeCat,
              {
                OR: [{ isNew: true }, { openedDate: { gte: fortyFiveDaysAgo } }],
              },
            ],
          },
        }),
        prisma.neighborhood.count({ where: { isFeatured: true } }),
        prisma.place.count({
          where: { AND: [localFavoritesWhere(), placeCat] },
        }),
        prisma.place.count({
          where: { AND: [dateNightPlacesWhere(), placeCat] },
        }),
        prisma.place.count({
          where: { AND: [groupFriendlyPlacesWhere(), placeCat] },
        }),
        prisma.place.count({
          where: { AND: [workFriendlyPlacesWhere(), placeCat] },
        }),
      ]);
    places.push({
      cat,
      newInDenver,
      neighborhoods,
      localFavorites,
      dateNight,
      goodForGroups,
      workFriendly,
    });
  }

  console.log(`  events rails: ${events.length}, places rails: ${places.length}`);
  return { events, places };
}

// ----------------------------------------------------------------------------
// Report writer
// ----------------------------------------------------------------------------

function md(table: (string | number)[][]): string {
  const header = table[0].map(String);
  const rows = table.slice(1);
  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length))
  );
  const pad = (s: string | number, i: number) =>
    String(s ?? "").padEnd(widths[i], " ");
  const lines: string[] = [];
  lines.push(`| ${header.map((h, i) => pad(h, i)).join(" | ")} |`);
  lines.push(`| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`);
  for (const r of rows) {
    lines.push(`| ${r.map((c, i) => pad(c, i)).join(" | ")} |`);
  }
  return lines.join("\n");
}

function buildReport(args: {
  scraperHealth: ScraperHealth[];
  pipeline: PipelineRun;
  dbState: DbState;
  surfaces: { events: EventsSurfaceRow[]; places: PlacesSurfaceRow[] };
}): string {
  const { scraperHealth, pipeline, dbState, surfaces } = args;
  const sumRaw = scraperHealth.reduce((s, r) => s + r.rawCount, 0);
  const empties = scraperHealth.filter((r) => r.status === "empty");
  const errors = scraperHealth.filter((r) => r.status === "error");
  const notConfigured = scraperHealth.filter((r) => r.status === "not configured");

  const summary: string[] = [];
  summary.push(`- Scrapers returning 0 silently: **${empties.length}** (${empties.map((e) => e.name).join(", ") || "none"})`);
  summary.push(`- Scrapers erroring: **${errors.length}** (${errors.map((e) => e.name).join(", ") || "none"})`);
  summary.push(`- Scrapers not configured: **${notConfigured.length}** (${notConfigured.map((e) => e.name).join(", ") || "none"})`);
  summary.push(`- Future events in DB: **${dbState.eventsFuture}**`);
  summary.push(`- Places in DB: **${dbState.placesTotal}** (localFav=${dbState.placesLocalFavorite}, isNew=${dbState.placesIsNew}, opened<45d=${dbState.placesOpenedLast45d})`);
  summary.push(`- Events with qualityScore persisted: **${dbState.eventsWithQualityScore}** (expected 0 — see Section F)`);

  const out: string[] = [];
  out.push(`# Pulse Data Audit — ${TODAY_ISO}`);
  out.push("");
  out.push("Phase 0 deliverable for `PRD/data-refresh-and-reliability.md`. Read-only audit (Section B writes only if `AUDIT_CONFIRM=1`).");
  out.push("");
  out.push("## Summary");
  out.push("");
  out.push(summary.join("\n"));
  out.push("");

  // ---- Section A ----
  out.push("## A. Scraper health");
  out.push("");
  out.push(
    md([
      ["Source", "Status", "Raw count", "Errors", "Duration (ms)", "Notes"],
      ...scraperHealth.map((r) => [
        r.name,
        r.status,
        r.rawCount,
        r.errors.length > 0 ? r.errors.slice(0, 2).join(" | ").slice(0, 80) : "-",
        r.durationMs,
        r.notes ?? (r.sampleTitles.length > 0 ? `e.g. "${r.sampleTitles[0].slice(0, 50)}"` : "-"),
      ]),
    ])
  );
  out.push("");
  out.push(`Sum of raw events across sources: **${sumRaw}**`);
  out.push("");
  if (scraperHealth.some((r) => r.sampleTitles.length > 0)) {
    out.push("### Sample titles (sanity check)");
    out.push("");
    for (const r of scraperHealth) {
      if (r.sampleTitles.length === 0) continue;
      out.push(`- **${r.name}**: ${r.sampleTitles.map((t) => `"${t}"`).join(", ")}`);
    }
    out.push("");
  }

  // ---- Section B ----
  out.push("## B. Pipeline full run");
  out.push("");
  if (!pipeline.ran) {
    out.push(`_${pipeline.reason ?? "skipped"}._ To run: \`AUDIT_CONFIRM=1 npm run audit\` (or invoke the script directly).`);
    out.push("");
  } else {
    out.push(
      md([
        ["Metric", "Value"],
        ["Events before run", pipeline.eventsBefore ?? 0],
        ["Events after run", pipeline.eventsAfter ?? 0],
        ["Total (post-dedup)", pipeline.total ?? 0],
        ["Inserted", pipeline.inserted ?? 0],
        ["Updated", pipeline.updated ?? 0],
        ["Enriched", pipeline.enriched ?? 0],
        ["Dropped (quality<cutoff, archived)", pipeline.dropped ?? 0],
        ["Dedup drop (sum raw − total)", sumRaw - (pipeline.total ?? 0)],
        ["Errors", (pipeline.errors ?? []).length],
        ["Duration (ms)", pipeline.durationMs ?? 0],
      ])
    );
    if ((pipeline.errors ?? []).length > 0) {
      out.push("");
      out.push("**Errors:**");
      out.push("");
      for (const e of pipeline.errors ?? []) out.push(`- ${e}`);
    }
    out.push("");
    out.push(
      `_Note: the PRD asks for 'count after AI quality filter'. No such filter is implemented in code today — see Section F, item 4._`
    );
    out.push("");
  }

  // ---- Section C ----
  out.push("## C. Database state");
  out.push("");
  out.push("### Events");
  out.push("");
  out.push(
    md([
      ["Metric", "Value"],
      ["Total events", dbState.eventsTotal],
      ["Future events (active)", dbState.eventsFuture],
      ["Archived", dbState.eventsArchived],
      ["Published (status)", dbState.eventsPublished],
      ["With qualityScore", dbState.eventsWithQualityScore],
      ["With oneLiner", dbState.eventsWithOneLiner],
      ["With noveltyScore", dbState.eventsWithNoveltyScore],
      ["Oldest future startTime", dbState.oldestFutureStart ?? "-"],
      ["Newest future startTime", dbState.newestFutureStart ?? "-"],
    ])
  );
  out.push("");
  out.push("**Future events by category:**");
  out.push("");
  out.push(
    md([
      ["Category", "Count"],
      ...Object.entries(dbState.eventsByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, v]),
    ])
  );
  out.push("");
  out.push("**Future events by source:**");
  out.push("");
  out.push(
    md([
      ["Source", "Count"],
      ...Object.entries(dbState.eventsBySource)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, v]),
    ])
  );
  out.push("");
  out.push("### Places");
  out.push("");
  out.push(
    md([
      ["Metric", "Value"],
      ["Total places", dbState.placesTotal],
      ["Local favorites", dbState.placesLocalFavorite],
      ["isNew = true", dbState.placesIsNew],
      ["openedDate >= 45d ago", dbState.placesOpenedLast45d],
      ["Last updated (most recent)", dbState.placesLastUpdated ?? "-"],
      ["Oldest updatedAt", dbState.placesOldestUpdate ?? "-"],
    ])
  );
  out.push("");
  out.push("**Places by category:**");
  out.push("");
  out.push(
    md([
      ["Category", "Count"],
      ...Object.entries(dbState.placesByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, v]),
    ])
  );
  out.push("");
  out.push("**Places by openingStatus:**");
  out.push("");
  out.push(
    md([
      ["openingStatus", "Count"],
      ...Object.entries(dbState.placesByOpeningStatus)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, v]),
    ])
  );
  out.push("");
  out.push("### Neighborhoods");
  out.push("");
  out.push(
    md([
      ["Metric", "Value"],
      ["Total", dbState.neighborhoodsTotal],
      ["Featured", dbState.neighborhoodsFeatured],
    ])
  );
  out.push("");

  // ---- Section D ----
  out.push("## D. Feed-surface coverage");
  out.push("");
  out.push("### Events tab — counts per rail category");
  out.push("");
  out.push(
    md([
      ["Rail", "Today", "Weekend", "New in Denver (places)", "Outside events", "Outside places"],
      ...surfaces.events.map((r) => [
        r.cat,
        r.today,
        r.weekend,
        r.newInDenver,
        r.outsideEvents,
        r.outsidePlaces,
      ]),
    ])
  );
  out.push("");
  out.push("### Places tab — counts per rail category");
  out.push("");
  out.push(
    md([
      ["Rail", "New in Denver", "Neighborhoods", "Local favs", "Date night", "Groups", "Work-friendly"],
      ...surfaces.places.map((r) => [
        r.cat,
        r.newInDenver,
        r.neighborhoods,
        r.localFavorites,
        r.dateNight,
        r.goodForGroups,
        r.workFriendly,
      ]),
    ])
  );
  out.push("");
  out.push(
    `_Outside-the-city scope: events/places whose \`neighborhood\` matches one of: ${OUTSIDE_DENVER_REGIONS.join(", ")}._`
  );
  out.push("");

  // ---- Section E ----
  out.push("## E. Cron health (manual)");
  out.push("");
  out.push("Run `vercel logs --since=14d` (or inspect the Vercel dashboard) and fill in the table below.");
  out.push("");
  out.push(
    md([
      ["Endpoint", "Schedule", "Runs", "OK", "Failed", "Most recent failure (truncate)"],
      ["/api/cron/scrape-and-revalidate", "0 11 * * *", "", "", "", ""],
      ["/api/cron/archive-stale-events", "0 10 * * *", "", "", "", ""],
      ["/api/cron/refresh-neighborhood-counts", "0 9 * * *", "", "", "", ""],
      ["/api/cron/refresh-places?chunk=0", "0 7 * * 0", "", "", "", ""],
      ["/api/cron/refresh-places?chunk=1", "10 7 * * 0", "", "", "", ""],
      ["/api/cron/refresh-places?chunk=2", "20 7 * * 0", "", "", "", ""],
      ["/api/cron/refresh-guide-counts", "30 9 * * *", "", "", "", ""],
      ["/api/cron/cleanup-cache", "0 4 * * *", "", "", "", ""],
      ["/api/cron/backfill-walk-times", "0 12 * * *", "", "", "", ""],
    ])
  );
  out.push("");
  out.push("Also confirm: `CRON_SECRET` env var is set in Vercel? **[y/n]**");
  out.push("");

  // ---- Section F ----
  out.push("## F. PRD vs reality — flagged gaps");
  out.push("");
  out.push(
    "Items where `PRD/data-refresh-and-reliability.md` assumptions diverge from current code. Phases 1–4 should be re-scoped against these.",
  );
  out.push("");
  out.push(
    `1. **Stale-event filter already exists.** \`lib/queries/events.ts:activeEventsWhere()\` filters \`startTime >= now\` AND \`isArchived = false\` on every events-tab query. Phase 1.2 is mostly done; only recurring-event next-occurrence tracking remains.`
  );
  out.push(
    `2. **Archive cron already exists.** \`/api/cron/archive-stale-events\` runs daily at 10am UTC (see \`vercel.json\`).`
  );
  out.push(
    `3. ~~**Dedup key is \`title + date\`, not \`title + venue + date\`**~~ **Fixed 2026-04-18.** \`deduplicateEvents\` now keys on \`normalizedTitle | normalizedVenue | YYYY-MM-DD\`.`
  );
  out.push(
    `4. ~~**No quality_score drop filter.**~~ **Fixed 2026-04-18.** \`runAllScrapers()\` now flips \`isArchived: true\` on events with \`qualityScore < PULSE_QUALITY_CUTOFF\` (default 5, tunable via env). Archived events are excluded from the home feed by \`activeEventsWhere()\`. Return value gained a \`dropped\` counter.`
  );
  out.push(
    `5. ~~**Inline-scrape enrichment drops scores.**~~ **Fixed 2026-04-18.** \`lib/scrapers/index.ts\` now persists \`qualityScore\`, \`noveltyScore\`, \`oneLiner\`, and a validated category override on the nightly-cron path. Today's qualityScore count: ${dbState.eventsWithQualityScore}.`
  );
  out.push(
    `6. **"New in Denver" is not arbitrarily lying.** It already queries \`isNew: true OR openedDate >= 45daysAgo\` (\`components/home/fetch-home-feed.ts\` + \`lib/home/places-section-filters.ts\`). If Rosetta Hall/Retrograde show as "new," their seed rows have \`isNew=true\` set. PRD §3.3 fix: unset \`isNew\` on stale seeds (or rename section to "Just added").`
  );
  out.push(
    `7. ~~**No \`isDayTrip\` field on Event.**~~ **Resolved 2026-04-18** by PRD 2 Phase 0 migration. Event + Place now have \`region\` (enum) + \`isDayTrip\` + \`isWeekendTrip\` + \`townName\` + \`driveNote\`, and \`outsideDenverWhere()\` prefers the enum with the neighborhood whitelist as fallback.`
  );
  out.push(
    `8. **No \`ScraperRun\` table.** Phase 4 work — every scrape currently logs only to stdout and the returned counts object. No historical observability.`
  );
  out.push(
    `9. **Places weekly cron already exists.** \`/api/cron/refresh-places\` runs Sundays with three chunked invocations (07:00, 07:10, 07:20 UTC). PRD §3.4 is already implemented.`
  );
  out.push(
    `10. **Facebook Events, pro sports, Meetup are explicit non-goals** per PRD. Honored.`
  );
  out.push("");

  // ---- Section G ----
  out.push("## G. Recommended Phase 1 priorities");
  out.push("");
  out.push("Ordered from highest-leverage to lowest, derived from A–F. Quest to approve before Phase 1 kickoff.");
  out.push("");
  const recs: string[] = [];
  if (empties.length > 0) {
    recs.push(
      `**Fix silently-empty scrapers first:** ${empties.map((e) => e.name).join(", ")}. These are the PRD's headline symptom (Today + Weekend empty). Low effort, huge feed impact.`
    );
  }
  if (errors.length > 0) {
    recs.push(
      `**Resolve erroring scrapers:** ${errors.map((e) => e.name).join(", ")}. See errors column in Section A.`
    );
  }
  if (notConfigured.length > 0) {
    recs.push(
      `**Configure API scrapers:** set ${notConfigured.map((e) => e.requiresEnv).join(", ")} in Vercel to enable ${notConfigured.map((e) => e.name).join(", ")}. Currently returning 0.`
    );
  }
  recs.push(
    `**Correct "New in Denver" seeds (Section F #6).** Either clear \`isNew=true\` on pre-existing seeds or rename the section UI to "Just added on Pulse."`
  );
  recs.push(
    `**Backfill scores on older events (optional).** Run \`npm run events:enrich\` against the 600+ events still missing \`qualityScore\`. Only needed if the quality filter is flagging gaps on pre-2026-04-18 rows.`
  );
  const anyEmptySurface = surfaces.events.some(
    (r) => r.cat === "all" && (r.today === 0 || r.weekend === 0 || r.outsideEvents === 0)
  );
  if (anyEmptySurface) {
    recs.push(
      `**Surfaces still empty after scrape:** the \`all\` rail shows empty sections — check Section D row \`all\` to confirm which one and trace back to source coverage in Section C's "events by source."`
    );
  }
  recs.push(
    `**Defer \`ScraperRun\` table to Phase 4** as scoped. Add structured stdout logs in Phase 1 as a bridge (per-source raw/inserted/updated/duration).`
  );
  for (let i = 0; i < recs.length; i++) {
    out.push(`${i + 1}. ${recs[i]}`);
  }
  out.push("");
  out.push("---");
  out.push("");
  out.push(
    `Report generated at ${new Date().toISOString()} against \`${redactedDbUrl()}\`.`
  );
  return out.join("\n") + "\n";
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  console.log("=== Pulse Data Audit (Phase 0) ===");
  console.log(`DB: ${redactedDbUrl()}`);
  console.log(`Mode: ${AUDIT_CONFIRM ? "read + one scrape write" : "read-only"}`);

  const scraperHealth = await runSectionA();
  const sumRaw = scraperHealth.reduce((s, r) => s + r.rawCount, 0);
  const pipeline = await runSectionB(sumRaw);
  const dbState = await runSectionC(new Date());
  const surfaces = await runSectionD(new Date());

  mkdirSync(REPORT_DIR, { recursive: true });
  const report = buildReport({ scraperHealth, pipeline, dbState, surfaces });
  writeFileSync(REPORT_PATH, report);
  console.log(`\n✓ Report written to ${REPORT_PATH}`);
}

main()
  .catch((e) => {
    console.error("Audit failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
