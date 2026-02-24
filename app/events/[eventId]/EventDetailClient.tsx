"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Category, EventListStatus, GoingWith } from "@prisma/client";
import { toggleWant, toggleDone } from "@/lib/actions/lists";
import { submitEventFeedback } from "@/lib/actions/events";
import {
  addToCalendar,
  shareEvent,
  copyEventLink,
  getEventShareUrl,
  CalendarProvider,
} from "@/lib/calendar";
import { InviteFriendsModal } from "@/components/calendar";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants/categories";

interface PlaceData {
  id: string;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  priceLevel?: number | null;
  vibeTags?: string[];
  companionTags?: string[];
  pulseDescription?: string | null;
  googleMapsUrl?: string | null;
}

interface UserPreferences {
  categories?: Category[];
  neighborhoods?: string[];
  goingWithPreference?: GoingWith | null;
  budgetMax?: number | null;
  vibes?: string[];
}

interface CreatorFeature {
  influencer: {
    id: string;
    handle: string;
    displayName: string;
    profileImageUrl: string | null;
    profileColor?: string | null;
  };
  quote: string | null;
  isFeatured: boolean;
  isHost: boolean;
}

interface EventDetailClientProps {
  event: {
    id: string;
    title: string;
    description: string;
    category: Category;
    tags: string[];
    venueName: string;
    address: string;
    neighborhood?: string | null;
    startTime: Date;
    endTime: Date | null;
    priceRange: string;
    source: string;
    sourceUrl: string | null;
    imageUrl: string | null;
    googleMapsUrl: string | null;
    appleMapsUrl: string | null;
    userStatus: EventListStatus | null;
    saveCount?: number;
    doneCount?: number;
    place?: PlaceData | null;
    userPreferences?: UserPreferences | null;
    city: { slug: string; name: string };
    creatorFeatures?: CreatorFeature[];
  };
}

