import Link from "next/link";
import SaveButton from "./SaveButton";
import VibeTagPill from "./VibeTagPill";
import { JustOpenedBadge } from "./Badges";
import { categoryLabel, daysSince, placeSecondaryMeta } from "@/lib/home/event-view";
import type { PlaceCompact } from "@/lib/home/types";

interface Props {
  place: PlaceCompact;
  variant?: "standard" | "wide";
}

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=640&q=60";

export default function PlaceCardCompact({ place, variant = "standard" }: Props) {
  const isWide = variant === "wide";
  const href = `/places/${place.id}`;
  const imgHeight = isWide ? 180 : 150;
  const cardWidth = isWide ? 280 : 220;

  const age = daysSince(place.openedDate);
  const showJustOpened = place.isNew && (age === null || age <= 14);

  return (
    <Link
      href={href}
      className="relative block shrink-0 snap-start"
      style={{ width: cardWidth }}
    >
      <article className="overflow-hidden rounded-card border border-mute-divider bg-surface">
        <div className="relative w-full bg-mute-hush" style={{ height: imgHeight }}>
          <img
            src={place.imageUrl || FALLBACK_IMG}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          {showJustOpened && <JustOpenedBadge />}
          <SaveButton itemId={place.id} itemType="place" />
        </div>
        <div className="p-3">
          <p className="text-meta font-medium uppercase tracking-wide text-coral">
            {categoryLabel(place.category)}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-body font-medium text-ink">
            {place.name}
          </h3>
          {placeSecondaryMeta(place) && (
            <p className="mt-1 truncate text-[12px] text-mute">
              {placeSecondaryMeta(place)}
            </p>
          )}
          <VibeTagPill tags={place.vibeTags} />
        </div>
      </article>
    </Link>
  );
}
