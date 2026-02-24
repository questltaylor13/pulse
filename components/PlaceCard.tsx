"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Category, ItemStatus } from "@prisma/client";
import { DogFriendlyBadge, SoberFriendlyBadge } from "@/components/badges";
import { setItemStatus, removeItemStatus } from "@/lib/actions/items";
import { CATEGORY_EMOJI, CATEGORY_LABELS } from "@/lib/constants/categories";

interface PlaceCardProps {
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  venueName: string;
  address: string;
  neighborhood?: string | null;
  priceRange: string;
  hours?: string | null;
  imageUrl?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  vibeTags?: string[];
  companionTags?: string[];
  status?: ItemStatus | null;
  onStatusChange?: (status: ItemStatus | null, removed?: boolean) => void;
  isNew?: boolean;
  isTrending?: boolean;
  // Dog-friendly and sober-friendly
  isDogFriendly?: boolean;
  dogFriendlyNotes?: string | null;
  isDrinkingOptional?: boolean;
  isAlcoholFree?: boolean;
  hasMocktailMenu?: boolean;
  soberFriendlyNotes?: string | null;
}

export default function PlaceCard({
  id,
  title,
  description,
  category,
  tags,
  venueName,
  address,
  neighborhood,
  priceRange,
  hours,
  imageUrl,
  googleRating,
  googleReviewCount,
  vibeTags = [],
  companionTags = [],
  status,
  onStatusChange,
  isNew,
  isTrending,
  isDogFriendly,
  dogFriendlyNotes,
  isDrinkingOptional,
  isAlcoholFree,
  hasMocktailMenu,
  soberFriendlyNotes,
}: PlaceCardProps) {
  const [currentStatus, setCurrentStatus] = useState<ItemStatus | null>(status || null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStatusChange = async (newStatus: ItemStatus | null, shouldRemove: boolean = false) => {
    if (isLoading) return;
    setIsLoading(true);
    setShowMoreMenu(false);

    try {
      if (newStatus === null) {
        await removeItemStatus(id);
      } else {
        await setItemStatus(id, newStatus);
      }

      setCurrentStatus(newStatus);
      onStatusChange?.(newStatus, shouldRemove);

      if (newStatus === "DONE") {
        setShowToast("Nice! Added to your Done list");
        setTimeout(() => setShowToast(null), 2000);
      } else if (newStatus === "PASS") {
        setShowToast("Got it, hidden from feed");
        setTimeout(() => setShowToast(null), 2000);
      }
    } catch {
      setShowToast("Failed to update. Please try again.");
      setTimeout(() => setShowToast(null), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWant = () => {
    if (currentStatus === "WANT") {
      handleStatusChange(null);
    } else {
      handleStatusChange("WANT");
    }
  };

  const handleDone = () => {
    handleStatusChange("DONE", true); // Remove from feed
  };

  const handlePass = () => {
    handleStatusChange("PASS", true); // Remove from feed
  };

  const handleShare = async () => {
    setShowMoreMenu(false);
    const url = `${window.location.origin}/places/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out ${title} in Denver`,
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShowToast("Link copied!");
      setTimeout(() => setShowToast(null), 2000);
    }
  };

  // Format price level
  const priceDisplay = priceRange || (
    <span className="text-slate-400">Price N/A</span>
  );

  return (
    <article className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow relative">
      {/* Toast */}
      {showToast && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {showToast}
        </div>
      )}

      {/* Image */}
      <Link href={`/places/${id}`} className="block">
        <div className="relative h-36 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-transform hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <span className="text-5xl opacity-30">
                {CATEGORY_EMOJI[category] || "📍"}
              </span>
            </div>
          )}

          {/* Badges on image */}
          {(isNew || isTrending) && (
            <div className="absolute top-2 right-2 flex gap-1">
              {isNew && (
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                  New
                </span>
              )}
              {isTrending && (
                <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                  Trending
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        {/* Line 1: Category + Neighborhood */}
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
        </div>

        {/* Title */}
        <Link href={`/places/${id}`}>
          <h3 className="font-semibold text-slate-900 hover:text-primary transition line-clamp-2 text-base mb-2">
            {title}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{description}</p>

        {/* Vibe/Companion Tags */}
        {(vibeTags.length > 0 || companionTags.length > 0) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {companionTags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-600"
              >
                {tag}
              </span>
            ))}
            {vibeTags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Lifestyle Badges (Dog-Friendly, Sober-Friendly) */}
        {(isDogFriendly || isAlcoholFree || isDrinkingOptional || hasMocktailMenu) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {isDogFriendly && (
              <DogFriendlyBadge details={dogFriendlyNotes} size="sm" />
            )}
            {isAlcoholFree && (
              <SoberFriendlyBadge type="alcohol-free" notes={soberFriendlyNotes} size="sm" />
            )}
            {(isDrinkingOptional || hasMocktailMenu) && !isAlcoholFree && (
              <SoberFriendlyBadge type="optional" notes={soberFriendlyNotes || (hasMocktailMenu ? "Great mocktail menu" : undefined)} size="sm" />
            )}
          </div>
        )}

        {/* Meta Info */}
        <div className="space-y-1 text-sm text-slate-500 mb-3">
          {/* Address */}
          <div className="flex items-center">
            <svg className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{venueName || address}</span>
          </div>

          {/* Price & Rating */}
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-1 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{priceDisplay}</span>
            </div>
            {googleRating && (
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-1 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium">{googleRating.toFixed(1)}</span>
                {googleReviewCount && (
                  <span className="text-slate-400 ml-1">({googleReviewCount.toLocaleString()})</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions: Want, Done, More Menu */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {/* Want Button */}
            <button
              onClick={handleWant}
              disabled={isLoading}
              className={`flex items-center gap-1.5 rounded-lg font-medium transition px-3 py-1.5 text-sm ${
                currentStatus === "WANT"
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              } disabled:opacity-50`}
            >
              <svg className="h-4 w-4" fill={currentStatus === "WANT" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {currentStatus === "WANT" ? "Saved" : "Want"}
            </button>

            {/* Done Button */}
            <button
              onClick={handleDone}
              disabled={isLoading}
              className={`flex items-center gap-1.5 rounded-lg font-medium transition px-3 py-1.5 text-sm ${
                currentStatus === "DONE"
                  ? "bg-green-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-green-50 hover:text-green-700"
              } disabled:opacity-50`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Done
            </button>
          </div>

          {/* More Menu */}
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
              <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl bg-white border border-slate-200 shadow-lg z-50 py-1">
                {/* Pass / Not interested */}
                <button
                  onClick={handlePass}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Pass / Not interested
                </button>

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* Suggest to Group */}
                <Link
                  href={`/groups?suggest=${id}&type=place`}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                  onClick={() => setShowMoreMenu(false)}
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Suggest to Group
                </Link>

                {/* Add to List */}
                <Link
                  href={`/lists?add=${id}&type=place`}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                  onClick={() => setShowMoreMenu(false)}
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Add to List
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
