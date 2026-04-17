"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Category } from "@prisma/client";
import { CATEGORY_EMOJI, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants/categories";
import { CATEGORY_PLACEHOLDER_IMAGE } from "@/lib/constants/placeholder-images";

interface HiddenGem {
  id: string;
  title: string;
  description: string;
  oneLiner: string | null;
  category: Category;
  venueName: string;
  address: string;
  priceRange: string;
  imageUrl: string | null;
  noveltyScore: number | null;
  qualityScore: number | null;
  isRecurring: boolean;
  startTime: string;
  tags: string[];
}

export default function HiddenGemsSection() {
  const [gems, setGems] = useState<HiddenGem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hidden-gems")
      .then((res) => res.json())
      .then((data) => setGems(data.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Hidden Gems</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-72 h-44 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (gems.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Hidden Gems</h2>
          <p className="text-sm text-slate-500">Unique experiences you might not know about</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {gems.map((gem) => {
          const isFree = /free|\$0/i.test(gem.priceRange);

          return (
            <Link
              key={gem.id}
              href={`/events/${gem.id}`}
              className="flex-shrink-0 w-72 rounded-xl border border-slate-200 bg-white overflow-hidden transition hover:shadow-lg hover:border-primary/30 group"
            >
              {/* Image */}
              <div className="relative h-32 overflow-hidden">
                <Image
                  src={gem.imageUrl || CATEGORY_PLACEHOLDER_IMAGE[gem.category] || CATEGORY_PLACEHOLDER_IMAGE.OTHER}
                  alt={gem.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                {/* Badges overlay */}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  {(gem.noveltyScore ?? 0) >= 8 && (
                    <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      Hidden Gem
                    </span>
                  )}
                  {isFree && (
                    <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      Free
                    </span>
                  )}
                </div>
                {/* Category pill */}
                <div className="absolute bottom-2 left-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[gem.category]}`}>
                    {CATEGORY_EMOJI[gem.category]} {CATEGORY_LABELS[gem.category]}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{gem.title}</h3>
                <p className="text-xs text-primary mt-1 line-clamp-2">
                  {gem.oneLiner || gem.description}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500">{gem.venueName}</span>
                  {gem.priceRange && (
                    <span className="text-xs text-slate-400">{gem.priceRange}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
