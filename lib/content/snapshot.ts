/**
 * Wave 5 hygiene — the one place that knows how a content row becomes a
 * {title, imageUrl, category, town} snapshot.
 *
 * lib/feedback/api.ts and lib/rank-engine/service.ts had each grown their own
 * copy of this mapping: two modules that both had to remember that a Place's
 * title lives in `name`, that town falls back to `neighborhood`, and that a
 * Discovery has no image. Drift between them would be silent and would show up
 * as a wrong title on a card.
 *
 * A leaf module by design — it imports prisma and nothing else, so both callers
 * can depend on it without reintroducing the import cycle that
 * lib/rank-engine/ordering.ts exists to avoid.
 *
 * Returns null for a missing row. That's the honest signal; callers decide what
 * it means (the rank engine throws — you can't rank what doesn't exist; the
 * feedback writer degrades to null snapshot fields).
 */

import { prisma } from "@/lib/prisma";

export interface ContentSnapshot {
  title: string | null;
  imageUrl: string | null;
  category: string | null;
  town: string | null;
}

/** All-null snapshot, for callers that write a row regardless. */
export const EMPTY_SNAPSHOT: ContentSnapshot = {
  title: null,
  imageUrl: null,
  category: null,
  town: null,
};

export async function loadEventSnapshot(
  eventId: string
): Promise<ContentSnapshot | null> {
  const row = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      imageUrl: true,
      category: true,
      townName: true,
      neighborhood: true,
    },
  });
  if (!row) return null;
  return {
    title: row.title,
    imageUrl: row.imageUrl,
    category: row.category,
    town: row.townName ?? row.neighborhood,
  };
}

export async function loadPlaceSnapshot(
  placeId: string
): Promise<ContentSnapshot | null> {
  const row = await prisma.place.findUnique({
    where: { id: placeId },
    select: {
      name: true,
      primaryImageUrl: true,
      category: true,
      townName: true,
      neighborhood: true,
    },
  });
  if (!row) return null;
  return {
    title: row.name,
    imageUrl: row.primaryImageUrl,
    category: row.category,
    town: row.townName ?? row.neighborhood,
  };
}

export async function loadDiscoverySnapshot(
  discoveryId: string
): Promise<ContentSnapshot | null> {
  const row = await prisma.discovery.findUnique({
    where: { id: discoveryId },
    select: { title: true, category: true, townName: true },
  });
  if (!row) return null;
  return {
    title: row.title,
    imageUrl: null, // Discoveries have no image field.
    category: row.category,
    town: row.townName,
  };
}

/**
 * The legacy `Item` polymorphic bridge. Only the pre-Phase-5 /lists UI still
 * writes through it; new surfaces use the direct FKs.
 */
export async function loadItemSnapshot(
  itemId: string
): Promise<ContentSnapshot | null> {
  const row = await prisma.item.findUnique({
    where: { id: itemId },
    select: { title: true, category: true, neighborhood: true },
  });
  if (!row) return null;
  return {
    title: row.title,
    imageUrl: null,
    category: row.category,
    town: row.neighborhood,
  };
}
