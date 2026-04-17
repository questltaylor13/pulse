"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  AllIcon,
  ArtIcon,
  BarsIcon,
  CoffeeIcon,
  ComedyIcon,
  FoodIcon,
  MusicIcon,
  NightlifeIcon,
  OffbeatIcon,
  OutdoorsIcon,
  PopupIcon,
  WeirdIcon,
} from "@/components/icons";
import {
  RAIL_CATEGORIES,
  RAIL_LABELS,
  type RailCategory,
} from "@/lib/home/category-filters";
import {
  PLACES_RAIL_CATEGORIES,
  PLACES_RAIL_LABELS,
  type PlacesRailCategory,
} from "@/lib/home/places-rail-filters";

type IconComponent = (props: { size?: number; className?: string }) => JSX.Element;

const EVENT_RAIL_ICONS: Record<RailCategory, IconComponent> = {
  all: AllIcon,
  music: MusicIcon,
  food: FoodIcon,
  weird: WeirdIcon,
  offbeat: OffbeatIcon,
  art: ArtIcon,
  outdoors: OutdoorsIcon,
  comedy: ComedyIcon,
  popup: PopupIcon,
};

const PLACES_RAIL_ICONS: Record<PlacesRailCategory, IconComponent> = {
  all: AllIcon,
  restaurants: FoodIcon,
  bars: BarsIcon,
  coffee: CoffeeIcon,
  outdoors: OutdoorsIcon,
  venues: ArtIcon,
  nightlife: NightlifeIcon,
};

interface Props {
  active: string;
  railSet?: "events" | "places";
}

export default function CategoryRail({ active, railSet = "events" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const categories = railSet === "places"
    ? (PLACES_RAIL_CATEGORIES as readonly string[])
    : (RAIL_CATEGORIES as readonly string[]);
  const labels = railSet === "places" ? PLACES_RAIL_LABELS : RAIL_LABELS;
  const icons = railSet === "places" ? PLACES_RAIL_ICONS : EVENT_RAIL_ICONS;

  function select(cat: string) {
    if (cat === active) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (cat === "all") params.delete("cat");
    else params.set("cat", cat);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    });
  }

  const ariaLabel = railSet === "places" ? "Place categories" : "Event categories";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex overflow-x-auto bg-surface no-scrollbar"
    >
      {categories.map((cat) => {
        const Icon = (icons as Record<string, IconComponent>)[cat];
        const isActive = cat === active;
        const label = (labels as Record<string, string>)[cat];
        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isActive}
            aria-pressed={isActive}
            aria-label={label}
            onClick={() => select(cat)}
            data-pending={isPending ? "" : undefined}
            className={`flex min-w-[72px] flex-col items-center justify-center gap-1 border-b-2 px-3 pb-2 pt-3 transition-colors ${
              isActive
                ? "border-ink text-ink"
                : "border-transparent text-mute hover:text-ink"
            }`}
          >
            <Icon size={22} className="shrink-0" />
            <span className="text-meta font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
