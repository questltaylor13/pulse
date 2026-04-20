/**
 * Reddit Mining Pipeline (PRD 3 Phase 2).
 *
 * Pulls top posts from a hand-curated list of Denver + Colorado subreddits
 * via Reddit's public JSON endpoints (no API key, no OAuth — free tier, 1
 * req/sec), then extracts structured Discovery candidates from each post +
 * its top comments using an LLM.
 *
 * Licensing posture (PRD §2.5): this pipeline does NOT persist raw Reddit
 * text anywhere. The only things stored are (a) the LLM extraction prompt
 * and response in LLMResearchRun (so we can tune prompts) and (b) the
 * structured candidates themselves — title, description (rewritten in Pulse
 * voice), subtype, source URL (the Reddit permalink). This is defensible
 * citing-and-synthesizing, not republishing.
 *
 * Per-post LLM calls reuse the LLMResearchRun table with queryLabel shaped
 * like `reddit:{subreddit}:{postId}` so Phase 4 enrichment can pull the
 * full candidate set via runBatchId.
 */

import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parseResponse } from "@/lib/discoveries/parsing";
import type {
  PipelineCandidate,
  PipelineRunResult,
} from "@/lib/discoveries/types";

// ---------------------------------------------------------------------------
// Subreddit config — extend via edit, not env.
// `minUpvotesTop` applies to weekly + monthly top lists; `minUpvotesPattern`
// applies to the pattern-matched search. Smaller subs get lower thresholds.
// ---------------------------------------------------------------------------

interface SubredditConfig {
  name: string;
  minUpvotesTop: number;
  minUpvotesPattern: number;
  townHint?: string; // Default town if post doesn't specify one
  notes?: string;
}

export const SUBREDDITS: SubredditConfig[] = [
  // Denver core
  { name: "Denver", minUpvotesTop: 50, minUpvotesPattern: 20, townHint: "Denver" },
  { name: "denverfood", minUpvotesTop: 50, minUpvotesPattern: 20, townHint: "Denver" },
  { name: "denvermusic", minUpvotesTop: 30, minUpvotesPattern: 15, townHint: "Denver" },
  { name: "DenverCirclejerk", minUpvotesTop: 50, minUpvotesPattern: 30, townHint: "Denver", notes: "high signal on overhyped vs real" },

  // Front Range / regional
  { name: "Boulder", minUpvotesTop: 40, minUpvotesPattern: 20, townHint: "Boulder" },
  { name: "fortcollins", minUpvotesTop: 40, minUpvotesPattern: 20, townHint: "Fort Collins" },
  { name: "ColoradoSprings", minUpvotesTop: 40, minUpvotesPattern: 20, townHint: "Colorado Springs" },

  // Mountain towns (smaller, scale thresholds down)
  { name: "Breckenridge", minUpvotesTop: 20, minUpvotesPattern: 10, townHint: "Breckenridge" },
  { name: "Vail", minUpvotesTop: 20, minUpvotesPattern: 10, townHint: "Vail" },
  { name: "SteamboatSprings", minUpvotesTop: 20, minUpvotesPattern: 10, townHint: "Steamboat Springs" },

  // Colorado-wide (no default town — let the LLM infer from post content)
  { name: "ColoradoHiking", minUpvotesTop: 40, minUpvotesPattern: 20 },
  { name: "colorado", minUpvotesTop: 100, minUpvotesPattern: 40, notes: "large sub, higher threshold" },
];

export const PATTERN_QUERIES = [
  "hidden gem",
  "things to do",
  "recommend",
  "best of",
  "what should I",
];

// Reddit's public JSON endpoints aggressively 403 pipelinery-looking UAs.
// Match the existing scraper pattern (Chrome-like) — same identifying UA
// used by lib/scrapers/fetch-utils.ts, which has been working against
// event sites for months.
const REDDIT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const REDDIT_REQUEST_DELAY_MS = 1100; // 1 req/sec with jitter
const DEFAULT_MODEL = process.env.DISCOVERIES_OPENAI_MODEL || "gpt-5.4-mini";
const MAX_OUTPUT_TOKENS = 2048;
const TOP_COMMENTS_PER_POST = 10;

