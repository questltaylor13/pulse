"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { OCCASION_TAGS, OCCASION_LABELS } from "@/lib/constants/occasion-tags";

const PILLS: { value: string; label: string }[] = [
  { value: "all", label: "All guides" },
  ...OCCASION_TAGS.map((t) => ({ value: t, label: OCCASION_LABELS[t] })),
];

export default function OccasionPillRail({ active }: { active: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value === "all") {
      params.delete("occasion");
    } else {
      params.set("occasion", value);
    }
    // preserve tab
    if (!params.has("tab")) params.set("tab", "guides");
    router.replace(`/?${params.toString()}`, { scroll: false });
  }

  return (
    <div
      className="flex gap-2 overflow-x-auto px-5 py-2.5 no-scrollbar"
      role="listbox"
      aria-label="Filter guides by occasion"
    >
      {PILLS.map((pill) => {
        const isActive = pill.value === active;
        return (
          <button
            key={pill.value}
            role="option"
            aria-selected={isActive}
            onClick={() => select(pill.value)}
            className={`shrink-0 rounded-pill px-3.5 py-1.5 text-[13px] leading-[22px] font-medium transition ${
              isActive
                ? "bg-ink text-surface"
                : "border border-mute-divider bg-surface text-ink"
            }`}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
