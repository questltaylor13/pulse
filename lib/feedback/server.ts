import { prisma } from "@/lib/prisma";
import type { ItemStatus } from "@prisma/client";

// PRD 5 Phase 1 — server-side batch helper for rendering feedback pills and
// filtering PASS/DONE items out of the feed during SSR.
//
// With the Phase 1 migration, UserItemStatus carries direct FKs to Event,
// Place, and Discovery (plus the legacy Item column for pre-PRD-5 rows).
// This helper takes native IDs from the feed pipeline and returns three
// Maps — one per content type — keyed by that native ID.
//
// For anon viewers (no userId) it returns empty maps; cards render without
// pills and nothing is filtered.

export interface FeedbackMaps {
  byEventId: Map<string, ItemStatus>;
  byPlaceId: Map<string, ItemStatus>;
  byDiscoveryId: Map<string, ItemStatus>;
}

const EMPTY: FeedbackMaps = {
  byEventId: new Map(),
  byPlaceId: new Map(),
  byDiscoveryId: new Map(),
};

export async function getFeedbackMaps(params: {
  userId: string | null | undefined;
  eventIds?: string[];
  placeIds?: string[];
  discoveryIds?: string[];
}): Promise<FeedbackMaps> {
  const userId = params.userId;
  if (!userId) return EMPTY;
  const eventIds = params.eventIds ?? [];
  const placeIds = params.placeIds ?? [];
  const discoveryIds = params.discoveryIds ?? [];
  if (eventIds.length === 0 && placeIds.length === 0 && discoveryIds.length === 0) {
    return EMPTY;
  }

  const rows = await prisma.userItemStatus.findMany({
    where: {
      userId,
      OR: [
        eventIds.length > 0 ? { eventId: { in: eventIds } } : null,
        placeIds.length > 0 ? { placeId: { in: placeIds } } : null,
        discoveryIds.length > 0 ? { discoveryId: { in: discoveryIds } } : null,
      ].filter((v): v is NonNullable<typeof v> => v !== null),
    },
    select: { eventId: true, placeId: true, discoveryId: true, status: true },
  });

  const byEventId = new Map<string, ItemStatus>();
  const byPlaceId = new Map<string, ItemStatus>();
  const byDiscoveryId = new Map<string, ItemStatus>();
  for (const row of rows) {
    if (row.eventId) byEventId.set(row.eventId, row.status);
    if (row.placeId) byPlaceId.set(row.placeId, row.status);
    if (row.discoveryId) byDiscoveryId.set(row.discoveryId, row.status);
  }
  return { byEventId, byPlaceId, byDiscoveryId };
}

// PASS and DONE items are filtered out of feed rendering (PRD §1.3).
// WANT items remain with a pill.
export function isFilteredFromFeed(status: ItemStatus | null | undefined): boolean {
  return status === "PASS" || status === "DONE";
}
