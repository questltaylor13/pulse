"use client";

import Link from "next/link";
import { MapPin, Star, Clock } from "lucide-react";
import { formatDistance } from "@/lib/geo";

interface NearbyItemCardProps {
  name: string;
  address: string;
  neighborhood: string | null;
  distance: number;
  googleRating: number | null;
  googleReviewCount: number | null;
  priceLevel: number | null;
  priceRange: string | null;
  imageUrl: string | null;
  category: string | null;
  vibeTags: string[];
  isNew: boolean;
  notes: string | null;
  href: string;
  actions?: React.ReactNode;
}

function PriceDots({ level }: { level: number }) {
  return (
    <span className="text-sm text-slate-500">
      {"$".repeat(level)}
      <span className="text-slate-300">{"$".repeat(4 - level)}</span>
    </span>
  );
}

export default function NearbyItemCard({
  name,
  address,
  neighborhood,
  distance,
  googleRating,
  googleReviewCount,
  priceLevel,
  priceRange,
  imageUrl,
  category,
  vibeTags,
  isNew,
  notes,
  href,
  actions,
}: NearbyItemCardProps) {
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:shadow-sm transition-shadow">
      {/* Image / Placeholder */}
      <Link href={href} className="flex-shrink-0">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <MapPin className="w-6 h-6 text-slate-300" />
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={href} className="min-w-0">
            <h4 className="font-medium text-slate-900 text-sm truncate hover:text-primary transition">
              {name}
            </h4>
          </Link>

          {/* Badges */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isNew && (
              <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                New
              </span>
            )}
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {formatDistance(distance)}
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
          {category && <span>{category}</span>}
          {neighborhood && (
            <>
              {category && <span className="text-slate-300">·</span>}
              <span>{neighborhood}</span>
            </>
          )}
        </div>

        {/* Rating & Price */}
        <div className="flex items-center gap-3 mt-1 text-xs">
          {googleRating && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="font-medium text-slate-700">
                {googleRating.toFixed(1)}
              </span>
              {googleReviewCount && (
                <span className="text-slate-400">
                  ({googleReviewCount.toLocaleString()})
                </span>
              )}
            </span>
          )}
          {priceLevel && <PriceDots level={priceLevel} />}
          {priceRange && !priceLevel && (
            <span className="text-slate-500">{priceRange}</span>
          )}
        </div>

        {/* Vibe tags */}
        {vibeTags.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {vibeTags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* User notes */}
        {notes && (
          <p className="mt-1 text-xs text-slate-400 italic truncate">
            "{notes}"
          </p>
        )}

        {/* Actions */}
        {actions && <div className="mt-2">{actions}</div>}
      </div>
    </div>
  );
}
