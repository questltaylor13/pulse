/**
 * PRD 6 — live re-rank orchestration (Wave 2).
 *
 * Two DB-backed entry points that sit on top of the pure ./live-rerank core:
 *
 *  - `rerankUserBaseline` — re-score an already-ranked baseline against the
 *    user's freshest WANT/PASS signal. Bounded to the baseline set (no
 *    candidate widening), so it's cheap enough to run inline on the read path
 *    when the cache is dirty (feedback landed since the last precompute).
 *
 *  - `triggerUserRerank` — fire-and-forget: after a feedback write, schedule a
 *    coalesced FORCED precompute so the (daily, on Hobby) cron isn't the only
 *    thing that re-ranks a user. Runs entirely after the response.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { buildRankingContext } from "./context";
import { hydrateRankables } from "./candidate-pool";
import { reorderByFreshScore, withinCoalesceWindow } from "./live-rerank";
import { precomputeUser } from "./precompute";
import { RANKING_CONFIG } from "./config";
import { runAfterResponse } from "@/lib/runtime/background";
import type { RankedItem } from "./types";

export async function rerankUserBaseline(
  userId: string,
  baseline: RankedItem[],
): Promise<RankedItem[]> {
  if (baseline.length === 0) return baseline;
  const ctx = await buildRankingContext(userId);
  if (!ctx) return baseline;
  const rankables = await hydrateRankables(
    baseline.map((b) => ({ itemType: b.itemType, itemId: b.itemId })),
  );
  return reorderByFreshScore(ctx, rankables, baseline);
}

export function triggerUserRerank(userId: string): void {
  runAfterResponse(async () => {
    const windowMs = RANKING_CONFIG.precompute.coalesceSeconds * 1000;
    const cache = await prisma.rankedFeedCache.findUnique({
      where: { userId },
      select: { computedAt: true },
    });
    if (withinCoalesceWindow(cache?.computedAt?.getTime() ?? null, Date.now(), windowMs)) {
      // Recomputed very recently — the triggering write already flagged the
      // cache dirty, so the next eligible write (or the daily cron) still
      // reflects this feedback. Skip the redundant recompute.
      return;
    }
    await precomputeUser(userId, { force: true });
  });
}
