"use client";

import { useState } from "react";
import type { ItemStatus } from "@prisma/client";
import type { FeedbackRef } from "@/lib/feedback/types";
import { isEventRef, isPlaceRef, isDiscoveryRef } from "@/lib/feedback/types";
import { useFeedback } from "@/lib/feedback/hooks";
import type { RankedItemType } from "@/lib/ranking/types";
import ActionSheet from "./ActionSheet";
import WhyThisSheet from "./WhyThisSheet";

// PRD 5 Phase 3 — detail-page feedback widget.
//
// Mounted near the title on event/place/discovery detail pages. Shows the
// user's current feedback state as a prominent pill (Interested / Been
// there) plus a ⋯ trigger that opens the same ActionSheet used on feed
// cards. Tapping the pill also opens the sheet — the row for the current
// status gets a selected highlight in the sheet itself.

interface Props {
  ref_: FeedbackRef;
  itemTitle: string;
  shareUrl?: string;
  initialStatus: ItemStatus | null;
}

const PILL_COPY: Record<Exclude<ItemStatus, "PASS">, { text: string; className: string }> = {
  WANT: {
    text: "✓ You're interested",
    className: "bg-teal-soft text-teal",
  },
  DONE: {
    text: "✓ You've been here",
    className: "bg-purple-100 text-purple-700",
  },
};

export default function DetailFeedback({
  ref_,
  itemTitle,
  shareUrl,
  initialStatus,
}: Props) {
  const [open, setOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const { status, submitting, errorMessage, upsert } = useFeedback({
    ref: ref_,
    initialStatus,
  });
  const whyTarget = resolveWhyTarget(ref_);

  const handleSelect = async (next: ItemStatus) => {
    const result = await upsert(next, "DETAIL_PAGE");
    if (result.ok) setOpen(false);
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
        // Silent
      }
    } else if (shareUrl && typeof navigator !== "undefined") {
      await navigator.clipboard?.writeText(shareUrl).catch(() => {});
    }
    setOpen(false);
  };

  const pill = status && status !== "PASS" ? PILL_COPY[status] : null;

  return (
    <>
      <div className="flex items-center gap-2">
        {pill && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition hover:opacity-80 ${pill.className}`}
          >
            {pill.text}
          </button>
        )}
        <button
          type="button"
          aria-label="Feedback options"
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-mute-hush text-ink hover:bg-mute-divider"
        >
          <span className="text-lg leading-none">⋯</span>
        </button>
      </div>
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
