"use client";

import { useState } from "react";
import BrandHeader from "./BrandHeader";
import SearchBar from "./SearchBar";
import TopTabs, { type HomeTab } from "./TopTabs";
import CategoryRail from "./CategoryRail";
import OccasionPillRail from "./OccasionPillRail";
import SearchOverlay from "./SearchOverlay";
import type { RailCategory } from "@/lib/home/category-filters";
import type { PlacesRailCategory } from "@/lib/home/places-rail-filters";
import type { EventCompact, PlaceCompact } from "@/lib/home/types";

interface Props {
  tab: HomeTab;
  category: RailCategory | PlacesRailCategory;
  occasion?: string;
  /** @deprecated No longer used — search overlay fetches from API now */
  searchableEvents?: EventCompact[];
  /** @deprecated No longer used — search overlay fetches from API now */
  searchablePlaces?: PlaceCompact[];
}

export default function StickyChrome({
  tab,
  category,
  occasion = "all",
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);

  const placeholder =
    tab === "places"
      ? "Search places in Denver"
      : tab === "guides"
        ? "What kind of plan are you looking for?"
        : "What are you in the mood for?";

  return (
    <>
      <div className="sticky top-0 z-chromeHeader bg-surface">
        <BrandHeader />
      </div>
      <div className="sticky top-12 z-chromeSearch bg-surface">
        <SearchBar placeholder={placeholder} onOpen={() => setSearchOpen(true)} />
      </div>
      <div className="sticky top-[104px] z-chromeTabs bg-surface">
        <TopTabs active={tab} />
      </div>
      {(tab === "events" || tab === "places") && (
        <div className="sticky top-[152px] z-chromeRail bg-surface">
          <CategoryRail
            active={category}
            railSet={tab === "places" ? "places" : "events"}
          />
        </div>
      )}
      {tab === "guides" && (
        <div className="sticky top-[152px] z-chromeRail bg-surface">
          <OccasionPillRail active={occasion} />
        </div>
      )}
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
