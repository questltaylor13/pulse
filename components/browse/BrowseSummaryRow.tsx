"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

const SORT_OPTIONS = [
  { label: "Top picks", value: "top" },
  { label: "Soonest first", value: "soonest" },
  { label: "Price low to high", value: "price" },
  { label: "Distance", value: "distance" },
] as const;

interface Props {
  total: number;
  label?: string;
}

export default function BrowseSummaryRow({ total, label = "picks" }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentSort = searchParams?.get("sort") ?? "top";

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-body font-medium text-ink">
        {total} {label}
      </span>
      <select
        value={currentSort}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          if (e.target.value === "top") {
            params.delete("sort");
          } else {
            params.set("sort", e.target.value);
          }
          const qs = params.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname, {
            scroll: false,
          });
        }}
        className="rounded-pill border border-mute-divider bg-surface px-3 py-1 text-body text-ink"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
