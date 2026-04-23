/**
 * PRD 6 Phase 2 — Hourly precompute cron.
 *
 * Iterates active users and re-ranks any whose cache is missing or dirty.
 * Respects a time budget so we don't blow past Vercel's 60s hobby limit;
 * partial runs are OK — the next tick continues where this one left off
 * (stale-aware via RankedFeedCache.computedAt + isDirty).
 *
 * Auth: Bearer CRON_SECRET (matches existing /api/cron/* pattern).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { precomputeUser } from "@/lib/ranking/precompute";
import { RANKING_CONFIG } from "@/lib/ranking/config";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const runBudgetMs = RANKING_CONFIG.precompute.runBudgetMs;

  try {
    // Prioritize users with dirty caches, then users with no cache, then
    // everyone else. Fetch a bounded list — even at 1000+ users we can't
    // rank everyone in a single 60s tick, so we paginate via cache age.
    const dirty = await prisma.user.findMany({
      where: { rankedFeedCache: { isDirty: true } },
      select: { id: true },
      take: 200,
    });
    const uncached = await prisma.user.findMany({
      where: { rankedFeedCache: null },
      select: { id: true },
      take: 200,
    });
    const stale = await prisma.user.findMany({
      where: { rankedFeedCache: { isNot: null } },
      select: { id: true },
      orderBy: { rankedFeedCache: { computedAt: "asc" } },
      take: 200,
    });

    // Dedup, prioritizing dirty → uncached → stale
    const seen = new Set<string>();
    const queue: string[] = [];
    for (const u of [...dirty, ...uncached, ...stale]) {
      if (seen.has(u.id)) continue;
      seen.add(u.id);
      queue.push(u.id);
    }

    let processed = 0;
    let skipped = 0;
    let errored = 0;
    let partialCompletion = false;

    for (const userId of queue) {
      if (Date.now() - startedAt > runBudgetMs) {
        partialCompletion = true;
        break;
      }
      const result = await precomputeUser(userId);
      if (result.skipped) skipped += 1;
      else if (result.error) errored += 1;
      else processed += 1;
    }

    return NextResponse.json({
      success: true,
      queued: queue.length,
      processed,
      skipped,
      errored,
      partialCompletion,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[ranking.precompute] cron error:", error);
    return NextResponse.json(
      {
        error: "Precompute failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
