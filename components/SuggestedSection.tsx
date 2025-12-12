"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Category, ItemType } from "@prisma/client";

interface SuggestionCandidate {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  category: Category;
  tags: string[];
  startTime: Date | string | null;
  venueName: string;
  priceRange: string;
  score: number;
}

interface SuggestionSet {
  weeklyPicks: SuggestionCandidate[];
  monthlyPicks: SuggestionCandidate[];
  reasonsById: Record<string, string>;
  summaryText: string;
  isAiGenerated: boolean;
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

interface SuggestionCardProps {
  suggestion: SuggestionCandidate;
  reason?: string;
}

function SuggestionCard({ suggestion, reason }: SuggestionCardProps) {
  const detailUrl =
    suggestion.type === "PLACE"
      ? `/places/${suggestion.id}`
      : `/items/${suggestion.id}`;

  return (
    <Link
      href={detailUrl}
      className="flex-shrink-0 w-64 card hover:shadow-md transition group"
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[suggestion.category]}`}
        >
          {CATEGORY_LABELS[suggestion.category]}
        </span>
        {suggestion.type === "PLACE" && (
          <span className="text-xs text-slate-400">Place</span>
        )}
      </div>
      <h4 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-primary transition mb-1">
        {suggestion.title}
      </h4>
      {reason && (
        <p className="text-xs text-primary font-medium mb-2">{reason}</p>
      )}
      <div className="text-xs text-slate-500 space-y-1">
        {suggestion.type === "EVENT" && suggestion.startTime && (
          <p>{formatDate(suggestion.startTime)}</p>
        )}
        <p className="line-clamp-1">{suggestion.venueName}</p>
        <p>{suggestion.priceRange}</p>
      </div>
    </Link>
  );
}

interface SuggestedSectionProps {
  title: string;
  subtitle?: string;
  suggestions: SuggestionCandidate[];
  reasonsById: Record<string, string>;
  showAll?: boolean;
}

function SuggestedRow({
  title,
  subtitle,
  suggestions,
  reasonsById,
  showAll,
}: SuggestedSectionProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {showAll && (
          <Link
            href="/suggestions"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            reason={reasonsById[suggestion.id]}
          />
        ))}
      </div>
    </div>
  );
}

export default function SuggestedSection() {
  const [suggestions, setSuggestions] = useState<SuggestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const response = await fetch("/api/suggestions");
        if (!response.ok) {
          throw new Error("Failed to fetch suggestions");
        }
        const data = await response.json();
        setSuggestions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestions();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          <span className="text-sm text-slate-600">
            Generating your personalized suggestions...
          </span>
        </div>
      </div>
    );
  }

  if (error || !suggestions) {
    return null; // Silently fail - suggestions are optional
  }

  if (
    suggestions.weeklyPicks.length === 0 &&
    suggestions.monthlyPicks.length === 0
  ) {
    return null; // No suggestions to show
  }

  return (
    <div className="space-y-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Suggested for you
            </h2>
            <p className="text-sm text-slate-600">{suggestions.summaryText}</p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-slate-600 p-1"
        >
          <svg
            className={`h-5 w-5 transition-transform ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="space-y-6">
          {/* Weekly picks */}
          <SuggestedRow
            title="This Week"
            subtitle="Happening in the next 7 days"
            suggestions={suggestions.weeklyPicks}
            reasonsById={suggestions.reasonsById}
          />

          {/* Monthly picks */}
          <SuggestedRow
            title="This Month"
            subtitle="Events and places to explore"
            suggestions={suggestions.monthlyPicks}
            reasonsById={suggestions.reasonsById}
          />
        </div>
      )}

      {/* AI badge */}
      {suggestions.isAiGenerated && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>AI-curated picks</span>
        </div>
      )}
    </div>
  );
}
