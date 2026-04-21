"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

// PRD 3 Phase 5 — Hidden Gems filter chips.
// Subtype pills: All / Spots / Clubs & Leagues / Seasonal.
// Scope toggle:  Near Me (default) / All of Colorado.

const SUBTYPES = [
  { key: "all", label: "All" },
  { key: "HIDDEN_GEM", label: "Spots" },
  { key: "NICHE_ACTIVITY", label: "Clubs & Leagues" },
  { key: "SEASONAL_TIP", label: "Seasonal" },
] as const;

const SCOPES = [
  { key: "near_me", label: "Near Me" },
  { key: "all", label: "All of Colorado" },
] as const;

export default function HiddenGemsFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const currentSubtype = params.get("subtype") ?? "all";
  const currentScope = params.get("scope") ?? "near_me";

  const buildHref = useCallback(
    (next: Record<string, string>) => {
      const search = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === "all" && k === "subtype") search.delete("subtype");
        else search.set(k, v);
      }
      const qs = search.toString();
      return qs ? `/discoveries?${qs}` : "/discoveries";
    },
    [params]
  );

  const go = useCallback(
    (next: Record<string, string>) => router.push(buildHref(next)),
    [buildHref, router]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SUBTYPES.map(({ key, label }) => {
          const active = currentSubtype === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => go({ subtype: key })}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-amber-500 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm">
        {SCOPES.map(({ key, label }) => {
          const active = currentScope === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => go({ scope: key })}
              className={`rounded-full px-3.5 py-1 font-medium transition ${
                active
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
