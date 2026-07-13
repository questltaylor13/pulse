"use client";

// Wave 4 Rate & Rank — "Did you make it to X?" prompt card (decision D10).
// "Yes — rate it" opens the duel flow (rating converts WANT → DONE, so the
// prompt disappears on refresh); "Didn't go" dismisses without a taste
// penalty.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRankFlow } from "./RankFlowProvider";
import type { RankRefClient } from "./types";

export interface RatePromptData {
  statusId: string;
  ref: RankRefClient;
  kind: "event" | "place";
  title: string;
  imageUrl: string | null;
  whenLabel: string;
}

export default function RatePromptCard({ prompt }: { prompt: RatePromptData }) {
  const router = useRouter();
  const { openRankFlow } = useRankFlow();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const rate = () =>
    openRankFlow({
      ref: prompt.ref,
      itemTitle: prompt.title,
      itemImageUrl: prompt.imageUrl,
      source: "DETAIL_PAGE",
      onCompleted: () => router.refresh(),
    });

  const dismiss = async () => {
    setBusy(true);
    setHidden(true); // optimistic
    try {
      await fetch("/api/rank/prompts/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId: prompt.statusId }),
      });
      router.refresh();
    } catch {
      setHidden(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-card border border-mute-divider bg-teal-soft/25 p-3">
      <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-mute-hush">
        {prompt.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={prompt.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg">
            {prompt.kind === "event" ? "🎟" : "📍"}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          Did you make it to {prompt.title}?
        </p>
        <p className="text-xs text-mute">{prompt.whenLabel}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={rate}
          className="rounded-full bg-coral px-3 py-1.5 text-xs font-semibold text-white hover:bg-coral/90 disabled:opacity-50"
        >
          Yes — rate it
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void dismiss()}
          className="rounded-full px-2.5 py-1.5 text-xs font-medium text-mute hover:bg-mute-hush disabled:opacity-50"
        >
          Didn&apos;t go
        </button>
      </div>
    </div>
  );
}
