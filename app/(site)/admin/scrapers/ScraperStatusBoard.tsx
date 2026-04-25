"use client";

import { useState } from "react";

interface Source {
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

const HEALTH_COLORS: Record<Source["health"], string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
  unknown: "bg-slate-300",
};

const HEALTH_LABELS: Record<Source["health"], string> = {
  green: "Healthy",
  yellow: "Empty",
  red: "Error",
  unknown: "No runs",
};

function fmtAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / (60 * 60 * 1000));
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ScraperStatusBoard({ sources }: { sources: Source[] }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function triggerScrape() {
    if (running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/scrape-now", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed");
      setResult(
        `✓ total=${body.total} inserted=${body.inserted} updated=${body.updated} enriched=${body.enriched} dropped=${body.dropped}`
      );
    } catch (e) {
      setResult(`✗ ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setRunning(false);
      // Let user refresh to see updated rows rather than auto-reloading.
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-ink">Scraper coverage</h1>
          <p className="mt-1 text-[14px] text-mute">
            Per-source health over the last 7 days.
          </p>
        </div>
        <button
          type="button"
          onClick={triggerScrape}
          disabled={running}
          className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-surface disabled:opacity-50"
        >
          {running ? "Running…" : "Refresh now"}
        </button>
      </div>
      {result && (
        <p className="mt-3 text-[13px] text-mute" role="status">
          {result}
        </p>
      )}

      {sources.length === 0 ? (
        <div className="mt-8 rounded-card border border-line bg-surface p-6 text-body text-mute">
          No ScraperRun rows yet. The first nightly cron (or a manual &ldquo;Refresh now&rdquo;)
          will populate this board.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-card border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-mute-hush text-[12px] uppercase tracking-wide text-mute">
              <tr>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Health</th>
                <th className="px-4 py-2">Last run</th>
                <th className="px-4 py-2 text-right">Runs&nbsp;(7d)</th>
                <th className="px-4 py-2 text-right">Inserted&nbsp;(7d)</th>
                <th className="px-4 py-2">Errors</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.source} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-ink">
                    {s.source}
                    {s.degraded && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase text-amber-800">
                        degraded
                      </span>
                    )}
                    {s.coverageAnomaly && (
                      <span
                        className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] uppercase text-red-800"
                        title="Latest rawCount is <50% of the 14-day median. Selectors may have drifted."
                      >
                        anomaly
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${HEALTH_COLORS[s.health]}`}
                        aria-hidden="true"
                      />
                      {HEALTH_LABELS[s.health]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mute">
                    {fmtAgo(s.lastRunAt)}
                    {s.lastRunDurationMs ? ` · ${s.lastRunDurationMs}ms` : ""}
                  </td>
                  <td className="px-4 py-3 text-right">{s.runsLast7Days}</td>
                  <td className="px-4 py-3 text-right">{s.totalInserted}</td>
                  <td className="px-4 py-3 text-mute">
                    {s.lastErrors.length > 0 ? (
                      <span title={s.lastErrors.join(" | ")}>
                        {s.lastErrors[0].slice(0, 60)}
                        {s.lastErrors[0].length > 60 ? "…" : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
