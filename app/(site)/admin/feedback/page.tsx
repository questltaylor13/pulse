import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { FeedbackSource, ItemStatus } from "@prisma/client";

// PRD 5 Phase 6 §6.2 — admin feedback health view.
// Total counts by status + source, median feedback count per user, top
// items by WANT + top items by PASS (quality flag), and a couple of
// data-quality lights (PRD §6.3) that surface in red when exceeded.

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ItemStatus, string> = {
  WANT: "Interested",
  DONE: "Been there",
  PASS: "Not for me",
};

const SOURCE_LABEL: Record<FeedbackSource, string> = {
  FEED_CARD: "Feed card",
  PROFILE_SWIPER: "Profile swiper",
  DETAIL_PAGE: "Detail page",
  LEGACY: "Legacy",
};

async function requireAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return !!user?.isAdmin;
}

export default async function AdminFeedbackPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!(await requireAdmin(session.user.id))) redirect("/");

  const [total, byStatus, bySource, userCounts, topWant, topPass, dataQualityFlags] =
    await Promise.all([
      prisma.userItemStatus.count(),
      prisma.userItemStatus.groupBy({ by: ["status"], _count: true }),
      prisma.userItemStatus.groupBy({ by: ["source"], _count: true }),
      // Median proxy via per-user counts. Cheap at current scale.
      prisma.userItemStatus.groupBy({
        by: ["userId"],
        _count: true,
      }),
      // Top items by WANT — join via snapshot to avoid joining all 4 FK tables
      prisma.$queryRaw<Array<{ title: string; count: bigint }>>`
        SELECT COALESCE("itemTitleSnapshot", 'Untitled') AS title, COUNT(*)::bigint AS count
        FROM "UserItemStatus"
        WHERE "status" = 'WANT'
        GROUP BY "itemTitleSnapshot"
        ORDER BY count DESC
        LIMIT 10
      `,
      prisma.$queryRaw<Array<{ title: string; count: bigint }>>`
        SELECT COALESCE("itemTitleSnapshot", 'Untitled') AS title, COUNT(*)::bigint AS count
        FROM "UserItemStatus"
        WHERE "status" = 'PASS'
        GROUP BY "itemTitleSnapshot"
        ORDER BY count DESC
        LIMIT 10
      `,
      // PRD §6.3: users with >50 PASS and <5 WANT (profile mismatch flag)
      prisma.$queryRaw<Array<{ userId: string; passCount: bigint; wantCount: bigint }>>`
        SELECT "userId",
          COUNT(*) FILTER (WHERE "status" = 'PASS')::bigint AS "passCount",
          COUNT(*) FILTER (WHERE "status" = 'WANT')::bigint AS "wantCount"
        FROM "UserItemStatus"
        GROUP BY "userId"
        HAVING COUNT(*) FILTER (WHERE "status" = 'PASS') > 50
           AND COUNT(*) FILTER (WHERE "status" = 'WANT') < 5
      `,
    ]);

  const statusMap = new Map(byStatus.map((r) => [r.status, r._count]));
  const sourceMap = new Map(bySource.map((r) => [r.source, r._count]));
  const counts = userCounts
    .map((r) => r._count)
    .sort((a, b) => a - b);
  const median =
    counts.length === 0 ? 0 : counts[Math.floor(counts.length / 2)];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Feedback</h1>
        <p className="mt-1 text-sm text-slate-600">
          PRD 5 behavioral signal health. Feeds the PRD 6 ranking engine.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total feedback rows" value={total} />
        <StatCard label="Interested (WANT)" value={statusMap.get("WANT") ?? 0} />
        <StatCard label="Been there (DONE)" value={statusMap.get("DONE") ?? 0} />
        <StatCard label="Not for me (PASS)" value={statusMap.get("PASS") ?? 0} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            By source
          </div>
          <ul className="mt-3 space-y-2">
            {(Object.keys(SOURCE_LABEL) as FeedbackSource[]).map((src) => (
              <li
                key={src}
                className="flex items-center justify-between text-sm text-slate-700"
              >
                <span>{SOURCE_LABEL[src]}</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {sourceMap.get(src) ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Median feedback per user
          </div>
          <div className="mt-1 text-3xl font-bold text-slate-900">{median}</div>
          <div className="mt-1 text-xs text-slate-500">
            {counts.length} users with any feedback row
          </div>
          <div className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">
            Data quality flags
          </div>
          <div className="mt-2 space-y-1 text-sm">
            <DataQualityRow
              label="Users with >50 PASS and <5 WANT"
              value={dataQualityFlags.length}
              threshold={0}
              description="Profile mismatch — prompt re-onboarding"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TopItemsTable
          title="Top WANT items"
          subtitle="Most-Interested across all users"
          rows={topWant}
          tone="teal"
        />
        <TopItemsTable
          title="Top PASS items"
          subtitle="High PASS count can indicate low-quality content"
          rows={topPass}
          tone="rose"
        />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function DataQualityRow({
  label,
  value,
  threshold,
  description,
}: {
  label: string;
  value: number;
  threshold: number;
  description: string;
}) {
  const flagged = value > threshold;
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-slate-700">{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <span
        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          flagged ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function TopItemsTable({
  title,
  subtitle,
  rows,
  tone,
}: {
  title: string;
  subtitle: string;
  rows: Array<{ title: string; count: bigint }>;
  tone: "teal" | "rose";
}) {
  const badgeClass =
    tone === "teal" ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-700";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-sm text-slate-500">No data yet.</div>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {rows.map((r, i) => (
            <li
              key={`${r.title}-${i}`}
              className="flex items-center justify-between gap-2 px-4 py-2.5"
            >
              <span className="truncate text-slate-800">{r.title}</span>
              <span
                className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}
              >
                {Number(r.count)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
