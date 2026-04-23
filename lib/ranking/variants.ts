/**
 * PRD 6 Phase 6 — A/B variant plumbing.
 *
 * Takes the user's rankingVariant string and returns a config with
 * variant overrides deep-merged onto RANKING_CONFIG. Unknown variants
 * silently fall back to "control" (no overrides).
 *
 * V1 ships with no real variants. Quest defines the first real variant
 * in config.ts (RANKING_VARIANTS) when there's enough user volume to
 * observe effects.
 */

import { RANKING_CONFIG, RANKING_VARIANTS, type DeepPartial, type RankingConfig } from "./config";
import type { RankingVariantKey } from "./types";

export function getVariantConfig(variant: RankingVariantKey): RankingConfig {
  const table = RANKING_VARIANTS as Record<string, DeepPartial<RankingConfig>>;
  const overrides = table[variant] ?? table.control ?? {};
  // deepMerge walks the RankingConfig tree and applies overrides; the
  // cast is safe because RankingConfig is strictly-readonly in config.ts
  // (as const) and deepMerge preserves structure.
  return deepMerge(RANKING_CONFIG as unknown as MutableRankingConfig, overrides) as unknown as RankingConfig;
}

// Mutable mirror of RankingConfig — used only as the internal type for
// deepMerge so it doesn't fight the const-assertion on RANKING_CONFIG.
type MutableRankingConfig = {
  -readonly [K in keyof RankingConfig]: RankingConfig[K] extends object
    ? { -readonly [P in keyof RankingConfig[K]]: RankingConfig[K][P] }
    : RankingConfig[K];
};

/**
 * Hash-based variant assignment. Stable for a given userId so the same
 * user consistently sees the same variant across precompute runs.
 *
 * For V1, all users assign to "control" because no other variants are
 * defined. When new variants are added, bump the salt so bucketing
 * refreshes cleanly (avoids poisoning from prior assignments).
 */
export function assignVariant(userId: string, salt = "v1"): RankingVariantKey {
  const variantKeys = Object.keys(RANKING_VARIANTS) as RankingVariantKey[];
  if (variantKeys.length <= 1) return "control";
  const hash = fnv1a(`${salt}:${userId}`);
  const bucket = hash % variantKeys.length;
  return variantKeys[bucket] ?? "control";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deepMerge<T extends object>(base: T, overrides: DeepPartial<T>): T {
  const out: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) };
  for (const key of Object.keys(overrides)) {
    const baseVal = (base as unknown as Record<string, unknown>)[key];
    const overrideVal = (overrides as unknown as Record<string, unknown>)[key];
    if (
      baseVal &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal) &&
      overrideVal &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal)
    ) {
      out[key] = deepMerge(baseVal as object, overrideVal as DeepPartial<object>);
    } else if (overrideVal !== undefined) {
      out[key] = overrideVal;
    }
  }
  return out as T;
}

/** FNV-1a 32-bit string hash. Small + deterministic; we don't need crypto. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}
