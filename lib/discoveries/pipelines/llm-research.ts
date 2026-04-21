/**
 * LLM Research Pipeline (PRD 3 Phase 1).
 *
 * Runs N independent research queries against OpenAI's Responses API with the
 * `web_search_preview` tool enabled. Each query is scoped to a different angle
 * — under-the-radar Denver, hidden spots, seasonal, hobby groups, regional
 * gems, newly trending — so the pipeline gets breadth rather than N
 * variations of the same set.
 *
 * Every run is persisted to the LLMResearchRun table: prompt, raw response,
 * parsed candidates, web-search request count, duration. That table is the
 * debugging surface and the input to downstream enrichment (Phase 4).
 *
 * Guardrails enforced HERE (structural, Phase 1):
 *   - Strict Zod validation on structured output
 *   - source_urls required — candidates with zero URLs are dropped at parse
 *
 * Guardrails enforced LATER (Phase 4 enrichment):
 *   - Google Places verification for location_hint
 *   - Cross-source corroboration boost
 *   - Event-vs-Gem classifier
 */

import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parseResponse } from "@/lib/discoveries/parsing";
import type {
  DiscoveryCandidate,
  PipelineCandidate,
  PipelineRunResult,
} from "@/lib/discoveries/types";

// ---------------------------------------------------------------------------
// Model config (tunable via env without code change)
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = process.env.DISCOVERIES_OPENAI_MODEL || "gpt-5.4-mini";
const MAX_OUTPUT_TOKENS = 4096;

// ---------------------------------------------------------------------------
// Research queries — tune these without touching pipeline logic.
// ---------------------------------------------------------------------------

export interface ResearchQuery {
  label: string;
  prompt: string;
}

export const RESEARCH_QUERIES: ResearchQuery[] = [
  {
    label: "denver_under_radar",
    prompt: `What are 5–10 unique, under-the-radar things to do in Denver right now? Focus on activities that aren't on Eventbrite — rec leagues, niche clubs, seasonal experiences, hidden viewpoints, weird competitions, unusual workshops. Exclude chain restaurants, mainstream concerts, and generic tourist attractions (Red Rocks, Coors Field, Union Station). Use the web_search tool and cite real source URLs — Reddit threads, niche sites, local blogs, or small-publication articles are all fine.`,
  },
  {
    label: "denver_hidden_spots",
    prompt: `What are best-kept-secret spots in Denver that locals love but tourists don't know about? Focus on specific named locations — hidden parks, under-the-radar bars, quiet viewpoints, unusual shops, small restaurants. Use the web_search tool and cite real source URLs for each spot.`,
  },
  {
    label: "seasonal_front_range",
    prompt: `What seasonal activities in Denver and along the Colorado Front Range are happening right now or in the next 4–6 weeks that most people don't know about? Focus on nature, community events, and time-limited experiences — sunflower blooms, stargazing spots, migration events, harvest rituals, short-window openings. Use the web_search tool and cite real source URLs.`,
  },
  {
    label: "hobby_groups",
    prompt: `What are the most distinctive hobby groups, rec leagues, and niche clubs active in Denver and nearby towns (Boulder, Fort Collins, Colorado Springs)? Include curling, archery, unusual sports leagues, specialty run/bike/climbing clubs, maker groups, craft circles. Use the web_search tool and cite real source URLs — club websites, meetup pages, local news coverage.`,
  },
  {
    label: "regional_mountain_gems",
    prompt: `What are hidden gems in mountain towns within 2 hours of Denver — places in Nederland, Estes Park, Idaho Springs, Georgetown, Winter Park — that locals love but most Denver residents don't know about? Focus on specific spots, rituals, and small experiences, not big-ticket tourist attractions. Use the web_search tool and cite real source URLs.`,
  },
  {
    label: "newly_trending",
    prompt: `What's newly opened or newly trending in Denver in the past 3–6 months that fits the vibe of young professionals aged 25–35? Focus on independent spots (not chains), unusual concepts, and places that have gotten write-ups or Reddit attention but aren't yet saturated. Use the web_search tool and cite real source URLs.`,
  },
];

// ---------------------------------------------------------------------------
// System prompt — voice + strict output contract
// ---------------------------------------------------------------------------

