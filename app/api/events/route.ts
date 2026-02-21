import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Category } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category") as Category | null;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const city = searchParams.get("city");
  const neighborhood = searchParams.get("neighborhood");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const where: Record<string, unknown> = {};

  if (category) {
    where.category = category;
  }

  if (from || to) {
    where.startTime = {};
    if (from) {
      (where.startTime as Record<string, Date>).gte = new Date(from);
    }
    if (to) {
      (where.startTime as Record<string, Date>).lte = new Date(to);
    }
  }

  if (neighborhood) {
    where.neighborhood = neighborhood;
  }

  if (city) {
    where.city = { name: { equals: city, mode: "insensitive" } };
  }

  try {
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startTime: "asc" },
        take: limit,
        skip: offset,
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
          imageUrl: true,
          googleRating: true,
          googleRatingCount: true,
        },
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      events,
      total,
      limit,
      offset,
      hasMore: offset + events.length < total,
    });
  } catch (error) {
    console.error("Events API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
