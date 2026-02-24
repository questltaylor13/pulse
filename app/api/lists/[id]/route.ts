import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

interface RouteParams {
  params: { id: string };
}

// Get a single list
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = params;

  const list = await prisma.list.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          profileImageUrl: true,
          isInfluencer: true,
        },
      },
      items: {
        orderBy: { order: "asc" },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              description: true,
              category: true,
              tags: true,
              venueName: true,
              address: true,
              neighborhood: true,
              startTime: true,
              endTime: true,
              priceRange: true,
              source: true,
              sourceUrl: true,
              googleRating: true,
              googleRatingCount: true,
              appleRating: true,
              appleRatingCount: true,
            },
          },
          place: {
            select: {
              id: true,
              name: true,
              address: true,
              neighborhood: true,
              category: true,
              priceLevel: true,
              googleRating: true,
              googleReviewCount: true,
              primaryImageUrl: true,
              vibeTags: true,
              isNew: true,
            },
          },
        },
      },
      collaborators: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Check access
  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.id === list.userId;
  const isCollaborator = list.collaborators?.some(
    (c) => c.userId === session?.user?.id
  );

  if (!list.isPublic && !isOwner && !isCollaborator) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Increment view count for public lists viewed by non-owners
  if (list.isPublic && !isOwner) {
    await prisma.list.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  // Calculate total estimated cost
  const totalCostParts = list.items
    .map((item) => item.event?.priceRange)
    .filter((p): p is string => !!p && p.toLowerCase() !== "free");
  const neighborhoods = [
    ...new Set(
      list.items
        .map((item) => item.event?.neighborhood || item.place?.neighborhood)
        .filter(Boolean)
    ),
  ];

  return NextResponse.json({
    id: list.id,
    name: list.name,
    description: list.description,
    coverImageUrl: list.coverImageUrl,
    isPublic: list.isPublic,
    template: list.template,
    shareSlug: list.shareSlug,
    viewCount: list.viewCount,
    saveCount: list.saveCount,
    isOwner,
    isCollaborator: !!isCollaborator,
    user: {
      id: list.user.id,
      username: list.user.username,
      name: list.user.name,
      profileImageUrl: list.user.profileImageUrl,
      isInfluencer: list.user.isInfluencer,
    },
    items: list.items.map((item, index) => {
      if (item.place) {
        return {
          id: item.place.id,
          listItemId: item.id,
          type: "place" as const,
          order: item.order || index,
          notes: item.notes,
          title: item.place.name,
          description: null,
          category: item.place.category,
          tags: item.place.vibeTags,
          venueName: item.place.name,
          address: item.place.address,
          neighborhood: item.place.neighborhood,
          startTime: null,
          endTime: null,
          priceRange: null,
          priceLevel: item.place.priceLevel,
          source: null,
          sourceUrl: null,
          googleRating: item.place.googleRating,
          googleRatingCount: item.place.googleReviewCount,
          appleRating: null,
          appleRatingCount: null,
          imageUrl: item.place.primaryImageUrl,
          isNew: item.place.isNew,
          addedAt: item.createdAt,
        };
      }
      return {
        id: item.event!.id,
        listItemId: item.id,
        type: "event" as const,
        order: item.order || index,
        notes: item.notes,
        title: item.event!.title,
        description: item.event!.description,
        category: item.event!.category,
        tags: item.event!.tags,
        venueName: item.event!.venueName,
        address: item.event!.address,
        neighborhood: item.event!.neighborhood,
        startTime: item.event!.startTime,
        endTime: item.event!.endTime,
        priceRange: item.event!.priceRange,
        priceLevel: null,
        source: item.event!.source,
        sourceUrl: item.event!.sourceUrl,
        googleRating: item.event!.googleRating,
        googleRatingCount: item.event!.googleRatingCount,
        appleRating: item.event!.appleRating,
        appleRatingCount: item.event!.appleRatingCount,
        imageUrl: null,
        isNew: false,
        addedAt: item.createdAt,
      };
    }),
    summary: {
      itemCount: list.items.length,
      neighborhoods,
      hasMultiplePrices: totalCostParts.length > 0,
    },
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  });
}

// Update a list
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const list = await prisma.list.findUnique({
    where: { id },
  });

  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, description, isPublic } = body;

  // Generate share slug if making public for the first time
  let shareSlug = list.shareSlug;
  if (isPublic && !list.isPublic && !shareSlug) {
    shareSlug = nanoid(10);
  }

  const updated = await prisma.list.update({
    where: { id },
    data: {
      name: name?.trim() || undefined,
      description: description !== undefined ? description?.trim() || null : undefined,
      isPublic: isPublic !== undefined ? isPublic : undefined,
      shareSlug,
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    isPublic: updated.isPublic,
    shareSlug: updated.shareSlug,
  });
}

