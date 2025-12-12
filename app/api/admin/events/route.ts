import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Category } from "@prisma/client";

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.nativeEnum(Category),
  tags: z.array(z.string()).default([]),
  venueName: z.string().min(1),
  address: z.string().min(1),
  startTime: z.string().transform((s) => new Date(s)),
  endTime: z
    .string()
    .optional()
    .transform((s) => (s ? new Date(s) : null)),
  priceRange: z.string().default("Free"),
  source: z.string().min(1),
  sourceUrl: z.string().url().optional().nullable(),
  externalId: z.string().optional().nullable(),
});

const bulkImportSchema = z.object({
  events: z.array(eventSchema),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bulkImportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Get Denver city
  const denver = await prisma.city.findUnique({
    where: { slug: "denver" },
  });

  if (!denver) {
    return NextResponse.json(
      { error: "Denver city not found. Please seed the database first." },
      { status: 404 }
    );
  }

  const results = {
    created: 0,
    updated: 0,
    errors: [] as string[],
  };

  for (const eventData of parsed.data.events) {
    try {
      if (eventData.externalId) {
        // Upsert by externalId + source
        await prisma.event.upsert({
          where: {
            externalId_source: {
              externalId: eventData.externalId,
              source: eventData.source,
            },
          },
          create: {
            ...eventData,
            cityId: denver.id,
          },
          update: {
            ...eventData,
            cityId: denver.id,
          },
        });
        results.updated++;
      } else {
        // Create new event
        await prisma.event.create({
          data: {
            ...eventData,
            cityId: denver.id,
          },
        });
        results.created++;
      }
    } catch (error) {
      results.errors.push(
        `Failed to import "${eventData.title}": ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return NextResponse.json({
    success: true,
    results,
  });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10))
  );

  const [total, events] = await Promise.all([
    prisma.event.count(),
    prisma.event.findMany({
      orderBy: { startTime: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        city: true,
        _count: {
          select: { interactions: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    events,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const eventId = searchParams.get("id");

  if (!eventId) {
    return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  }

  await prisma.event.delete({
    where: { id: eventId },
  });

  return NextResponse.json({ success: true });
}
