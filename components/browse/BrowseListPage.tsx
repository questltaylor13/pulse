"use client";

import { useMemo } from "react";
import type { BrowseConfig } from "@/lib/browse/browse-configs";
import type { BrowseItem } from "@/lib/browse/fetch-browse";
import SubHeader from "./SubHeader";
import DayPills from "./DayPills";
import FilterChipRow from "./FilterChipRow";
import BrowseSummaryRow from "./BrowseSummaryRow";
import ListCard from "./ListCard";
import DayGroupLabel from "./DayGroupLabel";
import FloatingMapButton from "./FloatingMapButton";

interface Props {
  config: BrowseConfig;
  items: BrowseItem[];
  total: number;
}

function formatWeekendSubtitle(): string {
  const now = new Date();
  // Find next Friday
  const day = now.getDay();
  const daysUntilFri = (5 - day + 7) % 7 || 7;
  const fri = new Date(now);
  fri.setDate(now.getDate() + (day <= 5 ? daysUntilFri : 0));
  if (day >= 5 && day <= 0) {
    fri.setDate(now.getDate());
  }
  const sun = new Date(fri);
  sun.setDate(fri.getDate() + 2);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${fmt(fri)} – ${fmt(sun)}`;
}

function groupByDay(items: BrowseItem[]): Map<string, BrowseItem[]> {
  const groups = new Map<string, BrowseItem[]>();
  for (const item of items) {
    const key = item.startTime
      ? new Date(item.startTime).toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }).toUpperCase()
      : "UNDATED";
    const arr = groups.get(key) ?? [];
    arr.push(item);
    groups.set(key, arr);
  }
  return groups;
}

export default function BrowseListPage({ config, items, total }: Props) {
  const isEventSource = config.source === "events";
  const showMap = config.source !== "guides";

  const subtitle = useMemo(() => {
    if (config.subtitle) return config.subtitle;
    if (isEventSource) return formatWeekendSubtitle();
    return undefined;
  }, [config.subtitle, isEventSource]);

  const grouped = useMemo(() => {
    if (!isEventSource) return null;
    return groupByDay(items);
  }, [items, isEventSource]);

  return (
    <div className="min-h-screen bg-surface pb-32">
      <SubHeader title={config.title} subtitle={subtitle} />

      {isEventSource && <DayPills />}

      <FilterChipRow />

      <BrowseSummaryRow total={total} />

      {/* Item list */}
      <div>
        {grouped ? (
          // Grouped by day for events
          Array.from(grouped.entries()).map(([dayLabel, dayItems]) => (
            <div key={dayLabel}>
              <DayGroupLabel label={dayLabel} />
              {dayItems.map((item) => (
                <ListCard key={item.id} item={item} />
              ))}
            </div>
          ))
        ) : (
          // Flat list for places/guides
          items.map((item) => (
            <ListCard key={item.id} item={item} />
          ))
        )}

        {items.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-title font-medium text-ink">No results</p>
            <p className="mt-1 text-body text-mute">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>

      {showMap && <FloatingMapButton />}
    </div>
  );
}
