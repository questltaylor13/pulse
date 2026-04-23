import Link from "next/link";
import type { ItemStatus } from "@prisma/client";
import SaveButton from "./SaveButton";
import CardMoreMenu from "@/components/feedback/CardMoreMenu";
import FeedbackTag from "@/components/feedback/FeedbackTag";
import { EditorPickBadge, FreeBadge, TodayBadge, TrendingBadge } from "./Badges";
import {
  categoryLabel,
  eventSecondaryMeta,
  formatEventTime,
  startsAfterPM,
} from "@/lib/home/event-view";
import type { EventCompact } from "@/lib/home/types";

interface Props {
  event: EventCompact;
  variant?: "standard" | "wide";
  showTodayBadge?: boolean;
  feedbackStatus?: ItemStatus | null;
}

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=640&q=60";

export default function EventCardCompact({
  event,
  variant = "standard",
  showTodayBadge = false,
  feedbackStatus = null,
}: Props) {
  const isWide = variant === "wide";
  const href = `/events/${event.id}`;
  const imgHeight = isWide ? 180 : 150;
  const cardWidth = isWide ? 280 : 220;

  const pickBadge = event.isEditorsPick ? (
    <EditorPickBadge />
  ) : showTodayBadge && startsAfterPM(event.startTime) ? (
    <TodayBadge />
  ) : event.priceRange === "Free" || event.priceRange === "$0" ? (
    <FreeBadge />
  ) : null;

  return (
    <Link
      href={href}
      className="relative block shrink-0 snap-start"
      style={{ width: cardWidth }}
    >
      <article className="overflow-hidden rounded-card border border-mute-divider bg-surface">
        <div className="relative w-full bg-mute-hush" style={{ height: imgHeight }}>
          <img
            src={event.imageUrl || FALLBACK_IMG}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          {pickBadge}
          <SaveButton itemId={event.id} itemType="event" />
          <CardMoreMenu
            ref_={{ eventId: event.id }}
            itemTitle={event.title}
            shareUrl={`/events/${event.id}`}
            initialStatus={feedbackStatus}
          />
        </div>
        <div className="p-3">
          <p className="text-meta font-medium uppercase tracking-wide text-coral">
            {categoryLabel(event.category)}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-body font-medium text-ink">
            {event.title}
          </h3>
          <p className="mt-1 truncate text-[12px] text-mute">
            {formatEventTime(event.startTime, event.isRecurring)}
          </p>
          {eventSecondaryMeta(event) && (
            <p className="truncate text-[12px] text-mute">{eventSecondaryMeta(event)}</p>
          )}
          {feedbackStatus === "WANT" && (
            <div className="mt-2">
              <FeedbackTag status={feedbackStatus} />
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
