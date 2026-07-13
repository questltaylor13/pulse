"use client";

// Wave 4 Rate & Rank — detail-page rate/re-rank block. Replaces the Wave 2
// star card (PlaceRating) when RATE_RANK_ENABLED is on, and gives events a
// post-visit rating for the first time. Unrated: a prompt + "Rate it"
// button opening the RankFlow. Rated: sentiment + "#N in your {category} ·
// score" + Re-rank. router.refresh() re-pulls the server-fetched entry
// after the flow completes.

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RankSentiment } from "@prisma/client";
import { useRankFlow } from "./RankFlowProvider";
import {
  SENTIMENT_LABELS,
  SENTIMENT_SCORE_CLASSES,
  type RankRefClient,
} from "./types";

export interface RateBlockEntry {
  rank: number;
  categorySize: number;
  categoryLabel: string;
  categorySlug: string;
  score: number;
  sentiment: RankSentiment;
  isPlacementConfirmed: boolean;
}

interface Props {
  refObj: RankRefClient;
  itemTitle: string;
  itemImageUrl?: string | null;
  /** e.g. "Been here? Rate it" (places) / "Did you go?" (past events) */
  prompt: string;
  entry: RateBlockEntry | null;
  /** Wave 2 aggregate line (places) — kept alongside the rank state. */
  aggregate?: { avg: number | null; count: number } | null;
  /**
   * Wave 2 star the user gave before the rank engine existed (or before
   * backfill ran). Shown as a hint when no ranked entry exists yet so
   * rating history never looks lost.
   */
  legacyRating?: number | null;
}

export default function RateBlock({
  refObj,
  itemTitle,
  itemImageUrl,
  prompt,
  entry,
  aggregate,
  legacyRating,
}: Props) {
  const router = useRouter();
  const { openRankFlow } = useRankFlow();

  const open = () =>
    openRankFlow({
      ref: refObj,
      itemTitle,
      itemImageUrl,
      source: "DETAIL_PAGE",
      onCompleted: () => router.refresh(),
    });

  return (
    <div className="rounded-card border border-mute-divider bg-surface p-4">
      {entry ? (
        <>
          <p className="text-meta font-medium uppercase tracking-wide text-mute">
            Your rating
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${SENTIMENT_SCORE_CLASSES[entry.sentiment]}`}
            >
              {entry.score.toFixed(1)} · {SENTIMENT_LABELS[entry.sentiment]}
            </span>
            <Link
              href={`/rankings?category=${entry.categorySlug}`}
              className="text-[13px] font-medium text-ink underline-offset-2 hover:underline"
            >
              #{entry.rank} of {entry.categorySize} in your {entry.categoryLabel}
            </Link>
            {!entry.isPlacementConfirmed && (
              <span className="text-xs text-mute">· placement unconfirmed</span>
            )}
            <button
              type="button"
              onClick={open}
              className="ml-auto rounded-full bg-mute-hush px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mute-divider"
            >
              Re-rank
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-meta font-medium uppercase tracking-wide text-mute">
            {prompt}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <button
              type="button"
              onClick={open}
              className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral/90"
            >
              Rate it
            </button>
            <span className="text-[13px] text-mute">
              {legacyRating != null
                ? `You gave this ${"★".repeat(legacyRating)} before — rate it to place it in your rankings`
                : "A couple of quick comparisons build your personal rankings"}
            </span>
          </div>
        </>
      )}
      {aggregate && aggregate.count > 0 && aggregate.avg != null && (
        <p className="mt-2 text-[13px] text-mute">
          Pulse rating {aggregate.avg.toFixed(1)} · {aggregate.count}{" "}
          {aggregate.count === 1 ? "rating" : "ratings"}
        </p>
      )}
    </div>
  );
}
