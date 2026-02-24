"use client";

import { useState, useCallback } from "react";
import { Compass } from "lucide-react";
import { RADIUS_OPTIONS, DEFAULT_RADIUS_MILES } from "@/lib/geo";
import FromListsTab from "./FromListsTab";
import DiscoverTab from "./DiscoverTab";
import type { NearbyListGroup, NearbyDiscoveryItem } from "@/lib/proximity";

type Tab = "lists" | "discover";

interface NearbySectionProps {
  lat: number;
  lng: number;
  initialListGroups: NearbyListGroup[];
  initialDiscoveryItems: NearbyDiscoveryItem[];
}

export default function NearbySection({
  lat,
  lng,
  initialListGroups,
  initialDiscoveryItems,
}: NearbySectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("lists");
  const [radius, setRadius] = useState(DEFAULT_RADIUS_MILES);
  const [listGroups, setListGroups] = useState(initialListGroups);
  const [discoveryItems, setDiscoveryItems] = useState(initialDiscoveryItems);
  const [discoverType, setDiscoverType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(
    async (newRadius: number, newType: string | null) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
          radius: newRadius.toString(),
        });

        const [listsRes, discoverRes] = await Promise.all([
          fetch(`/api/nearby/lists?${params}`),
          fetch(
            `/api/nearby/discover?${params}${newType ? `&type=${newType}` : ""}`
          ),
        ]);

        if (listsRes.ok) {
          const data = await listsRes.json();
          setListGroups(data.groups || []);
        }
        if (discoverRes.ok) {
          const data = await discoverRes.json();
          setDiscoveryItems(data.items || []);
        }
      } catch {
        // Keep existing data on error
      } finally {
        setLoading(false);
      }
    },
    [lat, lng]
  );

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    refetch(newRadius, discoverType);
  };

  const handleTypeChange = (type: string | null) => {
    setDiscoverType(type);
    refetch(radius, type);
  };

  // Don't render if there's nothing to show and no initial data
  if (
    initialListGroups.length === 0 &&
    initialDiscoveryItems.length === 0 &&
    !loading
  ) {
    // Still render the section but with a compact state so users can adjust radius
  }

  return (
    <section className="bg-slate-50 rounded-2xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Compass className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-slate-900">Plan Around This</h3>
      </div>

      {/* Tab toggle + Radius selector */}
      <div className="flex items-center justify-between mb-4 gap-3">
        {/* Tabs */}
        <div className="flex rounded-lg bg-white border border-slate-200 p-0.5">
          <button
            onClick={() => setActiveTab("lists")}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition ${
              activeTab === "lists"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            From Your Lists
          </button>
          <button
            onClick={() => setActiveTab("discover")}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition ${
              activeTab === "discover"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Discover Nearby
          </button>
        </div>

        {/* Radius pills */}
        <div className="flex gap-1">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRadiusChange(opt.value)}
              className={`text-[11px] font-medium px-2 py-1 rounded-full transition ${
                radius === opt.value
                  ? "bg-primary text-white"
                  : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Tab content */}
      {!loading && (
        <>
          {activeTab === "lists" && (
            <FromListsTab groups={listGroups} radiusMiles={radius} />
          )}
          {activeTab === "discover" && (
            <DiscoverTab
              items={discoveryItems}
              radiusMiles={radius}
              onTypeChange={handleTypeChange}
              activeType={discoverType}
            />
          )}
        </>
      )}
    </section>
  );
}
