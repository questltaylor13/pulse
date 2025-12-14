"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Category, GoingWith } from "@prisma/client";
import {
  addToCalendar,
  shareEvent,
  copyEventLink,
  getEventShareUrl,
  CalendarProvider,
} from "@/lib/calendar";
import ScoreBadge from "@/components/ScoreBadge";
import { FriendsGoingBadge } from "@/components/FriendsGoingBadge";
import { DogFriendlyBadge, SoberFriendlyBadge } from "@/components/badges";

interface FriendUser {
  id: string;
  name: string | null;
  username: string | null;
  profileImageUrl: string | null;
}

interface UserList {
  id: string;
  name: string;
  isDefault: boolean;
}

interface CreatorFeature {
  influencer: {
    id: string;
    handle: string;
    displayName: string;
    profileImageUrl: string | null;
    profileColor?: string | null;
  };
  quote: string;
  isFeatured: boolean;
  isHost: boolean;
}

interface PlaceData {
  id: string;
  googleMapsUrl?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  priceLevel?: number | null;
  combinedScore?: number | null;
  vibeTags?: string[];
  companionTags?: string[];
  pulseDescription?: string | null;
  primaryImageUrl?: string | null;
  isDogFriendly?: boolean;
  dogFriendlyNotes?: string | null;
  isDrinkingOptional?: boolean;
  isAlcoholFree?: boolean;
  hasMocktailMenu?: boolean;
  soberFriendlyNotes?: string | null;
}

interface ScoreBreakdown {
  companionScore?: number;
  vibeScore?: number;
  socialScore?: number;
  budgetScore?: number;
  timingScore?: number;
}

type ReasonType =
  | "CATEGORY_MATCH"
  | "NEIGHBORHOOD_MATCH"
  | "SIMILAR_TASTE"
  | "TRENDING"
  | "WEEKEND_PREFERENCE"
  | "TIME_PREFERENCE"
  | "VENUE_FAVORITE"
  | "EXPLORATION"
  | "HIGH_RATED"
  | "FREE_EVENT"
  | "GOING_WITH_MATCH"
  | "DATE_NIGHT_MATCH"
  | "FRIENDS_MATCH"
  | "FAMILY_MATCH"
  | "SOLO_MATCH"
  | "VIBE_MATCH"
  | "SOCIAL_MATCH"
  | "BUDGET_MATCH";

interface EventCardProps {
  id: string;
  title: string;
  description: string;
  category: Category;
  venueName: string;
  address: string;
  neighborhood?: string | null;
  startTime: Date | string;
  endTime?: Date | string | null;
  priceRange: string;
  source: string;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  score?: number;
  scoreBreakdown?: ScoreBreakdown;
  reasonType?: ReasonType;
  googleRating?: number | null;
  googleRatingCount?: number | null;
  appleRating?: number | null;
  appleRatingCount?: number | null;
  place?: PlaceData | null;
  isSaved?: boolean;
  isLiked?: boolean;
  recommendationReason?: string;
  isExplorationPick?: boolean;
  isTrendingPick?: boolean;
  onSave?: (eventId: string, goingWith?: GoingWith) => Promise<void>;
  onUnsave?: (eventId: string) => Promise<void>;
  onLike?: (eventId: string) => Promise<void>;
  onUnlike?: (eventId: string) => Promise<void>;
  onFeedback?: (eventId: string, type: "MORE" | "LESS" | "HIDE") => Promise<void>;
  creatorFeatures?: CreatorFeature[];
  compact?: boolean;
  friendsGoing?: FriendUser[];
  // Dog-friendly and sober-friendly
  isDogFriendly?: boolean;
  dogFriendlyDetails?: string | null;
  isDrinkingOptional?: boolean;
  isAlcoholFree?: boolean;
  soberFriendlyNotes?: string | null;
}

