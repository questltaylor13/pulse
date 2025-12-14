import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/labs/[id] - Get a single labs item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const item = await prisma.labsItem.findUnique({
    where: { id },
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
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Transform to include user's status
  const itemWithStatus = {
    ...item,
    userRSVP: item.rsvps[0] || null,
    userSave: item.saves[0] || null,
    rsvpCount: item._count.rsvps,
    saveCount: item._count.saves,
    rsvps: undefined,
    saves: undefined,
    _count: undefined,
  };

  return NextResponse.json(itemWithStatus);
}
