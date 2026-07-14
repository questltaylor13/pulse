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
 * The human label for a tag. kebab-case is the STORAGE and QUERY vocabulary — it
 * is not what a user should ever read.
 *
 * This exists because the first cut of Wave 6B migrated the corpus to kebab and
 * forgot that eight components render `vibeTags` straight to the screen. The
 * result would have been "cozy · lively" on every card where "Cozy · Lively" used
 * to be, and "date-spot" / "shareable-plates" on place detail. The wave's stated
 * win — enriched places finally show their vibe chips — would have landed as a
 * visible downgrade.
 */
export function vibeTagLabel(tag: string): string {
  return normalizeVibeTag(tag)
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Validate, then label. What every PLACE render site wants. */
export function vibeTagLabels(tags: string[]): string[] {
  return filterValidVibeTags(tags).map(vibeTagLabel);
}

/**
 * Display-format a tag WITHOUT validating it against this vocabulary.
 *
 * `Event.vibeTags` is a different, disjoint, already-canonical kebab vocabulary
 * (lib/enrich-event.ts: fun, live-music, concert, dancing…). It shares only four
 * tokens with the Place vocabulary, so running event tags through
 * filterValidVibeTags — which EventDetailPage did — silently dropped ~78% of
 * them, including the three most common. Format, don't validate.
 */
export function formatTagLabel(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * The values to put in a `vibeTags hasSome` query: the canonical kebab token AND
 * its legacy Title-case spelling.
 *
 * Matching both is deliberate and permanent. A data migration and a code deploy
 * cannot be atomic, so a query that spoke only one vocabulary would be wrong on
 * one side of the change. This is correct before 20260714130000_normalize_vibe_tags,
 * correct after it, and correct if it is re-run.
 */
export function vibeTagQueryValues(tags: string[]): string[] {
  const out = new Set<string>();
  for (const tag of tags) {
    const kebab = normalizeVibeTag(tag);
    if (!kebab) continue;
    out.add(kebab);
    // "cozy" -> "Cozy", "high-energy" -> "High Energy": the shape enrichment
    // used to write.
    out.add(
      kebab
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
    );
  }
  return [...out];
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