// ---------------------------------------------------------------------------
// Reddit fetch helpers (public JSON — no auth)
// ---------------------------------------------------------------------------

interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
  permalink: string;
  url: string;
  ups: number;
  num_comments: number;
  created_utc: number;
}

interface RedditComment {
  id: string;
  body: string;
  ups: number;
}

function normalizePost(raw: Record<string, unknown>): RedditPost | null {
  if (!raw || typeof raw !== "object") return null;
  const data = (raw.data ?? raw) as Record<string, unknown>;
  const id = typeof data.id === "string" ? data.id : null;
  const title = typeof data.title === "string" ? data.title : null;
  if (!id || !title) return null;
  return {
    id,
    subreddit: String(data.subreddit ?? ""),
    title,
    selftext: typeof data.selftext === "string" ? data.selftext : "",
    permalink:
      typeof data.permalink === "string" ? `https://www.reddit.com${data.permalink}` : "",
    url: typeof data.url === "string" ? data.url : "",
    ups: typeof data.ups === "number" ? data.ups : 0,
    num_comments: typeof data.num_comments === "number" ? data.num_comments : 0,
    created_utc: typeof data.created_utc === "number" ? data.created_utc : 0,
  };
}

async function redditFetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": REDDIT_USER_AGENT, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Reddit ${res.status} ${res.statusText} — ${url}`);
  }
  return res.json();
}

async function fetchTopPosts(
  subreddit: string,
  timeframe: "week" | "month",
  limit: number
): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/top.json?t=${timeframe}&limit=${limit}`;
  const data = (await redditFetchJson(url)) as {
    data?: { children?: Array<Record<string, unknown>> };
  };
  const children = data?.data?.children ?? [];
  return children.map(normalizePost).filter((p): p is RedditPost => p !== null);
}

async function searchPosts(
  subreddit: string,
  query: string,
  limit: number
): Promise<RedditPost[]> {
  const q = encodeURIComponent(query);
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${q}&restrict_sr=on&sort=top&t=year&limit=${limit}`;
  const data = (await redditFetchJson(url)) as {
    data?: { children?: Array<Record<string, unknown>> };
  };
  const children = data?.data?.children ?? [];
  return children.map(normalizePost).filter((p): p is RedditPost => p !== null);
}

