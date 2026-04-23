"use client";

import { useEffect } from "react";
import type { ItemStatus } from "@prisma/client";

// PRD 5 §1.2 — bottom-sheet action sheet opened from the card three-dot menu.
// Four rows: Interested / Not for me / I've been there / Share.
// Backdrop tap-to-dismiss. Grip handle at top. Keyboard Esc closes.
//
// Visuals hand-rolled to match the SoftAuthModal house style (no shadcn).
// Colors: teal (Interested), slate (Not for me), purple (Been there), amber (Share).

interface Props {
  open: boolean;
  onClose: () => void;
  itemTitle: string;
  currentStatus: ItemStatus | null;
  submitting: boolean;
  errorMessage: string | null;
  onSelect: (status: ItemStatus) => void;
  onShare: () => void;
  /** PRD 6 Phase 4 — optional "Why am I seeing this?" entry. If omitted,
   *  the row is hidden. Parent components include this when the user is
   *  signed in and the feature flag is on. */
  onWhy?: () => void;
}

interface Row {
  status: ItemStatus | "SHARE" | "WHY";
  icon: string;
  label: string;
  subtitle: string;
  iconBg: string;
  iconText: string;
}

const ROWS: Row[] = [
  {
    status: "WANT",
    icon: "✓",
    label: "Interested",
    subtitle: "Show me more like this",
    iconBg: "bg-teal-soft",
    iconText: "text-teal",
  },
  {
    status: "PASS",
    icon: "✕",
    label: "Not for me",
    subtitle: "🔒 Private · only affects your feed",
    iconBg: "bg-slate-100",
    iconText: "text-slate-500",
  },
  {
    status: "DONE",
    icon: "🎯",
    label: "I've been there",
    subtitle: "Add to your Denver history",
    iconBg: "bg-purple-100",
    iconText: "text-purple-700",
  },
  {
    status: "SHARE",
    icon: "↗",
    label: "Share",
    subtitle: "Send to a friend",
    iconBg: "bg-amber-100",
    iconText: "text-amber-700",
  },
  {
    status: "WHY",
    icon: "💡",
    label: "Why am I seeing this?",
    subtitle: "See how this matched your taste",
    iconBg: "bg-indigo-100",
    iconText: "text-indigo-700",
  },
];

export default function ActionSheet({
  open,
  onClose,
  itemTitle,
  currentStatus,
  submitting,
  errorMessage,
  onSelect,
  onShare,
  onWhy,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Feedback on this item"
      className="fixed inset-0 z-modal flex items-end justify-center bg-ink/25 transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[24px] bg-surface pb-safe animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grip handle */}
        <div className="flex justify-center pt-2.5 pb-1.5">
          <div className="h-1 w-9 rounded-full bg-slate-300" />
        </div>

        <div className="px-5 pt-2 pb-3">
          <h2 className="text-base font-semibold text-ink line-clamp-1">{itemTitle}</h2>
          <p className="mt-0.5 text-xs text-mute">Help us tune your feed</p>
        </div>

        <ul className="divide-y divide-mute-divider">
          {ROWS.filter((row) => row.status !== "WHY" || onWhy).map((row) => {
            const isCurrent =
              row.status !== "SHARE" &&
              row.status !== "WHY" &&
              currentStatus === row.status;
            return (
              <li key={row.status}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    if (row.status === "SHARE") onShare();
                    else if (row.status === "WHY") onWhy?.();
                    else onSelect(row.status);
                  }}
                  className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition active:bg-slate-50 disabled:opacity-50 ${
                    isCurrent ? "bg-teal-soft/40" : ""
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${row.iconBg} ${row.iconText} text-lg font-semibold`}
                  >
                    {row.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{row.label}</span>
                    <span className="block truncate text-xs text-mute">{row.subtitle}</span>
                  </span>
                  {isCurrent && (
                    <span className="text-xs font-semibold text-teal">Current</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {errorMessage && (
          <div className="mx-5 mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="p-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-mute-hush py-3 text-sm font-medium text-ink hover:bg-mute-divider"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
