"use client";

import Link from "next/link";
import { Category } from "@prisma/client";
import { ScoredEvent } from "@/lib/recommendations";

interface PeopleLikeYouAlsoLikedProps {
  recommendations: ScoredEvent[];
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

function getRelativeDate(date: Date): string {
  const now = new Date();
  const eventDate = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const diffDays = Math.ceil((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Tomorrow";
  } else if (diffDays > 0 && diffDays <= 7) {
    const dayOfWeek = eventDate.toLocaleDateString("en-US", { weekday: "long" });
    return `This ${dayOfWeek}`;
  } else {
    return eventDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatReasonAsExplanation(reason: string, event: ScoredEvent): string {
  // Enhance the reason with more context
  const lowerReason = reason.toLowerCase();

  // Pattern matching for different reason types
  if (lowerReason.includes("category") || lowerReason.includes("you like")) {
    return `Similar to events you've enjoyed`;
  } else if (lowerReason.includes("trending") || lowerReason.includes("popular")) {
    return `Popular with others like you`;
  } else if (lowerReason.includes("neighborhood")) {
    return `In your favorite area`;
  } else if (lowerReason.includes("weekend") || lowerReason.includes("time")) {
    return `Fits your schedule`;
  } else if (lowerReason.includes("venue") || lowerReason.includes("location")) {
    return `At a place you might like`;
  } else if (lowerReason.includes("exploration") || lowerReason.includes("try")) {
    return `Something new to try`;
  } else if (lowerReason.includes("free") || lowerReason.includes("budget")) {
    return `Fits your budget`;
  } else if (lowerReason.includes("date") || lowerReason.includes("friend") || lowerReason.includes("solo")) {
    return `Good for how you like to go out`;
  } else if (lowerReason.includes("vibe")) {
    return `Matches your vibe`;
  }

  // Fallback to original reason if no match
  return reason || "Recommended for you";
}

export default function PeopleLikeYouAlsoLiked({
  recommendations,
}: PeopleLikeYouAlsoLikedProps) {
  if (recommendations.length === 0) return null;

  return (
    <section className="card">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          People like you also liked...
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Based on your preferences and what others with similar taste enjoyed
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group rounded-lg border border-slate-200 p-4 transition hover:border-primary hover:shadow-md"
          >
            {/* Image */}
            {event.imageUrl && (
              <div className="mb-3 overflow-hidden rounded-md">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="h-32 w-full object-cover transition group-hover:scale-105"
                />
              </div>
            )}

            {/* Category badge + Free indicator */}
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[event.category]}`}
              >
                {CATEGORY_LABELS[event.category]}
              </span>
              {(event.priceRange?.toLowerCase() === "free" || event.priceRange === "$0") && (
                <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  Free
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="mb-1 font-semibold text-slate-900 line-clamp-2 group-hover:text-primary">
              {event.title}
            </h3>

            {/* Date & Venue - with relative date */}
            <div className="mb-2 space-y-1 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium text-slate-700">{getRelativeDate(event.startTime)}</span>
                <span className="text-slate-400">·</span>
                <span>{formatTime(event.startTime)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <span className="line-clamp-1">{event.venueName}</span>
              </div>
            </div>

            {/* Enhanced Reason - styled as a subtle explanation */}
            <div className="mt-3 flex items-center gap-1.5 text-xs text-primary/70">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="italic">
                {formatReasonAsExplanation(event.reason, event)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
