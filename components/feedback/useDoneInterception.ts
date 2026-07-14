"use client";

// Wave 5 hygiene — "I've been there" routes through the rank flow, in one place.
//
// CardMoreMenu and DetailFeedback had each grown their own copy of this
// interception: same guard (DONE + flag on + a content-native ref), same
// openRankFlow call, same early return. The rule it encodes — a DONE is a
// rating opportunity, not just a status write — is a product decision, and a
// product decision living in two files is one that will eventually be true in
// only one of them.
//
// Legacy Item-bridge refs deliberately fall through to the plain DONE write:
// the rank engine is content-native only (event/place/discovery), so
// resolveContentRef returns null for them and interception declines.

import { useCallback } from "react";
import type { ItemStatus } from "@prisma/client";
import type { FeedbackRef } from "@/lib/feedback/types";
import { resolveContentRef } from "@/lib/feedback/types";
import { useRankFlow, type OpenRankFlowArgs } from "@/components/rank/RankFlowProvider";

interface InterceptArgs {
  /** The status the user just picked. */
  next: ItemStatus;
  ref: FeedbackRef;
  itemTitle: string;
  /** Narrower than FeedbackSource by design — PROFILE_SWIPER can't open the flow. */
  source: OpenRankFlowArgs["source"];
  /** Fired when the rank flow commits — e.g. setStatusLocal("DONE"). */
  onCompleted: () => void;
  /** Fired at the moment of interception, before the flow opens — e.g. close the sheet. */
  onIntercept?: () => void;
}

/**
 * Returns a predicate: true means the DONE was routed into the rank flow and
 * the caller must NOT also perform its own status write. False means carry on.
 */
export function useDoneInterception(): (args: InterceptArgs) => boolean {
  const rankFlow = useRankFlow();

  return useCallback(
    ({ next, ref, itemTitle, source, onCompleted, onIntercept }: InterceptArgs) => {
      const rankRef = resolveContentRef(ref);
      if (next !== "DONE" || !rankFlow.enabled || !rankRef) return false;

      onIntercept?.();
      // No itemImageUrl: neither ActionSheet call site has one to pass. A prop
      // that is always undefined is a prop that lies about what the flow renders.
      rankFlow.openRankFlow({
        ref: rankRef,
        itemTitle,
        source,
        onCompleted,
      });
      return true;
    },
    [rankFlow],
  );
}
