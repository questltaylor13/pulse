"use client";

import { useState } from "react";

// Wave 2 Beli — 1–5 star rating on the place detail page. Tapping a star marks
// the place DONE ("been there") with that rating via /api/feedback, which
// trains the ranker and updates the place's Pulse rating aggregate.

interface Props {
  placeId: string;
  initialRating: number | null;
  ratingCount: number;
  ratingAvg: number | null;
}

export default function PlaceRating({
  placeId,
  initialRating,
  ratingCount,
  ratingAvg,
}: Props) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [hover, setHover] = useState<number | null>(null);
  const [count, setCount] = useState(ratingCount);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (value: number) => {
    if (submitting) return;
    const prev = rating;
    setRating(value);
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: { placeId },
          status: "DONE",
          source: "DETAIL_PAGE",
          rating: value,
        }),
      });
      if (!res.ok) {
        setRating(prev);
      } else if (prev == null) {
        setCount((c) => c + 1); // first time rating this place
      }
    } catch {
      setRating(prev);
    } finally {
      setSubmitting(false);
    }
  };

  const display = hover ?? rating ?? 0;

  return (
    <div className="rounded-card border border-mute-divider bg-surface p-4">
      <p className="text-meta font-medium uppercase tracking-wide text-mute">
        {rating ? "Your rating" : "Been here? Rate it"}
      </p>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={submitting}
              onMouseEnter={() => setHover(n)}
              onClick={() => submit(n)}
              aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              className="text-2xl leading-none transition-transform hover:scale-110 disabled:opacity-50"
            >
              <span className={n <= display ? "text-coral" : "text-mute-divider"}>★</span>
            </button>
          ))}
        </div>
        {count > 0 && ratingAvg != null && (
          <span className="text-[13px] text-mute">
            {ratingAvg.toFixed(1)} · {count} {count === 1 ? "rating" : "ratings"}
          </span>
        )}
      </div>
    </div>
  );
}
