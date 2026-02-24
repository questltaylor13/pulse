"use client";

import { useState } from "react";
import Link from "next/link";
import { Category, OpeningStatus, Place as PrismaPlace, Event } from "@prisma/client";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants/categories";
import {
  NewBadge,
  ComingSoonBadge,
  SoftOpenBadge,
  FeaturedBadge,
  HypeBadge,
} from "@/components/PlaceBadges";

type PlaceWithEvents = PrismaPlace & {
  events: Event[];
};

interface PlaceDetailClientProps {
  place: PlaceWithEvents;
  hasNotification: boolean;
  userId: string;
  similarPlaces: PrismaPlace[];
}

export default function PlaceDetailClient({
  place,
  hasNotification,
  userId,
  similarPlaces,
}: PlaceDetailClientProps) {
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [hasNotified, setHasNotified] = useState(hasNotification);

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
  const isNew = isOpen && daysOld !== null && daysOld <= 30;

  const googleMapsUrl =
    place.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      place.address || place.name
    )}`;

  const handleNotify = async () => {
    setNotifyLoading(true);
    try {
      const res = await fetch(`/api/places/${place.id}/notify`, {
        method: hasNotified ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertType: "NOTIFY_ON_OPEN" }),
      });
      if (res.ok) {
        setHasNotified(!hasNotified);
      }
    } catch (error) {
      console.error("Failed to update notification:", error);
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500">
        <Link href="/places" className="hover:text-primary">
          Places
        </Link>
        <span className="mx-2">/</span>
        {place.openingStatus !== "OPEN" && (
          <>
            <Link href="/new" className="hover:text-primary">
              New
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-slate-900">{place.name}</span>
      </nav>

      {/* Hero Image */}
      {place.primaryImageUrl ? (
        <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden">
          <img
            src={place.primaryImageUrl}
            alt={place.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {place.isFeatured && <FeaturedBadge />}
              {isSoftOpen && <SoftOpenBadge />}
              {isComingSoon && <ComingSoonBadge daysUntil={daysUntil ?? undefined} />}
              {isNew && <NewBadge daysOld={daysOld!} />}
              {(isSoftOpen || isComingSoon) && place.preOpeningSaves && place.preOpeningSaves >= 5 && (
                <HypeBadge count={place.preOpeningSaves} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
          <span className="text-8xl text-white/80">
            {place.category === "FOOD" || place.category === "RESTAURANT" ? "🍽️" :
             place.category === "COFFEE" ? "☕" :
             place.category === "BARS" ? "🍸" :
             place.category === "FITNESS" ? "💪" :
             place.category === "ART" ? "🎨" :
             place.category === "LIVE_MUSIC" ? "🎵" :
             "✨"}
          </span>
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {place.isFeatured && <FeaturedBadge />}
              {isSoftOpen && <SoftOpenBadge />}
              {isComingSoon && <ComingSoonBadge daysUntil={daysUntil ?? undefined} />}
              {isNew && <NewBadge daysOld={daysOld!} />}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              {place.category && (
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${CATEGORY_COLORS[place.category]}`}
                >
                  {CATEGORY_LABELS[place.category]}
                </span>
              )}
              {place.neighborhood && (
                <span className="text-sm text-slate-500">{place.neighborhood}</span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-slate-900">{place.name}</h1>
          </div>

          {/* Concept Description */}
          {place.conceptDescription && (
            <p className="text-lg text-slate-600 italic">{place.conceptDescription}</p>
          )}

          {/* Sneak Peek Info */}
          {place.sneakPeekInfo && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 font-medium">Sneak Peek</p>
              <p className="text-amber-700 text-sm mt-1">{place.sneakPeekInfo}</p>
            </div>
          )}

          {/* Vibe Tags */}
          {place.vibeTags && place.vibeTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {place.vibeTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Details grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Location */}
            <div className="card">
              <h3 className="font-medium text-slate-900 mb-2">Location</h3>
              {place.address && (
                <p className="text-sm text-slate-600 mb-3">{place.address}</p>
              )}
              <div className="flex gap-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  Google Maps
                </a>
              </div>
            </div>

            {/* Rating & Price */}
            <div className="card">
              <h3 className="font-medium text-slate-900 mb-2">Info</h3>
              {place.googleRating && (
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-medium">{place.googleRating.toFixed(1)}</span>
                  {place.googleReviewCount && (
                    <span className="text-slate-400">({place.googleReviewCount} reviews)</span>
                  )}
                </div>
              )}
              {(place.priceLevel || place.expectedPriceLevel) && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-emerald-600 font-medium">
                    {"$".repeat(place.priceLevel || place.expectedPriceLevel || 0)}
                  </span>
                  <span className="text-slate-300">
                    {"$".repeat(4 - (place.priceLevel || place.expectedPriceLevel || 0))}
                  </span>
                  {place.expectedPriceLevel && !place.priceLevel && (
                    <span className="text-xs text-slate-400">(expected)</span>
                  )}
                </div>
              )}
              {!place.googleRating && isNew && (
                <p className="text-sm text-slate-400 italic">New - no ratings yet</p>
              )}
            </div>
          </div>

          {/* Opening Info */}
          {(isComingSoon || isSoftOpen) && (
            <div className="card bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
              <h3 className="font-medium text-purple-900 mb-2">Opening Status</h3>
              {isSoftOpen && (
                <p className="text-purple-700">Currently in soft open! Stop by to be an early explorer.</p>
              )}
              {isComingSoon && place.expectedOpenDate && (
                <p className="text-purple-700">
                  Expected to open on{" "}
                  <span className="font-medium">
                    {new Date(place.expectedOpenDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {daysUntil !== null && daysUntil > 0 && (
                    <span className="text-purple-500"> ({daysUntil} days away)</span>
                  )}
                </p>
              )}
              {isComingSoon && !place.expectedOpenDate && (
                <p className="text-purple-700">Opening date TBD - stay tuned!</p>
              )}
            </div>
          )}

          {/* Source */}
          {place.newsSource && (
            <p className="text-sm text-slate-400">
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

          {/* Upcoming Events */}
          {place.events && place.events.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Upcoming Events</h2>
              <div className="space-y-3">
                {place.events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="block card hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-slate-900">{event.title}</h3>
                        <p className="text-sm text-slate-500">
                          {new Date(event.startTime).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          at{" "}
                          {new Date(event.startTime).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span className="text-primary text-sm">View →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Actions */}
        <div className="space-y-6">
          {/* Notification Card */}
          {(isComingSoon || isSoftOpen) && (
            <div className="card">
              <h3 className="font-medium text-slate-900 mb-4">Get Notified</h3>
              <p className="text-sm text-slate-600 mb-4">
                {isSoftOpen
                  ? "Be the first to know when they officially open!"
                  : "We'll let you know when this place opens."}
              </p>
              <button
                onClick={handleNotify}
                disabled={notifyLoading}
                className={`w-full rounded-lg px-4 py-3 text-sm font-medium transition ${
                  hasNotified
                    ? "bg-green-100 text-green-700"
                    : "bg-primary text-white hover:bg-primary-dark"
                } disabled:opacity-50`}
              >
                {hasNotified ? "You'll be notified!" : notifyLoading ? "..." : "Notify Me"}
              </button>
            </div>
          )}

          {/* Social Links */}
          {place.socialLinks && Object.keys(place.socialLinks as object).length > 0 && (
            <div className="card">
              <h3 className="font-medium text-slate-900 mb-4">Follow</h3>
              <div className="flex flex-wrap gap-2">
                {(place.socialLinks as { instagram?: string; twitter?: string }).instagram && (
                  <a
                    href={`https://instagram.com/${(place.socialLinks as { instagram: string }).instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
                  >
                    Instagram
                  </a>
                )}
                {(place.socialLinks as { twitter?: string }).twitter && (
                  <a
                    href={`https://twitter.com/${(place.socialLinks as { twitter: string }).twitter.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
                  >
                    Twitter
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Share Card */}
          <div className="card">
            <h3 className="font-medium text-slate-900 mb-4">Share</h3>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: place.name,
                    text: place.conceptDescription || `Check out ${place.name} on Pulse!`,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              className="w-full rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
            >
              Share this place
            </button>
          </div>
        </div>
      </div>

      {/* Similar Places */}
      {similarPlaces.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Similar Places</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similarPlaces.map((p) => (
              <Link key={p.id} href={`/places/${p.id}`}>
                <div className="group rounded-xl border border-slate-200 bg-white overflow-hidden transition hover:shadow-lg hover:border-primary">
                  {p.primaryImageUrl ? (
                    <div className="h-32 overflow-hidden">
                      <img
                        src={p.primaryImageUrl}
                        alt={p.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                      <span className="text-4xl text-slate-400">
                        {p.category === "FOOD" || p.category === "RESTAURANT" ? "🍽️" :
                         p.category === "COFFEE" ? "☕" :
                         p.category === "BARS" ? "🍸" :
                         "✨"}
                      </span>
                    </div>
                  )}
                  <div className="p-3">
                    {p.category && (
                      <span
                        className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[p.category]}`}
                      >
                        {CATEGORY_LABELS[p.category]}
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 group-hover:text-primary">
                      {p.name}
                    </h3>
                    {p.neighborhood && (
                      <p className="text-xs text-slate-500 mt-0.5">{p.neighborhood}</p>
                    )}
                    {p.googleRating && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <svg className="h-3 w-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {p.googleRating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
