import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PRD 2 §6.1 — 30-day retention for ScraperRun rows. Keeps the table from
 * growing unbounded while preserving enough history for trend analysis.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { count } = await prisma.scraperRun.deleteMany({
    where: { startedAt: { lt: thirtyDaysAgo } },
  });
  return NextResponse.json({ deleted: count });
}
