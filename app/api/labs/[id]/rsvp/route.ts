import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RSVPStatus } from "@prisma/client";

// POST /api/labs/[id]/rsvp - RSVP to an item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const status = (body.status as RSVPStatus) || "GOING";

  // Check if item exists and has capacity
  const item = await prisma.labsItem.findUnique({
    where: { id },
    include: { _count: { select: { rsvps: true } } },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Check capacity for GOING status
  if (status === "GOING" && item.capacity) {
    const goingCount = await prisma.labsRSVP.count({
      where: { labsItemId: id, status: "GOING" },
    });

    if (goingCount >= item.capacity) {
      return NextResponse.json(
        { error: "This event is at capacity" },
        { status: 400 }
      );
    }
  }

  // Upsert the RSVP
  const rsvp = await prisma.labsRSVP.upsert({
    where: {
      userId_labsItemId: {
        userId: session.user.id,
        labsItemId: id,
      },
    },
    update: { status },
    create: {
      userId: session.user.id,
      labsItemId: id,
      status,
    },
  });

  // Update spots left
  if (item.capacity) {
    const goingCount = await prisma.labsRSVP.count({
      where: { labsItemId: id, status: "GOING" },
    });

    await prisma.labsItem.update({
      where: { id },
      data: {
        spotsLeft: Math.max(0, item.capacity - goingCount),
        status: goingCount >= item.capacity ? "FULL" : "ACTIVE",
      },
    });
  }

  return NextResponse.json(rsvp);
}

// DELETE /api/labs/[id]/rsvp - Cancel RSVP
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  // Delete the RSVP
  await prisma.labsRSVP.deleteMany({
    where: {
      userId: session.user.id,
      labsItemId: id,
    },
  });

  // Update spots left
  const item = await prisma.labsItem.findUnique({
    where: { id },
  });

  if (item?.capacity) {
    const goingCount = await prisma.labsRSVP.count({
      where: { labsItemId: id, status: "GOING" },
    });

    await prisma.labsItem.update({
      where: { id },
      data: {
        spotsLeft: item.capacity - goingCount,
        status: "ACTIVE",
      },
    });
  }

  return NextResponse.json({ success: true });
}
