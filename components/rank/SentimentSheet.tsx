"use client";

// Wave 4 Rate & Rank — step 1 of the rating flow: how was it?
// Rendered inside the RankFlow bottom sheet.

import { SENTIMENT_OPTIONS } from "./types";
import type { RankSentiment } from "@prisma/client";

interface Props {
  itemTitle: string;
  submitting: boolean;
  onSelect: (sentiment: RankSentiment) => void;
  onJustMark: () => void;
}

export default function SentimentSheet({
  itemTitle,
  submitting,
  onSelect,
  onJustMark,
}: Props) {
  return (
    <>
      <div className="px-5 pt-2 pb-3">
        <h2 className="text-base font-semibold text-ink line-clamp-1">
          {itemTitle}
        </h2>
        <p className="mt-0.5 text-xs text-mute">How was it?</p>
      </div>

      <ul className="divide-y divide-mute-divider">
        {SENTIMENT_OPTIONS.map((opt) => (
          <li key={opt.sentiment}>
            <button
              type="button"
              disabled={submitting}
              onClick={() => onSelect(opt.sentiment)}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition active:bg-slate-50 disabled:opacity-50"
            >
              <span
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${opt.iconBg} ${opt.iconText} text-lg`}
              >
                {opt.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">
                  {opt.label}
                </span>
                <span className="block truncate text-xs text-mute">
                  {opt.subtitle}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="px-5 pb-1 pt-2 text-center">
        <button
          type="button"
          disabled={submitting}
          onClick={onJustMark}
          className="text-xs font-medium text-mute underline-offset-2 hover:underline disabled:opacity-50"
        >
          Just mark as been there
        </button>
      </div>
    </>
  );
}
