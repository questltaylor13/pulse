"use client";

import Link from "next/link";
import Image from "next/image";
import { Category } from "@prisma/client";
import { toggleWant, toggleDone } from "@/lib/actions/lists";
import { setItemStatus, removeItemStatus } from "@/lib/actions/items";
import { useState } from "react";
import AddToGroupDropdown from "./AddToGroupDropdown";

interface ListItemCardProps {
  id: string;
  type: "EVENT" | "PLACE";
  sourceId: string;
  title: string;
  description: string;
  category: Category;
  venueName: string;
  address: string;
  neighborhood: string | null;
  startTime: Date | null;
  priceRange: string;
  imageUrl: string | null;
  status: "WANT" | "DONE";
  updatedAt: Date;
  onStatusChange?: () => void;
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

const CATEGORY_EMOJI: Record<Category, string> = {
  ART: "🎨",
  LIVE_MUSIC: "🎵",
  BARS: "🍸",
  FOOD: "🍽️",
  COFFEE: "☕",
  OUTDOORS: "🌲",
  FITNESS: "💪",
  SEASONAL: "🎄",
  POPUP: "🎪",
  OTHER: "✨",
  RESTAURANT: "🍽️",
  ACTIVITY_VENUE: "🎯",
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

export default function ListItemCard({
  id,
  type,
  sourceId,
  title,
  description,
  category,
  venueName,
  address,
  neighborhood,
  startTime,
  priceRange,
  imageUrl,
  status,
  updatedAt,
  onStatusChange,
}: ListItemCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<"WANT" | "DONE" | null>(status);

  const detailUrl = type === "EVENT" ? `/events/${sourceId}` : `/places/${sourceId}`;

  const handleToggleStatus = async (newStatus: "WANT" | "DONE") => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (type === "EVENT") {
        // Events use toggleWant/toggleDone from lists.ts
        if (newStatus === "WANT") {
          await toggleWant(sourceId);
        } else {
          await toggleDone(sourceId);
        }
      } else {
        // Places use setItemStatus/removeItemStatus from items.ts
        if (currentStatus === newStatus) {
          // Toggle off - remove status
          await removeItemStatus(sourceId);
        } else {
          // Set new status
          await setItemStatus(sourceId, newStatus);
        }
      }

      // If clicking the same status, it removes it; otherwise sets new status
      if (currentStatus === newStatus) {
        setCurrentStatus(null);
      } else {
        setCurrentStatus(newStatus);
      }

      onStatusChange?.();
    } catch (error) {
      console.error("Failed to toggle status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <article className="group rounded-xl border border-slate-200 bg-white overflow-hidden transition hover:shadow-lg hover:border-primary/50">
      {/* Image */}
      {imageUrl ? (
        <Link href={detailUrl} className="block">
          <div className="relative h-44 overflow-hidden">
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition group-hover:scale-105"
            />
            {/* Type badge on image */}
            <div className="absolute top-2 left-2">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                type === "EVENT" ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
              }`}>
                {type === "EVENT" ? "Event" : "Place"}
              </span>
            </div>
            {/* Status badge on image */}
            <div className="absolute top-2 right-2">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                status === "DONE" ? "bg-green-500 text-white" : "bg-amber-500 text-white"
              }`}>
                {status === "DONE" ? "Done" : "Saved"}
              </span>
            </div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        </Link>
      ) : (
        <Link href={detailUrl} className="block">
          <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
            <span className="text-6xl opacity-40">
              {CATEGORY_EMOJI[category]}
            </span>
            {/* Type badge */}
            <div className="absolute top-2 left-2">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                type === "EVENT" ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
              }`}>
                {type === "EVENT" ? "Event" : "Place"}
              </span>
            </div>
            {/* Status badge */}
            <div className="absolute top-2 right-2">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                status === "DONE" ? "bg-green-500 text-white" : "bg-amber-500 text-white"
              }`}>
                {status === "DONE" ? "Done" : "Saved"}
              </span>
            </div>
          </div>
        </Link>
      )}

      <div className="p-4">
        {/* Category & Neighborhood badges */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category]}`}>
            {CATEGORY_LABELS[category]}
          </span>
          {neighborhood && (
            <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {neighborhood}
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={detailUrl}>
          <h3 className="mb-2 text-lg font-semibold text-slate-900 line-clamp-2 hover:text-primary transition">
            {title}
          </h3>
        </Link>

        {/* Description */}
        {description && (
          <p className="mb-3 text-sm text-slate-600 line-clamp-2">{description}</p>
        )}

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
              </span>
            </div>
          )}

          {/* Venue */}
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

        {/* Completion date for Done items */}
        {status === "DONE" && (
          <div className="text-xs text-slate-400 mb-3">
            Completed {new Date(updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-slate-100 pt-3 mt-auto">
          <div className="flex items-center gap-2">
            {/* Want Button */}
            <button
              onClick={() => handleToggleStatus("WANT")}
              disabled={isLoading}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                currentStatus === "WANT"
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              } disabled:opacity-50`}
            >
              <svg className="h-4 w-4" fill={currentStatus === "WANT" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Want
            </button>

            {/* Done Button */}
            <button
              onClick={() => handleToggleStatus("DONE")}
              disabled={isLoading}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                currentStatus === "DONE"
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              } disabled:opacity-50`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Done
            </button>

            {/* Add to Group */}
            <AddToGroupDropdown
              itemId={sourceId}
              itemType={type === "EVENT" ? "event" : "place"}
            />

            {/* View Details Link */}
            <Link
              href={detailUrl}
              className="ml-auto flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-200 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