const GOING_WITH_OPTIONS: { value: GoingWith; label: string; icon: string }[] = [
  { value: "SOLO", label: "Solo", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { value: "DATE", label: "Date", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  { value: "FRIENDS", label: "Friends", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { value: "FAMILY", label: "Family", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
];

function getRelativeDate(date: Date): { label: string; sublabel?: string } {
  const now = new Date();
  const eventDate = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const diffDays = Math.ceil((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const dayOfWeek = eventDate.toLocaleDateString("en-US", { weekday: "long" });
  const hour = eventDate.getHours();
  let timeOfDay = "Evening";
  if (hour < 12) timeOfDay = "Morning";
  else if (hour < 17) timeOfDay = "Afternoon";

  if (diffDays === 0) {
    return { label: "Today", sublabel: timeOfDay };
  } else if (diffDays === 1) {
    return { label: "Tomorrow", sublabel: timeOfDay };
  } else if (diffDays > 0 && diffDays <= 7) {
    return { label: `This ${dayOfWeek}`, sublabel: `In ${diffDays} days` };
  } else if (diffDays > 7 && diffDays <= 14) {
    return { label: `Next ${dayOfWeek}`, sublabel: `In ${diffDays} days` };
  } else if (diffDays > 0) {
    return { label: `In ${diffDays} days`, sublabel: dayOfWeek };
  } else {
    return { label: "Past event", sublabel: dayOfWeek };
  }
}

function formatDateTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function generatePersonalizationReason(
  event: EventDetailClientProps["event"],
  preferences: UserPreferences | null | undefined
): string | null {
  if (!preferences) return null;

  const reasons: string[] = [];

  // Category match
  if (preferences.categories?.includes(event.category)) {
    reasons.push(`You like ${CATEGORY_LABELS[event.category].toLowerCase()}`);
  }

  // Budget match
  if (event.priceRange.toLowerCase() === "free" || event.priceRange === "$0") {
    reasons.push("Free");
  }

  // Vibe match
  if (preferences.vibes && event.place?.vibeTags) {
    const matchingVibes = preferences.vibes.filter(v =>
      event.place?.vibeTags?.some(t => t.toLowerCase().includes(v.toLowerCase()))
    );
    if (matchingVibes.length > 0) {
      reasons.push(`${matchingVibes[0]} vibe`);
    }
  }

  // Time of day preference
  const hour = new Date(event.startTime).getHours();
  if (hour < 12) {
    reasons.push("Morning-friendly");
  }

  // Neighborhood match
  if (event.neighborhood && preferences.neighborhoods?.includes(event.neighborhood)) {
    reasons.push(`Near ${event.neighborhood}`);
  }

  if (reasons.length === 0) return null;
  return reasons.slice(0, 3).join(" · ");
}

export default function EventDetailClient({ event }: EventDetailClientProps) {
  const [status, setStatus] = useState<EventListStatus | null>(event.userStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [showPulseCalendarMenu, setShowPulseCalendarMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showGoingWithModal, setShowGoingWithModal] = useState(false);
  const [showCalendarNudge, setShowCalendarNudge] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<"MORE" | "LESS" | null>(null);
  const [copied, setCopied] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<"GOING" | "MAYBE" | null>(null);
  const [addingToCalendar, setAddingToCalendar] = useState(false);

  const calendarMenuRef = useRef<HTMLDivElement>(null);
  const pulseCalendarMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarMenuRef.current && !calendarMenuRef.current.contains(event.target as Node)) {
        setShowCalendarMenu(false);
      }
      if (pulseCalendarMenuRef.current && !pulseCalendarMenuRef.current.contains(event.target as Node)) {
        setShowPulseCalendarMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const relativeDate = getRelativeDate(event.startTime);
  const personalizationReason = generatePersonalizationReason(event, event.userPreferences);

  const handleToggleWant = async () => {
    if (isLoading) return;

    if (status !== "WANT") {
      // Show going with modal
      setShowGoingWithModal(true);
    } else {
      // Toggle off
      setIsLoading(true);
      try {
        const result = await toggleWant(event.id);
        setStatus(result.status as EventListStatus | null);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveWithGoingWith = async (goingWith?: GoingWith) => {
    setShowGoingWithModal(false);
    setIsLoading(true);
    try {
      const result = await toggleWant(event.id);
      setStatus(result.status as EventListStatus | null);
      if (result.status === "WANT") {
        // Show calendar nudge after saving
        setShowCalendarNudge(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDone = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await toggleDone(event.id);
      setStatus(result.status as EventListStatus | null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCalendar = (provider: CalendarProvider) => {
    setShowCalendarMenu(false);
    setShowCalendarNudge(false);
    const startDate = new Date(event.startTime);
    const endDate = event.endTime ? new Date(event.endTime) : null;

    addToCalendar(
      {
        title: event.title,
        description: event.description,
        location: `${event.venueName}, ${event.address}`,
        startTime: startDate,
        endTime: endDate,
        url: getEventShareUrl(event.id),
      },
      provider
    );
  };

  const handleShare = async () => {
    const url = getEventShareUrl(event.id);
    const shared = await shareEvent({
      title: event.title,
      text: `Check out ${event.title} at ${event.venueName}`,
      url,
    });

    if (shared) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    const url = getEventShareUrl(event.id);
    const success = await copyEventLink(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFeedback = async (type: "MORE" | "LESS" | "HIDE") => {
    setShowMoreMenu(false);
    if (type !== "HIDE") {
      setFeedbackGiven(type);
      setTimeout(() => setFeedbackGiven(null), 2000);
    }
    try {
      await submitEventFeedback(event.id, type);
    } catch {
      /* silently handled */
    }
  };

  const handleAddToPulseCalendar = async (newStatus: "GOING" | "MAYBE") => {
    setShowPulseCalendarMenu(false);
    setAddingToCalendar(true);
    try {
      const res = await fetch("/api/calendar/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, calendarStatus: newStatus }),
      });
      if (res.ok) {
        setCalendarStatus(newStatus);
        // Also update the status to WANT if not already
        if (status !== "WANT") {
          setStatus("WANT");
        }
      }
    } catch {
      /* silently handled */
    } finally {
      setAddingToCalendar(false);
    }
  };

  // Generate maps URLs if not provided
  const googleMapsUrl =
    event.place?.googleMapsUrl ||
    event.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${event.venueName}, ${event.address}`
    )}`;

  const appleMapsUrl =
    event.appleMapsUrl ||
    `https://maps.apple.com/?q=${encodeURIComponent(
      `${event.venueName}, ${event.address}`
    )}`;

  const isFree = event.priceRange.toLowerCase() === "free" || event.priceRange === "$0";

  return (
    <div className="card">
      {/* Back link */}
      <Link
        href="/feed"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to feed
      </Link>

      {/* Image */}
      {event.imageUrl && (
        <div className="mb-6 overflow-hidden rounded-lg">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-64 w-full object-cover"
          />
        </div>
      )}

      {/* Creator Features Section */}
      {event.creatorFeatures && event.creatorFeatures.length > 0 && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4">
          {/* Creator Pick Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Creator Pick
            </span>
            <span className="text-sm text-blue-600 font-medium">
              {event.creatorFeatures.some(f => f.isHost) ? "Hosted by local creators" : "Featured by local creators"}
            </span>
          </div>

          {/* Creator Quotes */}
          <div className="space-y-3">
            {event.creatorFeatures.map((feature) => (
              <div key={feature.influencer.id} className="flex items-start gap-3">
                <Link
                  href={`/influencers/${feature.influencer.handle}`}
                  className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden border-2 border-white shadow-sm hover:scale-110 transition-transform"
                  style={{
                    background: feature.influencer.profileColor || '#f1f5f9',
                  }}
                >
                  {feature.influencer.profileImageUrl ? (
                    <Image
                      src={feature.influencer.profileImageUrl}
                      alt={feature.influencer.displayName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm font-bold text-slate-600">
                      {feature.influencer.displayName.charAt(0)}
                    </div>
                  )}
                </Link>
                <div className="flex-1">
                  <Link
                    href={`/influencers/${feature.influencer.handle}`}
                    className="text-sm font-semibold text-blue-700 hover:underline"
                  >
                    @{feature.influencer.handle}
                    {feature.isHost && (
                      <span className="ml-1 text-xs text-blue-500 font-normal">(Host)</span>
                    )}
                  </Link>
                  <p className="text-sm text-slate-700 mt-0.5 italic">"{feature.quote}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Badge with Price Prominence */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${CATEGORY_COLORS[event.category]}`}
        >
          {CATEGORY_LABELS[event.category]}
        </span>
        {isFree && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
            Free
          </span>
        )}
        {event.neighborhood && (
          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {event.neighborhood}
          </span>
        )}
      </div>

      {/* Why This Is For You - Personalization */}
      {personalizationReason && (
        <div className="mb-4 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
          <p className="text-sm text-primary font-medium">
            Why this fits you: {personalizationReason}
          </p>
        </div>
      )}

      {/* Title */}
      <h1 className="mb-2 text-3xl font-bold text-slate-900">{event.title}</h1>

      {/* Social Signals */}
      {((event.saveCount && event.saveCount > 0) || (event.doneCount && event.doneCount > 0)) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          {event.saveCount && event.saveCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {event.saveCount} {event.saveCount === 1 ? "person" : "people"} saved this
            </span>
          )}
          {event.doneCount && event.doneCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {event.doneCount} marked as done
            </span>
          )}
        </div>
      )}

      {/* Time Awareness - Relative Date Display */}
      <div className="mb-6 flex items-center gap-3 text-slate-600">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{relativeDate.label}</span>
            {relativeDate.sublabel && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {relativeDate.sublabel}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500">{formatDateTime(event.startTime)}</div>
          {event.endTime && (
            <div className="text-sm text-slate-500">
              Until {formatTime(event.endTime)}
            </div>
          )}
        </div>
      </div>

      {/* Venue & Address */}
      <div className="mb-6 flex items-start gap-3 text-slate-600">
        <svg className="mt-0.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div>
          <div className="font-medium">{event.venueName}</div>
          <div className="text-sm text-slate-500">{event.address}</div>
        </div>
      </div>

      {/* Venue Ratings & Info (from Place data) */}
      {event.place && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          {event.place.googleRating && (
            <span className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-blue-700">
              <svg className="h-3.5 w-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {event.place.googleRating.toFixed(1)}
              {event.place.googleReviewCount && (
                <span className="text-blue-500">({event.place.googleReviewCount.toLocaleString()})</span>
              )}
            </span>
          )}
          {event.place.priceLevel && (
            <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-emerald-700">
              {"$".repeat(event.place.priceLevel)}
              <span className="text-emerald-300">{"$".repeat(4 - event.place.priceLevel)}</span>
            </span>
          )}
        </div>
      )}

      {/* Price (if not free) */}
      {!isFree && (
        <div className="mb-6 flex items-center gap-3 text-slate-600">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">{event.priceRange}</span>
        </div>
      )}

      {/* Who Is This For - Vibe & Companion Tags */}
      {event.place && (event.place.vibeTags?.length || event.place.companionTags?.length) && (
        <div className="mb-6 rounded-lg bg-slate-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Good for</h3>
          <div className="flex flex-wrap gap-2">
            {event.place.companionTags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-700"
              >
                {tag}
              </span>
            ))}
            {event.place.vibeTags?.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700"
              >
                {tag}
              </span>
            ))}
          </div>
          {event.place.pulseDescription && (
            <p className="mt-3 text-sm text-slate-600 italic">{event.place.pulseDescription}</p>
          )}
        </div>
      )}

      {/* Action Buttons - Row 1: Primary Actions */}
      <div className="mb-4 flex flex-wrap gap-3">
        <button
          onClick={handleToggleWant}
          disabled={isLoading}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium transition ${
            status === "WANT"
              ? "bg-primary text-white hover:bg-primary-dark"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          } disabled:opacity-50`}
        >
          <svg
            className="h-5 w-5"
            fill={status === "WANT" ? "currentColor" : "none"}
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
          {status === "WANT" ? "Saved" : "Want to do"}
        </button>

        <button
          onClick={handleToggleDone}
          disabled={isLoading}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium transition ${
            status === "DONE"
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          } disabled:opacity-50`}
        >
          <svg
            className="h-5 w-5"
            fill={status === "DONE" ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {status === "DONE" ? "Done!" : "Mark as done"}
        </button>
      </div>

      {/* Calendar Nudge - appears after saving */}
      {showCalendarNudge && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-blue-900">Add to your calendar?</p>
              <p className="text-sm text-blue-700">Don't forget about this event</p>
            </div>
            <button
              onClick={() => setShowCalendarNudge(false)}
              className="text-blue-400 hover:text-blue-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => handleAddToCalendar("google")}
              className="rounded-md bg-white border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              Google Calendar
            </button>
            <button
              onClick={() => handleAddToCalendar("apple")}
              className="rounded-md bg-white border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              Apple Calendar
            </button>
            <button
              onClick={() => setShowCalendarNudge(false)}
              className="text-sm text-blue-600 hover:underline"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons - Row 2: Secondary Actions */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {/* Add to My Calendar (Pulse) */}
        <div className="relative" ref={pulseCalendarMenuRef}>
          <button
            onClick={() => setShowPulseCalendarMenu(!showPulseCalendarMenu)}
            disabled={addingToCalendar}
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
              calendarStatus
                ? calendarStatus === "GOING"
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                : "bg-primary text-white hover:bg-primary/90"
            } disabled:opacity-50`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {calendarStatus === "GOING" ? "Going ✓" : calendarStatus === "MAYBE" ? "Maybe" : "Add to My Calendar"}
          </button>
          {showPulseCalendarMenu && (
            <div className="absolute top-full left-0 mt-2 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
              <button
                onClick={() => handleAddToPulseCalendar("GOING")}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                  calendarStatus === "GOING" ? "text-green-700 bg-green-50" : "text-slate-700"
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Going
              </button>
              <button
                onClick={() => handleAddToPulseCalendar("MAYBE")}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                  calendarStatus === "MAYBE" ? "text-yellow-700 bg-yellow-50" : "text-slate-700"
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Maybe
              </button>
            </div>
          )}
        </div>

        {/* Invite Friends */}
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Invite Friends
        </button>

        {/* External Calendar Dropdown */}
        <div className="relative" ref={calendarMenuRef}>
          <button
            onClick={() => setShowCalendarMenu(!showCalendarMenu)}
            className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          {showCalendarMenu && (
            <div className="absolute top-full left-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
              <button
                onClick={() => handleAddToCalendar("google")}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Google Calendar
              </button>
              <button
                onClick={() => handleAddToCalendar("outlook")}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Outlook
              </button>
              <button
                onClick={() => handleAddToCalendar("apple")}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Apple Calendar
              </button>
            </div>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {copied ? "Copied!" : "Share"}
        </button>

        {/* Tuning Controls Dropdown */}
        <div className="relative ml-auto" ref={moreMenuRef}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-200 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Tune
          </button>
          {showMoreMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
              <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase">Tune recommendations</div>
              <button
                onClick={() => handleFeedback("MORE")}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                More like this
              </button>
              <button
                onClick={() => handleFeedback("LESS")}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
                Less like this
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={handleCopyLink}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feedback toast */}
      {feedbackGiven && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-center text-sm text-green-700">
          {feedbackGiven === "MORE" ? "We'll show you more like this" : "We'll show you less like this"}
        </div>
      )}

      {/* Map Links */}
      <div className="mb-6 flex flex-wrap gap-3">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          Open in Google Maps
        </a>
        <a
          href={appleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          Open in Apple Maps
        </a>
      </div>

      {/* Tags (secondary, smaller) */}
      {event.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {event.tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      <div className="border-t border-slate-100 pt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">About this event</h2>
        <p className="whitespace-pre-line text-slate-600">{event.description}</p>
      </div>

      {/* Rating/Reflection Placeholder - shows for DONE events */}
      {status === "DONE" && (
        <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <h3 className="font-medium text-amber-900">How was it?</h3>
          <p className="mt-1 text-sm text-amber-700">
            Ratings and reflections coming soon! This will help us improve your recommendations.
          </p>
        </div>
      )}

      {/* Source */}
      <div className="mt-6 text-sm text-slate-400">
        Source:{" "}
        {event.sourceUrl ? (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary hover:underline"
          >
            {event.source}
          </a>
        ) : (
          event.source
        )}
      </div>

      {/* Going With Modal */}
      {showGoingWithModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Who are you going with?</h3>
            <div className="grid grid-cols-2 gap-3">
              {GOING_WITH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSaveWithGoingWith(option.value)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition"
                >
                  <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">{option.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => handleSaveWithGoingWith()}
              className="w-full mt-4 text-sm text-slate-500 hover:text-primary"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Invite Friends Modal */}
      <InviteFriendsModal
        eventId={event.id}
        eventTitle={event.title}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
}
