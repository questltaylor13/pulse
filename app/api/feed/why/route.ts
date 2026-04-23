/**
 * PRD 6 Phase 4 — "Why am I seeing this?" endpoint.
 *
 * GET /api/feed/why?itemType=event|place|discovery&itemId=<id>
 *
 * Session-gated (only the requesting user can read their own cache).
 * Returns the score + reasons + rank for an item, or a friendly empty
 * state when the item isn't in the user's cache (e.g., fallback path or
 * not-yet-precomputed).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readCache } from "@/lib/ranking/cache";
import type { RankedItemType } from "@/lib/ranking/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const url = new URL(request.url);
  const itemType = url.searchParams.get("itemType") as RankedItemType | null;
  const itemId = url.searchParams.get("itemId");
  if (!itemType || !itemId) {
    return NextResponse.json({ error: "itemType and itemId are required" }, { status: 400 });
  }
  if (itemType !== "event" && itemType !== "place" && itemType !== "discovery") {
    return NextResponse.json({ error: "invalid itemType" }, { status: 400 });
  }

  try {
    const cache = await readCache(userId);
    if (!cache) {
      return NextResponse.json({
        present: false,
        reason: "no_cache",
        item: { itemType, itemId },
      });
    }

    const index = cache.rankedItems.findIndex(
      (r) => r.itemType === itemType && r.itemId === itemId,
    );
    if (index === -1) {
      return NextResponse.json({
        present: false,
        reason: "item_not_in_cache",
        item: { itemType, itemId },
        computedAt: cache.computedAt.toISOString(),
      });
    }

    const item = cache.rankedItems[index];
    return NextResponse.json({
      present: true,
      item: { itemType, itemId },
      rank: index + 1, // 1-indexed for UI copy
      totalRanked: cache.rankedItems.length,
      score: item.score,
      reasons: item.reasons,
      isSerendipity: Boolean(item.isSerendipity),
      computedAt: cache.computedAt.toISOString(),
    });
  } catch (error) {
    console.error("[/api/feed/why] error:", error);
    return NextResponse.json(
      { error: "failed to read cache", details: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
