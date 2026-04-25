import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const lists = await prisma.list.findMany({
    where: {
      isPublic: true,
      saveCount: { gt: 0 },
    },
    orderBy: { saveCount: "desc" },
    take: 6,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          profileImageUrl: true,
          isInfluencer: true,
        },
      },
      items: {
        orderBy: { order: "asc" },
        take: 3,
        include: {
          event: {
            select: { id: true, title: true, category: true, imageUrl: true },
          },
        },
      },
      _count: { select: { items: true } },
    },
  });

  const formatted = lists.map((list) => ({
    id: list.id,
    name: list.name,
    description: list.description,
    shareSlug: list.shareSlug,
    saveCount: list.saveCount,
    itemCount: list._count.items,
    creator: {
      name: list.user.name,
      profileImageUrl: list.user.profileImageUrl,
      isInfluencer: list.user.isInfluencer,
    },
    previewItems: list.items.map((item) => ({
      title: item.event?.title || "Unknown",
      category: item.event?.category,
      imageUrl: item.event?.imageUrl,
      note: item.notes,
    })),
  }));

  return NextResponse.json({ lists: formatted });
}
