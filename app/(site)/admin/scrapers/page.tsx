import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ScraperStatusBoard from "./ScraperStatusBoard";

export const dynamic = "force-dynamic";

interface RunRow {
  source: string;
  health: "green" | "yellow" | "red" | "unknown";
  lastRunAt: string | null;
  lastRunDurationMs: number | null;
  runsLast7Days: number;
  totalInserted: number;
  totalErrors: number;
  lastErrors: string[];
  degraded: boolean;
  coverageAnomaly: boolean;
}

/**
 * PRD 2 §6.2 — admin coverage-health dashboard. Green/yellow/red indicator
 * per scraper over the last 7 days. Mirrors /api/admin/scraper-status but
 * renders directly from the DB for SSR.
 */
export default async function AdminScrapersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) redirect("/");

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

  const sources: RunRow[] = [];
  for (const [source, sourceRuns] of bySource.entries()) {
    const latest = sourceRuns[0];
    let health: RunRow["health"] = "unknown";
    if (!latest.succeeded || latest.errorCount > 0) health = "red";
    else if (latest.rawCount === 0) health = "yellow";
    else health = "green";

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
      totalInserted: sourceRuns.reduce((s, r) => s + r.insertedCount, 0),
      totalErrors: sourceRuns.reduce((s, r) => s + r.errorCount, 0),
      lastErrors: latest.errors.slice(0, 3),
      degraded,
      coverageAnomaly: latest.coverageAnomaly,
    });
  }
  sources.sort((a, b) => a.source.localeCompare(b.source));

  return <ScraperStatusBoard sources={sources} />;
}
