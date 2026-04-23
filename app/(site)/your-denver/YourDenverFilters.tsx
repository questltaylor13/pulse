"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// PRD 5 §4.2 — filter chips for the Your Denver history view. URL-driven
// so deep-linking and back-button work.

const FILTERS = [
  { key: "all", label: "All" },
  { key: "event", label: "Events" },
  { key: "place", label: "Places" },
  { key: "discovery", label: "Hidden Gems" },
] as const;

interface Props {
  counts: { all: number; event: number; place: number; discovery: number };
}

export default function YourDenverFilters({ counts }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams?.get("kind") ?? "all";

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map(({ key, label }) => {
        const sp = new URLSearchParams(searchParams?.toString() ?? "");
        if (key === "all") sp.delete("kind");
        else sp.set("kind", key);
        const qs = sp.toString();
        const href = qs ? `${pathname}?${qs}` : pathname;
        const active = current === key;
        const count = counts[key as keyof typeof counts];
        return (
          <Link
            key={key}
            href={href}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              active
                ? "border-purple-500 bg-purple-50 text-purple-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs font-normal text-slate-500">
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
