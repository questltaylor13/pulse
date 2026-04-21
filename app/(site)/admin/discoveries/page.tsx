import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { DiscoveryRun, DiscoverySource } from "@prisma/client";

// PRD 3 Phase 6 — admin observability for the Discovery pipelines.
// Shows per-source run history, flags UNVERIFIED queue size, and
// surfaces candidates that got rejected as dated events (a signal the
// Event pipeline has a gap).

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<DiscoverySource, string> = {
  LLM_RESEARCH: "LLM Research",
  REDDIT: "Reddit",
  NICHE_SITE: "Niche Sites",
  EDITORIAL: "Editorial",
  COMMUNITY: "Community",
};

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 6) / 10}m`;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminDiscoveriesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) redirect("/");

  const [recentRuns, unverifiedCount, rejectedAsEventSum, discoveryCount] =
    await Promise.all([
      prisma.discoveryRun.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.discovery.count({ where: { status: "UNVERIFIED" } }),
      prisma.discoveryRun.aggregate({
        where: {
          createdAt: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
        },
        _sum: { rejectedAsEventCount: true },
      }),
      prisma.discovery.count({ where: { status: "ACTIVE" } }),
    ]);

  const rejectedAsEvent = rejectedAsEventSum._sum.rejectedAsEventCount ?? 0;

  const runsBySource = recentRuns.reduce<Record<string, DiscoveryRun[]>>(
    (acc, run) => {
      const key = run.source;
      acc[key] = acc[key] ?? [];
      acc[key].push(run);
      return acc;
    },
    {}
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Pipelines</h1>
        <p className="mt-1 text-sm text-slate-600">
          Discovery pipeline observability. Weekly cron runs Sunday 3am UTC
          via <code className="rounded bg-slate-100 px-1">/api/discoveries/refresh</code>.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Discoveries" value={discoveryCount} />
        <StatCard
          label="Unverified queue"
          value={unverifiedCount}
          hint={
            unverifiedCount > 20
              ? "Over 20 — prompts or verification need tuning"
              : "Weekly triage ritual"
          }
          linkHref="/admin/discoveries/review"
          linkLabel="Review →"
        />
        <StatCard
          label="Rejected as dated events (28d)"
          value={rejectedAsEvent}
          hint={
            rejectedAsEvent > 30
              ? "High — Event-vs-Gem rule may need tightening"
              : "Normal"
          }
        />
      </section>

      <section className="space-y-6">
        {(["LLM_RESEARCH", "REDDIT", "NICHE_SITE"] as DiscoverySource[]).map(
          (source) => (
            <PipelineRuns
              key={source}
              title={SOURCE_LABEL[source]}
              runs={runsBySource[source] ?? []}
            />
          )
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  linkHref,
  linkLabel,
}: {
  label: string;
  value: number;
  hint?: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
      {linkHref && linkLabel && (
        <Link
          href={linkHref}
          className="mt-2 inline-block text-sm font-medium text-amber-700 hover:underline"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function PipelineRuns({
  title,
  runs,
}: {
  title: string;
  runs: DiscoveryRun[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <span className="text-xs text-slate-500">Last {runs.length} runs</span>
      </div>
      {runs.length === 0 ? (
        <div className="px-4 py-6 text-sm text-slate-500">No runs yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Raw</th>
                <th className="px-4 py-2">Rejected (event)</th>
                <th className="px-4 py-2">Dropped (quality)</th>
                <th className="px-4 py-2">Unverified</th>
                <th className="px-4 py-2">Upserted</th>
                <th className="px-4 py-2">Updated</th>
                <th className="px-4 py-2">Duration</th>
                <th className="px-4 py-2">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-4 py-2 text-slate-700 whitespace-nowrap">
                    {formatDate(run.createdAt)}
                  </td>
                  <td className="px-4 py-2">
                    <StatusPill status={run.status} />
                  </td>
                  <td className="px-4 py-2 text-slate-700">{run.rawCandidateCount}</td>
                  <td className="px-4 py-2 text-slate-700">{run.rejectedAsEventCount}</td>
                  <td className="px-4 py-2 text-slate-700">{run.droppedForQualityCount}</td>
                  <td className="px-4 py-2 text-slate-700">{run.unverifiedCount}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">{run.upsertedCount}</td>
                  <td className="px-4 py-2 text-slate-700">{run.updatedExistingCount}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDuration(run.durationMs)}</td>
                  <td className="px-4 py-2 text-slate-500">{run.errorCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "SUCCESS"
      ? "bg-emerald-100 text-emerald-700"
      : status === "PARTIAL"
        ? "bg-amber-100 text-amber-700"
        : status === "FAILED"
          ? "bg-rose-100 text-rose-700"
          : "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
