"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Place, Category, OpeningStatus } from "@prisma/client";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants/categories";
import { useSession } from "next-auth/react";
import {
  NewBadge,
  ComingSoonBadge,
  SoftOpenBadge,
  JustAnnouncedBadge,
  HypeBadge,
  FeaturedBadge,
} from "@/components/PlaceBadges";

type PlaceWithMeta = Place & {
  daysOld?: number;
  daysUntil?: number;
};

interface NewPlacesClientProps {
  justOpened: PlaceWithMeta[];
  recentlyOpened: PlaceWithMeta[];
  softOpen: PlaceWithMeta[];
  comingSoon: PlaceWithMeta[];
  announced: PlaceWithMeta[];
}

type Tab = "all" | "just-opened" | "coming-soon" | "soft-open";

interface PlaceCardProps {
  place: PlaceWithMeta;
  variant: "new" | "upcoming" | "soft-open";
  isSaved: boolean;
  onSave: (placeId: string) => void;
  onShare: (place: PlaceWithMeta) => void;
  savingId: string | null;
  isLoggedIn: boolean;
}

function PlaceCard({
  place,
  variant,
  isSaved,
  onSave,
  onShare,
  savingId,
  isLoggedIn,
}: PlaceCardProps) {
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);
  const isSaving = savingId === place.id;

  const now = new Date();
  const daysOld = place.openedDate
    ? Math.ceil((now.getTime() - new Date(place.openedDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const daysUntil = place.expectedOpenDate
    ? Math.ceil((new Date(place.expectedOpenDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleNotify = async () => {
    setNotifyLoading(true);
    try {
      const res = await fetch(`/api/places/${place.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertType: "NOTIFY_ON_OPEN" }),
      });
      if (res.ok) {
        setHasNotified(true);
      }
    } catch (error) {
      console.error("Failed to set notification:", error);
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-lg hover:border-primary">
      {/* Image with save/share buttons */}
      <div className="relative mb-3">
        {place.primaryImageUrl ? (
          <div className="overflow-hidden rounded-lg">
            <img
              src={place.primaryImageUrl}
              alt={place.name}
              className="h-40 w-full object-cover transition group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="h-40 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <span className="text-5xl text-white/80">
              {place.category === "FOOD" || place.category === "RESTAURANT" ? "🍽️" :
               place.category === "COFFEE" ? "☕" :
               place.category === "BARS" ? "🍸" :
               place.category === "FITNESS" ? "💪" :
               place.category === "ART" ? "🎨" :
               place.category === "LIVE_MUSIC" ? "🎵" :
               "✨"}
            </span>
          </div>
        )}

        {/* Action buttons overlay */}
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
              className={`p-2 rounded-full backdrop-blur-sm transition shadow-sm ${
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
            className="p-2 rounded-full bg-white/90 text-slate-600 hover:bg-white hover:text-primary backdrop-blur-sm transition shadow-sm"
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

      {/* Badges */}
      <div className="mb-3 flex flex-wrap gap-2">
        {place.isFeatured && <FeaturedBadge size="sm" />}

        {variant === "soft-open" ? (
          <SoftOpenBadge size="sm" />
        ) : variant === "upcoming" ? (
          <>
            <ComingSoonBadge daysUntil={daysUntil ?? undefined} size="sm" />
            {place.announcedDate && (
              (() => {
                const daysSince = Math.ceil(
                  (now.getTime() - new Date(place.announcedDate).getTime()) / (1000 * 60 * 60 * 24)
                );
                return daysSince <= 14 ? <JustAnnouncedBadge size="sm" /> : null;
              })()
            )}
          </>
        ) : daysOld !== null ? (
          <NewBadge daysOld={daysOld} size="sm" />
        ) : null}

        {(variant === "upcoming" || variant === "soft-open") && place.preOpeningSaves && place.preOpeningSaves >= 5 && (
          <HypeBadge count={place.preOpeningSaves} size="sm" />
        )}
      </div>

      {/* Category */}
      {place.category && (
        <span
          className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[place.category]}`}
        >
          {CATEGORY_LABELS[place.category]}
        </span>
      )}

      {/* Name */}
      <Link href={`/places/${place.id}`}>
        <h3 className="mb-1 text-lg font-semibold text-slate-900 line-clamp-1 group-hover:text-primary">
          {place.name}
        </h3>
      </Link>

      {/* Neighborhood */}
      {place.neighborhood && (
        <p className="mb-2 text-sm text-slate-500">{place.neighborhood}</p>
      )}

      {/* Concept description for upcoming */}
      {place.conceptDescription && (
        <p className="mb-2 text-sm text-slate-600 line-clamp-2 italic">
          {place.conceptDescription}
        </p>
      )}

      {/* Sneak peek info */}
      {place.sneakPeekInfo && (
        <p className="mb-2 text-xs text-slate-500 line-clamp-1">
          {place.sneakPeekInfo}
        </p>
      )}

      {/* Rating for open places */}
      {variant === "new" && place.googleRating ? (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-blue-700">
            <svg className="h-3 w-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {place.googleRating.toFixed(1)}
          </span>
          {place.priceLevel && (
            <span className="text-slate-400">
              {"$".repeat(place.priceLevel)}
            </span>
          )}
        </div>
      ) : variant === "new" && !place.googleRating ? (
        <p className="mb-3 text-xs text-slate-400 italic">New - no ratings yet</p>
      ) : null}

      {/* Expected price for upcoming */}
      {variant === "upcoming" && place.expectedPriceLevel && (
        <p className="mb-3 text-sm text-slate-500">
          Expected: {"$".repeat(place.expectedPriceLevel)}
        </p>
      )}

      {/* News source */}
      {place.newsSource && (
        <p className="mb-3 text-xs text-slate-400">
          via{" "}
          {place.newsSourceUrl ? (
            <a
              href={place.newsSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline"
            >
              {place.newsSource}
            </a>
          ) : (
            place.newsSource
          )}
        </p>
      )}

      {/* Actions */}
      <div className="mt-auto flex gap-2">
        <Link
          href={`/places/${place.id}`}
          className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          View Details
        </Link>

        {(variant === "upcoming" || variant === "soft-open") && (
          <button
            onClick={handleNotify}
            disabled={notifyLoading || hasNotified}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              hasNotified
                ? "bg-green-100 text-green-700"
                : "bg-primary text-white hover:bg-primary-dark"
            } disabled:opacity-50`}
          >
            {hasNotified ? "Notified!" : notifyLoading ? "..." : "Notify Me"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function NewPlacesClient({
  justOpened,
  recentlyOpened,
  softOpen,
  comingSoon,
  announced,
}: NewPlacesClientProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const isLoggedIn = !!session?.user;
  const totalNew = justOpened.length + recentlyOpened.length;
  const totalUpcoming = comingSoon.length + announced.length;

  // Get all place IDs
  const allPlaces = [...justOpened, ...recentlyOpened, ...softOpen, ...comingSoon, ...announced];

  // Fetch user's saved places status
  useEffect(() => {
    async function fetchSavedStatus() {
      if (!isLoggedIn || allPlaces.length === 0) return;

      try {
        const savedSet = new Set<string>();

        // Check each place's saved status in parallel
        await Promise.all(
          allPlaces.map(async (place) => {
            const res = await fetch(`/api/places/${place.id}/notify`);
            if (res.ok) {
              const data = await res.json();
              if (data.hasAlert) {
                savedSet.add(place.id);
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
  }, [isLoggedIn, allPlaces.length]);

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
        if ((error as Error).name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareToast("Link copied!");
        setTimeout(() => setShareToast(null), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Toast notification for share */}
      {shareToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {shareToast}
        </div>
      )}

      {/* Hero Section */}
      <div className="card bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <h1 className="text-3xl font-bold mb-2">What's New in Denver</h1>
        <p className="text-emerald-100 text-lg">
          Discover the latest openings and upcoming spots before everyone else
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="bg-white/20 rounded-full px-4 py-1">
            {totalNew} new places
          </div>
          <div className="bg-white/20 rounded-full px-4 py-1">
            {totalUpcoming} coming soon
          </div>
          {softOpen.length > 0 && (
            <div className="bg-white/20 rounded-full px-4 py-1">
              {softOpen.length} soft openings
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "all" as Tab, label: "All" },
          { id: "just-opened" as Tab, label: `Just Opened (${justOpened.length})` },
          { id: "coming-soon" as Tab, label: `Coming Soon (${totalUpcoming})` },
          { id: "soft-open" as Tab, label: `Soft Open (${softOpen.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Soft Openings Section */}
      {(activeTab === "all" || activeTab === "soft-open") && softOpen.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">Soft Openings</h2>
            <SoftOpenBadge size="sm" />
          </div>
          <p className="mb-4 text-sm text-slate-500">
            Be among the first to try these spots during their testing phase
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {softOpen.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                variant="soft-open"
                isSaved={savedPlaces.has(place.id)}
                onSave={handleSave}
                onShare={handleShare}
                savingId={savingId}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        </section>
      )}

      {/* Just Opened Section */}
      {(activeTab === "all" || activeTab === "just-opened") && justOpened.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">Just Opened</h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              Last 30 days
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {justOpened.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                variant="new"
                isSaved={savedPlaces.has(place.id)}
                onSave={handleSave}
                onShare={handleShare}
                savingId={savingId}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recently Opened Section */}
      {(activeTab === "all" || activeTab === "just-opened") && recentlyOpened.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">Recently Opened</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              30-90 days ago
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyOpened.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                variant="new"
                isSaved={savedPlaces.has(place.id)}
                onSave={handleSave}
                onShare={handleShare}
                savingId={savingId}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        </section>
      )}

      {/* Coming Soon Section */}
      {(activeTab === "all" || activeTab === "coming-soon") && comingSoon.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">Opening Soon</h2>
            <ComingSoonBadge size="sm" />
          </div>
          <p className="mb-4 text-sm text-slate-500">
            Get notified when these spots open their doors
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {comingSoon.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                variant="upcoming"
                isSaved={savedPlaces.has(place.id)}
                onSave={handleSave}
                onShare={handleShare}
                savingId={savingId}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        </section>
      )}

      {/* Announced / Rumored Section */}
      {(activeTab === "all" || activeTab === "coming-soon") && announced.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">Announced & Rumored</h2>
            <JustAnnouncedBadge size="sm" />
          </div>
          <p className="mb-4 text-sm text-slate-500">
            No opening date yet, but keep these on your radar
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {announced.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                variant="upcoming"
                isSaved={savedPlaces.has(place.id)}
                onSave={handleSave}
                onShare={handleShare}
                savingId={savingId}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {justOpened.length === 0 &&
        recentlyOpened.length === 0 &&
        softOpen.length === 0 &&
        comingSoon.length === 0 &&
        announced.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">🏗️</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No new places yet
            </h3>
            <p className="text-slate-500">
              Check back soon - we're always adding new spots to discover!
            </p>
          </div>
        )}
    </div>
  );
}
