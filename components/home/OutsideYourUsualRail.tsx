import Link from "next/link";
import type { ItemStatus } from "@prisma/client";
import ScrollSection from "./ScrollSection";
import EventCardCompact from "./EventCardCompact";
import PlaceCardCompact from "./PlaceCardCompact";
import type { OutsideUsualItem } from "@/lib/ranking/outside-usual";

// PRD 6 Phase 5 — "Outside your usual" horizontal-scroll rail.
//
// Lives on the events tab, between "Just added on Pulse" and "Outside
// the city." Cards carry a subtle "Stretch" pill so users know this
// section is intentional discovery, not algorithmic feed.

interface Props {
  items: OutsideUsualItem[];
  eventStatus: (id: string) => ItemStatus | null;
  placeStatus: (id: string) => ItemStatus | null;
}

export default function OutsideYourUsualRail({ items, eventStatus, placeStatus }: Props) {
  if (items.length === 0) return null;
  return (
    <ScrollSection
      title="Outside your usual"
      subtitle="Things we don't normally show you — curious?"
    >
      {items.map((item) => {
        if (item.kind === "event") {
          return (
            <StretchWrapper key={`e-${item.id}`}>
              <EventCardCompact
                event={item}
                variant="standard"
                feedbackStatus={eventStatus(item.id)}
              />
            </StretchWrapper>
          );
        }
        if (item.kind === "place") {
          return (
            <StretchWrapper key={`p-${item.id}`}>
              <PlaceCardCompact
                place={item}
                variant="standard"
                feedbackStatus={placeStatus(item.id)}
              />
            </StretchWrapper>
          );
        }
        // Discovery — no compact card component; inline minimal card.
        return (
          <StretchWrapper key={`d-${item.id}`}>
            <Link
              href={`/discoveries/${item.id}`}
              className="relative block shrink-0 snap-start"
              style={{ width: 220 }}
            >
              <article className="overflow-hidden rounded-card border border-mute-divider bg-surface">
                <div
                  className="flex w-full items-center justify-center bg-indigo-50 text-4xl"
                  style={{ height: 150 }}
                >
                  💎
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-medium text-ink">{item.title}</h3>
                  <p className="mt-1 text-xs text-mute">Hidden Denver gem</p>
                </div>
              </article>
            </Link>
          </StretchWrapper>
        );
      })}
    </ScrollSection>
  );
}

function StretchWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-pill bg-indigo-600/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
        Stretch
      </span>
    </div>
  );
}
