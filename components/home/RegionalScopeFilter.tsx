"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  scope: "near" | "all";
}

/**
 * PRD 2 §5.3 — "Near Denver" / "All" toggle. Controls whether mountain-
 * destination content appears in the feed. Defaults to "near" so
 * first-time users see impulse-friendly Denver + day-trip content; users
 * who tap "All" get Vail/Aspen/Telluride/etc. surfaced.
 *
 * Writes to the `scope` URL param and preserves tab/cat/occasion on click.
 */
export default function RegionalScopeFilter({ scope }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onSelect = (next: "near" | "all") => {
    if (next === scope) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "all") {
      params.set("scope", "all");
    } else {
      params.delete("scope"); // "near" is the default — omit for cleaner URLs
    }
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const pill = (value: "near" | "all", label: string, hint: string) => {
    const active = scope === value;
    return (
      <button
        type="button"
        onClick={() => onSelect(value)}
        className={[
          "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
          active
            ? "bg-ink text-surface"
            : "border border-line bg-surface text-mute hover:text-ink",
        ].join(" ")}
        aria-pressed={active}
        aria-label={hint}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2 px-5 pt-2 pb-1">
      <span className="text-[12px] uppercase tracking-wide text-mute">Scope</span>
      {pill("near", "Near Denver", "Denver metro plus day-trip towns")}
      {pill("all", "All", "Include weekend-trip mountain destinations")}
    </div>
  );
}