async function fetchTopComments(
  subreddit: string,
  postId: string,
  limit: number
): Promise<RedditComment[]> {
  const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?sort=top&limit=${limit}`;
  const data = (await redditFetchJson(url)) as Array<{
    data?: { children?: Array<Record<string, unknown>> };
  }>;
  if (!Array.isArray(data) || data.length < 2) return [];
  const children = data[1]?.data?.children ?? [];
  const comments: RedditComment[] = [];
  for (const child of children) {
    const d = (child.data ?? {}) as Record<string, unknown>;
    if (d.kind === "more") continue;
    const body = typeof d.body === "string" ? d.body : "";
    if (!body || body === "[deleted]" || body === "[removed]") continue;
    comments.push({
      id: String(d.id ?? ""),
      body,
      ups: typeof d.ups === "number" ? d.ups : 0,
    });
    if (comments.length >= limit) break;
  }
  return comments;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// LLM extraction
// ---------------------------------------------------------------------------

const REDDIT_EXTRACTION_SYSTEM_PROMPT = `You are extracting structured Discovery candidates from a Reddit post and its top comments. Your job is to surface specific places, activities, and experiences that community members are genuinely recommending — NOT to summarize the thread.

Rules:
- Only extract things that sound real and specific. A vague "go for a walk" is out; "the southeast corner of Cheesman at sunset" is in.
- NEVER extract dated events (concerts, festivals with specific dates, ticketed one-off events). Those belong in a different pipeline.
- Rewrite every description in Pulse's voice: opinionated, specific, friend-to-friend, 2–3 sentences, no marketing speak.
- Include ONE concrete detail that proves it's real: a time, a cross-street, a specific thing to order, a season.
- Exclude chains, major tourist attractions, obvious jokes, shitposts.

Return ONLY a valid JSON object (no prose, no code fences) matching this exact schema:

{
  "candidates": [
    {
      "title": string (short, specific),
      "description": string (2–3 sentences, Pulse voice),
      "subtype": "HIDDEN_GEM" | "NICHE_ACTIVITY" | "SEASONAL_TIP",
      "category_hint": string | null,
      "location_hint": string | null,
      "town_hint": string | null,
      "season_hint": string | null,
      "source_urls": string[] (include the Reddit permalink provided below)
    }
  ]
}

If the thread has no extractable recommendations (e.g. it's a complaint thread, a joke thread, a news post), return {"candidates": []} — do not invent content.`;

function buildExtractionUserMessage(params: {
  subreddit: string;
  post: RedditPost;
  comments: RedditComment[];
}): string {
  const { subreddit, post, comments } = params;
  const body = post.selftext ? post.selftext.slice(0, 3000) : "(no post body)";
  const commentBlock = comments
    .slice(0, TOP_COMMENTS_PER_POST)
    .map(
      (c, i) =>
        `[comment ${i + 1}, ${c.ups} upvotes]\n${c.body.slice(0, 1500)}`
    )
    .join("\n\n");

  return `Subreddit: r/${subreddit}
Permalink: ${post.permalink}
Post title: ${post.title}
Post body:
${body}

Top comments:
${commentBlock || "(no comments)"}`;
}

interface ExtractPostResult {
  candidates: PipelineCandidate[];
  rawText: string;
  error?: string;
  webSearches: number;
}

async function extractFromPost(params: {
  client: OpenAI;
  model: string;
  runBatchId: string;
  queryIndex: number;
  subreddit: string;
  post: RedditPost;
  comments: RedditComment[];
  townHint?: string;
}): Promise<ExtractPostResult> {
  const { client, model, runBatchId, queryIndex, subreddit, post, comments, townHint } =
    params;
  const queryLabel = `reddit:${subreddit}:${post.id}`;
  const userMessage = buildExtractionUserMessage({ subreddit, post, comments });

  const runRow = await prisma.lLMResearchRun.create({
    data: {
      runBatchId,
      queryIndex,
      queryLabel,
      model,
      prompt: userMessage,
      status: "PENDING",
    },
  });

  const startedAt = Date.now();
  try {
    const response = await client.responses.create({
      model,
      instructions: REDDIT_EXTRACTION_SYSTEM_PROMPT,
      input: userMessage,
      max_output_tokens: MAX_OUTPUT_TOKENS,
    });

    const rawText = (response.output_text ?? "").trim();
    const parsed = parseResponse(rawText);
    if (!parsed.ok) {
      await prisma.lLMResearchRun.update({
        where: { id: runRow.id },
        data: {
          rawResponse: rawText,
          status: "PARSE_ERROR",
          errorMessage: parsed.error,
          durationMs: Date.now() - startedAt,
        },
      });
      return { candidates: [], rawText, error: parsed.error, webSearches: 0 };
    }

    const candidates = parsed.value.candidates.map<PipelineCandidate>((c) => ({
      ...c,
      town_hint: c.town_hint ?? townHint ?? null,
      source_urls:
        c.source_urls && c.source_urls.length > 0 ? c.source_urls : [post.permalink],
      sourceType: "REDDIT",
      sourceContext: {
        queryLabel,
        runBatchId,
        subreddit,
        postId: post.id,
        postUpvotes: post.ups,
        postNumComments: post.num_comments,
      },
    }));

    await prisma.lLMResearchRun.update({
      where: { id: runRow.id },
      data: {
        rawResponse: rawText,
        candidates: candidates as unknown as object,
        candidateCount: candidates.length,
        status: "SUCCESS",
        durationMs: Date.now() - startedAt,
      },
    });
    return { candidates, rawText, webSearches: 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.lLMResearchRun.update({
      where: { id: runRow.id },
      data: {
        status: "API_ERROR",
        errorMessage: msg,
        durationMs: Date.now() - startedAt,
      },
    });
    return { candidates: [], rawText: "", error: msg, webSearches: 0 };
  }
}

// ---------------------------------------------------------------------------
// Intra-run dedup (simple normalized-title match)
// Full fuzzy match + location proximity lives in Phase 4 enrichment.
// ---------------------------------------------------------------------------

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeCandidates(candidates: PipelineCandidate[]): PipelineCandidate[] {
  const seen = new Map<string, PipelineCandidate>();
  for (const c of candidates) {
    const key = `${c.subtype}|${normalizeTitleKey(c.title)}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, c);
      continue;
    }
    // Merge: combine source URLs, bump inferred mentionedByN
    const urls = new Set([...existing.source_urls, ...c.source_urls]);
    const prior = existing.sourceContext ?? {};
    seen.set(key, {
      ...existing,
      source_urls: Array.from(urls),
      sourceContext: {
        ...prior,
        mentionedByN: (prior.mentionedByN ?? 1) + 1,
      },
    });
  }
  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface RunRedditMiningOptions {
  subreddits?: SubredditConfig[];
  model?: string;
  runBatchId?: string;
  maxPostsPerSub?: number; // Cap for smoke-testing; default covers full PRD spec
}

export async function runRedditMining(
  options: RunRedditMiningOptions = {}
): Promise<PipelineRunResult> {
  const subs = options.subreddits ?? SUBREDDITS;
  const model = options.model ?? DEFAULT_MODEL;
  const runBatchId = options.runBatchId ?? randomUUID();
  const maxPostsPerSub = options.maxPostsPerSub ?? Number.POSITIVE_INFINITY;
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
  let droppedCount = 0;
  const errors: string[] = [];
  let queryIndex = 0;

  for (const sub of subs) {
    try {
      const harvested: RedditPost[] = [];
      const seenIds = new Set<string>();

      // Top weekly
      await sleep(REDDIT_REQUEST_DELAY_MS);
      const weekly = await fetchTopPosts(sub.name, "week", 25);
      for (const p of weekly) {
        if (p.ups >= sub.minUpvotesTop && !seenIds.has(p.id)) {
          seenIds.add(p.id);
          harvested.push(p);
        }
      }

      // Top monthly
      await sleep(REDDIT_REQUEST_DELAY_MS);
      const monthly = await fetchTopPosts(sub.name, "month", 10);
      for (const p of monthly) {
        if (p.ups >= sub.minUpvotesTop && !seenIds.has(p.id)) {
          seenIds.add(p.id);
          harvested.push(p);
        }
      }

      // Pattern-matched search
      for (const pattern of PATTERN_QUERIES) {
        await sleep(REDDIT_REQUEST_DELAY_MS);
        try {
          const results = await searchPosts(sub.name, pattern, 10);
          for (const p of results) {
            if (p.ups >= sub.minUpvotesPattern && !seenIds.has(p.id)) {
              seenIds.add(p.id);
              harvested.push(p);
            }
          }
        } catch (err) {
          errors.push(
            `[r/${sub.name} search:"${pattern}"] ${(err as Error).message}`
          );
        }
      }

      const capped = harvested.slice(0, maxPostsPerSub);
      droppedCount += harvested.length - capped.length;

      for (const post of capped) {
        queryIndex++;
        await sleep(REDDIT_REQUEST_DELAY_MS);
        let comments: RedditComment[] = [];
        try {
          comments = await fetchTopComments(sub.name, post.id, TOP_COMMENTS_PER_POST);
        } catch (err) {
          errors.push(`[r/${sub.name}:${post.id} comments] ${(err as Error).message}`);
        }

        const result = await extractFromPost({
          client,
          model,
          runBatchId,
          queryIndex,
          subreddit: sub.name,
          post,
          comments,
          townHint: sub.townHint,
        });

        if (result.error) {
          errors.push(`[r/${sub.name}:${post.id}] ${result.error}`);
          continue;
        }
        rawCount += result.candidates.length;
        allCandidates.push(...result.candidates);
      }
    } catch (err) {
      errors.push(`[r/${sub.name}] ${(err as Error).message}`);
    }
  }

  const merged = mergeCandidates(allCandidates);
  droppedCount += allCandidates.length - merged.length;

  return {
    sourceType: "REDDIT",
    runBatchId,
    candidates: merged,
    rawCount,
    droppedCount,
    durationMs: Date.now() - startedAt,
    errors,
  };
}
