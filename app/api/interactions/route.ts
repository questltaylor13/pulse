import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { InteractionStatus } from "@prisma/client";

const interactionSchema = z.object({
  eventId: z.string(),
  action: z.enum(["save", "unsave", "like", "unlike", "rate", "attend"]),
  rating: z.number().min(1).max(5).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = interactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { eventId, action, rating } = parsed.data;
  const userId = session.user.id;

  // Verify event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Get or create interaction
  let interaction = await prisma.userEventInteraction.findUnique({
    where: {
      userId_eventId: { userId, eventId },
    },
  });

  switch (action) {
    case "save":
      interaction = await prisma.userEventInteraction.upsert({
        where: {
          userId_eventId: { userId, eventId },
        },
        create: {
          userId,
          eventId,
          status: InteractionStatus.SAVED,
        },
        update: {
          status: InteractionStatus.SAVED,
        },
      });
      break;

    case "unsave":
      if (interaction) {
        // If there's no other data (like, rating), delete the interaction
        if (!interaction.liked && !interaction.rating) {
          await prisma.userEventInteraction.delete({
            where: { id: interaction.id },
          });
          return NextResponse.json({ success: true, interaction: null });
        }
        // Otherwise just clear the status concept by keeping it but removing SAVED semantics
        // For now, we'll delete since we don't have an "unsaved" status
        await prisma.userEventInteraction.delete({
          where: { id: interaction.id },
        });
        return NextResponse.json({ success: true, interaction: null });
      }
      break;

    case "like":
      interaction = await prisma.userEventInteraction.upsert({
        where: {
          userId_eventId: { userId, eventId },
        },
        create: {
          userId,
          eventId,
          status: InteractionStatus.SAVED,
          liked: true,
        },
        update: {
          liked: true,
        },
      });
      break;

    case "unlike":
      if (interaction) {
        interaction = await prisma.userEventInteraction.update({
          where: { id: interaction.id },
          data: { liked: false },
        });
      }
      break;

    case "rate":
      if (!rating) {
        return NextResponse.json(
          { error: "Rating required for rate action" },
          { status: 400 }
        );
      }
      interaction = await prisma.userEventInteraction.upsert({
        where: {
          userId_eventId: { userId, eventId },
        },
        create: {
          userId,
          eventId,
          status: InteractionStatus.ATTENDED,
          rating,
        },
        update: {
          status: InteractionStatus.ATTENDED,
          rating,
        },
      });
      break;

    case "attend":
      interaction = await prisma.userEventInteraction.upsert({
        where: {
          userId_eventId: { userId, eventId },
        },
        create: {
          userId,
          eventId,
          status: InteractionStatus.ATTENDED,
        },
        update: {
          status: InteractionStatus.ATTENDED,
        },
      });
      break;
  }

  return NextResponse.json({ success: true, interaction });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const eventId = searchParams.get("eventId");
  const status = searchParams.get("status") as InteractionStatus | null;

  const userId = session.user.id;

  // If eventId provided, return single interaction
  if (eventId) {
    const interaction = await prisma.userEventInteraction.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });
    return NextResponse.json({ interaction });
  }

  // Otherwise return all user interactions
  const whereClause = {
    userId,
    ...(status && { status }),
  };

  const interactions = await prisma.userEventInteraction.findMany({
    where: whereClause,
    include: {
      event: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ interactions });
}
