/**
 * Place enrichment — the LLM pass that derives Pulse's tags, description, and
 * (Wave 6B) the five situational booleans from a place's Google data.
 *
 * Lifted out of scripts/enrich-places.ts, which was manual-CLI-only and on no
 * cron, so the corpus only ever got enriched when someone remembered to run it.
 * The pure functions here (prompt, parse, select, update) are what the tests
 * drive; the OpenAI call and the DB writes are the thin shell around them.
 *
 * Provider is OpenAI (gpt-4o-mini). There is no Anthropic SDK in this repo — the
 * "calls Claude" comments elsewhere are stale.
 */

import { PrismaClient, Category, Prisma } from "@prisma/client";
import OpenAI from "openai";
import {
  ENRICHMENT_VIBE_VOCABULARY,
  filterValidVibeTags,
} from "@/lib/constants/vibe-tags";

// These three vocabularies are Title-case and internally consistent — enrichment
// writes them, every reader queries them in the same case. Unlike vibeTags, they
// were never broken, so Wave 6B deliberately leaves them alone.
const COMPANION_TAGS = [
  "Solo-friendly", "Date Night", "Groups", "Family", "Friends",
  "Business", "Couples", "Girls Night", "Guys Night", "Team Outing",
];

const OCCASION_TAGS = [
  "Birthday", "Anniversary", "First Date", "Celebration", "Casual Hangout",
  "Special Occasion", "Weekend Brunch", "Happy Hour", "Late Night",
  "Sunday Funday", "Working Lunch", "Client Meeting",
];

const GOOD_FOR_TAGS = [
  "Quick Bite", "Long Dinner", "Drinks", "Coffee Meeting", "Work Remote",
  "People Watching", "Photos", "Live Music", "Dancing", "Outdoor Seating",
  "Dog-friendly", "Kids", "Vegetarian", "Vegan Options", "Gluten-free",
  "Late Night Eats",
];

const CATEGORY_MAP: Record<string, Category> = {
  restaurant: "RESTAURANT",
  bar: "BARS",
  coffee: "COFFEE",
  outdoors: "OUTDOORS",
  fitness: "FITNESS",
  art: "ART",
  live_music: "LIVE_MUSIC",
  activity: "ACTIVITY_VENUE",
};

/** The five Wave 6B situational booleans, and what the LLM is told each means. */
const SITUATIONAL_ATTRIBUTES = [
  ["goodForWatchingSports", "has TVs/screens and actually shows live games"],
  ["isKidFriendly", "kids are welcome and comfortable — high chairs, kids menu, or an obviously family setting"],
  ["hasOutdoorSeating", "has a patio, rooftop, or sidewalk seating"],
  ["hasIndoorSeating", "has seating indoors (true for nearly everywhere; false only for a truly outdoor-only spot like a food truck lot)"],
  ["fitsLargeGroups", "a group of 6+ could turn up without a reservation and be seated"],
] as const;

type SituationalKey = typeof SITUATIONAL_ATTRIBUTES[number][0];

/** The place fields the prompt actually uses. Narrower than Place, so tests can build one. */
export interface EnrichmentInput {
  id: string;
  name: string;
  category: Category | null;
  address: string;
  neighborhood: string | null;
  priceLevel: number | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  types: string[];
  website: string | null;
}

export interface PlaceEnrichment {
  vibeTags: string[];
  companionTags: string[];
  occasionTags: string[];
  goodForTags: string[];
  /** null when the model omitted it — never written, so live copy is never erased. */
  pulseDescription: string | null;
  goodForWatchingSports: boolean;
  isKidFriendly: boolean;
  hasOutdoorSeating: boolean;
  hasIndoorSeating: boolean;
  fitsLargeGroups: boolean;
  /**
   * How many of the five booleans arrived as REAL JSON booleans.
   *
   * Without this there is no floor: a model that returns `{}` (or answers "yes"
   * for everything, which asBool correctly rejects) parses to a perfectly valid
   * all-false enrichment, we stamp situationalEnrichedAt, and the weekly cron —
   * which gates on that column being null — never looks at the place again. It
   * would be invisible to every situational browse page forever, on the strength
   * of an answer the model never gave.
   */
  situationalAnswers: number;
}

/**
 * "full" regenerates everything. "attributes" derives ONLY the five booleans and
 * leaves existing descriptions and tags untouched — the backfill mode, because
 * the corpus already has live descriptions we do not want churned.
 */
export type EnrichmentMode = "full" | "attributes";

