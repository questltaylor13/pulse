"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Category } from "@prisma/client";
import Link from "next/link";
import EventCard from "@/components/EventCard";
import SuggestedSection from "@/components/SuggestedSection";
import FollowedCreatorPicksSection from "@/components/FollowedCreatorPicksSection";
import InfluencerPicksSection from "@/components/InfluencerPicksSection";
import NewInDenverSection from "@/components/NewInDenverSection";
import { ScoredEvent } from "@/lib/scoring";

const CATEGORIES: { value: Category | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Events" },
  { value: "ART", label: "Art" },
  { value: "LIVE_MUSIC", label: "Live Music" },
  { value: "BARS", label: "Bars" },
  { value: "FOOD", label: "Food" },
  { value: "COFFEE", label: "Coffee" },
  { value: "OUTDOORS", label: "Outdoors" },
  { value: "FITNESS", label: "Fitness" },
  { value: "SEASONAL", label: "Seasonal" },
  { value: "POPUP", label: "Pop-ups" },
  { value: "OTHER", label: "Other" },
];

// Subcategories for specific categories
const SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  FOOD: [
    { value: "american", label: "American" },
    { value: "italian", label: "Italian" },
    { value: "mexican", label: "Mexican" },
    { value: "japanese", label: "Japanese" },
    { value: "korean", label: "Korean" },
    { value: "chinese", label: "Chinese" },
    { value: "thai", label: "Thai" },
    { value: "indian", label: "Indian" },
    { value: "mediterranean", label: "Mediterranean" },
    { value: "brunch", label: "Brunch" },
    { value: "pizza", label: "Pizza" },
    { value: "seafood", label: "Seafood" },
    { value: "steakhouse", label: "Steakhouse" },
    { value: "vegetarian", label: "Vegetarian" },
  ],
  RESTAURANT: [
    { value: "american", label: "American" },
    { value: "italian", label: "Italian" },
    { value: "mexican", label: "Mexican" },
    { value: "japanese", label: "Japanese" },
    { value: "korean", label: "Korean" },
    { value: "chinese", label: "Chinese" },
    { value: "thai", label: "Thai" },
    { value: "indian", label: "Indian" },
    { value: "mediterranean", label: "Mediterranean" },
    { value: "brunch", label: "Brunch" },
    { value: "pizza", label: "Pizza" },
    { value: "seafood", label: "Seafood" },
    { value: "steakhouse", label: "Steakhouse" },
    { value: "vegetarian", label: "Vegetarian" },
  ],
  BARS: [
    { value: "cocktail", label: "Cocktail Bar" },
    { value: "dive", label: "Dive Bar" },
    { value: "sports", label: "Sports Bar" },
    { value: "wine", label: "Wine Bar" },
    { value: "brewery", label: "Brewery" },
    { value: "rooftop", label: "Rooftop" },
    { value: "speakeasy", label: "Speakeasy" },
    { value: "lounge", label: "Lounge" },
    { value: "pub", label: "Pub" },
    { value: "club", label: "Club" },
  ],
};

const DENVER_NEIGHBORHOODS = [
  "LoDo",
  "RiNo",
  "LoHi",
  "Highlands",
  "Capitol Hill",
  "Cherry Creek",
  "Wash Park",
  "Baker",
  "Five Points",
  "Uptown",
  "City Park",
  "Sloan's Lake",
  "Berkeley",
  "Tennyson",
  "SoBo",
  "Golden Triangle",
  "Ballpark",
  "Curtis Park",
  "Cole",
  "Union Station",
];

