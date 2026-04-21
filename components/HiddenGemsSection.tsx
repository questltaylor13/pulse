"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Category, DiscoverySubtype, EventRegion } from "@prisma/client";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/lib/constants/categories";

// PRD 3 Phase 5 — horizontal Hidden Gems rail for cross-surfacing on the
// Events / Places / Home feeds. Links to /discoveries/[id], not /events.

interface HiddenGem {
  id: string;
  title: string;
  description: string;
  subtype: DiscoverySubtype;
  category: Category;
  neighborhood: string | null;
  townName: string | null;
  region: EventRegion;
  seasonHint: string | null;
  qualityScore: number;
  tags: string[];
}

const SUBTYPE_LABEL: Record<DiscoverySubtype, string> = {
  HIDDEN_GEM: "Spot",
  NICHE_ACTIVITY: "Club",
  SEASONAL_TIP: "Seasonal",
};

export default function HiddenGemsSection() {
  const [gems, setGems] = useState<HiddenGem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hidden-gems?limit=8")
      .then((res) => res.json())
      .then((data) => setGems(data.discoveries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Hidden Gems</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-72 h-40 rounded-xl bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (gems.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Hidden Gems</h2>
          <p className="text-sm text-slate-500">
            Curated spots and rituals the guidebooks miss
          </p>
        </div>
        <Link
          href="/discoveries"
          className="text-sm font-medium text-amber-700 hover:underline"
        >
          See all →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {gems.map((gem) => {
          const locationLine = [gem.neighborhood, gem.townName]
            .filter(Boolean)
            .join(" · ");
          return (
            <Link
              key={gem.id}
              href={`/discoveries/${gem.id}`}
              className="flex-shrink-0 w-72 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-amber-400 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  ✦ Hidden Gem
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  {SUBTYPE_LABEL[gem.subtype]}
                </span>
              </div>

              <h3 className="mt-3 font-semibold text-slate-900 text-sm line-clamp-2">
                {gem.title}
              </h3>
              <p className="mt-1 text-xs text-slate-600 line-clamp-3">
                {gem.description}
              </p>

              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${CATEGORY_COLORS[gem.category] ?? "bg-slate-100 text-slate-700"}`}
                >
                  {CATEGORY_EMOJI[gem.category]} {CATEGORY_LABELS[gem.category]}
                </span>
                {locationLine && (
                  <span className="text-slate-500 truncate">{locationLine}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