export interface SelectionOptions {
  mode: EnrichmentMode;
  category?: string;
  force?: boolean;
}

export function buildPrompt(place: EnrichmentInput): string {
  const priceIndicator = place.priceLevel ? "$".repeat(place.priceLevel) : "Unknown price";

  const attributeLines = SITUATIONAL_ATTRIBUTES.map(
    ([key, meaning]) => `   - ${key}: ${meaning}`,
  ).join("\n");

  return `You are a Denver local helping categorize a venue for a social discovery app called Pulse.

Based on the following information about this place, provide:
1. vibeTags: 2-4 tags describing the atmosphere/vibe. Use these EXACT lowercase tokens: ${ENRICHMENT_VIBE_VOCABULARY.join(", ")}
2. companionTags: 2-3 tags for who this place is good for (choose from: ${COMPANION_TAGS.join(", ")})
3. occasionTags: 2-3 tags for what occasions fit this place (choose from: ${OCCASION_TAGS.join(", ")})
4. goodForTags: 2-4 tags for what this place is good for (choose from: ${GOOD_FOR_TAGS.join(", ")})
5. pulseDescription: A fun, engaging 1-2 sentence description written in a casual, friendly tone that captures what makes this place special. Focus on the experience, not just facts.
6. Five true/false situational attributes. Answer with real JSON booleans, never the strings "yes"/"no". If you are not reasonably confident, answer false:
${attributeLines}

Place Information:
- Name: ${place.name}
- Category: ${place.category || "Unknown"}
- Address: ${place.address}
- Neighborhood: ${place.neighborhood || "Denver"}
- Price Level: ${priceIndicator}
- Google Rating: ${place.googleRating || "Unknown"} (${place.googleReviewCount || 0} reviews)
- Types: ${place.types.join(", ")}
${place.website ? `- Website: ${place.website}` : ""}

Respond in JSON format only:
{
  "vibeTags": ["tag1", "tag2"],
  "companionTags": ["tag1", "tag2"],
  "occasionTags": ["tag1", "tag2"],
  "goodForTags": ["tag1", "tag2"],
  "pulseDescription": "Your description here",
  "goodForWatchingSports": false,
  "isKidFriendly": false,
  "hasOutdoorSeating": false,
  "hasIndoorSeating": true,
  "fitsLargeGroups": false
}`;
}

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const whitelist = (v: unknown, allowed: string[]): string[] =>
  asArray(v).filter((t) => allowed.includes(t));

// Strictly boolean. An LLM will happily answer "yes", and coercing that would
// publish a claim it never made in the shape we asked for. Anything that is not
// literally `true` is false — except hasIndoorSeating, which defaults true when
// ABSENT (most places have it, and so does the schema) but is still false if the
// model explicitly says so.
const asBool = (v: unknown, whenAbsent = false): boolean =>
  v === undefined || v === null ? whenAbsent : v === true;

/**
 * Parse + validate one LLM response. Returns null only when the payload is not a
 * JSON object at all; a response missing every field still yields a usable
 * (empty) enrichment rather than throwing.
 */
export function parseEnrichment(raw: string): PlaceEnrichment | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const o = parsed as Record<string, unknown>;

  const description = typeof o.pulseDescription === "string" && o.pulseDescription.trim()
    ? o.pulseDescription.trim()
    : null;

  const situationalAnswers = SITUATIONAL_ATTRIBUTES.filter(
    ([key]) => typeof o[key] === "boolean",
  ).length;

  return {
    vibeTags: filterValidVibeTags(asArray(o.vibeTags)),
    companionTags: whitelist(o.companionTags, COMPANION_TAGS),
    occasionTags: whitelist(o.occasionTags, OCCASION_TAGS),
    goodForTags: whitelist(o.goodForTags, GOOD_FOR_TAGS),
    pulseDescription: description,
    goodForWatchingSports: asBool(o.goodForWatchingSports),
    isKidFriendly: asBool(o.isKidFriendly),
    hasOutdoorSeating: asBool(o.hasOutdoorSeating),
    hasIndoorSeating: asBool(o.hasIndoorSeating, true),
    fitsLargeGroups: asBool(o.fitsLargeGroups),
    situationalAnswers,
  };
}

/**
 * Which places to pick up. The two modes gate on DIFFERENT columns, and that is
 * the crux of the targeted backfill: gating the attributes pass on
 * pulseDescription would skip every already-described place — i.e. all of them.
 */