interface FeedResponse {
  events: ScoredEvent[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface UserInteractions {
  [eventId: string]: {
    saved: boolean;
    liked: boolean;
  };
}

export default function FeedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<ScoredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | "ALL">("ALL");
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [showNeighborhoodFilter, setShowNeighborhoodFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [interactions, setInteractions] = useState<UserInteractions>({});

  // Redirect if not authenticated or onboarding not complete
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (!session.user.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [session, status, router]);

  const fetchEvents = useCallback(async (pageNum: number, cat: Category | "ALL", neighborhoods: string[], subcategories: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        pageSize: "12",
      });
      if (cat !== "ALL") {
        params.set("category", cat);
      }
      if (neighborhoods.length > 0) {
        params.set("neighborhoods", neighborhoods.join(","));
      }
      if (subcategories.length > 0) {
        params.set("subcategories", subcategories.join(","));
      }

      const response = await fetch(`/api/feed?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data: FeedResponse = await response.json();

      if (pageNum === 1) {
        setEvents(data.events);
      } else {
        setEvents((prev) => [...prev, ...data.events]);
      }

      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInteractions = useCallback(async () => {
    try {
      const response = await fetch("/api/interactions");
      if (response.ok) {
        const data = await response.json();
        const interactionsMap: UserInteractions = {};
        for (const interaction of data.interactions || []) {
          interactionsMap[interaction.eventId] = {
            saved: interaction.status === "SAVED",
            liked: interaction.liked === true,
          };
        }
        setInteractions(interactionsMap);
      }
    } catch {
      // User might not be logged in, that's okay
    }
  }, []);

  useEffect(() => {
    if (status === "loading" || !session?.user?.onboardingComplete) return;
    fetchEvents(1, category, selectedNeighborhoods, selectedSubcategories);
    fetchInteractions();
  }, [category, selectedNeighborhoods, selectedSubcategories, fetchEvents, fetchInteractions, session, status]);

  const handleCategoryChange = (newCategory: Category | "ALL") => {
    setCategory(newCategory);
    setSelectedSubcategories([]); // Clear subcategories when changing category
    setPage(1);
  };

  const handleSubcategoryToggle = (subcategory: string) => {
    setSelectedSubcategories((prev) =>
      prev.includes(subcategory)
        ? prev.filter((s) => s !== subcategory)
        : [...prev, subcategory]
    );
    setPage(1);
  };

  const clearSubcategoryFilter = () => {
    setSelectedSubcategories([]);
    setPage(1);
  };

  const handleNeighborhoodToggle = (neighborhood: string) => {
    setSelectedNeighborhoods((prev) =>
      prev.includes(neighborhood)
        ? prev.filter((n) => n !== neighborhood)
        : [...prev, neighborhood]
    );
    setPage(1);
  };

  const clearNeighborhoodFilter = () => {
    setSelectedNeighborhoods([]);
    setPage(1);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, category, selectedNeighborhoods, selectedSubcategories);
  };

  const handleSave = async (eventId: string) => {
    const response = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action: "save" }),
    });
    if (response.ok) {
      setInteractions((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], saved: true },
      }));
    }
  };

  const handleUnsave = async (eventId: string) => {
    const response = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action: "unsave" }),
    });
    if (response.ok) {
      setInteractions((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], saved: false },
      }));
    }
  };

  const handleLike = async (eventId: string) => {
    const response = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action: "like" }),
    });
    if (response.ok) {
      setInteractions((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], liked: true },
      }));
    }
  };

  const handleUnlike = async (eventId: string) => {
    const response = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action: "unlike" }),
    });
    if (response.ok) {
      setInteractions((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], liked: false },
      }));
    }
  };

  // Show loading while checking auth
  if (status === "loading" || !session?.user?.onboardingComplete) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Discover Denver</h1>
          <p className="text-slate-600">
            {total} events happening in the next 2 weeks
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/feed/following"
            className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Following
          </Link>
          <Link
            href="/places"
            className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            Places
          </Link>
          <Link
            href="/influencers"
            className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Curators
          </Link>
          <Link
            href="/saved"
            className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            Saved
          </Link>
        </div>
      </div>

      {/* New in Denver section */}
      <NewInDenverSection />

      {/* Suggested for you section */}
      <SuggestedSection />

      {/* Picks from curators you follow */}
      <FollowedCreatorPicksSection />

      {/* Discover new curators */}
      <InfluencerPicksSection />

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => handleCategoryChange(cat.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              category === cat.value
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Subcategory Filter - shows when FOOD, RESTAURANT, or BARS is selected */}
      {category !== "ALL" && SUBCATEGORIES[category] && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Filter by type:
            </span>
            {selectedSubcategories.length > 0 && (
              <button
                onClick={clearSubcategoryFilter}
                className="text-xs text-slate-500 hover:text-primary transition"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {SUBCATEGORIES[category].map((sub) => (
              <button
                key={sub.value}
                onClick={() => handleSubcategoryToggle(sub.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  selectedSubcategories.includes(sub.value)
                    ? "bg-primary/80 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Neighborhood Filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowNeighborhoodFilter(!showNeighborhoodFilter)}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-primary transition"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            Filter by Neighborhood
            <svg
              className={`h-4 w-4 transition-transform ${showNeighborhoodFilter ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {selectedNeighborhoods.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                {selectedNeighborhoods.length}
              </span>
            )}
          </button>
          {selectedNeighborhoods.length > 0 && (
            <button
              onClick={clearNeighborhoodFilter}
              className="text-xs text-slate-500 hover:text-primary transition"
            >
              Clear all
            </button>
          )}
        </div>

        {showNeighborhoodFilter && (
          <div className="flex flex-wrap gap-2 rounded-lg bg-slate-50 p-4">
            {DENVER_NEIGHBORHOODS.map((neighborhood) => (
              <button
                key={neighborhood}
                onClick={() => handleNeighborhoodToggle(neighborhood)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  selectedNeighborhoods.includes(neighborhood)
                    ? "bg-primary text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-primary hover:text-primary"
                }`}
              >
                {neighborhood}
              </button>
            ))}
          </div>
        )}

        {/* Selected neighborhoods display when filter is collapsed */}
        {!showNeighborhoodFilter && selectedNeighborhoods.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedNeighborhoods.map((neighborhood) => (
              <span
                key={neighborhood}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {neighborhood}
                <button
                  onClick={() => handleNeighborhoodToggle(neighborhood)}
                  className="hover:text-primary/70"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && events.length === 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="mb-3 h-6 w-20 rounded-full bg-slate-200" />
              <div className="mb-2 h-6 w-3/4 rounded bg-slate-200" />
              <div className="mb-4 h-4 w-full rounded bg-slate-200" />
              <div className="space-y-2">
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-4 w-1/2 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && events.length === 0 && !error && (
        <div className="card text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 p-4">
            <svg
              className="h-8 w-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            No events found
          </h3>
          <p className="text-slate-600">
            {category !== "ALL"
              ? `No ${CATEGORIES.find((c) => c.value === category)?.label.toLowerCase()} events in the next 2 weeks.`
              : "No events scheduled for the next 2 weeks."}
          </p>
        </div>
      )}

      {/* Event Grid */}
      {events.length > 0 && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                id={event.id}
                title={event.title}
                description={event.description}
                category={event.category}
                venueName={event.venueName}
                address={event.address}
                neighborhood={event.neighborhood}
                startTime={event.startTime}
                endTime={event.endTime}
                priceRange={event.priceRange}
                source={event.source}
                sourceUrl={event.sourceUrl}
                imageUrl={event.imageUrl}
                score={event.score}
                googleRating={event.googleRating}
                googleRatingCount={event.googleRatingCount}
                appleRating={event.appleRating}
                appleRatingCount={event.appleRatingCount}
                place={event.place}
                isSaved={interactions[event.id]?.saved || false}
                isLiked={interactions[event.id]?.liked || false}
                onSave={handleSave}
                onUnsave={handleUnsave}
                onLike={handleLike}
                onUnlike={handleUnlike}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
