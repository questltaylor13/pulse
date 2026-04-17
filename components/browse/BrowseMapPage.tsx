"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BrowseConfig } from "@/lib/browse/browse-configs";
import type { BrowseItem } from "@/lib/browse/fetch-browse";
import MapView from "@/components/map/MapView";
import MapPinPopup from "@/components/map/MapPinPopup";
import FilterChipRow from "./FilterChipRow";

interface Props {
  config: BrowseConfig;
  items: BrowseItem[];
}

export default function BrowseMapPage({ config, items }: Props) {
  const pathname = usePathname();
  const [selectedItem, setSelectedItem] = useState<BrowseItem | null>(null);

  // List view URL: strip /map from the end
  const listHref = pathname.replace(/\/map$/, "");

  return (
    <div className="fixed inset-0 z-0 flex flex-col">
      {/* Map fills viewport */}
      <div className="relative flex-1">
        <MapView
          items={items}
          onSelectItem={setSelectedItem}
          selectedId={selectedItem?.id}
        />

        {/* Overlaid controls */}
        <div className="absolute inset-x-0 top-0 z-10">
          {/* Back + List view row */}
          <div className="flex items-center justify-between px-4 pt-safe-top">
            <Link
              href={listHref}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-md"
              aria-label="Back to list"
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            <Link
              href={listHref}
              className="flex items-center gap-1.5 rounded-pill bg-surface px-3 py-2 text-body font-medium text-ink shadow-md"
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
              List view
            </Link>
          </div>

          {/* Filter chips */}
          <div className="mt-2">
            <FilterChipRow />
          </div>
        </div>
      </div>

      {/* Selected item popup */}
      {selectedItem && (
        <MapPinPopup item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
