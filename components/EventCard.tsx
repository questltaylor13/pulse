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
import AddToGroupDropdown from "@/components/AddToGroupDropdown";

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
  googleMapsUrl: string;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  priceLevel?: number | null;
  combinedScore?: number | null;
  vibeTags?: string[];
  companionTags?: string[];
  pulseDescription?: string | null;
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

const GOING_WITH_OPTIONS: { value: GoingWith; label: string; icon: string }[] = [
  { value: "SOLO", label: "Solo", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { value: "DATE", label: "Date", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  { value: "FRIENDS", label: "Friends", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { value: "FAMILY", label: "Family", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
];

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getCombinedRating(
  googleRating?: number | null,
  appleRating?: number | null
): number | null {
  if (googleRating && appleRating) {
    return Math.round(((googleRating + appleRating) / 2) * 10) / 10;
  }
  return googleRating || appleRating || null;
}

// Preference match badge config
const PREFERENCE_BADGES: Record<ReasonType, { emoji: string; label: string; color: string } | null> = {
  DATE_NIGHT_MATCH: { emoji: "💕", label: "Date Night", color: "bg-pink-100 text-pink-700" },
  FRIENDS_MATCH: { emoji: "👯", label: "Friends", color: "bg-blue-100 text-blue-700" },
  FAMILY_MATCH: { emoji: "👨‍👩‍👧", label: "Family", color: "bg-green-100 text-green-700" },
  SOLO_MATCH: { emoji: "🧘", label: "Solo", color: "bg-purple-100 text-purple-700" },
  VIBE_MATCH: { emoji: "✨", label: "Your Vibe", color: "bg-amber-100 text-amber-700" },
  SOCIAL_MATCH: { emoji: "🤝", label: "Social", color: "bg-cyan-100 text-cyan-700" },
  BUDGET_MATCH: { emoji: "💰", label: "In Budget", color: "bg-emerald-100 text-emerald-700" },
  GOING_WITH_MATCH: null,
  CATEGORY_MATCH: null,
  NEIGHBORHOOD_MATCH: null,
  SIMILAR_TASTE: null,
  TRENDING: null,
  WEEKEND_PREFERENCE: null,
  TIME_PREFERENCE: null,
  VENUE_FAVORITE: null,
  EXPLORATION: null,
  HIGH_RATED: null,
  FREE_EVENT: null,
};

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
  scoreBreakdown,
  reasonType,
  googleRating,
  googleRatingCount,
  appleRating,
  appleRatingCount,
  place,
  isSaved: initialSaved = false,
  isLiked: initialLiked = false,
  recommendationReason,
  isExplorationPick,
  isTrendingPick,
  onSave,
  onUnsave,
  onLike,
  onUnlike,
  onFeedback,
  creatorFeatures,
}: EventCardProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isLoading, setIsLoading] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [showGoingWithModal, setShowGoingWithModal] = useState(false);
  const [lists, setLists] = useState<UserList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [addedToList, setAddedToList] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<"MORE" | "LESS" | null>(null);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const calendarMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowListDropdown(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (calendarMenuRef.current && !calendarMenuRef.current.contains(event.target as Node)) {
        setShowCalendarMenu(false);
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
          setShowListDropdown(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to add to list:", error);
    }
  };

  const handleListDropdownToggle = () => {
    const newState = !showListDropdown;
    setShowListDropdown(newState);
    if (newState) fetchLists();
  };

  const handleSaveToggle = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (isSaved) {
        await onUnsave?.(id);
        setIsSaved(false);
      } else {
        // Show going with modal first
        setShowGoingWithModal(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWithGoingWith = async (goingWith: GoingWith) => {
    setShowGoingWithModal(false);
    setIsLoading(true);
    try {
      await onSave?.(id, goingWith);
      setIsSaved(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSave = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onSave?.(id);
      setIsSaved(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeToggle = async () => {
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
    } else {
      setFeedbackGiven(type);
      setTimeout(() => setFeedbackGiven(null), 2000);
    }
    await onFeedback?.(id, type);
  };

  const handleAddToCalendar = (provider: CalendarProvider) => {
    setShowCalendarMenu(false);
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

  const handleShare = async () => {
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
    const url = getEventShareUrl(id);
    const success = await copyEventLink(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isHidden) {
    return (
      <article className="card bg-slate-50 text-center py-8">
        <p className="text-slate-500 mb-2">Event hidden</p>
        <button
          onClick={() => setIsHidden(false)}
          className="text-sm text-primary hover:underline"
        >
          Undo
        </button>
      </article>
    );
  }

  // Get the best available image (event image, place image, or fallback gradient)
  const displayImageUrl = imageUrl || place?.pulseDescription; // place.primaryImageUrl would need to be added to PlaceData

  return (
    <article className="card group relative overflow-hidden transition hover:shadow-md">
      {/* Event Image */}
      {imageUrl && (
        <Link href={`/events/${id}`} className="block -mx-4 -mt-4 mb-4">
          <div className="relative h-40 overflow-hidden">
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition group-hover:scale-105"
            />
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

            {/* Special badges - positioned on image */}
            {(isExplorationPick || isTrendingPick || (creatorFeatures && creatorFeatures.length > 0)) && (
              <div className="absolute top-0 right-0">
                {creatorFeatures && creatorFeatures.length > 0 && (
                  <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-medium px-2 py-1 rounded-bl-lg flex items-center gap-1">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Creator Pick
                  </span>
                )}
                {isTrendingPick && !creatorFeatures?.length && (
                  <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-medium px-2 py-1 rounded-bl-lg">
                    Trending
                  </span>
                )}
                {isExplorationPick && !creatorFeatures?.length && !isTrendingPick && (
                  <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-medium px-2 py-1 rounded-bl-lg">
                    Try New
                  </span>
                )}
              </div>
            )}
          </div>
        </Link>
      )}

      {/* Special badges - when no image */}
      {!imageUrl && (isExplorationPick || isTrendingPick || (creatorFeatures && creatorFeatures.length > 0)) && (
        <div className="absolute top-0 right-0">
          {creatorFeatures && creatorFeatures.length > 0 && (
            <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-medium px-2 py-1 rounded-bl-lg flex items-center gap-1">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Creator Pick
            </span>
          )}
          {isTrendingPick && !creatorFeatures?.length && (
            <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-medium px-2 py-1 rounded-bl-lg">
              Trending
            </span>
          )}
          {isExplorationPick && !creatorFeatures?.length && !isTrendingPick && (
            <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-medium px-2 py-1 rounded-bl-lg">
              Try New
            </span>
          )}
        </div>
      )}

      {/* Creator hosts section */}
      {creatorFeatures && creatorFeatures.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex -space-x-2">
            {creatorFeatures.slice(0, 3).map((feature) => (
              <Link
                key={feature.influencer.id}
                href={`/influencers/${feature.influencer.handle}`}
                className="relative h-8 w-8 rounded-full overflow-hidden border-2 border-white shadow-sm hover:z-10 transition-transform hover:scale-110"
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
                  <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-600">
                    {feature.influencer.displayName.charAt(0)}
                  </div>
                )}
              </Link>
            ))}
          </div>
          <div className="text-xs text-slate-600">
            <span className="font-medium">
              {creatorFeatures.some(f => f.isHost) ? "Hosted by " : "Featured by "}
            </span>
            {creatorFeatures.map((feature, idx) => (
              <span key={feature.influencer.id}>
                <Link
                  href={`/influencers/${feature.influencer.handle}`}
                  className="text-primary hover:underline font-medium"
                >
                  @{feature.influencer.handle}
                </Link>
                {idx < creatorFeatures.length - 1 && (
                  idx === creatorFeatures.length - 2 ? " & " : ", "
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category & Neighborhood badges */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${CATEGORY_COLORS[category]}`}
          >
            {CATEGORY_LABELS[category]}
          </span>
          {neighborhood && (
            <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {neighborhood}
            </span>
          )}
        </div>
        {score !== undefined && (
          <span className="text-xs text-slate-400">Score: {score}</span>
        )}
      </div>

      {/* Preference match badges */}
      {(reasonType || scoreBreakdown) && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {/* Primary reason badge */}
          {reasonType && PREFERENCE_BADGES[reasonType] && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${PREFERENCE_BADGES[reasonType]!.color}`}>
              <span>{PREFERENCE_BADGES[reasonType]!.emoji}</span>
              {PREFERENCE_BADGES[reasonType]!.label}
            </span>
          )}
          {/* Secondary badges based on score breakdown */}
          {scoreBreakdown?.companionScore && scoreBreakdown.companionScore >= 10 && !reasonType?.includes("MATCH") && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
              <span>👥</span>
              Match
            </span>
          )}
          {scoreBreakdown?.vibeScore && scoreBreakdown.vibeScore >= 12 && reasonType !== "VIBE_MATCH" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              <span>✨</span>
              Vibe
            </span>
          )}
          {scoreBreakdown?.budgetScore && scoreBreakdown.budgetScore > 0 && reasonType !== "BUDGET_MATCH" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <span>💰</span>
              Free
            </span>
          )}
          {scoreBreakdown?.socialScore && scoreBreakdown.socialScore >= 10 && reasonType !== "SOCIAL_MATCH" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700">
              <span>🤝</span>
              Social
            </span>
          )}
        </div>
      )}

      {/* Recommendation reason */}
      {recommendationReason && (
        <p className="mb-2 text-xs text-primary/80 font-medium">
          {recommendationReason}
        </p>
      )}

      {/* Title */}
      <Link href={`/events/${id}`}>
        <h3 className="mb-2 text-lg font-semibold text-slate-900 line-clamp-2 hover:text-primary transition">
          {title}
        </h3>
      </Link>

      {/* Description */}
      <p className="mb-4 text-sm text-slate-600 line-clamp-2">{description}</p>

      {/* Event details */}
      <div className="mb-4 space-y-2 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {formatDate(startTime)} at {formatTime(startTime)}
            {endTime && ` - ${formatTime(endTime)}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="line-clamp-1">{venueName}</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{priceRange}</span>
        </div>
      </div>

      {/* Place Vibe Tags & Description */}
      {place && (place.vibeTags?.length || place.pulseDescription) && (
        <div className="mb-3">
          {place.vibeTags && place.vibeTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {place.vibeTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600"
                >
                  {tag}
                </span>
              ))}
              {place.companionTags && place.companionTags.length > 0 && (
                place.companionTags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="inline-block rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-600"
                  >
                    {tag}
                  </span>
                ))
              )}
            </div>
          )}
          {place.pulseDescription && (
            <p className="text-xs text-slate-500 italic line-clamp-2">
              {place.pulseDescription}
            </p>
          )}
        </div>
      )}

      {/* Location Ratings */}
      {(googleRating || appleRating || place?.googleRating) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          {(googleRating || place?.googleRating) && (
            <span className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-blue-700">
              <svg className="h-3 w-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {(googleRating || place?.googleRating)?.toFixed(1)}
              {(googleRatingCount || place?.googleReviewCount) && (
                <span className="text-blue-500">({(googleRatingCount || place?.googleReviewCount)?.toLocaleString()})</span>
              )}
            </span>
          )}
          {place?.priceLevel && (
            <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-emerald-700">
              {"$".repeat(place.priceLevel)}
              <span className="text-emerald-400">{"$".repeat(4 - place.priceLevel)}</span>
            </span>
          )}
          {googleRating && appleRating && (
            <span className="flex items-center gap-1 rounded bg-green-50 px-2 py-1 font-medium text-green-700">
              {getCombinedRating(googleRating, appleRating)} Combined
            </span>
          )}
          {place?.googleMapsUrl && (
            <a
              href={place.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded bg-slate-50 px-2 py-1 text-slate-600 hover:bg-slate-100 transition"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Map
            </a>
          )}
        </div>
      )}

      {/* Source */}
      <div className="mb-4 text-xs text-slate-400">
        via{" "}
        {sourceUrl ? (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
            {source}
          </a>
        ) : (
          source
        )}
      </div>

      {/* Actions Row 1: Save, Like, Calendar, Share */}
      <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
        <button
          onClick={isSaved ? handleSaveToggle : handleQuickSave}
          disabled={isLoading}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            isSaved
              ? "bg-primary text-white hover:bg-primary-dark"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          } disabled:opacity-50`}
        >
          <svg className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          {isSaved ? "Saved" : "Save"}
        </button>

        <button
          onClick={handleLikeToggle}
          disabled={isLoading}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            isLiked
              ? "bg-red-100 text-red-600 hover:bg-red-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          } disabled:opacity-50`}
        >
          <svg className="h-4 w-4" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* Calendar Dropdown */}
        <div className="relative" ref={calendarMenuRef}>
          <button
            onClick={() => setShowCalendarMenu(!showCalendarMenu)}
            className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-200 transition"
            title="Add to calendar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          {showCalendarMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
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
          className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-200 transition"
          title={copied ? "Copied!" : "Share"}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>

        {/* Add to List Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleListDropdownToggle}
            className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-200 transition"
            title="Add to list"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {showListDropdown && (
            <div className="absolute bottom-full left-0 mb-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
              {addedToList ? (
                <div className="px-3 py-2 text-sm text-green-600 font-medium">{addedToList}</div>
              ) : listsLoading ? (
                <div className="px-3 py-2 text-sm text-slate-500">Loading...</div>
              ) : lists.length === 0 ? (
                <div className="px-3 py-2">
                  <p className="text-sm text-slate-500 mb-2">No lists yet</p>
                  <Link href="/lists/new" className="text-sm text-primary hover:underline">Create a list</Link>
                </div>
              ) : (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase">Add to list</div>
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => handleAddToList(list.id)}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      {list.isDefault && (
                        <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      )}
                      <span className="truncate">{list.name}</span>
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <Link href="/lists/new" className="block w-full px-3 py-2 text-left text-sm text-primary hover:bg-slate-50">
                      + Create new list
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Add to Group Dropdown */}
        <AddToGroupDropdown itemId={id} itemType="event" />

        {/* More Menu (Tuning Controls) */}
        <div className="relative ml-auto" ref={moreMenuRef}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="flex items-center rounded-md bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 transition"
            title="More options"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {showMoreMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
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
                onClick={() => handleFeedback("HIDE")}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                Hide this event
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
        <div className="mt-2 rounded-md bg-green-50 p-2 text-center text-sm text-green-700">
          {feedbackGiven === "MORE" ? "We'll show you more like this" : "We'll show you less like this"}
        </div>
      )}

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
