"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventListStatus, ItemStatus, Category } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Unified list item type that can be either an Event or an Item (Place)
export interface UnifiedListItem {
  id: string;
  type: "EVENT" | "PLACE";
  sourceId: string; // eventId or itemId
  title: string;
  description: string;
  category: Category;
  venueName: string;
  address: string;
  neighborhood: string | null;
  startTime: Date | null;
  priceRange: string;
  imageUrl: string | null;
  status: "WANT" | "DONE";
  updatedAt: Date;
}

/**
 * Toggle "Want to do" status for an event
 * If already WANT, removes the status
 * If DONE, changes to WANT
 * If no status, sets to WANT
 */
export async function toggleWant(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  // Check existing status
  const existing = await prisma.eventUserStatus.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });

  if (existing?.status === "WANT") {
    // Remove if already WANT
    await prisma.eventUserStatus.delete({
      where: { id: existing.id },
    });
    revalidatePath("/lists/want");
    return { status: null };
  }

  // Upsert to WANT
  const result = await prisma.eventUserStatus.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: { userId, eventId, status: "WANT" },
    update: { status: "WANT" },
  });

  revalidatePath("/lists/want");
  revalidatePath("/lists/done");
  return { status: result.status };
}

/**
 * Toggle "Done" status for an event
 * If already DONE, removes the status
 * If WANT, changes to DONE (completed it!)
 * If no status, sets to DONE
 */
export async function toggleDone(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  // Check existing status
  const existing = await prisma.eventUserStatus.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });

  if (existing?.status === "DONE") {
    // Remove if already DONE
    await prisma.eventUserStatus.delete({
      where: { id: existing.id },
    });
    revalidatePath("/lists/done");
    return { status: null };
  }

  // Upsert to DONE
  const result = await prisma.eventUserStatus.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: { userId, eventId, status: "DONE" },
    update: { status: "DONE" },
  });

  revalidatePath("/lists/want");
  revalidatePath("/lists/done");
  return { status: result.status };
}

/**
 * Get user's event list by status
 */
export async function getUserList(status: EventListStatus) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const now = new Date();

  // For WANT: show upcoming events, sorted by startTime ascending
  // For DONE: show all events from last 6 months, sorted by updatedAt desc
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const statuses = await prisma.eventUserStatus.findMany({
    where: {
      userId,
      status,
      ...(status === "WANT"
        ? { event: { startTime: { gte: now } } }
        : { updatedAt: { gte: sixMonthsAgo } }),
    },
    include: {
      event: {
        include: {
          city: { select: { slug: true } },
        },
      },
    },
    orderBy:
      status === "WANT"
        ? { event: { startTime: "asc" } }
        : { updatedAt: "desc" },
  });

  return statuses.map((s) => ({
    id: s.id,
    eventId: s.eventId,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    event: s.event,
  }));
}

// Filter options for unified list
export interface UnifiedListFilters {
  category?: Category | null;
  type?: "EVENT" | "PLACE" | null;
  neighborhood?: string | null;
}

/**
 * Get unified list combining both EventUserStatus and UserItemStatus
 * This ensures all saved items appear regardless of which system saved them
 */
export async function getUnifiedList(
  status: "WANT" | "DONE",
  filters?: UnifiedListFilters
): Promise<UnifiedListItem[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Build event filter conditions
  const eventWhereConditions: Record<string, unknown> = {};
  if (filters?.category) {
    eventWhereConditions.category = filters.category;
  }
  if (filters?.neighborhood) {
    eventWhereConditions.neighborhood = filters.neighborhood;
  }

  // Build item filter conditions
  const itemWhereConditions: Record<string, unknown> = {};
  if (filters?.category) {
    itemWhereConditions.category = filters.category;
  }
  if (filters?.neighborhood) {
    itemWhereConditions.neighborhood = filters.neighborhood;
  }

  // Query both tables in parallel (unless type filter excludes one)
  const shouldQueryEvents = !filters?.type || filters.type === "EVENT";
  const shouldQueryPlaces = !filters?.type || filters.type === "PLACE";

  const [eventStatuses, itemStatuses] = await Promise.all([
    // Query legacy EventUserStatus
    shouldQueryEvents
      ? prisma.eventUserStatus.findMany({
          where: {
            userId,
            status: status as EventListStatus,
            ...(status === "WANT"
              ? { event: { startTime: { gte: now }, ...eventWhereConditions } }
              : { updatedAt: { gte: sixMonthsAgo }, event: eventWhereConditions }),
          },
          include: {
            event: true,
          },
        })
      : Promise.resolve([]),
    // Query new UserItemStatus (for Places and Items)
    shouldQueryPlaces
      ? prisma.userItemStatus.findMany({
          where: {
            userId,
            status: status as ItemStatus,
            ...(status === "DONE" ? { updatedAt: { gte: sixMonthsAgo } } : {}),
            item: {
              type: "PLACE",
              ...itemWhereConditions,
            },
          },
          include: {
            item: true,
          },
        })
      : Promise.resolve([]),
  ]);

  // Convert to unified format
  const unifiedItems: UnifiedListItem[] = [];

  // Add events from EventUserStatus
  for (const es of eventStatuses) {
    unifiedItems.push({
      id: es.id,
      type: "EVENT",
      sourceId: es.eventId,
      title: es.event.title,
      description: es.event.description,
      category: es.event.category,
      venueName: es.event.venueName,
      address: es.event.address,
      neighborhood: es.event.neighborhood,
      startTime: es.event.startTime,
      priceRange: es.event.priceRange,
      imageUrl: es.event.imageUrl,
      status: es.status,
      updatedAt: es.updatedAt,
    });
  }

  // Add items from UserItemStatus (Places)
  for (const is of itemStatuses) {
    // Skip if it's an EVENT type item (to avoid duplicates with legacy system)
    if (is.item.type === "EVENT") continue;

    unifiedItems.push({
      id: is.id,
      type: "PLACE",
      sourceId: is.itemId,
      title: is.item.title,
      description: is.item.description,
      category: is.item.category,
      venueName: is.item.venueName,
      address: is.item.address,
      neighborhood: is.item.neighborhood,
      startTime: is.item.startTime,
      priceRange: is.item.priceRange,
      imageUrl: is.item.imageUrl,
      status: is.status as "WANT" | "DONE",
      updatedAt: is.updatedAt,
    });
  }

  // Sort: for WANT, events by startTime then places by updatedAt
  // For DONE, all by updatedAt desc
  if (status === "WANT") {
    unifiedItems.sort((a, b) => {
      // Events with startTime first, sorted by startTime
      if (a.type === "EVENT" && b.type === "EVENT") {
        return (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0);
      }
      if (a.type === "EVENT") return -1;
      if (b.type === "EVENT") return 1;
      // Places sorted by updatedAt
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  } else {
    unifiedItems.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  return unifiedItems;
}

/**
 * Get event status for current user
 */
export async function getEventStatus(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const status = await prisma.eventUserStatus.findUnique({
    where: {
      userId_eventId: { userId: session.user.id, eventId },
    },
  });

  return status?.status || null;
}

/**
 * Get multiple event statuses for current user (for list views)
 */
export async function getEventStatuses(eventIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {};
  }

  const statuses = await prisma.eventUserStatus.findMany({
    where: {
      userId: session.user.id,
      eventId: { in: eventIds },
    },
  });

  const statusMap: Record<string, EventListStatus> = {};
  for (const s of statuses) {
    statusMap[s.eventId] = s.status;
  }

  return statusMap;
}
