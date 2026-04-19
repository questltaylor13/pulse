import OpenAI from "openai";
import { createHash } from "crypto";
import type { Category, PrismaClient } from "@prisma/client";
import { deriveRegionalFields } from "@/lib/regional/metadata";
import { classifyEvent, extractTags } from "@/lib/scrapers/classify";

/**
 * PRD 2 Phase 3.2 — weekly LLM research pass for mountain destinations.
 *
 * Uses OpenAI's Responses API with the built-in `web_search` tool to
 * discover upcoming festivals, races, seasonal events, and distinctive
 * experiences in Colorado mountain towns — the stuff visitor-bureau RSS
 * feeds miss. Chosen over Anthropic's equivalent API to keep all LLM
 * traffic on the existing OPENAI_API_KEY (same key used by enrichEvent).
 *
 * Candidates go through the same `deriveRegionalFields()` regional tagging
 * the rest of the pipeline uses. Candidates without source URLs are dropped
 * per PRD — we need citations for user trust.
 */

const MODEL = "gpt-5";
const SOURCE = "llm-research-mtn";

// Keep the prompt almost verbatim from PRD §3.2 so the output shape is
// stable across weeks and matches Quest's voice expectation.
const PROMPT = `You are researching events for Pulse, a Denver-focused discovery app for 25-35 year olds.

Use web search to find the most compelling events, festivals, and unique experiences happening in Colorado mountain towns (Breckenridge, Vail, Aspen, Steamboat Springs, Crested Butte, Telluride, Winter Park, Beaver Creek, Keystone) in the next 8 weeks.

Focus on:
- Festivals (music, food, film, art)
- Races (ski, bike, trail, running)
- Seasonal events (ski season openings, mud season quirks, summer concert series)
- Concerts by nationally-known artists
- Anything distinctive enough that a Denver resident would think "that's worth a weekend trip"

Exclude:
- Conferences, conventions, B2B meetings, trade shows
- Weekly-recurring happy hours (unless truly distinctive)
- Events without a specific date or date range

Return ONLY a JSON array (no prose, no markdown fences) of objects with this exact shape:
[
  {
    "title": "string — the event name",
    "startDate": "YYYY-MM-DD — first day of the event",
    "endDate": "YYYY-MM-DD or null — last day if multi-day",
    "town": "one of: Breckenridge | Vail | Aspen | Steamboat Springs | Crested Butte | Telluride | Winter Park | Beaver Creek | Keystone",
    "venueName": "string — the venue or 'Throughout town' if it's a town-wide festival",
    "description": "2-3 sentences describing what makes this event compelling",
    "category": "one of: LIVE_MUSIC | ART | OUTDOORS | FOOD | BARS | COMEDY | SEASONAL | SOCIAL | OTHER",
    "sourceUrl": "string — the URL where you found verifiable information about this event (required)"
  }
]

Drop any event where you can't find a source URL. Target 10-20 high-quality results. Do NOT hallucinate dates — if you can't find a specific date, omit that event.`;

export interface ResearchedEvent {
  title: string;
  startDate: string;
  endDate: string | null;
  town: string;
  venueName: string;
  description: string;
  category: string;
  sourceUrl: string;
}

export interface ResearchResult {
  raw: ResearchedEvent[];
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

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

function coerceCategory(raw: string | null | undefined): Category {
  if (!raw) return "OTHER";
  const upper = raw.toUpperCase().replace(/[\s-]+/g, "_") as Category;
  return VALID_CATEGORIES.has(upper) ? upper : "OTHER";
}

function stableId(url: string, town: string, title: string): string {
  return createHash("sha256").update(`${url}|${town}|${title}`).digest("hex").slice(0, 16);
}

function parseJsonArray(text: string): ResearchedEvent[] {
  // Models sometimes wrap output in ```json fences despite the instruction.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end < 0 || end <= start) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function anchorToMountainTime(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const isDST = m >= 3 && m <= 10;
  const offset = isDST ? 6 : 7;
  // Anchor at 19:00 local (most mountain-town events are evening-ish)
  const dt = new Date(Date.UTC(y, m - 1, d, 19 + offset, 0, 0));
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Call OpenAI Responses API with the built-in `web_search` tool. The model
 * decides when/whether to search and returns its final answer via
 * response.output_text. No DB writes here — caller can inspect first.
 */
export async function researchMountainEvents(): Promise<ResearchedEvent[]> {
  const client = new OpenAI();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client as any).responses.create({
    model: MODEL,
    input: PROMPT,
    tools: [{ type: "web_search" }],
  });
  const text: string = response.output_text ?? "";
  return parseJsonArray(text);
}

/**
 * Upsert researched events into the DB. Uses the existing orchestrator's
 * regional-tagging pattern: sets `neighborhood` to the canonical town
 * name, which lets `deriveRegionalFields()` populate region/driveTime/etc.
 */
export async function ingestResearchedEvents(
  prisma: PrismaClient,
  candidates: ResearchedEvent[]
): Promise<ResearchResult> {
  const errors: string[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const city = await prisma.city.findFirst({ where: { name: "Denver" } });
  if (!city) {
    return { raw: candidates, inserted, updated, skipped, errors: ["Denver city not found"] };
  }

  for (const c of candidates) {
    // Mandatory source URL
    if (!c.sourceUrl || !/^https?:\/\//.test(c.sourceUrl)) {
      skipped++;
      continue;
    }
    // Mandatory known town
    const regional = deriveRegionalFields(c.town);
    if (regional.region === "DENVER_METRO") {
      // Unknown town — drop (PRD: strict on regional quality)
      skipped++;
      continue;
    }
    const startTime = anchorToMountainTime(c.startDate);
    if (!startTime) {
      skipped++;
      continue;
    }
    const endTime = c.endDate ? anchorToMountainTime(c.endDate) : null;

    const externalId = stableId(c.sourceUrl, c.town, c.title);
    const existing = await prisma.event.findFirst({
      where: { externalId, source: SOURCE },
    });
    const category = coerceCategory(c.category) ?? classifyEvent(c.title, c.venueName);
    const tags = extractTags(c.title, c.venueName);

    const baseData = {
      title: c.title,
      description: c.description,
      category,
      tags,
      venueName: c.venueName || c.town,
      address: `${c.town}, CO`,
      neighborhood: c.town,
      startTime,
      endTime: endTime && endTime.getTime() > startTime.getTime() ? endTime : null,
      priceRange: "$$$",
      sourceUrl: c.sourceUrl,
      region: regional.region,
      townName: regional.townName,
      isDayTrip: regional.isDayTrip,
      isWeekendTrip: regional.isWeekendTrip,
      driveTimeFromDenver: regional.driveTimeFromDenver,
      driveNote: regional.driveNote,
    };

    try {
      if (existing) {
        await prisma.event.update({ where: { id: existing.id }, data: baseData });
        updated++;
      } else {
        await prisma.event.create({
          data: {
            ...baseData,
            cityId: city.id,
            source: SOURCE,
            externalId,
          },
        });
        inserted++;
      }
    } catch (e) {
      errors.push(`${c.title}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return { raw: candidates, inserted, updated, skipped, errors };
}
