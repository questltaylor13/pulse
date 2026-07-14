"use client";

// Wave 5 hygiene — the bottom-sheet shell, extracted.
//
// components/feedback/ActionSheet.tsx and components/rank/RankFlow.tsx had
// independently grown the same chrome: Esc-to-close, a tap-to-dismiss backdrop,
// the grip handle, the rose error strip, and the footer button. Two copies of
// modal semantics is two places to forget an aria attribute.
//
// Visuals stay hand-rolled to match the SoftAuthModal house style (no shadcn).

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Announced to screen readers — each sheet says what it is for. */
  ariaLabel: string;
  children: React.ReactNode;
  errorMessage?: string | null;
  /**
   * Footer button label. Pass null to omit the footer entirely — the rank flow
   * drops it on the result step, where "Cancel" would be nonsense (the work is
   * already committed).
   */
  cancelLabel?: string | null;
}

export default function BottomSheet({
  open,
  onClose,
  ariaLabel,
  children,
  errorMessage,
  cancelLabel = "Cancel",
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
      aria-label={ariaLabel}
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

        {children}

        {errorMessage && (
          <div className="mx-5 mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorMessage}
          </div>
        )}

        {cancelLabel && (
          <div className="p-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-mute-hush py-3 text-sm font-medium text-ink hover:bg-mute-divider"
            >
              {cancelLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
