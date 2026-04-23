/**
 * PRD 6 Phase 7 — RankingRun 14-day retention cleanup.
 *
 * Runs daily at 04:30 UTC; deletes RankingRun rows older than 14 days
 * so the observability table stays bounded.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const { count } = await prisma.rankingRun.deleteMany({
      where: { createdAt: { lt: fourteenDaysAgo } },
    });
    return NextResponse.json({ success: true, deleted: count });
  } catch (error) {
    console.error("[cleanup-ranking-runs] error:", error);
    return NextResponse.json(
      { error: "cleanup failed", details: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
