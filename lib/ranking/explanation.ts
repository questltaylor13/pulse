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
  loved_similarity: ({ tagsMatched }) =>
    tagsMatched?.length
      ? `Because you loved ${tagsMatched[0]}`
      : "Like spots you've rated highly",
  disliked_similarity: () => "Similar to spots that missed for you",
  category_affinity: ({ contribution }) =>
    contribution >= 0
      ? "You rate this kind of spot highly"
      : "A category that hasn't landed for you",
  recency: () => "Just added — fresh this week",
  starts_soon: () => "Happening soon",
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

/**
 * Wave 3 — the generic factors we de-prioritize when choosing a single
 * "why you're seeing this" card line. They're true but say nothing about
 * the user's taste, so a real match (vibe/aspiration/want/etc.) beats them.
 */
const GENERIC_CARD_FACTORS = new Set(["base_quality", "unprofiled", "recency", "starts_soon"]);

/**
 * Pick one card-level "why you're seeing this" line from a reasons array.
 * Returns the highest-contribution POSITIVE reason's human_readable,
 * pushing generic factors to the back so a taste match wins. Returns null
 * when there are no positive reasons (e.g. fallback/unpersonalized items).
 */
export function pickCardReason(reasons: ScoreReason[]): string | null {
  const positives = reasons.filter((r) => r.contribution > 0);
  if (positives.length === 0) return null;
  const ranked = [...positives].sort((a, b) => {
    const aGeneric = GENERIC_CARD_FACTORS.has(a.factor) ? 1 : 0;
    const bGeneric = GENERIC_CARD_FACTORS.has(b.factor) ? 1 : 0;
    if (aGeneric !== bGeneric) return aGeneric - bGeneric; // taste factors first
    return b.contribution - a.contribution; // then highest contribution
  });
  return ranked[0].human_readable;
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
