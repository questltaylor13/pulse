"use client";

import { useState } from "react";
import { rateItem, removeItemRating } from "@/lib/actions/items";

interface RatingControlProps {
  itemId: string;
  initialRating: number | null;
  initialNotes?: string | null;
  onRatingChange?: (rating: number | null, notes: string | null) => void;
  showNotes?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function RatingControl({
  itemId,
  initialRating,
  initialNotes = null,
  onRatingChange,
  showNotes = true,
  size = "md",
}: RatingControlProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [notes, setNotes] = useState<string>(initialNotes || "");
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNotesInput, setShowNotesInput] = useState(!!initialNotes);

  const handleStarClick = async (starValue: number) => {
    if (loading) return;
    setLoading(true);

    try {
      if (rating === starValue) {
        // Click same star to remove rating
        await removeItemRating(itemId);
        setRating(null);
        setNotes("");
        onRatingChange?.(null, null);
      } else {
        await rateItem(itemId, starValue, notes || undefined);
        setRating(starValue);
        onRatingChange?.(starValue, notes || null);
      }
    } catch {
      /* silently handled */
    } finally {
      setLoading(false);
    }
  };

  const handleNotesSubmit = async () => {
    if (!rating || loading) return;
    setLoading(true);

    try {
      await rateItem(itemId, rating, notes || undefined, false);
      onRatingChange?.(rating, notes || null);
    } catch {
      /* silently handled */
    } finally {
      setLoading(false);
    }
  };

  const starSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const starSize = starSizes[size];

  return (
    <div className="space-y-2">
      {/* Stars */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = (hoveredStar !== null ? hoveredStar : rating || 0) >= star;

          return (
            <button
              key={star}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(null)}
              disabled={loading}
              className={`transition ${
                loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <svg
                className={`${starSize} ${
                  isFilled ? "text-yellow-400" : "text-slate-300"
                } transition-colors`}
                fill={isFilled ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          );
        })}
        {rating && (
          <span className="ml-2 text-sm text-slate-500">
            {rating}/5
          </span>
        )}
      </div>

      {/* Notes */}
      {showNotes && rating && (
        <div className="space-y-1">
          {!showNotesInput ? (
            <button
              onClick={() => setShowNotesInput(true)}
              className="text-xs text-slate-500 hover:text-primary"
            >
              + Add notes
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any thoughts? (optional)"
                className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-primary focus:outline-none"
                onBlur={handleNotesSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNotesSubmit();
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
