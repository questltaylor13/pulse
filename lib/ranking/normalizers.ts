/**
 * PRD 6 — Pure normalizers that bridge the three content shapes
 * (Event / Place / Discovery) into the RankableItem vocabulary the
 * formula speaks. No DB calls, no side effects — safe to unit-test.
 */

import type { PriceTier } from "./types";

// ---------------------------------------------------------------------------
// Quality normalization
// ---------------------------------------------------------------------------

/**
 * Event/Discovery qualityScore is Int 1-10 → 0.1-1.0.
 * Place has no qualityScore — rescale combinedScore (rating × log reviews).
 *
 * If nothing usable is present, returns a neutral midpoint (0.5) so the
 * item is still rankable but doesn't get punished for missing data.
 */
export function normalizeQuality(input: {
  qualityScore?: number | null;
  combinedScore?: number | null;
}): number {
  if (typeof input.qualityScore === "number" && input.qualityScore > 0) {
    return clamp(input.qualityScore / 10, 0, 1);
  }
  if (typeof input.combinedScore === "number" && input.combinedScore > 0) {
    // combinedScore = rating × log(reviews); observed prod range ~0-20.
    // Cap at 15 (99th percentile) and rescale to 0-1. Adjust as data grows.
    return clamp(input.combinedScore / 15, 0, 1);
  }
  return 0.5;
}

// ---------------------------------------------------------------------------
// Price-tier normalization
// ---------------------------------------------------------------------------

/**
 * Unifies the three price shapes:
 * - Event.priceRange: free-form string ("$", "$$", "free", "event_url", etc.)
 * - Place.priceLevel: Google's Int 0-4 (0=$, 4=$$$$, sometimes null)
 * - Discovery: no price field — defaults to FREE
 *
 * Missing or unrecognized price → MID (neutral) so items aren't unfairly
 * filtered; we'd rather rank than exclude on uncertainty.
 */
export function normalizePriceTier(input: {
  priceRange?: string | null;
  priceLevel?: number | null;
  itemType?: "event" | "place" | "discovery";
}): PriceTier {
  if (input.itemType === "discovery") return "FREE";

  if (typeof input.priceLevel === "number") {
    if (input.priceLevel <= 0) return "FREE";
    if (input.priceLevel === 1) return "LOW";
    if (input.priceLevel === 2) return "MID";
    if (input.priceLevel >= 3) return "HIGH";
  }

  if (typeof input.priceRange === "string") {
    const normalized = input.priceRange.toLowerCase().trim();
    if (!normalized) return "MID"; // empty = no data → neutral, not "free"
    if (normalized === "free" || normalized === "$0") return "FREE";
    // Count dollar signs — the most common pattern ($ / $$ / $$$ / $$$$)
    const dollarCount = (normalized.match(/\$/g) ?? []).length;
    if (dollarCount === 1) return "LOW";
    if (dollarCount === 2) return "MID";
    if (dollarCount >= 3) return "HIGH";
    // Keyword fallback
    if (normalized.includes("free")) return "FREE";
    if (normalized.includes("cheap") || normalized.includes("budget")) return "LOW";
    if (normalized.includes("expensive") || normalized.includes("premium")) return "HIGH";
  }

  return "MID";
}

// ---------------------------------------------------------------------------
// Tag overlap
// ---------------------------------------------------------------------------

/**
 * Count of tags present in both arrays. Case-insensitive. Order-independent.
 */
export function tagOverlap(a: string[], b: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const lowerA = new Set(a.map((t) => t.toLowerCase()));
  let count = 0;
  for (const tag of b) {
    if (lowerA.has(tag.toLowerCase())) count += 1;
  }
  return count;
}

/**
 * Whether two items share at least N tags. Per signal-map, behavioral
 * similarity fires at ≥2 shared tags.
 */
export function sharesTags(a: string[], b: string[], threshold: number): boolean {
  return tagOverlap(a, b) >= threshold;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}
