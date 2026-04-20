/**
 * Discovery enrichment (PRD 3 Phase 4).
 *
 * Every raw pipeline candidate flows through two LLM-backed steps before
 * it's eligible to become a Discovery record:
 *
 *   1. Event-vs-Gem classifier — reject candidates that are really dated
 *      events (concerts, festivals with a specific instance). Confidence
 *      > 0.7 as DATED_EVENT → rejected + logged for the Event pipeline.
 *
 *   2. Pulse-voice enrichment — rewrite title/description in Pulse voice,
 *      pick a Category enum value, generate 3–5 tags, assign a 1–10
 *      quality score. Quality < 6 → dropped.
 *
 * Both steps share the OpenAI client and model config. No web_search here
 * — we're reasoning over the candidate we already have, not discovering
 * new content.
 */

import OpenAI from "openai";
import { z } from "zod";
import { parseResponse } from "@/lib/discoveries/parsing";
import type { PipelineCandidate } from "@/lib/discoveries/types";
import type { Category } from "@prisma/client";

const DEFAULT_MODEL = process.env.DISCOVERIES_OPENAI_MODEL || "gpt-5.4-mini";
const ENRICH_MAX_TOKENS = 1024;
const CLASSIFIER_MAX_TOKENS = 256;

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

export const ClassifierResultSchema = z.object({
  classification: z.enum(["DATED_EVENT", "DISCOVERY"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(500),
});

export type ClassifierResult = z.infer<typeof ClassifierResultSchema>;

const CLASSIFIER_SYSTEM_PROMPT = `You are a strict classifier for the Pulse discovery pipeline. Given a candidate, decide whether it belongs in the DATED_EVENT pipeline (specific date + time + ticket/admission, single-occurrence or festival instance) or the DISCOVERY pipeline (permanent, recurring, or seasonal without a specific ticketed instance).

Rules:
- A recurring weekly meetup (e.g. "Thursday 6am run club") → DISCOVERY
- A named festival happening this weekend → DATED_EVENT
- A permanent bar, trail, or spot → DISCOVERY
- A ticketed popup with fixed dates → DATED_EVENT
- "When the sunflowers bloom in August" (no specific ticketed instance) → DISCOVERY
- Mention of a specific date + ticket URL → DATED_EVENT

Return ONLY JSON matching this shape (wrap in an object with a "candidates" array to match the shared parser — use a single-item array):

{
  "candidates": [
    {
      "title": "classifier-result",
      "description": "<your reason, one sentence>",
      "subtype": "HIDDEN_GEM",
      "source_urls": ["https://pulse.internal/classifier"],
      "category_hint": "DATED_EVENT" or "DISCOVERY",
      "town_hint": "<confidence as a decimal string, e.g. '0.85'>",
      "location_hint": null,
      "season_hint": null
    }
  ]
}`;

export async function classifyEventVsGem(
  candidate: PipelineCandidate,
  client: OpenAI,
  model = DEFAULT_MODEL
): Promise<ClassifierResult> {
  const input = [
    `title: ${candidate.title}`,
    `description: ${candidate.description}`,
    `subtype (proposed): ${candidate.subtype}`,
    `season_hint: ${candidate.season_hint ?? "null"}`,
    `location_hint: ${candidate.location_hint ?? "null"}`,
    `town_hint: ${candidate.town_hint ?? "null"}`,
    `source_urls: ${candidate.source_urls.join(", ")}`,
  ].join("\n");

  const response = await client.responses.create({
    model,
    instructions: CLASSIFIER_SYSTEM_PROMPT,
    input,
    max_output_tokens: CLASSIFIER_MAX_TOKENS,
  });

  const rawText = (response.output_text ?? "").trim();
  const parsed = parseResponse(rawText);
  if (!parsed.ok || parsed.value.candidates.length === 0) {
    // Fail open: conservatively route to DISCOVERY with low confidence so
    // we don't accidentally drop everything if the classifier misbehaves.
    return {
      classification: "DISCOVERY",
      confidence: 0.3,
      reason: `parse-failure: ${parsed.ok ? "empty" : parsed.error}`,
    };
  }
  const item = parsed.value.candidates[0];
  const classification = item.category_hint === "DATED_EVENT" ? "DATED_EVENT" : "DISCOVERY";
  const confidence = Number(item.town_hint ?? "0.5");
  return {
    classification,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
    reason: item.description,
  };
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

export const CATEGORY_VALUES = [
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
] as const satisfies ReadonlyArray<Category>;

export const EnrichedResultSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(800),
  category: z.enum(CATEGORY_VALUES),
  tags: z.array(z.string().min(1).max(30)).min(1).max(8),
  quality_score: z.number().int().min(1).max(10),
});

export type EnrichedResult = z.infer<typeof EnrichedResultSchema>;

const ENRICH_SYSTEM_PROMPT = `You are the curation voice for Pulse, a Denver + Front Range discovery platform for 25–35 year old locals. You rewrite raw candidates in Pulse voice:

- Opinionated, specific, never generic
- 2–3 sentences max in the description
- No marketing speak, no "immerse yourself in"
- Sound like a friend who actually lives here
- Include one concrete detail that proves it's real (a time, a cross-street, a specific thing to order/do, a specific season)

Assign a Category from this fixed enum: ART, LIVE_MUSIC, BARS, FOOD, COFFEE, OUTDOORS, FITNESS, SEASONAL, POPUP, OTHER, RESTAURANT, ACTIVITY_VENUE, COMEDY, SOCIAL, WELLNESS.

Quality score 1–10:
  - 9–10: specific, rare, unmistakably in Pulse voice, user would screenshot this
  - 7–8: solid, specific, in-voice, good signal
  - 5–6: valid but generic — barely makes the cut
  - 1–4: generic, vague, chain, touristy, or low-signal (should be rejected)

Tags (3–5): short, lowercased, hyphenated — e.g. "free", "group-friendly", "date-worthy", "regional", "sunset", "morning".

Return ONLY a JSON object wrapped in the "candidates" array shape used by the shared parser:

{
  "candidates": [
    {
      "title": "<rewritten title, <=60 chars, punchy>",
      "description": "<rewritten Pulse voice description, 2-3 sentences>",
      "subtype": "<same as input>",
      "source_urls": <same as input>,
      "category_hint": "<CATEGORY enum value>",
      "location_hint": "<same as input or refined>",
      "town_hint": "<same as input>",
      "season_hint": "<same as input or refined>"
    }
  ]
}

Additionally, embed tags and quality in the season_hint field using this exact format so the parser can recover them:

season_hint = "<original or '-'>|tags=tag1,tag2,tag3|quality=<1-10>"`;

function extractTagsAndQuality(seasonHint: string | null): {
  tags: string[];
  quality: number;
  cleanedSeason: string | null;
} {
  if (!seasonHint) return { tags: [], quality: 0, cleanedSeason: null };
  const parts = seasonHint.split("|");
  const cleaned = parts[0].trim();
  let tags: string[] = [];
  let quality = 0;
  for (const p of parts.slice(1)) {
    const [k, v] = p.split("=").map((s) => s.trim());
    if (k === "tags" && v) tags = v.split(",").map((t) => t.trim()).filter(Boolean);
    else if (k === "quality" && v) quality = Number(v) || 0;
  }
  return {
    tags,
    quality,
    cleanedSeason: cleaned === "-" || cleaned === "" ? null : cleaned,
  };
}

export interface EnrichmentResult {
  enriched: EnrichedResult | null;
  cleanedSeasonHint: string | null;
  reason?: string;
}

export async function enrichCandidate(
  candidate: PipelineCandidate,
  client: OpenAI,
  model = DEFAULT_MODEL
): Promise<EnrichmentResult> {
  const input = [
    `title: ${candidate.title}`,
    `description: ${candidate.description}`,
    `subtype: ${candidate.subtype}`,
    `category_hint: ${candidate.category_hint ?? "null"}`,
    `location_hint: ${candidate.location_hint ?? "null"}`,
    `town_hint: ${candidate.town_hint ?? "null"}`,
    `season_hint: ${candidate.season_hint ?? "null"}`,
    `source_urls: ${candidate.source_urls.join(", ")}`,
    `source_type: ${candidate.sourceType}`,
  ].join("\n");

  let rawText = "";
  try {
    const response = await client.responses.create({
      model,
      instructions: ENRICH_SYSTEM_PROMPT,
      input,
      max_output_tokens: ENRICH_MAX_TOKENS,
    });
    rawText = (response.output_text ?? "").trim();
  } catch (err) {
    return {
      enriched: null,
      cleanedSeasonHint: null,
      reason: `api-error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const parsed = parseResponse(rawText);
  if (!parsed.ok || parsed.value.candidates.length === 0) {
    return {
      enriched: null,
      cleanedSeasonHint: null,
      reason: parsed.ok ? "empty" : parsed.error,
    };
  }

  const item = parsed.value.candidates[0];
  const { tags, quality, cleanedSeason } = extractTagsAndQuality(item.season_hint ?? null);
  const categoryHint = (item.category_hint ?? "").toUpperCase();
  const category = (CATEGORY_VALUES as readonly string[]).includes(categoryHint)
    ? (categoryHint as Category)
    : null;

  if (!category || tags.length === 0 || quality <= 0) {
    return {
      enriched: null,
      cleanedSeasonHint: cleanedSeason,
      reason: `schema-drift: category=${category} tags=${tags.length} quality=${quality}`,
    };
  }

  const validation = EnrichedResultSchema.safeParse({
    title: item.title,
    description: item.description,
    category,
    tags,
    quality_score: quality,
  });
  if (!validation.success) {
    return {
      enriched: null,
      cleanedSeasonHint: cleanedSeason,
      reason: `schema: ${validation.error.message}`,
    };
  }
  return { enriched: validation.data, cleanedSeasonHint: cleanedSeason };
}

export const QUALITY_THRESHOLD = 6;
