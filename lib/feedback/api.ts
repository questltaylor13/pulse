/**
 * Server-side feedback operations (PRD 5 §0.4).
 *
 * Thin wrappers around Prisma that (a) handle the polymorphic ref, (b) write
 * the denormalized snapshot at create time, (c) set `source` so the new flow
 * is distinguishable from pre-Phase-5 LEGACY rows.
 *
 * Distinct from `lib/actions/items.ts`, which is the pre-Phase-5 Want/Done/
 * Pass path backing the existing /lists UI. That file continues to write
 * UserItemStatus rows with the default `source = LEGACY` and no snapshot —
 * valid by design until those call sites migrate to this module.
 */

import { prisma } from "@/lib/prisma";
import type {
  FeedbackSource,
  ItemStatus,
  UserItemStatus,
} from "@prisma/client";
import type { FeedbackRef } from "./types";
import {
  isDiscoveryRef,
  isEventRef,
  isItemRef,
  isPlaceRef,
} from "./types";

interface ItemSnapshot {
  title: string | null;
  category: string | null;
  town: string | null;
}

// After PRD 5 Phase 1, UserItemStatus has four native FKs (itemId, eventId,
// placeId, discoveryId). Each ref shape maps directly to one column — no
// lazy Item bridge needed anymore. The pre-Phase-5 /lists UI still writes
// via `itemId` for backwards compatibility; new UI surfaces write direct.

interface ResolvedSnapshot {
  title: string | null;
  category: string | null;
  town: string | null;
}

async function loadEventSnapshot(eventId: string): Promise<ResolvedSnapshot> {
  const row = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true, category: true, townName: true, neighborhood: true },
  });
  return {
    title: row?.title ?? null,
    category: row?.category ?? null,
    town: row?.townName ?? row?.neighborhood ?? null,
  };
}

async function loadPlaceSnapshot(placeId: string): Promise<ResolvedSnapshot> {
  const row = await prisma.place.findUnique({
    where: { id: placeId },
    select: { name: true, category: true, townName: true, neighborhood: true },
  });
  return {
    title: row?.name ?? null,
    category: row?.category ?? null,
    town: row?.townName ?? row?.neighborhood ?? null,
  };
}

async function loadItemSnapshot(itemId: string): Promise<ItemSnapshot> {
  const row = await prisma.item.findUnique({
    where: { id: itemId },
    select: { title: true, category: true, neighborhood: true },
  });
  return {
    title: row?.title ?? null,
    category: row?.category ?? null,
    town: row?.neighborhood ?? null,
  };
}

async function loadDiscoverySnapshot(
  discoveryId: string
): Promise<ItemSnapshot> {
  const row = await prisma.discovery.findUnique({
    where: { id: discoveryId },
    select: { title: true, category: true, townName: true },
  });
  return {
    title: row?.title ?? null,
    category: row?.category ?? null,
    town: row?.townName ?? null,
  };
}

export async function upsertFeedback(params: {
  userId: string;
  ref: FeedbackRef;
  status: ItemStatus;
  source: FeedbackSource;
}): Promise<UserItemStatus> {
  const { userId, ref, status, source } = params;
  const common = { status, source };

  if (isItemRef(ref)) {
    const snap = await loadItemSnapshot(ref.itemId);
    return prisma.userItemStatus.upsert({
      where: { userId_itemId: { userId, itemId: ref.itemId } },
      update: { ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
      create: { userId, itemId: ref.itemId, ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
    });
  }
  if (isEventRef(ref)) {
    const snap = await loadEventSnapshot(ref.eventId);
    return prisma.userItemStatus.upsert({
      where: { userId_eventId: { userId, eventId: ref.eventId } },
      update: { ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
      create: { userId, eventId: ref.eventId, ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
    });
  }
  if (isPlaceRef(ref)) {
    const snap = await loadPlaceSnapshot(ref.placeId);
    return prisma.userItemStatus.upsert({
      where: { userId_placeId: { userId, placeId: ref.placeId } },
      update: { ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
      create: { userId, placeId: ref.placeId, ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
    });
  }
  if (isDiscoveryRef(ref)) {
    const snap = await loadDiscoverySnapshot(ref.discoveryId);
    return prisma.userItemStatus.upsert({
      where: { userId_discoveryId: { userId, discoveryId: ref.discoveryId } },
      update: { ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
      create: { userId, discoveryId: ref.discoveryId, ...common, itemTitleSnapshot: snap.title, itemCategorySnapshot: snap.category, itemTownSnapshot: snap.town },
    });
  }
  throw new Error("upsertFeedback: ref missing valid id");
}

export async function deleteFeedback(params: {
  userId: string;
  ref: FeedbackRef;
}): Promise<number> {
  const { userId, ref } = params;
  if (isItemRef(ref)) {
    return (await prisma.userItemStatus.deleteMany({ where: { userId, itemId: ref.itemId } })).count;
  }
  if (isEventRef(ref)) {
    return (await prisma.userItemStatus.deleteMany({ where: { userId, eventId: ref.eventId } })).count;
  }
  if (isPlaceRef(ref)) {
    return (await prisma.userItemStatus.deleteMany({ where: { userId, placeId: ref.placeId } })).count;
  }
  if (isDiscoveryRef(ref)) {
    return (await prisma.userItemStatus.deleteMany({ where: { userId, discoveryId: ref.discoveryId } })).count;
  }
  throw new Error("deleteFeedback: ref missing valid id");
}
