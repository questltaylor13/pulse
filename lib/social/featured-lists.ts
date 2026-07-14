/**
 * Wave 5 — featured public lists.
 *
 * The query behind /api/lists/featured, lifted out of the route so the home
 * feed can render the same rail server-side without a self-fetch and without a
 * second copy of the shape drifting away from the first.
 *
 * ListItems can point at an event *or* a place. Selecting only `event` — which
 * the route did until now — is what made place-backed previews render as the
 * literal string "Unknown".
 */

import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveContent } from "@/lib/content/snapshot";
import type { Category } from "@prisma/client";

export interface FeaturedListPreviewItem {
  title: string;
  category: Category | null;
  imageUrl: string | null;
  note: string | null;
}

export interface FeaturedList {
  id: string;
  name: string;
  description: string | null;
  shareSlug: string | null;
  saveCount: number;
  itemCount: number;
  creator: {
    name: string | null;
    username: string | null;
    profileImageUrl: string | null;
    isInfluencer: boolean;
  };
  previewItems: FeaturedListPreviewItem[];
}

const DEFAULT_LIMIT = 6;
const PREVIEW_ITEMS = 3;

export async function fetchFeaturedLists(
  limit: number = DEFAULT_LIMIT
): Promise<FeaturedList[]> {
  const lists = await prisma.list.findMany({
    // NOT `saveCount > 0`. The only writer of saveCount is another user copying
    // your list, which has never happened — Pulse has one real user. That
    // predicate made the rail structurally unreachable: a surfacing feature
    // that surfaces nothing. A public list with something in it is worth
    // showing on its own; saves order the rail, they don't gate it.
    where: {
      isPublic: true,
      items: { some: {} },
    },
    orderBy: [{ saveCount: "desc" }, { viewCount: "desc" }, { updatedAt: "desc" }],
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          profileImageUrl: true,
          isInfluencer: true,
        },
      },
      items: {
        orderBy: { order: "asc" },
        take: PREVIEW_ITEMS,
        include: {
          event: {
            select: { id: true, title: true, category: true, imageUrl: true },
          },
          place: {
            select: { id: true, name: true, category: true, primaryImageUrl: true },
          },
        },
      },
      _count: { select: { items: true } },
    },
  });

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    description: list.description,
    shareSlug: list.shareSlug,
    saveCount: list.saveCount,
    itemCount: list._count.items,
    creator: {
      name: list.user.name,
      username: list.user.username,
      profileImageUrl: list.user.profileImageUrl,
      isInfluencer: list.user.isInfluencer,
    },
    previewItems: list.items
      .map((item) => {
        // Shared mapper — a ListItem points at an event OR a place, and knowing
        // which field holds the title is lib/content/snapshot.ts's job.
        const content = resolveContent(item);
        // Nothing resolvable to show — drop it rather than print "Unknown".
        if (!content.title) return null;
        return {
          title: content.title,
          category: content.category as Category | null,
          imageUrl: content.imageUrl,
          note: item.notes,
        };
      })
      .filter((i): i is FeaturedListPreviewItem => i !== null),
  }));
}

/**
 * Cached variant for the home rail.
 *
 * The result is identical for every viewer — it takes no user id — and it lands
 * on the For You render path, so recomputing it per request is pure waste. Ten
 * minutes is well inside the tolerance for "which public lists are popular".
 */
export const fetchFeaturedListsCached = unstable_cache(
  fetchFeaturedLists,
  ["featured-lists"],
  { revalidate: 600, tags: ["featured-lists"] }
);
