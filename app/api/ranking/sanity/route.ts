/**
 * PRD 6 Phase 7 — Weekly ranking sanity check.
 *
 * Logs warnings (not alerts) when the ranking feed shows signs of
 * pathology. Intended for Quest's weekly review. Checks:
 *   1. Top-10 homogeneity — same items in everyone's top 10 = filter
 *      bubble collapse (serendipity not firing).
 *   2. Serendipity hit rate — % of serendipity slots getting WANT.
 *      <5% = serendipity not resonating; >50% = mislabeled.
 *   3. Per-segment divergence — NEW_TO_CITY vs IN_A_RUT vs
 *      LOCAL_EXPLORER vs VISITING top-10 overlap. >70% means the
 *      strategy presets aren't pulling enough weight.
 *
 * Auth: Bearer CRON_SECRET. Schedule: Mondays 10:00 UTC.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ContextSegment } from "@prisma/client";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const caches = await prisma.rankedFeedCache.findMany({
      select: { userId: true, rankedItems: true },
      take: 500, // Bounded — sanity checks are statistical, not exhaustive.
    });

    const warnings: string[] = [];

    // 1. Top-10 homogeneity
    const topTenCounts = new Map<string, number>();
    for (const cache of caches) {
      const ranked = Array.isArray(cache.rankedItems) ? cache.rankedItems : [];
      for (const item of (ranked as Array<{ itemType: string; itemId: string }>).slice(0, 10)) {
        const key = `${item.itemType}:${item.itemId}`;
        topTenCounts.set(key, (topTenCounts.get(key) ?? 0) + 1);
      }
    }
    const repeatedItems = Array.from(topTenCounts.entries()).filter(
      ([, count]) => caches.length >= 10 && count >= caches.length * 0.8,
    );
    if (repeatedItems.length >= 3) {
      warnings.push(
        `TOP_TEN_HOMOGENEITY: ${repeatedItems.length} items appear in 80%+ of user top-10s — serendipity may not be firing.`,
      );
    }

    // 2. Serendipity hit rate
    const serendipityByUser = await computeSerendipityHitRate();
    if (serendipityByUser.total > 20 && serendipityByUser.hitRate < 0.05) {
      warnings.push(
        `SERENDIPITY_LOW: ${(serendipityByUser.hitRate * 100).toFixed(1)}% WANT rate on serendipity slots (${serendipityByUser.wants}/${serendipityByUser.total}).`,
      );
    }
    if (serendipityByUser.total > 20 && serendipityByUser.hitRate > 0.5) {
      warnings.push(
        `SERENDIPITY_HIGH: ${(serendipityByUser.hitRate * 100).toFixed(1)}% WANT rate — items may be mislabeled as serendipity.`,
      );
    }

    // 3. Per-segment top-10 divergence
    const perSegmentOverlap = await computeSegmentOverlap();
    for (const [pair, overlap] of Object.entries(perSegmentOverlap)) {
      if (overlap > 0.7) {
        warnings.push(
          `SEGMENT_CONVERGENCE: ${pair} top-10 overlap at ${(overlap * 100).toFixed(0)}% — strategy presets may be weak.`,
        );
      }
    }

    // Always log, even when clean — gives a visible audit trail.
    console.warn("[ranking.sanity]", {
      cachesChecked: caches.length,
      repeatedItems: repeatedItems.length,
      serendipityHitRate: serendipityByUser.hitRate,
      segmentOverlap: perSegmentOverlap,
      warnings,
    });

    return NextResponse.json({
      success: true,
      cachesChecked: caches.length,
      warnings,
      serendipity: serendipityByUser,
      segmentOverlap: perSegmentOverlap,
    });
  } catch (error) {
    console.error("[ranking.sanity] error:", error);
    return NextResponse.json(
      { error: "sanity check failed", details: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function computeSerendipityHitRate(): Promise<{
  wants: number;
  total: number;
  hitRate: number;
}> {
  // For each serendipity-tagged cached item, is there a WANT status row?
  // Scan the last 200 caches, find serendipity IDs, count WANTs.
  const caches = await prisma.rankedFeedCache.findMany({
    select: { userId: true, rankedItems: true },
    take: 200,
  });
  let wants = 0;
  let total = 0;
  for (const cache of caches) {
    const ranked = Array.isArray(cache.rankedItems) ? cache.rankedItems : [];
    const serendipityItems = (ranked as Array<{ itemType: string; itemId: string; isSerendipity?: boolean }>)
      .filter((r) => r.isSerendipity);
    total += serendipityItems.length;
    if (!serendipityItems.length) continue;

    for (const item of serendipityItems) {
      const field =
        item.itemType === "event" ? "eventId" : item.itemType === "place" ? "placeId" : "discoveryId";
      const wantHit = await prisma.userItemStatus.count({
        where: { userId: cache.userId, [field]: item.itemId, status: "WANT" },
      });
      if (wantHit > 0) wants += 1;
    }
  }
  return { wants, total, hitRate: total > 0 ? wants / total : 0 };
}

async function computeSegmentOverlap(): Promise<Record<string, number>> {
  const segments: ContextSegment[] = ["NEW_TO_CITY", "IN_A_RUT", "LOCAL_EXPLORER", "VISITING"];
  const topTenBySegment = new Map<ContextSegment, Set<string>>();

  for (const seg of segments) {
    const users = await prisma.user.findMany({
      where: { profile: { contextSegment: seg } },
      select: { rankedFeedCache: { select: { rankedItems: true } } },
      take: 50,
    });
    const ids = new Set<string>();
    for (const u of users) {
      if (!u.rankedFeedCache) continue;
      const ranked = Array.isArray(u.rankedFeedCache.rankedItems)
        ? u.rankedFeedCache.rankedItems
        : [];
      for (const item of (ranked as Array<{ itemType: string; itemId: string }>).slice(0, 10)) {
        ids.add(`${item.itemType}:${item.itemId}`);
      }
    }
    topTenBySegment.set(seg, ids);
  }

  const overlap: Record<string, number> = {};
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = topTenBySegment.get(segments[i]) ?? new Set();
      const b = topTenBySegment.get(segments[j]) ?? new Set();
      if (a.size === 0 || b.size === 0) {
        overlap[`${segments[i]} vs ${segments[j]}`] = 0;
        continue;
      }
      const shared = [...a].filter((x) => b.has(x));
      overlap[`${segments[i]} vs ${segments[j]}`] = shared.length / Math.min(a.size, b.size);
    }
  }
  return overlap;
}
