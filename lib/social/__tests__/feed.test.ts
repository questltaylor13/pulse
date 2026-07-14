/**
 * Wave 5 — pure shaping of the following feed.
 *
 * The DB decides *which* rows a viewer may see (privacy + cursor live in SQL);
 * this module decides what a row becomes once its ranked entry has been
 * hydrated — in particular, that a pointer row with nothing behind it is
 * dropped rather than rendered as a hollow placeholder.
 */

import { describe, it, expect } from "vitest";
import { toFeedItems, type FeedActivityInput } from "@/lib/social/feed";
import type { FeedRankedEntry } from "@/lib/rank-engine/service";

const AUTHOR = {
  id: "u1",
  username: "alex",
  name: "Alex",
  profileImageUrl: null,
  isInfluencer: false,
};

function row(overrides: Partial<FeedActivityInput> = {}): FeedActivityInput {
  return {
    id: "a1",
    type: "RANKED_ITEM",
    rankedEntryId: "e1",
    createdAt: new Date("2026-07-13T12:00:00Z"),
    user: AUTHOR,
    list: null,
    ...overrides,
  };
}

function entry(overrides: Partial<FeedRankedEntry> = {}): FeedRankedEntry {
  return {
    entryId: "e1",
    rank: 3,
    title: "Tacos El Rey",
    imageUrl: null,
    town: "Denver",
    note: null,
    score: 8.4,
    sentiment: "LIKED",
    isPlacementConfirmed: true,
    href: "/places/p1",
    ref: { placeId: "p1" },
    category: "RESTAURANTS",
    categoryLabel: "Restaurants",
    categorySlug: "restaurants",
    categorySize: 12,
    ...overrides,
  };
}

describe("toFeedItems", () => {
  it("hydrates a ranked row with the entry's current rank and content", () => {
    const items = toFeedItems([row()], new Map([["e1", entry()]]));

    expect(items).toHaveLength(1);
    expect(items[0].rankedEntry).toMatchObject({
      rank: 3,
      categorySize: 12,
      title: "Tacos El Rey",
      categoryLabel: "Restaurants",
    });
  });

  it("reflects a re-rank, because rank comes from the entry and not the row", () => {
    // Same activity row, entry has since moved to #1: the feed must say #1.
    const items = toFeedItems([row()], new Map([["e1", entry({ rank: 1 })]]));

    expect(items[0].rankedEntry?.rank).toBe(1);
  });

  it("drops a ranked row whose entry no longer resolves", () => {
    // onDelete: Cascade should make this unreachable — defence in depth.
    expect(toFeedItems([row()], new Map())).toEqual([]);
  });

  it("keeps non-ranked activity that has no entry to hydrate", () => {
    const items = toFeedItems(
      [
        row({
          id: "a2",
          type: "CREATED_LIST",
          rankedEntryId: null,
          list: { id: "l1", name: "Best patios" },
        }),
      ],
      new Map()
    );

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("CREATED_LIST");
    expect(items[0].list).toEqual({ id: "l1", name: "Best patios" });
    expect(items[0].rankedEntry).toBeNull();
  });

  it("drops only the unresolvable row, preserving order around it", () => {
    const items = toFeedItems(
      [
        row({ id: "a1", rankedEntryId: "e1" }),
        row({ id: "a2", rankedEntryId: "gone" }),
        row({ id: "a3", type: "CREATED_LIST", rankedEntryId: null }),
      ],
      new Map([["e1", entry()]])
    );

    expect(items.map((i) => i.id)).toEqual(["a1", "a3"]);
  });
});
