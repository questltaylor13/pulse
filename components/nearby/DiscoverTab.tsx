"use client";

import { useState } from "react";
import { Star, MapPin, Bookmark, CalendarPlus } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import AddToPlanModal from "./AddToPlanModal";
import SaveToListModal from "./SaveToListModal";
import type { NearbyDiscoveryItem } from "@/lib/proximity";

interface DiscoverTabProps {
  items: NearbyDiscoveryItem[];
  radiusMiles: number;
  onTypeChange: (type: string | null) => void;
  activeType: string | null;
}

const TYPE_FILTERS = [
  { value: null, label: "All" },
  { value: "restaurant", label: "Restaurants" },
  { value: "bar", label: "Bars" },
  { value: "cafe", label: "Coffee" },
  { value: "tourist_attraction", label: "Activities" },
];

function PriceDots({ level }: { level: number }) {
  return (
    <span className="text-xs text-slate-500">
      {"$".repeat(level)}
      <span className="text-slate-300">{"$".repeat(4 - level)}</span>
    </span>
  );
}

export default function DiscoverTab({
  items,
  radiusMiles,
  onTypeChange,
  activeType,
}: DiscoverTabProps) {
  const [planModal, setPlanModal] = useState<{
    placeId: string | null;
    name: string;
  } | null>(null);
  const [saveModal, setSaveModal] = useState<{
    placeId: string;
    name: string;
  } | null>(null);

  if (items.length === 0) {
    return (
      <div>
        {/* Type filters */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value ?? "all"}
              onClick={() => onTypeChange(filter.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition ${
                activeType === filter.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="py-8 text-center">
          <p className="text-sm text-slate-400">
            No new spots found within {radiusMiles} mi
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Type filters */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.value ?? "all"}
            onClick={() => onTypeChange(filter.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition ${
              activeType === filter.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Horizontal scroll cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
        {items.map((item) => (
          <div
            key={item.googlePlaceId}
            className="flex-shrink-0 w-56 snap-start rounded-xl border border-slate-100 bg-white overflow-hidden hover:shadow-sm transition-shadow"
          >
            {/* Card header */}
            <div className="p-3">
              <div className="flex items-start justify-between gap-1">
                <h4 className="font-medium text-sm text-slate-900 line-clamp-2 leading-tight">
                  {item.name}
                </h4>
                {item.isNew && (
                  <span className="flex-shrink-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                    New!
                  </span>
                )}
              </div>

              {/* Distance + Neighborhood */}
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span>{formatDistance(item.distance)}</span>
                {item.neighborhood && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="truncate">{item.neighborhood}</span>
                  </>
                )}
              </div>

              {/* Rating & Price */}
              <div className="flex items-center gap-2.5 mt-1.5">
                {item.rating && (
                  <span className="flex items-center gap-0.5 text-xs">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-slate-700">
                      {item.rating.toFixed(1)}
                    </span>
                  </span>
                )}
                {item.priceLevel && <PriceDots level={item.priceLevel} />}
              </div>

              {/* Type chips */}
              {item.types.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {item.types.slice(0, 2).map((type) => (
                    <span
                      key={type}
                      className="inline-block rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500"
                    >
                      {type.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex border-t border-slate-100">
              <button
                onClick={() =>
                  setSaveModal({
                    placeId: item.pulseId || item.googlePlaceId,
                    name: item.name,
                  })
                }
                className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save
              </button>
              <div className="w-px bg-slate-100" />
              <button
                onClick={() =>
                  setPlanModal({
                    placeId: item.pulseId || null,
                    name: item.name,
                  })
                }
                className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-primary hover:bg-blue-50 transition"
                disabled={!item.pulseId}
                title={item.pulseId ? undefined : "Only saved places can be added to plans"}
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                Plan
              </button>
            </div>
          </div>
        ))}
      </div>

      <AddToPlanModal
        isOpen={!!planModal}
        onClose={() => setPlanModal(null)}
        placeId={planModal?.placeId}
        itemName={planModal?.name || ""}
      />

      <SaveToListModal
        isOpen={!!saveModal}
        onClose={() => setSaveModal(null)}
        placeId={saveModal?.placeId || ""}
        itemName={saveModal?.name || ""}
      />
    </div>
  );
}
