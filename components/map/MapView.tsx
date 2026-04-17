"use client";

import { useRef, useState, useCallback } from "react";
import type { BrowseItem } from "@/lib/browse/fetch-browse";
import { CATEGORY_COLORS } from "@/lib/constants/categories";

// Category to hex color for markers
const MARKER_COLORS: Record<string, string> = {
  ART: "#7c3aed",
  LIVE_MUSIC: "#db2777",
  BARS: "#d97706",
  FOOD: "#ea580c",
  COFFEE: "#ca8a04",
  OUTDOORS: "#16a34a",
  FITNESS: "#2563eb",
  SEASONAL: "#dc2626",
  POPUP: "#4f46e5",
  OTHER: "#64748b",
  RESTAURANT: "#ea580c",
  ACTIVITY_VENUE: "#0891b2",
  COMEDY: "#e11d48",
  SOCIAL: "#0d9488",
  WELLNESS: "#059669",
};

interface Props {
  items: BrowseItem[];
  onSelectItem: (item: BrowseItem) => void;
  selectedId?: string;
}

// Dynamically imported Mapbox wrapper
function MapboxMap({ items, onSelectItem, selectedId }: Props) {
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [MapGL, setMapGL] = useState<any>(null);

  // Dynamic import on mount
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || MapGL) return;
      import("react-map-gl/mapbox").then((mod) => {
        setMapGL(mod);
        setMapLoaded(true);
      });
    },
    [MapGL],
  );

  if (!MapGL) {
    return (
      <div ref={containerRef} className="flex h-full w-full items-center justify-center bg-mute-hush">
        <p className="text-body text-mute">Loading map...</p>
      </div>
    );
  }

  const { Map: ReactMap, Marker, NavigationControl } = MapGL;

  return (
    <ReactMap
      ref={mapRef}
      initialViewState={{
        longitude: -104.9903,
        latitude: 39.7392,
        zoom: 12,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
    >
      <NavigationControl position="top-right" />
      {items
        .filter((item) => item.lat != null && item.lng != null)
        .map((item) => {
          const color = item.category
            ? MARKER_COLORS[item.category] ?? "#64748b"
            : "#64748b";
          const isSelected = item.id === selectedId;
          return (
            <Marker
              key={item.id}
              longitude={item.lng!}
              latitude={item.lat!}
              anchor="bottom"
              onClick={(e: any) => {
                e.originalEvent?.stopPropagation();
                onSelectItem(item);
              }}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface shadow-md transition-transform ${
                  isSelected ? "scale-125" : ""
                }`}
                style={{ backgroundColor: color }}
              >
                <div className="h-2 w-2 rounded-full bg-surface" />
              </div>
            </Marker>
          );
        })}
    </ReactMap>
  );
}

export default function MapView(props: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-mute-hush">
        <div className="text-center">
          <svg
            width={32}
            height={32}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            className="mx-auto mb-2 text-mute-soft"
          >
            <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
            <path d="M8 2v16" />
            <path d="M16 6v16" />
          </svg>
          <p className="text-body font-medium text-ink">Map not configured</p>
          <p className="mt-1 text-meta text-mute">
            Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the map
          </p>
        </div>
      </div>
    );
  }

  return <MapboxMap {...props} />;
}
