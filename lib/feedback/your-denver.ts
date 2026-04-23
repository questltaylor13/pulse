import { prisma } from "@/lib/prisma";
import type { Category } from "@prisma/client";

// PRD 5 §4 — query helper that powers the Your Denver history view.
// Returns all DONE-status rows for a user, joined back to the live record
// where it still exists, falling back to the denormalized snapshot when the
// underlying Event/Place/Discovery has been deleted (FK went NULL).

export type DoneKind = "event" | "place" | "discovery";

export interface DoneItem {
  statusId: string;        // UserItemStatus.id (for delete actions)
  kind: DoneKind;
  sourceId: string | null; // Live id if still present, null if deleted
  title: string;
  category: Category | null;
  town: string | null;
  neighborhood: string | null;
  imageUrl: string | null;
  doneAt: Date;             // UserItemStatus.createdAt
}

export async function fetchDoneItems(userId: string): Promise<DoneItem[]> {
  const rows = await prisma.userItemStatus.findMany({
    where: { userId, status: "DONE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      itemId: true,
      eventId: true,
      placeId: true,
      discoveryId: true,
      itemTitleSnapshot: true,
      itemCategorySnapshot: true,
      itemTownSnapshot: true,
      createdAt: true,
      item: {
        select: {
          type: true,
          title: true,
          category: true,
          neighborhood: true,
          imageUrl: true,
        },
      },
      event: {
        select: {
          title: true,
          category: true,
          neighborhood: true,
          townName: true,
          imageUrl: true,
        },
      },
      place: {
        select: {
          name: true,
          category: true,
          neighborhood: true,
          townName: true,
        },
      },
      discovery: {
        select: {
          title: true,
          category: true,
          neighborhood: true,
          townName: true,
        },
      },
    },
  });

  const out: DoneItem[] = [];
  for (const row of rows) {
    if (row.event) {
      out.push({
        statusId: row.id,
        kind: "event",
        sourceId: row.eventId,
        title: row.event.title,
        category: row.event.category,
        town: row.event.townName ?? null,
        neighborhood: row.event.neighborhood ?? null,
        imageUrl: row.event.imageUrl ?? null,
        doneAt: row.createdAt,
      });
    } else if (row.place) {
      out.push({
        statusId: row.id,
        kind: "place",
        sourceId: row.placeId,
        title: row.place.name,
        category: row.place.category,
        town: row.place.townName ?? null,
        neighborhood: row.place.neighborhood ?? null,
        imageUrl: null,
        doneAt: row.createdAt,
      });
    } else if (row.discovery) {
      out.push({
        statusId: row.id,
        kind: "discovery",
        sourceId: row.discoveryId,
        title: row.discovery.title,
        category: row.discovery.category,
        town: row.discovery.townName ?? null,
        neighborhood: row.discovery.neighborhood ?? null,
        imageUrl: null,
        doneAt: row.createdAt,
      });
    } else if (row.item) {
      // Legacy Item bridge row — PRD 1 WANT/DONE/PASS path
      out.push({
        statusId: row.id,
        kind: row.item.type === "EVENT" ? "event" : "place",
        sourceId: row.itemId,
        title: row.item.title,
        category: row.item.category,
        town: null,
        neighborhood: row.item.neighborhood ?? null,
        imageUrl: row.item.imageUrl ?? null,
        doneAt: row.createdAt,
      });
    } else {
      // All live refs are null — record survives via snapshot only
      out.push({
        statusId: row.id,
        kind: "event", // Best guess; unknown kind when all refs null
        sourceId: null,
        title: row.itemTitleSnapshot ?? "(removed)",
        category: (row.itemCategorySnapshot as Category) ?? null,
        town: row.itemTownSnapshot ?? null,
        neighborhood: null,
        imageUrl: null,
        doneAt: row.createdAt,
      });
    }
  }
  return out;
}
