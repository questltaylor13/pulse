import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PRD 6 Phase 7 §7.2 — ranking engine health view.
// Precompute job health, cache freshness, fallback incidents,
// per-variant cohorts, and recent RankingRun samples.

export const dynamic = "force-dynamic";

async function requireAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return Boolean(user?.isAdmin);
}

export default async function AdminRankingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?next=/admin/ranking");
  const admin = await requireAdmin(session.user.id);
  if (!admin) redirect("/");

  const now = Date.now();
  const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    usersWithCache,
    freshCache,
    staleCache,
    oldestCache,
    lastRun,
    recentRuns,
    errorsLast7d,
    variantCohorts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.rankedFeedCache.count(),
    prisma.rankedFeedCache.count({ where: { computedAt: { gte: fourHoursAgo } } }),
    prisma.rankedFeedCache.count({ where: { computedAt: { lt: fourHoursAgo } } }),
    prisma.rankedFeedCache.findFirst({
      orderBy: { computedAt: "asc" },
      select: { computedAt: true },
    }),
    prisma.rankingRun.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        durationMs: true,
        poolSize: true,
        rankedCount: true,
        serendipityCount: true,
        error: true,
        variant: true,
      },
    }),
    prisma.rankingRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        userId: true,
        variant: true,
        poolSize: true,
        rankedCount: true,
        serendipityCount: true,
        durationMs: true,
        error: true,
      },
    }),
    prisma.rankingRun.count({
      where: { createdAt: { gte: sevenDaysAgo }, NOT: { error: null } },
    }),
    prisma.user.groupBy({
      by: ["rankingVariant"],
      _count: true,
    }),
  ]);

  const coverage = totalUsers > 0 ? (usersWithCache / totalUsers) * 100 : 0;
  const freshPct = usersWithCache > 0 ? (freshCache / usersWithCache) * 100 : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-ink">Ranking engine health</h1>
      <p className="mt-1 text-sm text-mute">PRD 6 Phase 7 — admin observability</p>

      <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total users" value={totalUsers.toLocaleString()} />
        <Stat
          label="Users with cache"
          value={usersWithCache.toLocaleString()}
          sub={`${coverage.toFixed(1)}% coverage`}
          tone={coverage > 95 ? "good" : coverage > 80 ? "warn" : "bad"}
        />
        <Stat
          label="Fresh cache (<4h)"
          value={freshCache.toLocaleString()}
          sub={`${freshPct.toFixed(1)}% of cached`}
          tone={freshPct > 95 ? "good" : freshPct > 80 ? "warn" : "bad"}
        />
        <Stat
          label="Stale cache (≥4h)"
          value={staleCache.toLocaleString()}
          sub={oldestCache ? `oldest: ${fmtRelative(oldestCache.computedAt)}` : undefined}
          tone={staleCache === 0 ? "good" : staleCache < usersWithCache * 0.2 ? "warn" : "bad"}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Precompute job</h2>
        {lastRun ? (
          <div className="mt-2 rounded-card border border-mute-divider bg-surface p-4 text-sm">
            <div>
              <span className="text-mute">Last run:</span>{" "}
              <span className="text-ink">{fmtRelative(lastRun.createdAt)}</span>{" "}
              <span className="text-mute">({lastRun.durationMs}ms)</span>
            </div>
            <div className="mt-1">
              <span className="text-mute">Pool:</span>{" "}
              <span className="text-ink">{lastRun.poolSize}</span>{" "}
              <span className="text-mute">→ ranked</span>{" "}
              <span className="text-ink">{lastRun.rankedCount}</span>{" "}
              <span className="text-mute">({lastRun.serendipityCount} serendipity)</span>
            </div>
            <div className="mt-1">
              <span className="text-mute">Variant:</span>{" "}
              <span className="text-ink">{lastRun.variant}</span>
            </div>
            {lastRun.error && (
              <div className="mt-2 rounded bg-rose-50 px-3 py-2 text-rose-700">
                <span className="font-medium">Error:</span> {lastRun.error}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-mute">No runs yet.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Fallback incidents (7d)</h2>
        <p className="mt-2 text-sm text-ink">
          <span
            className={`font-semibold ${errorsLast7d > 10 ? "text-rose-700" : errorsLast7d > 0 ? "text-amber-700" : "text-emerald-700"}`}
          >
            {errorsLast7d}
          </span>{" "}
          <span className="text-mute">errored runs in the last 7 days.</span>
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Variant cohorts</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-mute">
              <th className="pb-2">Variant</th>
              <th className="pb-2">Users</th>
            </tr>
          </thead>
          <tbody>
            {variantCohorts.map((v) => (
              <tr key={v.rankingVariant} className="border-t border-mute-divider">
                <td className="py-2 text-ink">{v.rankingVariant}</td>
                <td className="py-2 text-ink">{v._count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Recent runs (20)</h2>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-left text-mute">
              <th className="pb-2">When</th>
              <th className="pb-2">User</th>
              <th className="pb-2">Variant</th>
              <th className="pb-2">Pool</th>
              <th className="pb-2">Ranked</th>
              <th className="pb-2">Ser.</th>
              <th className="pb-2">ms</th>
              <th className="pb-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {recentRuns.map((r) => (
              <tr key={r.id} className="border-t border-mute-divider">
                <td className="py-1">{fmtRelative(r.createdAt)}</td>
                <td className="py-1 font-mono text-[10px]">{r.userId?.slice(0, 8) ?? "—"}</td>
                <td className="py-1">{r.variant}</td>
                <td className="py-1">{r.poolSize}</td>
                <td className="py-1">{r.rankedCount}</td>
                <td className="py-1">{r.serendipityCount}</td>
                <td className="py-1">{r.durationMs}</td>
                <td className="py-1 text-rose-700">{r.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "bad"
          ? "text-rose-700"
          : "text-ink";
  return (
    <div className="rounded-card border border-mute-divider bg-surface p-3">
      <div className="text-xs text-mute">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-mute">{sub}</div>}
    </div>
  );
}

function fmtRelative(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}