export const DISCOVERY_SYSTEM_PROMPT = `You are a research agent for Pulse, a Denver + Colorado Front Range discovery platform for 25–35 year old locals. You find specific, under-the-radar places, activities, and seasonal rituals — the kind of things a friend who lives in Denver would recommend, not what a travel blog would.

You have access to a web_search tool. Use it to ground every recommendation in real, verifiable sources — local Reddit threads, small publication articles, niche club websites, community calendars. Do NOT recommend anything you cannot cite.

Constraints on what counts as a valid candidate:
- Must be specific, not generic ("Washington Park is nice" = invalid; "the southeast bench at Cheesman Park at sunset" = valid)
- Must NOT be a dated event with a ticket (concerts, festivals, popups with fixed dates belong in a different pipeline — OUT)
- Must exclude chains, major tourist attractions, and anything that's already on every Denver guide
- Prefer one concrete detail that proves it's real: a cross-street, a time window, a specific thing to order or do, a season

Return ONLY a valid JSON object (no prose, no markdown, no code fences) matching this exact schema:

{
  "candidates": [
    {
      "title": string (short, specific),
      "description": string (2–3 sentences, opinionated, friend-to-friend voice),
      "subtype": "HIDDEN_GEM" | "NICHE_ACTIVITY" | "SEASONAL_TIP",
      "category_hint": string | null,
      "location_hint": string | null,
      "town_hint": string | null,
      "season_hint": string | null,
      "source_urls": string[] (at least one real URL you visited via web_search)
    }
  ]
}

If you cannot find enough verified candidates, return fewer — never invent URLs, never invent places.`;

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface RunLLMResearchOptions {
  queries?: ResearchQuery[];
  model?: string;
  runBatchId?: string;
}

export async function runLLMResearch(
  options: RunLLMResearchOptions = {}
): Promise<PipelineRunResult> {
  const queries = options.queries ?? RESEARCH_QUERIES;
  const model = options.model ?? DEFAULT_MODEL;
  const runBatchId = options.runBatchId ?? randomUUID();
  const startedAt = Date.now();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env and the Vercel project env before running the discoveries pipeline."
    );
  }

  const client = new OpenAI({ apiKey });

  const allCandidates: PipelineCandidate[] = [];
  let rawCount = 0;
  const droppedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const queryIndex = i + 1;
    const logBase = { runBatchId, queryIndex, queryLabel: query.label, model };

    const runRow = await prisma.lLMResearchRun.create({
      data: {
        ...logBase,
        prompt: query.prompt,
        status: "PENDING",
      },
    });

    const queryStartedAt = Date.now();
    try {
      const response = await client.responses.create({
        model,
        instructions: DISCOVERY_SYSTEM_PROMPT,
        input: query.prompt,
        tools: [{ type: "web_search_preview" }],
        max_output_tokens: MAX_OUTPUT_TOKENS,
      });

      const rawText = (response.output_text ?? "").trim();
      const webSearches = countWebSearchCalls(response);

      const parsed = parseResponse(rawText);
      if (!parsed.ok) {
        await prisma.lLMResearchRun.update({
          where: { id: runRow.id },
          data: {
            rawResponse: rawText,
            webSearches,
            status: "PARSE_ERROR",
            errorMessage: parsed.error,
            durationMs: Date.now() - queryStartedAt,
          },
        });
        errors.push(`[${query.label}] parse: ${parsed.error}`);
        continue;
      }

      const candidates: DiscoveryCandidate[] = parsed.value.candidates;
      rawCount += candidates.length;

      const pipelineCandidates: PipelineCandidate[] = candidates.map((c) => ({
        ...c,
        sourceType: "LLM_RESEARCH",
        sourceContext: { queryLabel: query.label, runBatchId },
      }));

      allCandidates.push(...pipelineCandidates);

      await prisma.lLMResearchRun.update({
        where: { id: runRow.id },
        data: {
          rawResponse: rawText,
          candidates: pipelineCandidates as unknown as object,
          candidateCount: pipelineCandidates.length,
          webSearches,
          status: "SUCCESS",
          durationMs: Date.now() - queryStartedAt,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[${query.label}] api: ${msg}`);
      await prisma.lLMResearchRun.update({
        where: { id: runRow.id },
        data: {
          status: "API_ERROR",
          errorMessage: msg,
          durationMs: Date.now() - queryStartedAt,
        },
      });
    }
  }

  return {
    sourceType: "LLM_RESEARCH",
    runBatchId,
    candidates: allCandidates,
    rawCount,
    droppedCount,
    durationMs: Date.now() - startedAt,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function countWebSearchCalls(response: unknown): number {
  // Responses API returns `output` as an array of items; web_search tool calls
  // appear as items with type 'web_search_call'. Count them without failing
  // if the SDK shape drifts.
  const output = (response as { output?: Array<{ type?: string }> })?.output;
  if (!Array.isArray(output)) return 0;
  return output.filter((item) => item?.type === "web_search_call").length;
}
