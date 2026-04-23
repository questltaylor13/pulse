/**
 * PRD 6 — Per-user precompute orchestration.
 *
 * Given a userId, builds the ranking context, builds the candidate pool,
 * scores every item, sorts, writes the cache, and logs a RankingRun row.
 *
 * The cron handler (Phase 2 §2.1) calls this in a loop across active
 * users, respecting a time budget (45s on hobby plan).
 */

import { prisma } from "@/lib/prisma";
import { buildRankingContext } from "./context";
import { buildCandidatePool } from "./candidate-pool";
import { score } from "./formula";
import { writeCache } from "./cache";
import { RANKING_CONFIG } from "./config";
import type { RankedItem } from "./types";

export interface PrecomputeResult {
  userId: string;
  poolSize: number;
  rankedCount: number;
  serendipityCount: number;
  durationMs: number;
  skipped: boolean;
  error?: string;
}

export interface PrecomputeOptions {
  /** If true, force re-rank even if cache is fresh. */
  force?: boolean;
  /** Scope applied to candidate pool. Default 'all'. */
  scope?: "near" | "all";
  /** Max items to retain in the cache. Default 200. */
  topN?: number;
}

/**
 * Score and cache a single user. Returns a result summary for logging.
 * Never throws — errors are captured on the result and propagated to
 * RankingRun so the cron can continue the batch.
 */
export async function precomputeUser(
  userId: string,
  opts: PrecomputeOptions = {},
): Promise<PrecomputeResult> {
  const startedAt = Date.now();
  const scope = opts.scope ?? "all";
  const topN = opts.topN ?? 200;

  try {
    // Freshness check — skip if the cache is fresh and nothing's dirty.
    if (!opts.force) {
      const skipResult = await maybeSkip(userId, startedAt);
      if (skipResult) return skipResult;
    }

    const ctx = await buildRankingContext(userId);
    if (!ctx) {
      return logRun({
        userId,
        variant: "control",
        poolSize: 0,
        rankedCount: 0,
        serendipityCount: 0,
        durationMs: Date.now() - startedAt,
        error: "user not found",
        skipped: false,
      });
    }

    const pool = await buildCandidatePool(ctx, { scope });
    const scored: RankedItem[] = pool
      .map((item) => {
        const { score: s, reasons } = score(ctx, item);
        return { itemType: item.itemType, itemId: item.itemId, score: s, reasons };
      })
      .filter((r) => r.score >= 0.5) // signal-map: ranking floor
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    // Phase 3 will inject serendipity here — stub for now.
    const serendipityCount = 0;

    await writeCache(userId, scored, {
      profileVersion: ctx.profile?.version ?? 0,
      feedbackCount: ctx.totalFeedbackCount,
    });

    return logRun({
      userId,
      variant: ctx.variant,
      poolSize: pool.length,
      rankedCount: scored.length,
      serendipityCount,
      durationMs: Date.now() - startedAt,
      skipped: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return logRun({
      userId,
      variant: "control",
      poolSize: 0,
      rankedCount: 0,
      serendipityCount: 0,
      durationMs: Date.now() - startedAt,
      error: message,
      skipped: false,
    });
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function maybeSkip(userId: string, startedAt: number): Promise<PrecomputeResult | null> {
  const [cache, user] = await Promise.all([
    prisma.rankedFeedCache.findUnique({
      where: { userId },
      select: {
        computedAt: true,
        profileVersion: true,
        feedbackCount: true,
        isDirty: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { version: true } } },
    }),
  ]);

  if (!cache) return null; // no cache → must compute
  if (cache.isDirty) return null;

  const now = Date.now();
  const freshnessMs = RANKING_CONFIG.precompute.skipIfFresherThanMinutes * 60 * 1000;
  const isFresh = now - cache.computedAt.getTime() < freshnessMs;
  if (!isFresh) return null;

  const profileChanged = (user?.profile?.version ?? 0) !== cache.profileVersion;
  if (profileChanged) return null;

  const feedbackCount = await prisma.userItemStatus.count({ where: { userId } });
  if (feedbackCount !== cache.feedbackCount) return null;

  return logRun({
    userId,
    variant: "control",
    poolSize: 0,
    rankedCount: 0,
    serendipityCount: 0,
    durationMs: Date.now() - startedAt,
    skipped: true,
  });
}

async function logRun(result: PrecomputeResult & { variant: string }): Promise<PrecomputeResult> {
  try {
    await prisma.rankingRun.create({
      data: {
        userId: result.userId,
        variant: result.variant,
        poolSize: result.poolSize,
        rankedCount: result.rankedCount,
        serendipityCount: result.serendipityCount,
        durationMs: result.durationMs,
        error: result.error,
      },
    });
  } catch (err) {
    // Don't crash the cron if logging fails — just console-warn.
    console.warn("[ranking.precompute] failed to log RankingRun", err);
  }
  return {
    userId: result.userId,
    poolSize: result.poolSize,
    rankedCount: result.rankedCount,
    serendipityCount: result.serendipityCount,
    durationMs: result.durationMs,
    skipped: result.skipped,
    error: result.error,
  };
}
