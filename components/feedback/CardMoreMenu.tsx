"use client";

import { useState } from "react";
import type { ItemStatus } from "@prisma/client";
import type { FeedbackRef } from "@/lib/feedback/types";
import { isEventRef, isPlaceRef, isDiscoveryRef } from "@/lib/feedback/types";
import { useFeedback } from "@/lib/feedback/hooks";
import type { RankedItemType } from "@/lib/ranking/types";
import ActionSheet from "./ActionSheet";
import WhyThisSheet from "./WhyThisSheet";

// PRD 5 §1.1 — three-dot trigger. Sits top-left opposite SaveButton on
// compact feed cards. Opens the ActionSheet (§1.2). Drives the optimistic
// feedback mutation via useFeedback and owns the PASS/DONE post-feedback
// animation contract (fades the wrapping card via the `onRemove` callback
// passed in from the card parent).

interface Props {
  ref_: FeedbackRef; // `ref` is reserved in React
  itemTitle: string;
  shareUrl?: string; // If omitted, Share row hides the native share
  initialStatus: ItemStatus | null;
  onRemove?: () => void; // Called after PASS or DONE success so the parent
                          // can play the 400ms fade + drop the card from DOM.
}

export default function CardMoreMenu({
  ref_,
  itemTitle,
  shareUrl,
  initialStatus,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const { status, submitting, errorMessage, upsert } = useFeedback({
    ref: ref_,
    initialStatus,
  });

  // PRD 6 Phase 4 — derive itemType + itemId from the FeedbackRef for the
  // "Why am I seeing this?" path. Legacy itemRef (Item bridge) has no
  // ranking cache entry so we hide the Why row for those.
  const whyTarget = resolveWhyTarget(ref_);

  const handleSelect = async (next: ItemStatus) => {
    const prev = status;
    const result = await upsert(next, "FEED_CARD");
    if (!result.ok) return; // Error surfaced in-sheet by the hook
    setOpen(false);
    // Removal contract: PASS → always remove; DONE → remove from current feed
    // (reappears in Your Denver). WANT → card stays in feed with pill.
    // We only remove if the status changed to PASS or DONE (not on no-op toggle).
    if ((next === "PASS" || next === "DONE") && prev !== next) {
      onRemove?.();
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator && shareUrl) {
      try {
        await navigator.share({
          title: itemTitle,
          text: `Found this on Pulse → ${itemTitle}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share unavailable — silent noop
      }
    } else if (shareUrl && typeof navigator !== "undefined") {
      await navigator.clipboard?.writeText(shareUrl).catch(() => {});
    }
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="More options"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-ink backdrop-blur-sm transition hover:bg-white active:scale-95"
      >
        <span className="text-lg leading-none">⋯</span>
      </button>
      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        itemTitle={itemTitle}
        currentStatus={status}
        submitting={submitting}
        errorMessage={errorMessage}
        onSelect={handleSelect}
        onShare={handleShare}
        onWhy={
          whyTarget
            ? () => {
                setOpen(false);
                setWhyOpen(true);
              }
            : undefined
        }
      />
      {whyTarget && (
        <WhyThisSheet
          open={whyOpen}
          onClose={() => setWhyOpen(false)}
          itemType={whyTarget.itemType}
          itemId={whyTarget.itemId}
          itemTitle={itemTitle}
          onOpenFeedback={() => {
            setWhyOpen(false);
            setOpen(true);
          }}
        />
      )}
    </>
  );
}

function resolveWhyTarget(ref: FeedbackRef): { itemType: RankedItemType; itemId: string } | null {
  if (isEventRef(ref)) return { itemType: "event", itemId: ref.eventId };
  if (isPlaceRef(ref)) return { itemType: "place", itemId: ref.placeId };
  if (isDiscoveryRef(ref)) return { itemType: "discovery", itemId: ref.discoveryId };
  return null;
}
