"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  /** Echoed from fetchHomeFeed.selectedDateFilter — same wire format the
   *  chip writes back. `null` means the implicit "today" default. */
  value: "tomorrow" | "weekend" | string | null;
  /** YYYY-MM-DD lower bound for the native date picker (today, Denver). */
  minDate: string;
}

type Preset = "today" | "tomorrow" | "weekend" | "this-week" | "next-week";

// Tokens written verbatim to the `date` URL param for non-calendar presets.
const PRESET_TOKENS = ["tomorrow", "weekend", "this-week", "next-week"];

/**
 * Date selector for the Events tab. Mirrors RegionalScopeFilter's
 * pill-chip pattern: writes the `date` URL param and lets the RSC tree
 * re-fetch. "Pick a date" triggers a hidden <input type="date"> via ref.
 */
export default function EventDateFilter({ value, minDate }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const isPreset = (v: typeof value): v is string =>
    typeof v === "string" && PRESET_TOKENS.includes(v);
  const isCustomDate = !!value && !isPreset(value);

  const writeParam = (next: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next) {
      params.set("date", next);
    } else {
      params.delete("date");
    }
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const onPreset = (next: Preset) => {
    if (next === "today") {
      if (value === null) return;
      writeParam(null);
      return;
    }
    if (next === value) return;
    writeParam(next);
  };

  const onCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v) writeParam(v);
  };

  const pill = (
    label: string,
    active: boolean,
    onClick: () => void,
    aria: string,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-brand-gradient-strong text-white shadow-pill"
          : "border border-line bg-surface text-mute hover:text-ink",
      ].join(" ")}
      aria-pressed={active}
      aria-label={aria}
    >
      {label}
    </button>
  );

  // When a custom date is active, surface the chosen date as the chip label.
  const pickLabel = isCustomDate ? formatChipDate(value as string) : "Pick a date";

  return (
    <div className="flex items-center gap-2 px-5 pt-2 pb-1 overflow-x-auto">
      <span className="text-[12px] uppercase tracking-wide text-mute shrink-0">When</span>
      {pill("Today", value === null, () => onPreset("today"), "Events happening today")}
      {pill("Tomorrow", value === "tomorrow", () => onPreset("tomorrow"), "Events happening tomorrow")}
      {pill("This weekend", value === "weekend", () => onPreset("weekend"), "Events happening this weekend")}
      {pill("This week", value === "this-week", () => onPreset("this-week"), "Events happening this week")}
      {pill("Next week", value === "next-week", () => onPreset("next-week"), "Events happening next week")}
      {pill(
        pickLabel,
        isCustomDate,
        () => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click(),
        "Pick a specific date",
      )}
      <input
        ref={dateInputRef}
        type="date"
        min={minDate}
        value={isCustomDate ? (value as string) : ""}
        onChange={onCustomDateChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      <Link
        href="/events/calendar"
        className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-mute transition-colors hover:text-ink"
        aria-label="Browse the month calendar"
      >
        📅 Calendar
      </Link>
    </div>
  );
}

// Render "May 11" from a YYYY-MM-DD string without timezone surprises.
function formatChipDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  // Month index is 0-based; constructing in local time is fine — we only
  // use month/day for display, never arithmetic.
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
