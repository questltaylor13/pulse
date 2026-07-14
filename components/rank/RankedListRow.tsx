"use client";

// Wave 4 Rate & Rank — one row of a ranked list. Shared by /rankings (own,
// editable) and the public /u/[username]/rankings/[category] page
// (read-only). Overflow actions: Re-rank (reopens the duel flow), Edit note,
// Remove (delete entry, keeps the DONE history row).

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RankSentiment } from "@prisma/client";
import { useRankFlow } from "./RankFlowProvider";
import InitialThumb from "@/components/ui/InitialThumb";
import {
  SENTIMENT_SCORE_CLASSES,
  type RankRefClient,
} from "./types";

export interface RankedRowData {
  entryId: string;
  rank: number;
  title: string;
  imageUrl: string | null;
  town: string | null;
  note: string | null;
  score: number;
  sentiment: RankSentiment;
  isPlacementConfirmed: boolean;
  href: string | null;
  ref: RankRefClient | null;
}

interface Props {
  entry: RankedRowData;
  canEdit: boolean;
}

export default function RankedListRow({ entry, canEdit }: Props) {
  const router = useRouter();
  const { openRankFlow } = useRankFlow();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const rerank = () => {
    setMenuOpen(false);
    if (!entry.ref) return;
    openRankFlow({
      ref: entry.ref,
      itemTitle: entry.title,
      itemImageUrl: entry.imageUrl,
      source: "DETAIL_PAGE",
      onCompleted: () => router.refresh(),
    });
  };

  const editNote = async () => {
    setMenuOpen(false);
    const next = window.prompt("Note for this spot", entry.note ?? "");
    if (next === null) return;
    setBusy(true);
    try {
      await fetch(`/api/rank/entries/${entry.entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: next.trim() === "" ? null : next.trim() }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setMenuOpen(false);
    if (!window.confirm(`Remove "${entry.title}" from your rankings?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/rank/entries/${entry.entryId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <div className="flex items-center gap-3 py-3">
      <span className="w-8 flex-shrink-0 text-right text-base font-bold text-mute">
        {entry.rank}
      </span>
      <InitialThumb src={entry.imageUrl} title={entry.title} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{entry.title}</p>
        {entry.town && (
          <p className="truncate text-xs text-mute">{entry.town}</p>
        )}
        {entry.note && (
          <p className="mt-0.5 line-clamp-1 text-xs italic text-mute">
            “{entry.note}”
          </p>
        )}
      </div>
      <span
        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${SENTIMENT_SCORE_CLASSES[entry.sentiment]}`}
      >
        {entry.score.toFixed(1)}
      </span>
      {!entry.isPlacementConfirmed && canEdit && (
        <span
          className="flex-shrink-0 text-xs text-amber-500"
          title="Placement unconfirmed — re-rank to finish"
        >
          ⚠
        </span>
      )}
    </div>
  );

  return (
    <li className="relative border-b border-mute-divider last:border-b-0">
      <div className="flex items-center">
        <div className="min-w-0 flex-1">
          {entry.href ? (
            <Link href={entry.href} className="block hover:bg-slate-50">
              {body}
            </Link>
          ) : (
            body
          )}
        </div>
        {canEdit && (
          <div className="relative flex-shrink-0 pr-1">
            <button
              type="button"
              aria-label="Entry options"
              disabled={busy}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-mute hover:bg-mute-hush disabled:opacity-50"
            >
              <span className="text-lg leading-none">⋯</span>
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-xl border border-mute-divider bg-surface shadow-lg">
                  {entry.ref && (
                    <button
                      type="button"
                      onClick={rerank}
                      className="block w-full px-3 py-2.5 text-left text-sm text-ink hover:bg-slate-50"
                    >
                      Re-rank
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void editNote()}
                    className="block w-full px-3 py-2.5 text-left text-sm text-ink hover:bg-slate-50"
                  >
                    {entry.note ? "Edit note" : "Add note"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove()}
                    className="block w-full px-3 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
