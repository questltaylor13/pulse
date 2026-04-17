import Link from "next/link";
import Image from "next/image";
import type { PlaceCompact } from "@/lib/home/types";
import { categoryLabel } from "@/lib/home/event-view";
import { CATEGORY_COLORS } from "@/lib/constants/categories";

interface Props {
  place: PlaceCompact;
}

export default function PlaceListCard({ place }: Props) {
  const colorClass = place.category
    ? CATEGORY_COLORS[place.category]
    : "bg-slate-100 text-slate-700";

  const meta: string[] = [];
  if (place.neighborhood) meta.push(place.neighborhood);
  if (place.priceLevel !== null && place.priceLevel > 0)
    meta.push("$".repeat(place.priceLevel));

  const vibes = (place.vibeTags ?? []).slice(0, 2).join(" · ");

  return (
    <Link
      href={`/places/${place.id}`}
      className="flex gap-3 rounded-[12px] bg-surface p-2 transition hover:bg-surface-raised"
    >
      {/* Thumbnail */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[12px] bg-mute-divider">
        {place.imageUrl ? (
          <Image
            src={place.imageUrl}
            alt={place.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-mute">
            ?
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        {/* Category label */}
        <span
          className={`inline-block w-fit rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase leading-none ${colorClass}`}
        >
          {categoryLabel(place.category)}
        </span>

        {/* Title */}
        <h3 className="truncate text-[15px] font-medium text-ink">
          {place.name}
        </h3>

        {/* Meta line 1 */}
        {meta.length > 0 && (
          <p className="truncate text-[12px] text-mute">{meta.join(" · ")}</p>
        )}

        {/* Meta line 2: vibes */}
        {vibes && (
          <p className="truncate text-[12px] text-mute">{vibes}</p>
        )}
      </div>
    </Link>
  );
}
