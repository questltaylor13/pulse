"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Category } from "@prisma/client";
import { CATEGORY_EMOJI, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants/categories";
import { CATEGORY_PLACEHOLDER_IMAGE } from "@/lib/constants/placeholder-images";

interface NewItem {
  id: string;
  title: string;
  description: string;
  oneLiner: string | null;
  category: Category;
  venueName: string;
  address: string;
  priceRange: string;
  imageUrl: string | null;
  isRecurring: boolean;
  tags: string[];
}

export default function NewThisMonthSection() {
  const [items, setItems] = useState<NewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/new-this-month")
      .then((res) => res.json())
      .then((data) => setItems(data.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-[#FFF8F0] p-5">
        <h2 className="text-lg font-bold text-slate-900 mb-3">New This Month</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-72 h-40 rounded-xl bg-orange-100/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[#FFF8F0] p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">New This Month</h2>
        <p className="text-sm text-slate-500">Recently opened, just launched, or new to Denver</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {items.map((item) => {
          const isSeasonal = item.category === "SEASONAL" || item.tags.some(t => /seasonal/i.test(t));
          const badgeText = isSeasonal ? "Seasonal" : "Just Opened";
          const badgeEmoji = isSeasonal ? "\ud83c\udf31" : "\ud83c\udd95";

          return (
            <Link
              key={item.id}
              href={`/events/${item.id}`}
              className="flex-shrink-0 w-72 rounded-xl bg-white border border-orange-100 overflow-hidden transition hover:shadow-lg hover:border-orange-200 group"
            >
              {/* Image */}
              <div className="relative h-28 overflow-hidden">
                <Image
                  src={item.imageUrl || CATEGORY_PLACEHOLDER_IMAGE[item.category] || CATEGORY_PLACEHOLDER_IMAGE.OTHER}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute top-2 left-2">
                  <span className="bg-white/95 backdrop-blur-sm text-slate-800 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                    {badgeEmoji} {badgeText}
                  </span>
                </div>
                <div className="absolute bottom-2 right-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
                    {CATEGORY_EMOJI[item.category]} {CATEGORY_LABELS[item.category]}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{item.title}</h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                  {item.oneLiner || item.description}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400 truncate">{item.venueName}</span>
                  {item.priceRange && (
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{item.priceRange}</span>
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
