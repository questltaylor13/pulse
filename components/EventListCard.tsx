"use client";

import { useState } from "react";
import Link from "next/link";
import { Category, EventListStatus } from "@prisma/client";
import { toggleWant, toggleDone } from "@/lib/actions/lists";

interface EventListCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    category: Category;
    venueName: string;
    address: string;
    startTime: Date;
    priceRange: string;
  };
  status: EventListStatus;
  onStatusChange?: (newStatus: EventListStatus | null) => void;
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

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventListCard({
  event,
  status,
  onStatusChange,
}: EventListCardProps) {
  const [currentStatus, setCurrentStatus] = useState<EventListStatus | null>(status);
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkDone = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await toggleDone(event.id);
      const newStatus = result.status as EventListStatus | null;
      setCurrentStatus(newStatus);
      onStatusChange?.(newStatus);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (currentStatus === "WANT") {
        await toggleWant(event.id);
      } else {
        await toggleDone(event.id);
      }
      setCurrentStatus(null);
      onStatusChange?.(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStatus === null) {
    return null; // Hidden after removal
  }

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex items-center gap-4 rounded-lg border border-slate-200 p-4 transition hover:border-primary hover:shadow-md"
    >
      <div className="flex-1 min-w-0">
        {/* Category badge */}
        <span
          className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[event.category]}`}
        >
          {CATEGORY_LABELS[event.category]}
        </span>

        {/* Title */}
        <h3 className="mb-1 font-semibold text-slate-900 line-clamp-1 group-hover:text-primary">
          {event.title}
        </h3>

        {/* Details */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {formatDate(event.startTime)} at {formatTime(event.startTime)}
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
            {event.venueName}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {currentStatus === "WANT" && (
          <button
            onClick={handleMarkDone}
            disabled={isLoading}
            className="flex items-center gap-1 rounded-md bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 transition hover:bg-green-200 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Done
          </button>
        )}
        <button
          onClick={handleRemove}
          disabled={isLoading}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          title="Remove from list"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Link>
  );
}
