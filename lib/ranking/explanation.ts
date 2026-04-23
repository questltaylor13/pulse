/**
 * PRD 6 — Factor → Pulse-voice copy mapping.
 *
 * The formula produces ScoreReason entries with terse factor keys; this
 * module renders them into user-facing strings for the "Why am I seeing
 * this?" sheet. Keep copy warm/conversational per locked decision.
 *
 * Centralized so we can tune voice without grepping the whole codebase.
 */

import type { ScoreReason } from "./types";

type Renderer = (ctx: { contribution: number; tagsMatched?: string[] }) => string;

const RENDERERS: Record<string, Renderer> = {
  base_quality: () => "A Pulse favorite",
  social_match: ({ tagsMatched }) =>
    tagsMatched?.length
      ? `Matches your ${joinHumanList(tagsMatched.map(quote))} vibe`
      : "Matches how you like to go out",
  vibe_match: ({ tagsMatched }) =>
    tagsMatched?.length
      ? `Feels like ${joinHumanList(tagsMatched.slice(0, 2).map(quote))}`
      : "Matches the vibes you picked",
  aspiration_match: ({ tagsMatched }) =>
    tagsMatched?.length
      ? `You said you wanted more ${joinHumanList(tagsMatched.slice(0, 2).map(lower))}`
      : "Matches something you want more of",
  hidden_gem_bonus: () => "A hidden Denver gem",
  want_similarity: ({ contribution }) =>
    contribution > 0.2
      ? "Like a bunch of things you're into"
      : "Similar to something you marked Interested",
  pass_similarity: () => "Similar to things you've passed on",
  recency: () => "Just added — fresh this week",
  budget_penalty: () => "A little above your usual budget",
  novelty: () => "Different from your usual",
  serendipity: () => "Outside your usual — curious?",
  cold_start: () => "We're still learning your taste",
  unprofiled: () => "Quality pick on Pulse",
};

/**
 * Render a factor into a ScoreReason. Unknown factors fall back to a
 * generic label (so adding a new factor doesn't crash; it just reads as
 * "factor contributed"). Always lock the human_readable string at render
 * time — the reasons array in RankedFeedCache is persisted.
 */
export function renderReason(
  factor: string,
  contribution: number,
  tagsMatched?: string[],
): ScoreReason {
  const renderer = RENDERERS[factor];
  const human_readable = renderer
    ? renderer({ contribution, tagsMatched })
    : fallbackCopy(factor, contribution);
  return {
    factor,
    contribution,
    human_readable,
    ...(tagsMatched?.length ? { tags_matched: tagsMatched } : {}),
  };
}

/** Return a stable list of the top-N positive contributions (for the sheet). */
export function topPositiveReasons(reasons: ScoreReason[], n = 4): ScoreReason[] {
  return reasons.filter((r) => r.contribution > 0).sort((a, b) => b.contribution - a.contribution).slice(0, n);
}

/** Negative contributions (if any) — rendered as "what held it back" when we surface them. */
export function topNegativeReasons(reasons: ScoreReason[], n = 2): ScoreReason[] {
  return reasons.filter((r) => r.contribution < 0).sort((a, b) => a.contribution - b.contribution).slice(0, n);
}

// ---------------------------------------------------------------------------
// Internal copy helpers
// ---------------------------------------------------------------------------

function fallbackCopy(factor: string, contribution: number): string {
  const verb = contribution >= 0 ? "boosted" : "dampened";
  return `Your taste ${verb} this pick`;
}

function joinHumanList(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

function quote(s: string): string {
  return `"${s.replace(/["']/g, "")}"`;
}

function lower(s: string): string {
  return s.toLowerCase();
}
