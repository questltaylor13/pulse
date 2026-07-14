/**
 * Wave 5 — pure shaping for the following feed.
 *
 * Kept out of the route so the interesting rule is testable without a database:
 * a RANKED_ITEM row carries only a pointer, and everything it displays comes
 * from the hydrated entry. If the entry is gone, the row is dropped — a feed
 * that renders a hollow placeholder is worse than one that renders nothing.
 *
 * Authorization is *not* done here. Which rows a viewer may see (follow graph,
 * `isPublic`, the author's current `rankingsArePublic`, confirmed-only) is
 * decided in SQL, because this endpoint pages with `take: limit + 1` and
 * filtering after the fetch would under-fill pages and corrupt `hasMore`.
 */

import type { ActivityType } from "@prisma/client";
import type { FeedRankedEntry } from "@/lib/rank-engine/service";

export interface FeedUser {
  id: string;
  username: string | null;
  name: string | null;
  profileImageUrl: string | null;
  isInfluencer: boolean;
}

export interface FeedList {
  id: string;
  name: string;
}

/** The activity row as fetched, before hydration. */
export interface FeedActivityInput {
  id: string;
  type: ActivityType;
  rankedEntryId: string | null;
  createdAt: Date;
  user: FeedUser;
  list?: FeedList | null;
}

/** The activity row as the client renders it. */
export interface FollowingFeedItem {
  id: string;
  type: ActivityType;
  user: FeedUser;
  list: FeedList | null;
  /** Current state of the ranked entry; null for non-ranked activity. */
  rankedEntry: FeedRankedEntry | null;
  createdAt: Date;
}

/**
 * The same row after JSON serialization, which is what the client actually
 * receives. Declared here rather than hand-copied into the component, so the
 * wire shape can't drift away from the shape the route produces — the repo
 * models this the same way (`lib/home/types.ts`: `lastUpdatedAt: string // ISO`).
 */
export type FollowingFeedItemJSON = Omit<FollowingFeedItem, "createdAt"> & {
  createdAt: string;
};

export function toFeedItems(
  rows: FeedActivityInput[],
  entries: Map<string, FeedRankedEntry>
): FollowingFeedItem[] {
  const items: FollowingFeedItem[] = [];

  for (const row of rows) {
    const rankedEntry = row.rankedEntryId
      ? (entries.get(row.rankedEntryId) ?? null)
      : null;

    // A pointer row with nothing behind it has nothing to say.
    if (row.rankedEntryId && !rankedEntry) continue;

    items.push({
      id: row.id,
      type: row.type,
      user: row.user,
      list: row.list ?? null,
      rankedEntry,
      createdAt: row.createdAt,
    });
  }

  return items;
}
