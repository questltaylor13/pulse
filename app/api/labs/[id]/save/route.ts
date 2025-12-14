import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/labs/[id]/save - Save an item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  // Check if item exists
  const item = await prisma.labsItem.findUnique({
    where: { id },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Create the save (upsert to handle duplicates gracefully)
  const save = await prisma.labsSave.upsert({
    where: {
      userId_labsItemId: {
        userId: session.user.id,
        labsItemId: id,
      },
    },
    update: {},
    create: {
      userId: session.user.id,
      labsItemId: id,
    },
  });

  return NextResponse.json(save);
}

// DELETE /api/labs/[id]/save - Unsave an item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.labsSave.deleteMany({
    where: {
      userId: session.user.id,
      labsItemId: id,
    },
  });

  return NextResponse.json({ success: true });
}
