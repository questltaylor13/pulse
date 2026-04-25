import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface SourceHealth {
  source: string;
  health: "green" | "yellow" | "red" | "unknown";
  lastRunAt: string | null;
  lastRunDurationMs: number | null;
  runsLast7Days: number;
  totalInserted: number;
  totalErrors: number;
  lastErrors: string[];
  degraded: boolean;
  // PR 2 step 10: latest run's coverage-anomaly flag — true when rawCount
  // dropped well below the source's 14-day rolling median (cold-start
  // guards in lib/scrapers/index.ts).
  coverageAnomaly: boolean;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const runs = await prisma.scraperRun.findMany({
    where: { startedAt: { gte: sevenDaysAgo } },
    orderBy: { startedAt: "desc" },
  });

  const bySource = new Map<string, typeof runs>();
  for (const r of runs) {
    if (!bySource.has(r.source)) bySource.set(r.source, []);
    bySource.get(r.source)!.push(r);
  }

  const sources: SourceHealth[] = [];
  for (const [source, sourceRuns] of bySource.entries()) {
    const latest = sourceRuns[0]; // ordered desc
    const totalInserted = sourceRuns.reduce((s, r) => s + r.insertedCount, 0);
    const totalErrors = sourceRuns.reduce((s, r) => s + r.errorCount, 0);

    // PRD §6.2 health rubric:
    //   Green  — latest run succeeded AND rawCount > 0
    //   Yellow — latest run succeeded but rawCount == 0
    //   Red    — latest run errored
    let health: SourceHealth["health"] = "unknown";
    if (!latest.succeeded || latest.errorCount > 0) health = "red";
    else if (latest.rawCount === 0) health = "yellow";
    else health = "green";

    // PRD §6.3 degraded signal — two consecutive yellow runs.
    const lastTwo = sourceRuns.slice(0, 2);
    const degraded =
      lastTwo.length === 2 &&
      lastTwo.every((r) => r.succeeded && r.rawCount === 0);

    sources.push({
      source,
      health,
      lastRunAt: latest.startedAt.toISOString(),
      lastRunDurationMs: latest.durationMs,
      runsLast7Days: sourceRuns.length,
      totalInserted,
      totalErrors,
      lastErrors: latest.errors.slice(0, 3),
      degraded,
      coverageAnomaly: latest.coverageAnomaly,
    });
  }

  sources.sort((a, b) => a.source.localeCompare(b.source));
  return NextResponse.json({
    sources,
    windowDays: 7,
    generatedAt: new Date().toISOString(),
  });
}
