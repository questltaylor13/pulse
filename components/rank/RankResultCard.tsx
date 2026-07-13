"use client";

// Wave 4 Rate & Rank — step 3: the landing. "#4 of 23 in your Restaurants".

import Link from "next/link";

interface Props {
  rank: number;
  categorySize: number;
  categoryLabel: string;
  score: number;
  listPath: string;
  onDone: () => void;
}

export default function RankResultCard({
  rank,
  categorySize,
  categoryLabel,
  score,
  listPath,
  onDone,
}: Props) {
  return (
    <>
      <div className="px-5 pb-4 pt-3 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral/10 text-2xl font-bold text-coral">
          #{rank}
        </div>
        <h2 className="mt-3 text-base font-semibold text-ink">
          #{rank} of {categorySize} in your {categoryLabel}
        </h2>
        <p className="mt-1 text-sm text-mute">Score {score.toFixed(1)}</p>
      </div>

      <div className="space-y-2 px-5 pb-2">
        <Link
          href={listPath}
          onClick={onDone}
          className="block w-full rounded-xl bg-coral py-3 text-center text-sm font-semibold text-white transition hover:bg-coral/90"
        >
          View your rankings
        </Link>
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-xl bg-mute-hush py-3 text-sm font-medium text-ink hover:bg-mute-divider"
        >
          Done
        </button>
      </div>
    </>
  );
}
