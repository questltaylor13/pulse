import Link from "next/link";
import type { PlaceCompact } from "@/lib/home/types";
import PlaceFilterChips from "./PlaceFilterChips";
import PlaceListCard from "./PlaceListCard";

interface Props {
  neighborhood: {
    name: string;
    slug: string;
    description: string;
    placeCount: number;
  };
  places: PlaceCompact[];
  activeCat: string;
}

export default function NeighborhoodDetailPage({
  neighborhood,
  places,
  activeCat,
}: Props) {
  const baseHref = `/places/neighborhood/${neighborhood.slug}`;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4">
      {/* Back + header */}
      <div className="mb-4">
        <Link
          href="/?tab=places"
          className="mb-2 inline-flex items-center gap-1 text-sm text-mute hover:text-ink"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0"
          >
            <path
              d="M10 12L6 8l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </Link>
        <h1 className="text-[20px] font-medium text-ink">
          {neighborhood.name}
        </h1>
        <p className="mt-0.5 text-sm text-mute">
          {neighborhood.placeCount}{" "}
          {neighborhood.placeCount === 1 ? "place" : "places"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          {neighborhood.description}
        </p>
      </div>

      {/* Filter chips */}
      <PlaceFilterChips activeCat={activeCat} baseHref={baseHref} />

      {/* Place list */}
      {places.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {places.map((place) => (
            <PlaceListCard key={place.id} place={place} />
          ))}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="text-sm text-mute">
            No places found for this filter.
          </p>
        </div>
      )}

      {/* View on map — deferred */}
      <button
        disabled
        className="fixed bottom-20 left-1/2 z-30 hidden -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-surface shadow-lg"
      >
        View on map
      </button>
    </div>
  );
}
