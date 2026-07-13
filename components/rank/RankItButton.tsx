"use client";

// Wave 4 Rate & Rank — small "Rank it" chip for DONE-history cards that
// don't have a ranked entry yet (/your-denver). Lives inside a Link-wrapped
// card, so it stops propagation like CardMoreMenu's trigger does.

import { useRouter } from "next/navigation";
import { useRankFlow } from "./RankFlowProvider";
import type { RankRefClient } from "./types";

interface Props {
  refObj: RankRefClient;
  itemTitle: string;
  itemImageUrl?: string | null;
}

export default function RankItButton({ refObj, itemTitle, itemImageUrl }: Props) {
  const router = useRouter();
  const { openRankFlow } = useRankFlow();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openRankFlow({
          ref: refObj,
          itemTitle,
          itemImageUrl,
          source: "DETAIL_PAGE",
          onCompleted: () => router.refresh(),
        });
      }}
      className="inline-flex w-fit items-center gap-1 rounded-full bg-coral/10 px-2.5 py-1 text-xs font-semibold text-coral transition hover:bg-coral/20"
    >
      ⇅ Rank it
    </button>
  );
}
