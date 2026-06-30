"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import type { ItemStatus } from "@prisma/client";
import type { FeedbackRef } from "@/lib/feedback/types";
import { useFeedback } from "@/lib/feedback/hooks";
import SoftAuthModal from "@/components/home/SoftAuthModal";

interface Props {
  ref_: FeedbackRef;
  initialStatus?: ItemStatus | null;
}

/**
 * Visible "Not for me" downvote on feed cards (Wave 1). Maps to a PASS in
 * UserItemStatus — the signal the ranker penalizes via computePassSimilarity —
 * and shows an inline "Fewer like this · Undo" confirmation so the control's
 * effect is obvious (closing the "I don't know what downvote does" gap). The
 * card drops on the next load (feedbackMaps filters PASS), matching the
 * ⋯-menu removal contract.
 */
export default function NotForMeButton({ ref_, initialStatus = null }: Props) {
  const { data: session } = useSession();
  const { status, upsert, remove } = useFeedback({ ref: ref_, initialStatus });
  const [authOpen, setAuthOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const isPassed = status === "PASS";

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      setAuthOpen(true);
      return;
    }
    if (isPassed) {
      await remove();
      setConfirm(false);
      return;
    }
    const r = await upsert("PASS", "FEED_CARD");
    if (r.ok) setConfirm(true);
  }

  async function handleUndo(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await remove();
    setConfirm(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label={isPassed ? "Undo not for me" : "Not for me — show fewer like this"}
        aria-pressed={isPassed}
        onClick={handleClick}
        className="absolute right-2 top-[44px] z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/85 text-ink backdrop-blur transition hover:bg-white active:scale-90"
      >
        <svg
          viewBox="0 0 24 24"
          width={15}
          height={15}
          fill={isPassed ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
        </svg>
      </button>

      {confirm && (
        <div className="absolute inset-x-2 bottom-2 z-20 flex items-center justify-between gap-2 rounded-full bg-ink/90 px-3 py-1.5 text-[12px] text-white backdrop-blur">
          <span>Fewer like this</span>
          <button
            type="button"
            onClick={handleUndo}
            className="font-semibold underline underline-offset-2"
          >
            Undo
          </button>
        </div>
      )}

      <SoftAuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        action="tune your feed"
      />
    </>
  );
}
