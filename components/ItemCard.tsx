"use client";

import Link from "next/link";
import { Category, ItemType, ItemStatus } from "@prisma/client";
import ItemStatusButtons from "./ItemStatusButtons";
import AddToGroupDropdown from "./AddToGroupDropdown";

interface ItemCardProps {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  venueName: string;
  address: string;
  startTime: Date | string | null;
  endTime?: Date | string | null;
  priceRange: string;
  source: string;
  sourceUrl?: string | null;
  neighborhood?: string | null;
  hours?: string | null;
  imageUrl?: string | null;
  score?: number;
  reason?: string;
  status?: ItemStatus | null;
  onStatusChange?: (status: ItemStatus | null) => void;
}

const CATEGORY_COLORS: Record<Category, string> = {
  ART: "bg-purple-100 text-purple-700",
  LIVE_MUSIC: "bg-pink-100 text-pink-700",
  BARS: "bg-amber-100 text-amber-700",
  FOOD: "bg-orange-100 text-orange-700",
  COFFEE: "bg-yellow-100 text-yellow-700",
  OUTDOORS: "bg-green-100 text-green-700",
  FITNESS: "bg-blue-100 text-blue-700",
  SEASONAL: "bg-red-100 text-red-700",
  POPUP: "bg-indigo-100 text-indigo-700",
  OTHER: "bg-slate-100 text-slate-700",
  RESTAURANT: "bg-orange-100 text-orange-700",
  ACTIVITY_VENUE: "bg-cyan-100 text-cyan-700",
};

const CATEGORY_LABELS: Record<Category, string> = {
  ART: "Art",
  LIVE_MUSIC: "Live Music",
  BARS: "Bars",
  FOOD: "Food",
  COFFEE: "Coffee",
  OUTDOORS: "Outdoors",
  FITNESS: "Fitness",
  SEASONAL: "Seasonal",
  POPUP: "Pop-up",
  OTHER: "Other",
  RESTAURANT: "Restaurant",
  ACTIVITY_VENUE: "Activity",
};

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ItemCard({
  id,
  type,
  title,
  description,
  category,
  tags,
  venueName,
  address,
  startTime,
  endTime,
  priceRange,
  source,
  sourceUrl,
  neighborhood,
  hours,
  imageUrl,
  score,
  reason,
  status,
  onStatusChange,
}: ItemCardProps) {
  const detailUrl = type === "PLACE" ? `/places/${id}` : `/items/${id}`;

  return (
    <article className="group rounded-xl border border-slate-200 bg-white overflow-hidden transition hover:shadow-lg hover:border-primary">
      {/* Image */}
      {imageUrl ? (
        <Link href={detailUrl}>
          <div className="h-40 overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          </div>
        </Link>
      ) : (
        <Link href={detailUrl}>
          <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <span className="text-5xl text-slate-300">
              {category === "FOOD" || category === "RESTAURANT" ? "🍽️" :
               category === "COFFEE" ? "☕" :
               category === "BARS" ? "🍸" :
               category === "FITNESS" ? "💪" :
               category === "ART" ? "🎨" :
               category === "LIVE_MUSIC" ? "🎵" :
               category === "OUTDOORS" ? "🌲" :
               type === "PLACE" ? "📍" :
               "✨"}
            </span>
          </div>
        </Link>
      )}

      <div className="p-4">
        {/* Category & Type badges */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category]}`}
            >
              {CATEGORY_LABELS[category]}
            </span>
            {neighborhood && (
              <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {neighborhood}
              </span>
            )}
          </div>
          {score !== undefined && (
            <span className="text-xs text-slate-400">{score.toFixed(0)}%</span>
          )}
        </div>

        {/* Reason for recommendation */}
        {reason && (
          <div className="mb-2 text-xs text-primary font-medium">{reason}</div>
        )}

        {/* Title */}
        <Link href={detailUrl}>
          <h3 className="mb-2 text-base font-semibold text-slate-900 line-clamp-2 hover:text-primary transition">
            {title}
          </h3>
        </Link>

        {/* Description */}
        <p className="mb-3 text-sm text-slate-600 line-clamp-2">{description}</p>

        {/* Details */}
        <div className="mb-3 space-y-1.5 text-sm text-slate-500">
          {/* Date/Time for events */}
          {type === "EVENT" && startTime && (
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>
                {formatDate(startTime)} at {formatTime(startTime)}
                {endTime && ` - ${formatTime(endTime)}`}
              </span>
            </div>
          )}

          {/* Hours for places */}
          {type === "PLACE" && hours && (
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{hours}</span>
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="line-clamp-1">{venueName}</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{priceRange}</span>
          </div>
        </div>

        {/* Source */}
        <div className="text-xs text-slate-400">
          via{" "}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline"
            >
              {source}
            </a>
          ) : (
            source
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 pt-3 mt-3">
          <div className="flex items-center justify-between gap-2">
            <ItemStatusButtons
              itemId={id}
              initialStatus={status || null}
              onStatusChange={onStatusChange}
              size="sm"
            />
            <AddToGroupDropdown
              itemId={id}
              itemType={type === "PLACE" ? "place" : "event"}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