// Category emoji mapping
const CATEGORY_EMOJI: Record<Category, string> = {
  ART: "🎨",
  LIVE_MUSIC: "🎵",
  BARS: "🍺",
  FOOD: "🍽️",
  COFFEE: "☕",
  OUTDOORS: "🏔️",
  FITNESS: "💪",
  SEASONAL: "🎄",
  POPUP: "✨",
  OTHER: "📍",
  RESTAURANT: "🍽️",
  ACTIVITY_VENUE: "🎯",
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

const GOING_WITH_OPTIONS: { value: GoingWith; label: string; icon: string }[] = [
  { value: "SOLO", label: "Solo", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { value: "DATE", label: "Date", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  { value: "FRIENDS", label: "Friends", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { value: "FAMILY", label: "Family", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
];

function formatDateTime(start: Date | string, end?: Date | string | null): string {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const dateStr = startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (end) {
    const endDate = typeof end === "string" ? new Date(end) : end;
    const endTime = endDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${dateStr} • ${startTime} - ${endTime}`;
  }

  return `${dateStr} • ${startTime}`;
}

export default function EventCard({
  id,
  title,
  description,
  category,
  venueName,
  address,
  neighborhood,
  startTime,
  endTime,
  priceRange,
  source,
  sourceUrl,
  imageUrl,
  score,
  googleRating,
  googleRatingCount,
  place,
  isSaved: initialSaved = false,
  isLiked: initialLiked = false,
  isExplorationPick,
  isTrendingPick,
  onSave,
  onUnsave,
  onLike,
  onUnlike,
  onFeedback,
  creatorFeatures,
  compact = false,
  friendsGoing,
  isDogFriendly,
  dogFriendlyDetails,
  isDrinkingOptional,
  isAlcoholFree,
  soberFriendlyNotes,
}: EventCardProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isLoading, setIsLoading] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showGoingWithModal, setShowGoingWithModal] = useState(false);
  const [showCalendarSubmenu, setShowCalendarSubmenu] = useState(false);
  const [lists, setLists] = useState<UserList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [showListSubmenu, setShowListSubmenu] = useState(false);
  const [addedToList, setAddedToList] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<"GOING" | "MAYBE" | null>(null);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
        setShowCalendarSubmenu(false);
        setShowListSubmenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLists = async () => {
    if (lists.length > 0) return;
    setListsLoading(true);
    try {
      const response = await fetch("/api/lists");
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists);
      }
    } catch (error) {
      console.error("Failed to fetch lists:", error);
    } finally {
      setListsLoading(false);
    }
  };

  const handleAddToList = async (listId: string) => {
    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id }),
      });
      if (response.ok) {
        const data = await response.json();
        setAddedToList(data.action === "already_added" ? "Already in list" : "Added!");
        setTimeout(() => {
          setAddedToList(null);
          setShowMoreMenu(false);
          setShowListSubmenu(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to add to list:", error);
    }
  };

  const handleQuickSave = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (isSaved) {
        await onUnsave?.(id);
        setIsSaved(false);
      } else {
        await onSave?.(id);
        setIsSaved(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeToggle = async () => {
    setShowMoreMenu(false);
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (isLiked) {
        await onUnlike?.(id);
        setIsLiked(false);
      } else {
        await onLike?.(id);
        setIsLiked(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (type: "MORE" | "LESS" | "HIDE") => {
    setShowMoreMenu(false);
    if (type === "HIDE") {
      setIsHidden(true);
    }
    await onFeedback?.(id, type);
  };

  const handleAddToCalendar = (provider: CalendarProvider) => {
    setShowMoreMenu(false);
    setShowCalendarSubmenu(false);
    const startDate = typeof startTime === "string" ? new Date(startTime) : startTime;
    const endDate = endTime
      ? typeof endTime === "string"
        ? new Date(endTime)
        : endTime
      : null;

    addToCalendar(
      {
        title,
        description,
        location: `${venueName}, ${address}`,
        startTime: startDate,
        endTime: endDate,
        url: getEventShareUrl(id),
      },
      provider
    );
  };

  const handleAddToPulseCalendar = async (status: "GOING" | "MAYBE") => {
    setShowMoreMenu(false);
    setShowCalendarSubmenu(false);
    setAddingToCalendar(true);
    try {
      const res = await fetch("/api/calendar/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id, calendarStatus: status }),
      });
      if (res.ok) {
        setCalendarStatus(status);
        // Also mark as saved if not already
        if (!isSaved) {
          setIsSaved(true);
        }
      }
    } catch (error) {
      console.error("Failed to add to calendar:", error);
    } finally {
      setAddingToCalendar(false);
    }
  };

  const handleShare = async () => {
    setShowMoreMenu(false);
    const url = getEventShareUrl(id);
    const shared = await shareEvent({
      title,
      text: `Check out ${title} at ${venueName}`,
      url,
    });

    if (shared) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    setShowMoreMenu(false);
    const url = getEventShareUrl(id);
    const success = await copyEventLink(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isHidden) {
    return (
      <article className="bg-white rounded-xl border border-slate-100 text-center py-6">
        <p className="text-slate-500 text-sm mb-2">Event hidden</p>
        <button
          onClick={() => setIsHidden(false)}
          className="text-sm text-primary hover:underline"
        >
          Undo
        </button>
      </article>
    );
  }

  // Get best rating to display (prefer Google)
  const displayRating = googleRating || place?.googleRating;
  const displayRatingCount = googleRatingCount || place?.googleReviewCount;

  return (
    <article className="bg-white rounded-xl border border-slate-100 hover:shadow-md transition-shadow relative">
      {/* Image - Compact height */}
      {imageUrl && (
        <Link href={`/events/${id}`} className="block">
          <div className={`relative overflow-hidden ${compact ? "h-28" : "h-36"}`}>
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-transform hover:scale-105"
            />
            {/* Special badges on image */}
            {(isExplorationPick || isTrendingPick || (creatorFeatures && creatorFeatures.length > 0)) && (
              <div className="absolute top-2 right-2">
                {creatorFeatures && creatorFeatures.length > 0 && (
                  <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Pick
                  </span>
                )}
                {isTrendingPick && !creatorFeatures?.length && (
                  <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                    Trending
                  </span>
                )}
                {isExplorationPick && !creatorFeatures?.length && !isTrendingPick && (
                  <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                    New
                  </span>
                )}
              </div>
            )}
          </div>
        </Link>
      )}

      <div className={compact ? "p-3" : "p-4"}>
        {/* Line 1: Category + Neighborhood + Score */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm">
            <span className="font-medium text-slate-900">
              {CATEGORY_EMOJI[category]} {CATEGORY_LABELS[category]}
            </span>
            {neighborhood && (
              <>
                <span className="mx-1.5 text-slate-300">•</span>
                <span className="text-slate-500">{neighborhood}</span>
              </>
            )}
          </span>
          {score !== undefined && score >= 50 && (
            <ScoreBadge score={score} size="sm" showLabel={false} />
          )}
        </div>

        {/* Title */}
        <Link href={`/events/${id}`}>
          <h3 className={`font-semibold text-slate-900 hover:text-primary transition line-clamp-2 ${
            compact ? "text-sm mb-1" : "text-base mb-2"
          }`}>
            {title}
          </h3>
        </Link>

        {/* Description - 2 lines max, hidden in compact */}
        {!compact && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-3">{description}</p>
        )}

        {/* Meta Info - Compact */}
        <div className={`space-y-1 text-sm text-slate-500 ${compact ? "mb-2" : "mb-3"}`}>
          <div className="flex items-center">
            <svg className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{formatDateTime(startTime, compact ? null : endTime)}</span>
          </div>
          <div className="flex items-center">
            <svg className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{venueName}</span>
          </div>
          {!compact && (
            <>
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {priceRange.toLowerCase() === "free" ? (
                  <span className="text-green-600 font-medium">Free</span>
                ) : (
                  <span>{priceRange}</span>
                )}
              </div>
              {displayRating && (
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-medium">{displayRating.toFixed(1)}</span>
                  {displayRatingCount && (
                    <span className="text-slate-400 ml-1">({displayRatingCount.toLocaleString()})</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Lifestyle Badges (Dog-Friendly, Sober-Friendly) */}
        {(isDogFriendly || isAlcoholFree || isDrinkingOptional) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {isDogFriendly && (
              <DogFriendlyBadge details={dogFriendlyDetails} size={compact ? "sm" : "md"} />
            )}
            {isAlcoholFree && (
              <SoberFriendlyBadge type="alcohol-free" notes={soberFriendlyNotes} size={compact ? "sm" : "md"} />
            )}
            {isDrinkingOptional && !isAlcoholFree && (
              <SoberFriendlyBadge type="optional" notes={soberFriendlyNotes} size={compact ? "sm" : "md"} />
            )}
          </div>
        )}

        {/* Friends Going */}
        {friendsGoing && friendsGoing.length > 0 && (
          <div className="mb-3">
            <FriendsGoingBadge friends={friendsGoing} size={compact ? "sm" : "md"} />
          </div>
        )}

        {/* Actions: Save + Ellipsis Menu */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            onClick={handleQuickSave}
            disabled={isLoading}
            className={`flex items-center gap-1.5 rounded-lg font-medium transition ${
              compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
            } ${
              isSaved
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            } disabled:opacity-50`}
          >
            <svg className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {isSaved ? "Saved" : "Save"}
          </button>

          {/* Ellipsis Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 transition"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </button>

            {showMoreMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-52 rounded-xl bg-white border border-slate-200 shadow-lg z-50 py-1">
                {/* Like */}
                <button
                  onClick={handleLikeToggle}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <svg className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : "text-slate-400"}`} fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {isLiked ? "Unlike" : "Like"}
                </button>

                {/* Add to Calendar */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowCalendarSubmenu(!showCalendarSubmenu);
                      setShowListSubmenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="flex items-center gap-3">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {calendarStatus ? (calendarStatus === "GOING" ? "Going ✓" : "Maybe") : "Add to Calendar"}
                    </span>
                  </button>
                  {showCalendarSubmenu && (
                    <div className="absolute right-full top-0 mr-1 w-44 rounded-lg bg-white border border-slate-200 shadow-lg py-1 z-50">
                      <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase">My Calendar</div>
                      <button
                        onClick={() => handleAddToPulseCalendar("GOING")}
                        disabled={addingToCalendar}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                          calendarStatus === "GOING" ? "text-green-700 bg-green-50" : "text-slate-700"
                        }`}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        I&apos;m Going
                      </button>
                      <button
                        onClick={() => handleAddToPulseCalendar("MAYBE")}
                        disabled={addingToCalendar}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                          calendarStatus === "MAYBE" ? "text-yellow-700 bg-yellow-50" : "text-slate-700"
                        }`}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Maybe
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase">Export</div>
                      <button onClick={() => handleAddToCalendar("google")} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                        Google Calendar
                      </button>
                      <button onClick={() => handleAddToCalendar("apple")} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                        Apple Calendar
                      </button>
                      <button onClick={() => handleAddToCalendar("outlook")} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                        Outlook
                      </button>
                    </div>
                  )}
                </div>

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {copied ? "Copied!" : "Share"}
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* Add to List */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowListSubmenu(!showListSubmenu);
                      setShowCalendarSubmenu(false);
                      if (!showListSubmenu) fetchLists();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="flex items-center gap-3">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Add to List
                    </span>
                  </button>
                  {showListSubmenu && (
                    <div className="absolute right-full top-0 mr-1 w-44 rounded-lg bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto z-50">
                      {addedToList ? (
                        <div className="px-4 py-2 text-sm text-green-600 font-medium">{addedToList}</div>
                      ) : listsLoading ? (
                        <div className="px-4 py-2 text-sm text-slate-500">Loading...</div>
                      ) : lists.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-slate-500">No lists yet</div>
                      ) : (
                        lists.map((list) => (
                          <button
                            key={list.id}
                            onClick={() => handleAddToList(list.id)}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 truncate"
                          >
                            {list.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Suggest to Group - simplified */}
                <Link
                  href={`/groups?suggest=${id}`}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                  onClick={() => setShowMoreMenu(false)}
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Suggest to Group
                </Link>

                <div className="border-t border-slate-100 my-1" />

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </button>

                {/* Hide */}
                <button
                  onClick={() => handleFeedback("HIDE")}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                  Hide this event
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Source - Subtle */}
        {!compact && source && (
          <div className="text-xs text-slate-400 mt-3">
            via{" "}
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 hover:underline">
                {source}
              </a>
            ) : (
              source
            )}
          </div>
        )}
      </div>

      {/* Going With Modal */}
      {showGoingWithModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Who are you going with?</h3>
            <div className="grid grid-cols-2 gap-3">
              {GOING_WITH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={async () => {
                    setShowGoingWithModal(false);
                    setIsLoading(true);
                    try {
                      await onSave?.(id, option.value);
                      setIsSaved(true);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
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
              onClick={() => {
                setShowGoingWithModal(false);
                handleQuickSave();
              }}
              className="w-full mt-4 text-sm text-slate-500 hover:text-primary"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
