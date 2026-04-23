/**
 * PRD 6 Phase 3 — Serendipity injection.
 *
 * Filter-bubbles kill discovery apps. After the sorted ranked list is
 * produced, we splice in "outside your profile" picks at every Nth slot
 * (default 5). They replace the would-be match at that position; the
 * replaced match slides to the next slot.
 *
 * Sourcing (in preference order):
 *   1. Hidden Gems (Discovery with isHiddenGem=true) the user hasn't seen.
 *   2. High-quality items in categories the user has engaged with least.
 *   3. High-base-quality items with near-zero profile boosts.
 *
 * Hard requirements on every pick:
 *   - Must pass budget filter (handled upstream in candidate pool).
 *   - Must not be DONE/PASS-excluded (handled upstream in candidate pool).
 *   - Must not be already in the ranked list at a higher position.
 *   - Variety: no two adjacent serendipity slots in the same category.
 */

import { RANKING_CONFIG, type RankingConfig } from "./config";
import type { RankableItem, RankedItem, RankingContext, ScoreReason } from "./types";
import { renderReason } from "./explanation";

export interface InjectSerendipityOptions {
  config?: RankingConfig;
  /**
   * Where to start injecting. Keep 0 as the user's top personalized pick
   * (best first-impression). Default: 4 (first injection at index 4).
   */
  firstSlot?: number;
}

/**
 * Mix serendipity items into a sorted ranked list. Returns a new array
 * of the same length (or longer — trailing slots may get appended if the
 * input was shorter than firstSlot).
 */
export function injectSerendipity(
  ranked: RankedItem[],
  pool: RankableItem[],
  ctx: RankingContext,
  opts: InjectSerendipityOptions = {},
): RankedItem[] {
  const config = opts.config ?? RANKING_CONFIG;
  const interval = config.serendipity.mixedInInterval;
  const firstSlot = opts.firstSlot ?? interval - 1;

  if (ranked.length === 0 || interval <= 0) return ranked;

  const rankedIds = new Set(ranked.map((r) => `${r.itemType}:${r.itemId}`));
  const candidates = rankSerendipityCandidates(pool, ctx, rankedIds, config);
  if (candidates.length === 0) return ranked;

  const out: RankedItem[] = [];
  const usedSerendipityCategories: (string | null)[] = [];
  let candIdx = 0;
  let rankedIdx = 0;

  const total = Math.max(ranked.length, firstSlot + 1);
  for (let i = 0; i < total; i++) {
    const isSerendipitySlot =
      i >= firstSlot && (i - firstSlot) % interval === 0 && candIdx < candidates.length;

    if (isSerendipitySlot) {
      // Respect the variety constraint: skip a candidate whose category
      // matches the immediately-previous serendipity slot.
      const prevCat = usedSerendipityCategories[usedSerendipityCategories.length - 1] ?? null;
      let pickIdx = candIdx;
      while (
        pickIdx < candidates.length &&
        candidates[pickIdx].category !== null &&
        candidates[pickIdx].category === prevCat
      ) {
        pickIdx += 1;
      }
      const pick = candidates[pickIdx] ?? candidates[candIdx];
      // consume the chosen candidate by splicing it out of the list
      candidates.splice(candidates.indexOf(pick), 1);

      out.push(toSerendipityRankedItem(pick));
      usedSerendipityCategories.push(pick.category);
      continue;
    }

    if (rankedIdx < ranked.length) {
      out.push(ranked[rankedIdx]);
      rankedIdx += 1;
    }
  }

  // Append any leftover ranked tail that didn't get consumed.
  while (rankedIdx < ranked.length) {
    out.push(ranked[rankedIdx]);
    rankedIdx += 1;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Candidate ranking (who gets to be serendipitous)
// ---------------------------------------------------------------------------

function rankSerendipityCandidates(
  pool: RankableItem[],
  ctx: RankingContext,
  rankedIds: Set<string>,
  config: RankingConfig,
): RankableItem[] {
  // Build least-engaged category list: categories with the LOWEST familiarity
  // score (including zero-engagement categories) rank first.
  const leastEngaged = buildLeastEngagedCategories(pool, ctx);
  const preferHiddenGems = config.serendipity.preferHiddenGems;

  // Score every pool item for its serendipity fitness. Higher is better.
  const scored = pool
    .filter((item) => !rankedIds.has(`${item.itemType}:${item.itemId}`))
    .map((item) => {
      let fitness = item.normalizedQuality; // base: still prefer quality
      if (preferHiddenGems && item.isHiddenGem) fitness += 0.3;
      const leastIdx = item.category ? leastEngaged.indexOf(item.category) : -1;
      if (leastIdx >= 0) {
        // Bump categories the user hasn't engaged with; earlier in the list = stronger bump.
        fitness += 0.2 * (1 - leastIdx / Math.max(1, leastEngaged.length));
      }
      return { item, fitness };
    })
    .sort((a, b) => b.fitness - a.fitness);

  return scored.map((s) => s.item);
}

/**
 * Returns categories in ascending familiarity order. Categories the user
 * has never engaged with come first. Only considers categories that
 * actually appear in the candidate pool (no phantom entries).
 */
function buildLeastEngagedCategories(pool: RankableItem[], ctx: RankingContext): string[] {
  const categoriesInPool = new Set<string>();
  for (const item of pool) {
    if (item.category) categoriesInPool.add(item.category);
  }
  return Array.from(categoriesInPool).sort(
    (a, b) => (ctx.familiarity[a] ?? 0) - (ctx.familiarity[b] ?? 0),
  );
}

function toSerendipityRankedItem(item: RankableItem): RankedItem {
  const reason: ScoreReason = renderReason("serendipity", 0);
  // Intentionally assign score=0 — serendipity items aren't ranked on
  // their score, they're placed by slot. This also makes it clear in
  // debug logs that they didn't "win" by personalization.
  return {
    itemType: item.itemType,
    itemId: item.itemId,
    score: 0,
    reasons: [reason],
    isSerendipity: true,
  };
}
