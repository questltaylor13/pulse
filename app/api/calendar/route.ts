import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "month"; // 'week' | 'month'
  const dateParam = searchParams.get("date"); // ISO date string

  const baseDate = dateParam ? new Date(dateParam) : new Date();

  let startDate: Date;
  let endDate: Date;

  if (view === "week") {
    startDate = startOfWeek(baseDate, { weekStartsOn: 0 });
    endDate = endOfWeek(baseDate, { weekStartsOn: 0 });
  } else {
    startDate = startOfMonth(baseDate);
    endDate = endOfMonth(baseDate);
  }

  // Get user's saved/going events (from EventUserStatus with WANT status)
  const myEvents = await prisma.eventUserStatus.findMany({
    where: {
      userId: session.user.id,
      status: "WANT",
      event: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    include: {
      event: {
        include: {
          place: true,
        },
      },
    },
    orderBy: {
      event: { startTime: "asc" },
    },
  });

  // Get pending invitations
  const invitations = await prisma.eventInvitation.findMany({
    where: {
      inviteeId: session.user.id,
      status: "PENDING",
      event: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    include: {
      event: {
        include: {
          place: true,
        },
      },
      inviter: {
        select: { id: true, name: true, profileImageUrl: true },
      },
      group: {
        select: { id: true, name: true, emoji: true },
      },
    },
    orderBy: {
      event: { startTime: "asc" },
    },
  });

  // Get group events user has accepted
  const groupEvents = await prisma.groupEvent.findMany({
    where: {
      group: {
        members: {
          some: { userId: session.user.id },
        },
      },
      status: "CONFIRMED",
      event: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    include: {
      event: {
        include: {
          place: true,
        },
      },
      group: {
        select: { id: true, name: true, emoji: true },
      },
    },
  });

  // Get Labs RSVPs
  const labsEvents = await prisma.labsRSVP.findMany({
    where: {
      userId: session.user.id,
      status: "GOING",
      labsItem: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    include: {
      labsItem: true,
    },
  });

  return NextResponse.json({
    myEvents,
    invitations,
    groupEvents,
    labsEvents,
    dateRange: { startDate, endDate },
  });
}
