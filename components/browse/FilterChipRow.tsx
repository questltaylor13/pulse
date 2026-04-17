"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import { filtersFromParams, activeFilterCount } from "@/lib/browse/filters";
import FilterSheet from "./FilterSheet";

const QUICK_CHIPS = [
  { label: "Any category", param: "category", value: "" },
  { label: "Free", param: "price", value: "free" },
  { label: "Dog friendly", param: "vibe", value: "dog-friendly" },
  { label: "Outdoors", param: "category", value: "OUTDOORS" },
] as const;

export default function FilterChipRow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const filters = filtersFromParams(new URLSearchParams(searchParams?.toString() ?? ""));
  const count = activeFilterCount(filters);

  const toggleQuickChip = useCallback(
    (param: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (!value) {
        // "Any category" clears the category param
        params.delete("category");
      } else if (params.get(param) === value) {
        params.delete(param);
      } else {
        params.set(param, value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const isActive = (param: string, value: string) => {
    if (!value) return !searchParams?.get("category");
    return searchParams?.get(param) === value;
  };

  return (
    <>
      <div className="flex gap-2 overflow-x-auto px-5 py-2 no-scrollbar">
        {/* Filter button */}
        <button
          onClick={() => setSheetOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-pill border border-mute-divider bg-surface px-3 py-1.5 text-body font-medium text-ink"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6h16M6 12h12M9 18h6" />
          </svg>
          Filters
          {count > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-surface">
              {count}
            </span>
          )}
        </button>

        {/* Quick chips */}
        {QUICK_CHIPS.map((chip) => {
          const active = isActive(chip.param, chip.value);
          return (
            <button
              key={chip.label}
              onClick={() => toggleQuickChip(chip.param, chip.value)}
              className={`shrink-0 rounded-pill px-3 py-1.5 text-body transition-colors ${
                active
                  ? "bg-ink text-surface"
                  : "border border-mute-divider bg-surface text-ink"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {sheetOpen && <FilterSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}
