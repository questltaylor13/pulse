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
import { isDiscoveryRef, isItemRef } from "./types";

interface ItemSnapshot {
  title: string | null;
  category: string | null;
  town: string | null;
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

  if (isItemRef(ref)) {
    const snap = await loadItemSnapshot(ref.itemId);
    return prisma.userItemStatus.upsert({
      where: { userId_itemId: { userId, itemId: ref.itemId } },
      update: {
        status,
        source,
        itemTitleSnapshot: snap.title,
        itemCategorySnapshot: snap.category,
        itemTownSnapshot: snap.town,
      },
      create: {
        userId,
        itemId: ref.itemId,
        status,
        source,
        itemTitleSnapshot: snap.title,
        itemCategorySnapshot: snap.category,
        itemTownSnapshot: snap.town,
      },
    });
  }

  if (isDiscoveryRef(ref)) {
    const snap = await loadDiscoverySnapshot(ref.discoveryId);
    return prisma.userItemStatus.upsert({
      where: { userId_discoveryId: { userId, discoveryId: ref.discoveryId } },
      update: {
        status,
        source,
        itemTitleSnapshot: snap.title,
        itemCategorySnapshot: snap.category,
        itemTownSnapshot: snap.town,
      },
      create: {
        userId,
        discoveryId: ref.discoveryId,
        status,
        source,
        itemTitleSnapshot: snap.title,
        itemCategorySnapshot: snap.category,
        itemTownSnapshot: snap.town,
      },
    });
  }

  throw new Error("upsertFeedback: ref must include exactly one of itemId or discoveryId");
}

export async function deleteFeedback(params: {
  userId: string;
  ref: FeedbackRef;
}): Promise<number> {
  const { userId, ref } = params;
  if (isItemRef(ref)) {
    const res = await prisma.userItemStatus.deleteMany({
      where: { userId, itemId: ref.itemId },
    });
    return res.count;
  }
  if (isDiscoveryRef(ref)) {
    const res = await prisma.userItemStatus.deleteMany({
      where: { userId, discoveryId: ref.discoveryId },
    });
    return res.count;
  }
  throw new Error("deleteFeedback: ref must include exactly one of itemId or discoveryId");
}
