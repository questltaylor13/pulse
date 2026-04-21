/**
 * Niche Sites Pipeline (PRD 3 Phase 3).
 *
 * Fetches a hand-curated list of small Denver + Front Range community sites,
 * applies per-site HTML extractors, and returns Discovery candidates. This
 * is intentionally *not* a general scraper — each site has a tailored
 * extract function that's ~10–25 lines (see `niche-sites.config.ts`).
 *
 * Compliance guardrails (PRD ground rules):
 *   - robots.txt is fetched for each site and checked against our User-Agent
 *     before the page itself is requested. Disallowed → site skipped.
 *   - Polite User-Agent identifies Pulse and a contact address so site
 *     operators can reach us if there's an issue.
 *   - Rate limit: 1.2s delay between sites so we never stack requests on a
 *     single origin.
 *
 * Candidates come out raw (site's own voice). Phase 4 enrichment rewrites
 * in Pulse voice, verifies location, dedupes, and upserts to Discovery.
 */

import * as cheerio from "cheerio";
import { randomUUID } from "node:crypto";
import { NICHE_SITES, type NicheSiteConfig } from "./niche-sites.config";
import type {
  PipelineCandidate,
  PipelineRunResult,
} from "@/lib/discoveries/types";

const USER_AGENT =
  "pulse-app/0.1 (+https://pulse-three-eta.vercel.app; discovery bot; contact questltaylor@gmail.com)";
const FETCH_TIMEOUT_MS = 12_000;
const PER_SITE_DELAY_MS = 1200;

// ---------------------------------------------------------------------------
// robots.txt — minimal compliance check (User-Agent + Disallow rules)
// ---------------------------------------------------------------------------

interface RobotsRule {
  agent: string;
  disallows: string[];
  allows: string[];
}

function parseRobotsTxt(text: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let current: RobotsRule | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      current = { agent: value.toLowerCase(), disallows: [], allows: [] };
      rules.push(current);
    } else if (key === "disallow" && current) {
      if (value) current.disallows.push(value);
    } else if (key === "allow" && current) {
      if (value) current.allows.push(value);
    }
  }
  return rules;
}

function pathIsAllowed(rules: RobotsRule[], path: string, userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  // Prefer agent-specific rules, then fall back to *
  const specific = rules.find((r) => ua.includes(r.agent) && r.agent !== "*");
  const wildcard = rules.find((r) => r.agent === "*");
  const rule = specific ?? wildcard;
  if (!rule) return true;

  const matchLen = (pattern: string): number => {
    if (!pattern) return 0;
    return path.startsWith(pattern) ? pattern.length : -1;
  };
  const bestDisallow = Math.max(-1, ...rule.disallows.map(matchLen));
  const bestAllow = Math.max(-1, ...rule.allows.map(matchLen));
  if (bestDisallow < 0) return true;
  return bestAllow >= bestDisallow;
}

async function isAllowedByRobots(targetUrl: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { allowed: false, reason: "Invalid URL" };
  }
  const robotsUrl = `${parsed.origin}/robots.txt`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) {
      // No robots.txt or non-200 — convention is "allowed"
      return { allowed: true };
    }
    const text = await res.text();
    const rules = parseRobotsTxt(text);
    const allowed = pathIsAllowed(rules, parsed.pathname || "/", USER_AGENT);
    return allowed
      ? { allowed: true }
      : { allowed: false, reason: `robots.txt disallows ${parsed.pathname}` };
  } catch (err) {
    // Treat fetch failure as allowed (robots missing), but log
    return { allowed: true, reason: `robots.txt fetch failed: ${(err as Error).message}` };
  }
}

// ---------------------------------------------------------------------------
// Page fetch
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface RunNicheSitesOptions {
  sites?: NicheSiteConfig[];
  runBatchId?: string;
}

export async function runNicheSites(
  options: RunNicheSitesOptions = {}
): Promise<PipelineRunResult> {
  const sites = (options.sites ?? NICHE_SITES).filter((s) => s.enabled);
  const runBatchId = options.runBatchId ?? randomUUID();
  const startedAt = Date.now();

  const allCandidates: PipelineCandidate[] = [];
  let rawCount = 0;
  const droppedCount = 0;
  const errors: string[] = [];
  let first = true;

  for (const site of sites) {
    if (!first) await sleep(PER_SITE_DELAY_MS);
    first = false;

    try {
      const robots = await isAllowedByRobots(site.url);
      if (!robots.allowed) {
        errors.push(`[${site.name}] skipped: ${robots.reason}`);
        continue;
      }

      const html = await fetchHtml(site.url);
      const $ = cheerio.load(html);
      const rawCandidates = site.extract($, { site });

      const pipelineCandidates: PipelineCandidate[] = rawCandidates.map((c) => ({
        ...c,
        source_urls:
          c.source_urls && c.source_urls.length > 0 ? c.source_urls : [site.url],
        sourceType: "NICHE_SITE",
        sourceContext: {
          queryLabel: `niche:${slugify(site.name)}`,
          runBatchId,
        },
      }));

      rawCount += pipelineCandidates.length;
      allCandidates.push(...pipelineCandidates);

      if (pipelineCandidates.length === 0) {
        errors.push(`[${site.name}] 0 candidates — selector may need tuning`);
      }
    } catch (err) {
      errors.push(`[${site.name}] ${(err as Error).message}`);
    }
  }

  return {
    sourceType: "NICHE_SITE",
    runBatchId,
    candidates: allCandidates,
    rawCount,
    droppedCount,
    durationMs: Date.now() - startedAt,
    errors,
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
