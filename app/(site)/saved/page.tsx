"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import EventCard from "@/components/EventCard";
import { Category } from "@prisma/client";

interface SavedEvent {
  id: string;
  eventId: string;
  status: string;
  liked: boolean | null;
  event: {
    id: string;
    title: string;
    description: string;
    category: Category;
    venueName: string;
    address: string;
    startTime: string;
    endTime: string | null;
    priceRange: string;
    source: string;
    sourceUrl: string | null;
  };
}

export default function SavedEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchSavedEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/interactions?status=SAVED");
      if (response.status === 401) {
        setError("Please sign in to view your saved events");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch saved events");
      }
      const data = await response.json();
      setSavedEvents(data.interactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading" || !session?.user?.onboardingComplete) return;
    fetchSavedEvents();
  }, [fetchSavedEvents, session, status]);

  const handleUnsave = async (eventId: string) => {
    const response = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action: "unsave" }),
    });
    if (response.ok) {
      setSavedEvents((prev) => prev.filter((e) => e.eventId !== eventId));
    }
  };

  const handleLike = async (eventId: string) => {
    const response = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action: "like" }),
    });
    if (response.ok) {
      setSavedEvents((prev) =>
        prev.map((e) =>
          e.eventId === eventId ? { ...e, liked: true } : e
        )
      );
    }
  };

  const handleUnlike = async (eventId: string) => {
    const response = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action: "unlike" }),
    });
    if (response.ok) {
      setSavedEvents((prev) =>
        prev.map((e) =>
          e.eventId === eventId ? { ...e, liked: false } : e
        )
      );
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saved Events</h1>
          <p className="text-slate-600">
            {savedEvents.length} event{savedEvents.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <a
          href="/feed"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          Discover More
        </a>
      </div>

      {/* Error State */}
      {error && (
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">{error}</h3>
          <a
            href="/auth/login"
            className="inline-block text-primary hover:underline"
          >
            Sign in to continue
          </a>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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
      {!loading && savedEvents.length === 0 && !error && (
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
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            No saved events yet
          </h3>
          <p className="mb-4 text-slate-600">
            Browse the feed and save events you want to remember.
          </p>
          <a href="/feed" className="btn-primary">
            Browse Events
          </a>
        </div>
      )}

      {/* Saved Events Grid */}
      {savedEvents.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {savedEvents.map((saved) => (
            <EventCard
              key={saved.id}
              id={saved.event.id}
              title={saved.event.title}
              description={saved.event.description}
              category={saved.event.category}
              venueName={saved.event.venueName}
              address={saved.event.address}
              startTime={saved.event.startTime}
              endTime={saved.event.endTime}
              priceRange={saved.event.priceRange}
              source={saved.event.source}
              sourceUrl={saved.event.sourceUrl}
              isSaved={true}
              isLiked={saved.liked === true}
              onSave={async () => {}}
              onUnsave={handleUnsave}
              onLike={handleLike}
              onUnlike={handleUnlike}
            />
          ))}
        </div>
      )}
    </div>
  );
}
