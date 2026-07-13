"use client";

// Wave 4 Rate & Rank — app-wide provider owning ONE RankFlow sheet instance.
//
// Mounted once in the root layout with the server-read flag. Cards and
// detail widgets open the flow imperatively via useRankFlow().openRankFlow —
// no per-card prop drilling, and the sheet survives the card being removed
// from the feed mid-duel (the PASS/DONE removal contract fades cards out).

import { createContext, useCallback, useContext, useState } from "react";
import RankFlow from "./RankFlow";
import type { RankFlowResult, RankRefClient } from "./types";

export interface OpenRankFlowArgs {
  ref: RankRefClient;
  itemTitle: string;
  itemImageUrl?: string | null;
  source: "FEED_CARD" | "DETAIL_PAGE";
  onCompleted?: (result: RankFlowResult) => void;
}

interface RankFlowContextValue {
  /** RATE_RANK_ENABLED server flag. Off ⇒ callers use the legacy DONE path. */
  enabled: boolean;
  openRankFlow: (args: OpenRankFlowArgs) => void;
}

const RankFlowContext = createContext<RankFlowContextValue>({
  enabled: false,
  openRankFlow: () => {},
});

export function useRankFlow(): RankFlowContextValue {
  return useContext(RankFlowContext);
}

export default function RankFlowProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState<OpenRankFlowArgs | null>(null);

  const openRankFlow = useCallback(
    (args: OpenRankFlowArgs) => {
      if (!enabled) return;
      setActive(args);
    },
    [enabled]
  );

  const handleClose = useCallback(
    (result: RankFlowResult) => {
      if (result.committed) active?.onCompleted?.(result);
      setActive(null);
    },
    [active]
  );

  return (
    <RankFlowContext.Provider value={{ enabled, openRankFlow }}>
      {children}
      {active && (
        <RankFlow
          open
          refObj={active.ref}
          itemTitle={active.itemTitle}
          itemImageUrl={active.itemImageUrl}
          source={active.source}
          onClose={handleClose}
        />
      )}
    </RankFlowContext.Provider>
  );
}