export function buildSelectionWhere(options: SelectionOptions): Prisma.PlaceWhereInput {
  const { mode, category, force = false } = options;
  const where: Prisma.PlaceWhereInput = {};

  if (!force) {
    if (mode === "full") {
      where.pulseDescription = null;
    } else {
      where.situationalEnrichedAt = null;
    }
  }

  if (category) {
    const mapped = CATEGORY_MAP[category];
    if (!mapped) {
      throw new Error(
        `Unknown category: ${category}. Available: ${Object.keys(CATEGORY_MAP).join(", ")}`,
      );
    }
    where.category = mapped;
  }

  return where;
}

/**
 * What to write. In "attributes" mode this is ONLY the five booleans and the
 * marker — never the description or tags. That is the safety property of the
 * targeted backfill and it is asserted directly in the tests.
 */
export function buildUpdateData(
  mode: EnrichmentMode,
  e: PlaceEnrichment,
  now: Date,
): Prisma.PlaceUpdateInput {
  const attributes: Record<SituationalKey, boolean> & { situationalEnrichedAt: Date } = {
    goodForWatchingSports: e.goodForWatchingSports,
    isKidFriendly: e.isKidFriendly,
    hasOutdoorSeating: e.hasOutdoorSeating,
    hasIndoorSeating: e.hasIndoorSeating,
    fitsLargeGroups: e.fitsLargeGroups,
    situationalEnrichedAt: now,
  };

  if (mode === "attributes") return attributes;

  return {
    ...attributes,
    vibeTags: e.vibeTags,
    companionTags: e.companionTags,
    occasionTags: e.occasionTags,
    goodForTags: e.goodForTags,
    // Omitted entirely when the model gave us nothing, so a flaky response can
    // never erase copy that is already live.
    ...(e.pulseDescription ? { pulseDescription: e.pulseDescription } : {}),
  };
}

export interface EnrichRunOptions extends SelectionOptions {
  limit?: number;
  dryRun?: boolean;
  /** ms between OpenAI calls; the cron uses a larger value than the CLI. */
  delayMs?: number;
  onProgress?: (message: string) => void;
}

export interface EnrichRunResult {
  processed: number;
  enriched: number;
  failed: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run the enrichment pass. Shared by the CLI and the weekly cron.
 */
export async function runEnrichment(
  prisma: PrismaClient,
  openai: OpenAI,
  options: EnrichRunOptions,
): Promise<EnrichRunResult> {
  const { mode, limit, dryRun = false, delayMs = 500, onProgress = () => {} } = options;

  const places = await prisma.place.findMany({
    where: buildSelectionWhere(options),
    // nulls: "last" matters. calculateCombinedScore returns null for any place
    // with no rating or <5 reviews, and Postgres sorts DESC as NULLS FIRST — so
    // a plain `desc` led every batch with the LEAST-known places, exactly
    // inverting the intent of enriching the best ones first.
    orderBy: { combinedScore: { sort: "desc", nulls: "last" } },
    take: limit,
  });

  onProgress(`${places.length} place(s) to enrich (mode=${mode}, dryRun=${dryRun})`);

  let enriched = 0;
  let failed = 0;

  for (const place of places) {
    if (dryRun) {
      onProgress(`[DRY RUN] would enrich ${place.name}`);
      enriched++;
      continue;
    }

    let parsedEnrichment: PlaceEnrichment | null = null;
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: buildPrompt(place) }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 600,
      });
      const content = response.choices[0]?.message?.content;
      parsedEnrichment = content ? parseEnrichment(content) : null;
    } catch (error) {
      onProgress(
        `FAILED ${place.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // A model that answered NONE of the five must not be recorded as having
    // answered. Writing situationalEnrichedAt here would retire the place from
    // the weekly cron's `situationalEnrichedAt: null` gate permanently, on the
    // strength of an answer we never got. Same for a full-mode response that
    // produced no tags at all — the pulseDescription gate would strand it.
    const unusable =
      !parsedEnrichment ||
      parsedEnrichment.situationalAnswers === 0 ||
      (mode === "full" && parsedEnrichment.vibeTags.length === 0);

    if (unusable) {
      failed++;
      onProgress(`unusable response for ${place.name} — leaving it for the next run`);
      await sleep(delayMs);
      continue;
    }

    await prisma.place.update({
      where: { id: place.id },
      data: buildUpdateData(mode, parsedEnrichment!, new Date()),
    });
    enriched++;
    onProgress(`enriched ${place.name}`);

    await sleep(delayMs);
  }

  return { processed: places.length, enriched, failed };
}
