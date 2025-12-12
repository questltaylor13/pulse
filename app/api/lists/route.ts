import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { ListTemplate } from "@prisma/client";

// Get user's lists
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lists = await prisma.list.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { items: true },
      },
      items: {
        take: 3,
        orderBy: { order: "asc" },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              category: true,
              venueName: true,
              startTime: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    lists: lists.map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      coverImageUrl: list.coverImageUrl,
      isDefault: list.isDefault,
      isPublic: list.isPublic,
      template: list.template,
      shareSlug: list.shareSlug,
      viewCount: list.viewCount,
      saveCount: list.saveCount,
      itemCount: list._count.items,
      recentItems: list.items.map((item) => ({
        id: item.event.id,
        title: item.event.title,
        category: item.event.category,
        venueName: item.event.venueName,
        startTime: item.event.startTime,
      })),
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    })),
  });
}

// Create a new list
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, isPublic, template, coverImageUrl } = body;

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: "List name is required" }, { status: 400 });
  }

  // Check if list with same name exists
  const existing = await prisma.list.findUnique({
    where: {
      userId_name: {
        userId: session.user.id,
        name: name.trim(),
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A list with this name already exists" },
      { status: 400 }
    );
  }

  // Validate template if provided
  const validTemplate = template && Object.values(ListTemplate).includes(template)
    ? (template as ListTemplate)
    : null;

  // Generate share slug if public
  const shareSlug = isPublic ? nanoid(10) : null;

  const list = await prisma.list.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      description: description?.trim() || null,
      coverImageUrl: coverImageUrl || null,
      isPublic: isPublic || false,
      template: validTemplate,
      shareSlug,
    },
  });

  // Create activity
  await prisma.userActivity.create({
    data: {
      userId: session.user.id,
      type: "CREATED_LIST",
      listId: list.id,
      isPublic: isPublic || false,
    },
  });

  return NextResponse.json({
    id: list.id,
    name: list.name,
    description: list.description,
    coverImageUrl: list.coverImageUrl,
    isPublic: list.isPublic,
    template: list.template,
    shareSlug: list.shareSlug,
  });
}

