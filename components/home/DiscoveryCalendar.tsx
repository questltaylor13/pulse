"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// Wave 2 — month calendar discovery surface. Density dots per day (from
// /api/events/by-month); tapping a day deep-links to the date-filtered feed
// (/?date=YYYY-MM-DD, which parseDateFilter turns into a specific-day filter).

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function densityClass(count: number): string {
  if (count === 0) return "bg-transparent";
  if (count <= 2) return "bg-coral/30";
  if (count <= 5) return "bg-coral/60";
  return "bg-coral";
}

interface Props {
  /** Denver "today" as YYYY-MM-DD, passed from the server to avoid TZ drift. */
  todayKey: string;
}

export default function DiscoveryCalendar({ todayKey }: Props) {
  const router = useRouter();
  const [ty, tm] = useMemo(() => todayKey.split("-").map(Number), [todayKey]);
  const [year, setYear] = useState(ty);
  const [month, setMonth] = useState(tm); // 1-12
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const monthStr = `${year}-${pad(month)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/events/by-month?month=${monthStr}`)
      .then((r) => (r.ok ? r.json() : { counts: {} }))
      .then((data: { counts?: Record<string, number> }) => {
        if (!cancelled) setCounts(data.counts ?? {});
      })
      .catch(() => {
        if (!cancelled) setCounts({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [monthStr]);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  const step = (delta: number) => {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth() + 1);
  };

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-card border border-mute-divider bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => step(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-mute-hush"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2 className="text-title font-semibold text-ink">
          {MONTH_LABELS[month - 1]} {year}
        </h2>
        <button
          type="button"
          onClick={() => step(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-mute-hush"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-1 text-[11px] font-medium uppercase text-mute">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const key = `${year}-${pad(month)}-${pad(day)}`;
          const count = counts[key] ?? 0;
          const isToday = key === todayKey;
          const isPast = key < todayKey;
          // Only future/today days with events are tappable — parseDateFilter
          // rejects past dates, so a past day would dead-end to today's feed.
          const actionable = count > 0 && (!isPast || isToday);
          return (
            <button
              key={key}
              type="button"
              disabled={!actionable}
              onClick={() => router.push(`/?date=${key}`)}
              aria-label={`${count} event${count === 1 ? "" : "s"} on ${key}`}
              className={[
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-[13px] transition-colors",
                isToday ? "ring-1 ring-coral" : "",
                actionable ? "text-ink hover:bg-mute-hush" : "text-mute-divider",
                isPast && !isToday ? "opacity-40" : "",
              ].join(" ")}
            >
              <span>{day}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${densityClass(count)}`} />
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[12px] text-mute">
        {loading ? "Loading…" : "Tap a day to see what's on."}
      </p>
    </div>
  );
}
