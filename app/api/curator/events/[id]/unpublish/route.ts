import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/curator/events/[id]/unpublish - Unpublish an event (return to draft)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const influencer = await prisma.influencer.findFirst({
    where: { userId: session.user.id },
  });

  if (!influencer) {
    return NextResponse.json({ error: "Not a creator" }, { status: 403 });
  }

  const { id } = await params;

  // Check ownership
  const existingEvent = await prisma.event.findUnique({
    where: { id },
    select: { createdById: true, status: true },
  });

  if (!existingEvent || existingEvent.createdById !== influencer.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (existingEvent.status === "DRAFT") {
    return NextResponse.json({ error: "Event is already a draft" }, { status: 400 });
  }

  // Unpublish the event
  const event = await prisma.event.update({
    where: { id },
    data: {
      status: "DRAFT",
    },
  });

  return NextResponse.json({ event, success: true });
}
