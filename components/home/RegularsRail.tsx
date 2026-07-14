// Wave 6A — "On again this week".
//
// The weeklies you rated and loved, coming round again. This rail is the reason
// a rated series can safely leave the discovery pool: DONE means discovered, not
// never-again, and without somewhere to land, your favourite Tuesday would
// quietly disappear from the app the moment you told us you liked it.

import Link from "next/link";
import ScrollSection from "./ScrollSection";
import InitialThumb from "@/components/ui/InitialThumb";
import type { RegularItem } from "@/lib/home/regulars";

interface Props {
  items: RegularItem[];
}

export default function RegularsRail({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <ScrollSection
      title="On again this week"
      subtitle="Your regulars, coming round again"
    >
      {items.map((item) => (
        <RegularCard key={item.seriesId} item={item} />
      ))}
    </ScrollSection>
  );
}

function RegularCard({ item }: { item: RegularItem }) {
  return (
    <Link
      href={`/events/${item.eventId}`}
      className="w-56 flex-shrink-0 snap-start overflow-hidden rounded-card border border-mute-divider bg-surface transition hover:border-coral/40"
    >
      <InitialThumb
        src={item.imageUrl}
        title={item.title}
        className="h-28 w-full"
        initialClassName="text-2xl"
      />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-ink">
            {item.title}
          </h3>
          {/* Their rank is why this is on the rail at all — show it. */}
          <span className="flex-shrink-0 rounded-pill bg-coral/10 px-2 py-0.5 text-meta font-semibold text-coral">
            #{item.rank}
          </span>
        </div>
        <p className="mt-0.5 truncate text-meta text-mute">{item.venueName}</p>
        <p className="mt-1 truncate text-meta text-ink/60">
          {/* Prefer the source's own words ("Every Tuesday") over a derived date:
              a cadence tells you how to build it into your week, which a single
              date does not. */}
          {item.cadence ?? formatNext(item.startTime)}
        </p>
      </div>
    </Link>
  );
}

function formatNext(startTime: Date): string {
  return new Date(startTime).toLocaleDateString(undefined, {
    weekday: "long",
  });
}
