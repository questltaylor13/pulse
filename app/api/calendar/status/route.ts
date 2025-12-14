import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId, calendarStatus } = await req.json(); // 'GOING' | 'MAYBE' | 'DECLINED'

  // Update or create the interaction with calendar status
  const interaction = await prisma.userEventInteraction.upsert({
    where: {
      userId_eventId: {
        userId: session.user.id,
        eventId,
      },
    },
    update: {
      calendarStatus,
      status: calendarStatus === "GOING" ? "ATTENDED" : "SAVED",
    },
    create: {
      userId: session.user.id,
      eventId,
      calendarStatus,
      status: "SAVED",
    },
  });

  // Also update EventUserStatus
  if (calendarStatus === "DECLINED") {
    // Remove from want list if declined
    await prisma.eventUserStatus.deleteMany({
      where: {
        userId: session.user.id,
        eventId,
      },
    });
  } else {
    await prisma.eventUserStatus.upsert({
      where: {
        userId_eventId: {
          userId: session.user.id,
          eventId,
        },
      },
      update: {
        status: "WANT",
      },
      create: {
        userId: session.user.id,
        eventId,
        status: "WANT",
      },
    });
  }

  return NextResponse.json({ interaction });
}
