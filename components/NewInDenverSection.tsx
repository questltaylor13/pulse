"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Place, Category } from "@prisma/client";
import { NewBadge, SoftOpenBadge, ComingSoonBadge, FeaturedBadge } from "./PlaceBadges";
import { useSession } from "next-auth/react";

type PlaceWithMeta = Place & {
  daysOld?: number;
  daysUntil?: number;
};

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

interface NewPlaceCardProps {
  place: PlaceWithMeta;
  isSaved: boolean;
  onSave: (placeId: string) => void;
  onShare: (place: PlaceWithMeta) => void;
  savingId: string | null;
  isLoggedIn: boolean;
}

function NewPlaceCard({ place, isSaved, onSave, onShare, savingId, isLoggedIn }: NewPlaceCardProps) {
  const now = new Date();
  const daysOld = place.openedDate
    ? Math.ceil((now.getTime() - new Date(place.openedDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const daysUntil = place.expectedOpenDate
    ? Math.ceil((new Date(place.expectedOpenDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isSoftOpen = place.openingStatus === "SOFT_OPEN";
  const isComingSoon = place.openingStatus === "COMING_SOON";
  const isOpen = place.openingStatus === "OPEN";
  const isSaving = savingId === place.id;

  return (
    <div className="group flex-shrink-0 w-64 rounded-xl border border-slate-200 bg-white overflow-hidden transition hover:shadow-lg hover:border-primary">
      {/* Image with action buttons */}
      <div className="relative">
        <Link href={`/places/${place.id}`}>
          {place.primaryImageUrl ? (
            <div className="h-32 overflow-hidden">
              <img
                src={place.primaryImageUrl}
                alt={place.name}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="h-32 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <span className="text-4xl text-white/80">
                {place.category === "FOOD" || place.category === "RESTAURANT" ? "🍽️" :
                 place.category === "COFFEE" ? "☕" :
                 place.category === "BARS" ? "🍸" :
                 place.category === "FITNESS" ? "💪" :
                 "✨"}
              </span>
            </div>
          )}
        </Link>

        {/* Action buttons - positioned at top right of image */}
        <div className="absolute top-2 right-2 flex gap-1.5">
          {/* Save button */}
          {isLoggedIn && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSave(place.id);
              }}
              disabled={isSaving}
              className={`p-1.5 rounded-full backdrop-blur-sm transition ${
                isSaved
                  ? "bg-primary text-white"
                  : "bg-white/90 text-slate-600 hover:bg-white hover:text-primary"
              } disabled:opacity-50`}
              title={isSaved ? "Saved" : "Save for later"}
            >
              <svg
                className="h-4 w-4"
                fill={isSaved ? "currentColor" : "none"}
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
            </button>
          )}

          {/* Share button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShare(place);
            }}
            className="p-1.5 rounded-full bg-white/90 text-slate-600 hover:bg-white hover:text-primary backdrop-blur-sm transition"
            title="Share"
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
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
        </div>
      </div>

      <Link href={`/places/${place.id}`}>
        <div className="p-3">
          {/* Badges */}
          <div className="mb-2 flex flex-wrap gap-1">
            {place.isFeatured && <FeaturedBadge size="sm" />}
            {isSoftOpen && <SoftOpenBadge size="sm" />}
            {isComingSoon && <ComingSoonBadge daysUntil={daysUntil ?? undefined} size="sm" />}
            {isOpen && daysOld !== null && daysOld <= 30 && <NewBadge daysOld={daysOld} size="sm" />}
          </div>

          {/* Category */}
          {place.category && (
            <span
              className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[place.category]}`}
            >
              {CATEGORY_LABELS[place.category]}
            </span>
          )}

          {/* Name */}
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 group-hover:text-primary">
            {place.name}
          </h3>

          {/* Neighborhood */}
          {place.neighborhood && (
            <p className="text-xs text-slate-500 mt-0.5">{place.neighborhood}</p>
          )}

          {/* Opening info */}
          {isComingSoon && place.expectedOpenDate && (
            <p className="mt-1 text-xs text-purple-600 font-medium">
              Opens {new Date(place.expectedOpenDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
          {isSoftOpen && (
            <p className="mt-1 text-xs text-orange-600 font-medium">
              Now in soft open
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

export default function NewInDenverSection() {
  const { data: session } = useSession();
  const [places, setPlaces] = useState<PlaceWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const isLoggedIn = !!session?.user;

  // Fetch user's saved places status
  useEffect(() => {
    async function fetchSavedStatus() {
      if (!isLoggedIn || places.length === 0) return;

      try {
        const placeIds = places.map((p) => p.id);
        const savedSet = new Set<string>();

        // Check each place's saved status
        await Promise.all(
          placeIds.map(async (placeId) => {
            const res = await fetch(`/api/places/${placeId}/notify`);
            if (res.ok) {
              const data = await res.json();
              if (data.hasAlert) {
                savedSet.add(placeId);
              }
            }
          })
        );

        setSavedPlaces(savedSet);
      } catch (error) {
        console.error("Failed to fetch saved status:", error);
      }
    }

    fetchSavedStatus();
  }, [isLoggedIn, places]);

  // Handle save/unsave
  const handleSave = async (placeId: string) => {
    if (!isLoggedIn || savingId) return;

    setSavingId(placeId);
    const wasSaved = savedPlaces.has(placeId);

    try {
      const res = await fetch(`/api/places/${placeId}/notify`, {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertType: "NOTIFY_ON_OPEN" }),
      });

      if (res.ok) {
        setSavedPlaces((prev) => {
          const next = new Set(prev);
          if (wasSaved) {
            next.delete(placeId);
          } else {
            next.add(placeId);
          }
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to save place:", error);
    } finally {
      setSavingId(null);
    }
  };

  // Handle share
  const handleShare = async (place: PlaceWithMeta) => {
    const shareUrl = `${window.location.origin}/places/${place.id}`;
    const shareText = place.conceptDescription || `Check out ${place.name} on Pulse!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: place.name,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error
        if ((error as Error).name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareToast("Link copied!");
        setTimeout(() => setShareToast(null), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  useEffect(() => {
    async function fetchNewPlaces() {
      try {
        // Fetch newest open places and upcoming places
        const [newRes, upcomingRes] = await Promise.all([
          fetch("/api/places/new?days=30&limit=4"),
          fetch("/api/places/upcoming?limit=4&includeSoftOpen=true"),
        ]);

        const newData = newRes.ok ? await newRes.json() : { places: [] };
        const upcomingData = upcomingRes.ok ? await upcomingRes.json() : { places: [] };

        // Combine and dedupe, prioritize soft opens and new places
        const allPlaces: PlaceWithMeta[] = [];
        const seenIds = new Set<string>();

        // Add soft opens first
        for (const place of upcomingData.softOpen || []) {
          if (!seenIds.has(place.id)) {
            seenIds.add(place.id);
            allPlaces.push(place);
          }
        }

        // Add new places
        for (const place of newData.places || []) {
          if (!seenIds.has(place.id) && allPlaces.length < 6) {
            seenIds.add(place.id);
            allPlaces.push(place);
          }
        }

        // Add coming soon
        for (const place of upcomingData.comingSoon || []) {
          if (!seenIds.has(place.id) && allPlaces.length < 6) {
            seenIds.add(place.id);
            allPlaces.push(place);
          }
        }

        setPlaces(allPlaces.slice(0, 6));
      } catch (error) {
        console.error("Failed to fetch new places:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchNewPlaces();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-56 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (places.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 relative">
      {/* Toast notification for share */}
      {shareToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {shareToast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h2 className="text-lg font-bold text-slate-900">New in Denver</h2>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {places.length} spots
          </span>
        </div>
        <Link
          href="/new"
          className="text-sm font-medium text-primary hover:text-primary-dark transition"
        >
          See all →
        </Link>
      </div>

      {/* Horizontal scroll container */}
      <div className="relative -mx-4 px-4">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {places.map((place) => (
            <NewPlaceCard
              key={place.id}
              place={place}
              isSaved={savedPlaces.has(place.id)}
              onSave={handleSave}
              onShare={handleShare}
              savingId={savingId}
              isLoggedIn={isLoggedIn}
            />
          ))}

          {/* See all card */}
          <Link href="/new">
            <div className="flex-shrink-0 w-48 h-full min-h-[220px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-2 transition hover:border-primary hover:bg-primary/5">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-600">View all new spots</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
