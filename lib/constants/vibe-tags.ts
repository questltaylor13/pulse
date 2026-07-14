// ONE canonical vibe vocabulary: kebab-case.
//
// Wave 6B. Before this, there were two. The allowlist here was kebab-case while
// `scripts/enrich-places.ts` wrote Title-case ("Cozy", "Lively"), which meant:
//
//   1. Every LLM-enriched place rendered ZERO vibe chips — filterValidVibeTags
//      matched nothing, so the chip block never drew.
//   2. Worse, and invisibly: FilterSheet renders chips from THIS list and writes
//      these kebab values into the URL, which land in
//      `where.vibeTags = { hasSome: [...] }` against a Title-case corpus. The
//      entire browse vibe filter matched zero places.
//
// The fix is one vocabulary, not a translation layer at each read — the repo
// already carries three coexisting normalize() functions and did not need a
// fourth. Enrichment is told to emit these exact tokens, the corpus was migrated
// to them (20260714130000_normalize_vibe_tags), and normalizeVibeTag() below is
// the belt-and-braces for legacy rows and a disobedient LLM.

export const VIBE_TAGS = [
  // Original vocabulary
  "cozy", "chill", "lively", "high-energy",
  "date-spot", "group-friendly", "solo-friendly", "family-friendly",
  "hidden-gem", "neighborhood-spot", "special-occasion", "iconic",
  "big-patio", "dog-friendly", "walkable", "scenic-view",
  "good-for-work", "conversation-friendly", "shareable-plates", "late-night",
  "quiet", "loud", "intimate", "romantic",
  // Wave 6B: the enrichment vocabulary, which was writing these all along with
  // no allowlist entry to land in.
  "trendy", "upscale", "casual", "hip",
  "classic", "eclectic", "artsy", "energetic",
  "relaxed", "sophisticated", "funky", "industrial",
  "rustic", "modern", "vintage",
] as const;

export type VibeTag = typeof VIBE_TAGS[number];

/**
 * The subset the LLM enricher is allowed to emit. Kept as an explicit list (not
 * all of VIBE_TAGS) because several canonical tags — "dog-friendly",
 * "walkable" — are facts we hold on the model or derive, not vibes to guess at.
 *
 * The test suite asserts every member of this list is a valid VibeTag. That
 * assertion is what stops the two halves drifting apart again.
 */
export const ENRICHMENT_VIBE_VOCABULARY: readonly VibeTag[] = [
  "trendy", "cozy", "upscale", "casual",
  "romantic", "lively", "chill", "hip",
  "classic", "eclectic", "artsy", "intimate",
  "energetic", "relaxed", "sophisticated", "funky",
  "industrial", "rustic", "modern", "vintage",
] as const;

// Semantic renames that case-folding alone cannot resolve. This is precisely
// where the spec's proposed fix (reuse Wave 4's normalizeTagToken, which only
// lowercases and hyphenates) would have failed: "Groups" -> "groups", which is
// not "group-friendly", so the tag would still have been dropped.
const ALIASES: Record<string, VibeTag> = {
  "groups": "group-friendly",
  "friends": "group-friendly",
  "date-night": "date-spot",
  "couples": "date-spot",
  "family": "family-friendly",
  "kids": "family-friendly",
  "solo": "solo-friendly",
  "patio": "big-patio",
  "outdoor-seating": "big-patio",
  "work-friendly": "good-for-work",
  "good-for-working": "good-for-work",
  "work-remote": "good-for-work",
};

/**
 * Fold any historical spelling onto the canonical token. Safe to call on a value
 * that is already canonical (idempotent — asserted in the tests).
 */
export function normalizeVibeTag(raw: string): string {
  const kebab = raw.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return ALIASES[kebab] ?? kebab;
}

export function isValidVibeTag(tag: string): tag is VibeTag {
  return (VIBE_TAGS as readonly string[]).includes(tag);
}

/**
 * Normalize, drop anything outside the vocabulary, de-duplicate. Order is
 * preserved. Dedup matters mid-migration, when a row can hold both spellings.
 */
export function filterValidVibeTags(tags: string[]): VibeTag[] {
  const out: VibeTag[] = [];
  for (const tag of tags) {
    const normalized = normalizeVibeTag(tag);
    if (isValidVibeTag(normalized) && !out.includes(normalized)) {
      out.push(normalized);
    }
  }
  return out;
}