// Delete a list
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const list = await prisma.list.findUnique({
    where: { id },
  });

  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  if (list.isDefault) {
    return NextResponse.json(
      { error: "Cannot delete default list" },
      { status: 400 }
    );
  }

  await prisma.list.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

// Add/remove event to/from list, reorder, duplicate, or save
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const body = await request.json();
  const { action, eventId, placeId, order, itemOrders, newName } = body;

  const list = await prisma.list.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  const isOwner = list.userId === session.user.id;

  // Handle "save_copy" action - anyone can save a public list
  if (action === "save_copy") {
    if (!list.isPublic) {
      return NextResponse.json({ error: "List is not public" }, { status: 403 });
    }

    // Create a copy of the list for the current user
    const copyName = newName || `${list.name} (Copy)`;

    // Check if name already exists for user
    const existingNames = await prisma.list.findMany({
      where: { userId: session.user.id },
      select: { name: true },
    });
    const names = new Set(existingNames.map((l) => l.name));
    let finalName = copyName;
    let counter = 1;
    while (names.has(finalName)) {
      finalName = `${copyName} ${counter}`;
      counter++;
    }

    const newList = await prisma.list.create({
      data: {
        userId: session.user.id,
        name: finalName,
        description: list.description,
        template: list.template,
        isPublic: false,
      },
    });

    // Copy all items (events and places)
    if (list.items.length > 0) {
      await prisma.listItem.createMany({
        data: list.items.map((item, index) => ({
          listId: newList.id,
          eventId: item.eventId,
          placeId: item.placeId,
          order: index,
        })),
      });
    }

    // Increment save count on original list
    await prisma.list.update({
      where: { id },
      data: { saveCount: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      action: "saved_copy",
      newListId: newList.id,
      name: newList.name,
    });
  }

  // All other actions require ownership
  if (!isOwner) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Handle "duplicate" action
  if (action === "duplicate") {
    const copyName = newName || `${list.name} (Copy)`;

    const newList = await prisma.list.create({
      data: {
        userId: session.user.id,
        name: copyName,
        description: list.description,
        template: list.template,
        isPublic: false,
      },
    });

    if (list.items.length > 0) {
      await prisma.listItem.createMany({
        data: list.items.map((item, index) => ({
          listId: newList.id,
          eventId: item.eventId,
          placeId: item.placeId,
          order: index,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      action: "duplicated",
      newListId: newList.id,
    });
  }

  // Handle "reorder" action
  if (action === "reorder" && itemOrders) {
    // itemOrders is an array of { listItemId, order }
    for (const { listItemId, order: newOrder } of itemOrders) {
      await prisma.listItem.update({
        where: { id: listItemId },
        data: { order: newOrder },
      });
    }
    return NextResponse.json({ success: true, action: "reordered" });
  }

  // Handle "remove" action
  if (action === "remove") {
    if (placeId) {
      await prisma.listItem.deleteMany({
        where: { listId: id, placeId },
      });
      return NextResponse.json({ success: true, action: "removed" });
    }
    if (!eventId) {
      return NextResponse.json({ error: "eventId or placeId required" }, { status: 400 });
    }
    await prisma.listItem.deleteMany({
      where: { listId: id, eventId },
    });
    return NextResponse.json({ success: true, action: "removed" });
  }

  // Default: Add to list (supports both eventId and placeId)
  const maxOrder = list.items.reduce((max, item) => Math.max(max, item.order || 0), -1);

  if (placeId) {
    const place = await prisma.place.findUnique({ where: { id: placeId } });
    if (!place) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    const existingPlace = await prisma.listItem.findUnique({
      where: { listId_placeId: { listId: id, placeId } },
    });
    if (existingPlace) {
      return NextResponse.json({ success: true, action: "already_added" });
    }

    await prisma.listItem.create({
      data: {
        listId: id,
        placeId,
        order: order ?? maxOrder + 1,
      },
    });

    await prisma.userActivity.create({
      data: {
        userId: session.user.id,
        type: "ADDED_TO_LIST",
        listId: id,
        isPublic: list.isPublic,
      },
    });

    return NextResponse.json({ success: true, action: "added" });
  }

  if (!eventId) {
    return NextResponse.json({ error: "eventId or placeId required" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const existing = await prisma.listItem.findUnique({
    where: { listId_eventId: { listId: id, eventId } },
  });
  if (existing) {
    return NextResponse.json({ success: true, action: "already_added" });
  }

  await prisma.listItem.create({
    data: {
      listId: id,
      eventId,
      order: order ?? maxOrder + 1,
    },
  });

  await prisma.userActivity.create({
    data: {
      userId: session.user.id,
      type: "ADDED_TO_LIST",
      eventId,
      listId: id,
      isPublic: list.isPublic,
    },
  });

  return NextResponse.json({ success: true, action: "added" });
}
