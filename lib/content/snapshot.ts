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

/**
 * A row that has already `include`d its content relations. Every field is
 * optional because call sites select different subsets — what matters is that
 * they all stop re-deriving the SAME four rules below.
 */
export interface ContentRelations {
  event?: {
    title?: string;
    imageUrl?: string | null;
    category?: string | null;
    townName?: string | null;
    neighborhood?: string | null;
  } | null;
  place?: {
    name?: string;
    primaryImageUrl?: string | null;
    category?: string | null;
    townName?: string | null;
    neighborhood?: string | null;
  } | null;
  discovery?: {
    title?: string;
    category?: string | null;
    townName?: string | null;
  } | null;
  /** Wave 6A — a recurring series. Its "town" is its venue. */
  series?: {
    title?: string;
    category?: string | null;
    venueName?: string | null;
  } | null;
  /** Denormalized fallbacks, for rows whose content has since been deleted. */
  titleSnapshot?: string | null;
  imageSnapshot?: string | null;
  categorySnapshot?: string | null;
}

/**
 * The actual shared knowledge, and the reason this module exists: an Event's
 * title lives in `title` but a Place's lives in `name`; the image is `imageUrl`
 * on one and `primaryImageUrl` on the other; town falls back to neighborhood;
 * a Discovery has no image at all.
 *
 * Pure — no database. The loaders below are this function plus a query, and
 * callers that already have the relations in hand (the rank engine's toView, the
 * featured-lists rail, the follow suggestions) call it directly rather than
 * growing a fourth copy of the same four rules.
 */
export function resolveContent(row: ContentRelations): ContentSnapshot {
  return {
    title:
      row.event?.title ??
      row.place?.name ??
      row.discovery?.title ??
      row.series?.title ??
      row.titleSnapshot ??
      null,
    imageUrl:
      row.event?.imageUrl ??
      row.place?.primaryImageUrl ??
      row.imageSnapshot ??
      null, // Discoveries have no image field.
    category:
      row.event?.category ??
      row.place?.category ??
      row.discovery?.category ??
      row.series?.category ??
      row.categorySnapshot ??
      null,
    town:
      row.event?.townName ??
      row.event?.neighborhood ??
      row.place?.townName ??
      row.place?.neighborhood ??
      row.discovery?.townName ??
      row.series?.venueName ??
      null,
  };
}

export async function loadEventSnapshot(
  eventId: string
): Promise<ContentSnapshot | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      imageUrl: true,
      category: true,
      townName: true,
      neighborhood: true,
    },
  });
  return event ? resolveContent({ event }) : null;
}

export async function loadPlaceSnapshot(
  placeId: string
): Promise<ContentSnapshot | null> {
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: {
      name: true,
      primaryImageUrl: true,
      category: true,
      townName: true,
      neighborhood: true,
    },
  });
  return place ? resolveContent({ place }) : null;
}

export async function loadDiscoverySnapshot(
  discoveryId: string
): Promise<ContentSnapshot | null> {
  const discovery = await prisma.discovery.findUnique({
    where: { id: discoveryId },
    select: { title: true, category: true, townName: true },
  });
  return discovery ? resolveContent({ discovery }) : null;
}

export async function loadSeriesSnapshot(
  seriesId: string
): Promise<ContentSnapshot | null> {
  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    select: { title: true, category: true, venueName: true },
  });
  return series ? resolveContent({ series }) : null;
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
