import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: { events: { orderBy: { order: "desc" }, take: 1 } },
  });

  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const body = await request.json();
  const { eventId, placeId, notes } = body;

  if (!eventId && !placeId) {
    return NextResponse.json(
      { error: "Either eventId or placeId is required" },
      { status: 400 }
    );
  }

  // Verify referenced item exists
  if (eventId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
  }

  if (placeId) {
    const place = await prisma.place.findUnique({ where: { id: placeId } });
    if (!place) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }
  }

  // Next order position
  const maxOrder = plan.events.length > 0 ? plan.events[0].order : -1;

  const planEvent = await prisma.planEvent.create({
    data: {
      planId: id,
      eventId: eventId || null,
      placeId: placeId || null,
      order: maxOrder + 1,
      notes: notes || null,
    },
  });

  return NextResponse.json({ success: true, item: planEvent });
}
