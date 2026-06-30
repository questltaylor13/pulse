"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export type HomeTab = "foryou" | "events" | "places" | "guides";

const TAB_LABELS: Record<HomeTab, string> = {
  foryou: "For You",
  events: "Events",
  places: "Places",
  guides: "Guides",
};

const DEFAULT_TABS: HomeTab[] = ["events", "places", "guides"];

interface Props {
  active: HomeTab;
  /** Visible tabs, in order. Defaults to Events/Places/Guides. */
  tabs?: HomeTab[];
  /** The tab that maps to no `?tab=` param. Defaults to "events". */
  defaultTab?: HomeTab;
}

export default function TopTabs({ active, tabs = DEFAULT_TABS, defaultTab = "events" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSelect(tab: HomeTab) {
    if (tab === active) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (tab === defaultTab) params.delete("tab");
    else params.set("tab", tab);
    // Drop Events-only params when leaving the Events tab.
    if (tab !== "events") {
      params.delete("cat");
      params.delete("date");
    }
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
      {tabs.map((value) => {
        const isActive = value === active;
        return (
          <button
            key={value}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${value}`}
            onClick={() => handleSelect(value)}
            data-pending={isPending ? "" : undefined}
            className={`flex flex-1 items-center justify-center border-b-2 text-[15px] transition-colors ${
              isActive
                ? "border-coral font-medium text-coral"
                : "border-transparent font-normal text-mute hover:text-ink"
            }`}
          >
            {TAB_LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}
