"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export type HomeTab = "events" | "places" | "guides";
const TABS: { value: HomeTab; label: string }[] = [
  { value: "events", label: "Events" },
  { value: "places", label: "Places" },
  { value: "guides", label: "Guides" },
];

interface Props {
  active: HomeTab;
}

export default function TopTabs({ active }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSelect(tab: HomeTab) {
    if (tab === active) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (tab === "events") params.delete("tab");
    else params.set("tab", tab);
    // Drop category when leaving Events tab.
    if (tab !== "events") params.delete("cat");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    });
  }

  return (
    <div
      role="tablist"
      aria-label="Home sections"
      className="flex h-12 items-stretch border-b border-mute-divider bg-surface"
    >
      {TABS.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.value}`}
            onClick={() => handleSelect(tab.value)}
            data-pending={isPending ? "" : undefined}
            className={`flex flex-1 items-center justify-center border-b-2 text-[15px] transition-colors ${
              isActive
                ? "border-ink font-medium text-ink"
                : "border-transparent font-normal text-mute hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
