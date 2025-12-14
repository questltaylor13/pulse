import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LabsItemType } from "@prisma/client";

// GET /api/labs - List labs items
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Admin check - return 403 if not admin
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as LabsItemType | null;
  const includeCompleted = searchParams.get("includeCompleted") === "true";

  const items = await prisma.labsItem.findMany({
    where: {
      ...(type && { type }),
      ...(!includeCompleted && {
        status: { in: ["ACTIVE", "FULL"] },
      }),
      // Show items that are ongoing (no startTime) or in the future
      OR: [
        { startTime: null },
        { startTime: { gte: new Date() } },
      ],
    },
    include: {
      _count: {
        select: { rsvps: true, saves: true },
      },
      rsvps: {
        where: { userId: session.user.id },
        take: 1,
      },
      saves: {
        where: { userId: session.user.id },
        take: 1,
      },
    },
    orderBy: [
      { startTime: "asc" },
      { createdAt: "desc" },
    ],
  });

  // Transform to include user's status
  const itemsWithStatus = items.map((item) => ({
    ...item,
    userRSVP: item.rsvps[0] || null,
    userSave: item.saves[0] || null,
    rsvpCount: item._count.rsvps,
    saveCount: item._count.saves,
    rsvps: undefined,
    saves: undefined,
    _count: undefined,
  }));

  return NextResponse.json(itemsWithStatus);
}

// GET user's Labs stats
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === "stats") {
    const [rsvpCount, saveCount, attendedCount] = await Promise.all([
      prisma.labsRSVP.count({
        where: {
          userId: session.user.id,
          status: "GOING",
        },
      }),
      prisma.labsSave.count({
        where: { userId: session.user.id },
      }),
      prisma.labsRSVP.count({
        where: {
          userId: session.user.id,
          status: "GOING",
          labsItem: {
            startTime: { lt: new Date() },
            status: "COMPLETED",
          },
        },
      }),
    ]);

    return NextResponse.json({
      rsvpCount,
      saveCount,
      attendedCount,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
