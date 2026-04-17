import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { activeEventsWhere } from "@/lib/queries/events";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ events: [], places: [], guides: [], neighborhoods: [], categories: [] });
  }

  const now = new Date();

  const [events, places, guides, neighborhoods] = await Promise.all([
    prisma.event.findMany({
      where: {
        ...activeEventsWhere(now),
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { venueName: { contains: q, mode: "insensitive" } },
          { tags: { hasSome: [q.toLowerCase()] } },
        ],
      },
      select: { id: true, title: true, imageUrl: true, venueName: true, category: true },
      take: 3,
    }),
    prisma.place.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { neighborhood: { contains: q, mode: "insensitive" } },
          { vibeTags: { hasSome: [q.toLowerCase()] } },
        ],
      },
      select: { id: true, name: true, primaryImageUrl: true, neighborhood: true, category: true },
      take: 3,
    }),
    prisma.guide.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { occasionTags: { hasSome: [q.toLowerCase()] } },
        ],
      },
      select: { id: true, slug: true, title: true, coverImageUrl: true, tagline: true },
      take: 3,
    }),
    prisma.neighborhood.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { slug: true, name: true, placeCount: true },
      take: 3,
    }),
  ]);

  return NextResponse.json({ events, places, guides, neighborhoods });
}
