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

import { prisma } from "@/lib/prisma";
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
    where: {
      isPublic: true,
      saveCount: { gt: 0 },
    },
    orderBy: { saveCount: "desc" },
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
        const title = item.event?.title ?? item.place?.name ?? null;
        // Nothing resolvable to show — drop it rather than print "Unknown".
        if (!title) return null;
        return {
          title,
          category: item.event?.category ?? item.place?.category ?? null,
          imageUrl: item.event?.imageUrl ?? item.place?.primaryImageUrl ?? null,
          note: item.notes,
        };
      })
      .filter((i): i is FeaturedListPreviewItem => i !== null),
  }));
}
