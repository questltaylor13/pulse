import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId, inviteeIds, groupId, message } = await req.json();

  // Validate event exists
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const invitations = [];

  // Send to individuals
  if (inviteeIds && inviteeIds.length > 0) {
    for (const inviteeId of inviteeIds) {
      // Don't invite yourself
      if (inviteeId === session.user.id) continue;

      // Check if already invited
      const existing = await prisma.eventInvitation.findFirst({
        where: {
          inviteeId,
          eventId,
          inviterId: session.user.id,
        },
      });

      if (!existing) {
        const invitation = await prisma.eventInvitation.create({
          data: {
            inviteeId,
            eventId,
            inviterId: session.user.id,
            message,
          },
        });
        invitations.push(invitation);
      }
    }
  }

  // Send to group members
  if (groupId) {
    const groupMembers = await prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { not: session.user.id }, // Don't invite yourself
      },
    });

    for (const member of groupMembers) {
      const existing = await prisma.eventInvitation.findFirst({
        where: {
          inviteeId: member.userId,
          eventId,
          groupId,
        },
      });

      if (!existing) {
        const invitation = await prisma.eventInvitation.create({
          data: {
            inviteeId: member.userId,
            eventId,
            groupId,
            inviterId: session.user.id,
            message,
          },
        });
        invitations.push(invitation);
      }
    }
  }

  return NextResponse.json({
    invitations,
    message: `Sent ${invitations.length} invitation(s)`,
  });
}
