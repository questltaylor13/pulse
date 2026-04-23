"use client";

/**
 * PRD 6 Phase 4 — "Why am I seeing this?" modal.
 *
 * Opened from the three-dot ActionSheet. Fetches /api/feed/why for the
 * given item, renders the top positive reasons with a subtle magnitude
 * bar, calls out serendipity picks, and links back to the feedback
 * sheet if the user wants to tune the recommendation.
 */

import { useEffect, useState } from "react";
import type { RankedItemType, ScoreReason } from "@/lib/ranking/types";
import { track } from "@/lib/feedback/analytics";

interface WhyResponse {
  present: boolean;
  reason?: "no_cache" | "item_not_in_cache";
  rank?: number;
  totalRanked?: number;
  score?: number;
  reasons?: ScoreReason[];
  isSerendipity?: boolean;
  computedAt?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  itemType: RankedItemType;
  itemId: string;
  itemTitle: string;
  /** Optional callback to jump back to the feedback action sheet. */
  onOpenFeedback?: () => void;
}

export default function WhyThisSheet({
  open,
  onClose,
  itemType,
  itemId,
  itemTitle,
  onOpenFeedback,
}: Props) {
  const [data, setData] = useState<WhyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/feed/why?itemType=${itemType}&itemId=${itemId}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((body: WhyResponse) => {
        if (cancelled) return;
        setData(body);
        const positiveReasons = (body.reasons ?? []).filter((r) => r.contribution > 0);
        track({
          type: "ranking_why_opened",
          itemType,
          reasonCount: positiveReasons.length,
          isSerendipity: Boolean(body.isSerendipity),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, itemType, itemId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const positive = (data?.reasons ?? [])
    .filter((r) => r.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 5);

  const maxContribution = positive[0]?.contribution ?? 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Why you're seeing this"
      className="fixed inset-0 z-modal flex items-end justify-center bg-ink/25 transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[24px] bg-surface pb-safe animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1.5">
          <div className="h-1 w-9 rounded-full bg-slate-300" />
        </div>

        <div className="px-5 pt-2 pb-3">
          <h2 className="text-base font-semibold text-ink line-clamp-1">{itemTitle}</h2>
          {data?.rank && data?.totalRanked ? (
            <p className="mt-0.5 text-xs text-mute">
              Ranked #{data.rank} in your feed today
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-mute">Here&apos;s why</p>
          )}
        </div>

        <div className="px-5 pb-4">
          {loading && (
            <div className="py-6 text-center text-sm text-mute">Loading…</div>
          )}

          {error && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          {!loading && !error && data && !data.present && (
            <div className="py-4 text-sm text-ink">
              This is a quality pick on Pulse — your personalized ranking
              hasn&apos;t been computed yet or this item isn&apos;t in your current
              feed. Check back soon.
            </div>
          )}

          {!loading && !error && data?.isSerendipity && (
            <div className="mb-3 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
              <span className="font-medium">Outside your usual.</span> We
              thought you might be curious.
            </div>
          )}

          {!loading && !error && positive.length > 0 && (
            <ul className="space-y-2">
              {positive.map((r, i) => (
                <li key={`${r.factor}_${i}`} className="flex items-center gap-3">
                  <span className="w-6 text-lg" aria-hidden>
                    {iconFor(r.factor)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink">{r.human_readable}</div>
                    <div className="mt-1 h-1 rounded-full bg-slate-100">
                      <div
                        className="h-1 rounded-full bg-indigo-400"
                        style={{
                          width: `${Math.max(
                            8,
                            Math.min(100, (r.contribution / maxContribution) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {onOpenFeedback && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFeedback();
              }}
              className="mt-4 w-full rounded-xl bg-mute-hush py-3 text-sm font-medium text-ink hover:bg-mute-divider"
            >
              Not matching? Tell us why
            </button>
          )}
        </div>

        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function iconFor(factor: string): string {
  switch (factor) {
    case "base_quality":
      return "⭐";
    case "social_match":
      return "👥";
    case "vibe_match":
      return "🎨";
    case "aspiration_match":
      return "🎯";
    case "hidden_gem_bonus":
      return "💎";
    case "want_similarity":
      return "❤️";
    case "recency":
      return "🆕";
    case "novelty":
      return "🔀";
    case "serendipity":
      return "✨";
    case "unprofiled":
      return "⭐";
    default:
      return "•";
  }
}
