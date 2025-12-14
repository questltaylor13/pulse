"use client";

import { useState } from "react";
import Link from "next/link";
import { Category } from "@prisma/client";

const CATEGORY_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  FOOD: { emoji: "🍽️", label: "Food", color: "from-orange-400 to-orange-500" },
  LIVE_MUSIC: { emoji: "🎵", label: "Live Music", color: "from-pink-400 to-pink-500" },
  ART: { emoji: "🎨", label: "Art", color: "from-purple-400 to-purple-500" },
  BARS: { emoji: "🍸", label: "Bars", color: "from-amber-400 to-amber-500" },
  COFFEE: { emoji: "☕", label: "Coffee", color: "from-yellow-500 to-amber-500" },
  OUTDOORS: { emoji: "🏔️", label: "Outdoors", color: "from-green-400 to-green-500" },
  FITNESS: { emoji: "💪", label: "Fitness", color: "from-blue-400 to-blue-500" },
  POPUP: { emoji: "🎪", label: "Pop-ups", color: "from-indigo-400 to-indigo-500" },
  SEASONAL: { emoji: "🎄", label: "Seasonal", color: "from-red-400 to-red-500" },
  RESTAURANT: { emoji: "🍴", label: "Restaurants", color: "from-orange-400 to-orange-500" },
  ACTIVITY_VENUE: { emoji: "🎯", label: "Activities", color: "from-cyan-400 to-cyan-500" },
  OTHER: { emoji: "✨", label: "Other", color: "from-slate-400 to-slate-500" },
};

const NEIGHBORHOOD_INFO: Record<string, { vibe: string; icon: string }> = {
  "RiNo": { vibe: "Arts & Breweries", icon: "🎨" },
  "LoDo": { vibe: "Downtown & Nightlife", icon: "🌃" },
  "Capitol Hill": { vibe: "Diverse & Eclectic", icon: "🏳️‍🌈" },
  "Highlands": { vibe: "Trendy & Local", icon: "🍽️" },
  "LoHi": { vibe: "Hip & Upscale", icon: "✨" },
  "Five Points": { vibe: "Jazz & Culture", icon: "🎺" },
  "Cherry Creek": { vibe: "Shopping & Dining", icon: "🛍️" },
  "Wash Park": { vibe: "Active & Green", icon: "🏃" },
  "Baker": { vibe: "Vintage & Cafes", icon: "☕" },
  "Sloan's Lake": { vibe: "Lakeside Living", icon: "🏖️" },
  "Park Hill": { vibe: "Family & Community", icon: "🏡" },
  "Colfax": { vibe: "Eclectic & Iconic", icon: "🎭" },
};

interface ExploreSectionProps {
  categoryCounts: Record<string, number>;
  neighborhoodCounts: Record<string, number>;
}

export default function ExploreSection({
  categoryCounts,
  neighborhoodCounts,
}: ExploreSectionProps) {
  const [activeTab, setActiveTab] = useState<"categories" | "neighborhoods">("categories");

  const categoriesWithCounts = Object.entries(categoryCounts)
    .filter(([cat]) => CATEGORY_CONFIG[cat])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const neighborhoods = Object.entries(neighborhoodCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  if (categoriesWithCounts.length === 0 && neighborhoods.length === 0) {
    return null;
  }

  return (
    <section className="landing-section bg-white">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="landing-heading text-slate-900 mb-3">Explore Denver</h2>
          <p className="landing-subheading max-w-2xl mx-auto">
            Find exactly what you&apos;re looking for
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab("categories")}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "categories"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              By Category
            </button>
            <button
              onClick={() => setActiveTab("neighborhoods")}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "neighborhoods"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              By Neighborhood
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        {activeTab === "categories" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {categoriesWithCounts.map(([category, count]) => {
              const config = CATEGORY_CONFIG[category];
              return (
                <Link
                  key={category}
                  href={`/feed?category=${category}`}
                  className="group block"
                >
                  <div className="relative rounded-xl bg-slate-50 border border-slate-200 p-6 text-center transition hover:shadow-md hover:border-slate-300 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <div className="text-4xl mb-3">{config.emoji}</div>
                    <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-primary transition">
                      {config.label}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {count} {count === 1 ? "event" : "events"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Neighborhoods Grid */}
        {activeTab === "neighborhoods" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {neighborhoods.map(([neighborhood, count]) => {
              const info = NEIGHBORHOOD_INFO[neighborhood] || { vibe: "Local Gems", icon: "📍" };
              return (
                <Link
                  key={neighborhood}
                  href={`/feed?neighborhoods=${encodeURIComponent(neighborhood)}`}
                  className="group block bg-slate-50 rounded-xl p-5 border border-slate-200 hover:shadow-md hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{info.icon}</span>
                    <h3 className="font-semibold text-slate-900 group-hover:text-primary transition">
                      {neighborhood}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{info.vibe}</p>
                  <p className="text-xs text-primary font-medium">
                    {count} upcoming {count === 1 ? "event" : "events"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}

        {/* View all link */}
        <div className="mt-8 text-center">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            Browse all events
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
