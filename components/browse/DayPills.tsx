"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

const DAYS = [
  { label: "All weekend", value: "" },
  { label: "Fri", value: "fri" },
  { label: "Sat", value: "sat" },
  { label: "Sun", value: "sun" },
] as const;

export default function DayPills() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeDay = searchParams?.get("day") ?? "";

  const setDay = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value) {
        params.set("day", value);
      } else {
        params.delete("day");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  return (
    <div className="flex gap-2 overflow-x-auto px-5 py-3 no-scrollbar">
      {DAYS.map((d) => {
        const isActive = activeDay === d.value;
        return (
          <button
            key={d.value}
            onClick={() => setDay(d.value)}
            className={`shrink-0 rounded-pill px-4 py-1.5 text-body font-medium transition-colors ${
              isActive
                ? "bg-ink text-surface"
                : "border border-mute-divider bg-surface text-ink"
            }`}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}
