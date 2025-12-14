import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { invitationId, response } = await req.json(); // response: 'ACCEPTED' | 'DECLINED' | 'MAYBE'

  const invitation = await prisma.eventInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.inviteeId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update invitation
  const updated = await prisma.eventInvitation.update({
    where: { id: invitationId },
    data: {
      status: response,
      respondedAt: new Date(),
    },
  });

  // If accepted, also create/update the user's event status
  if (response === "ACCEPTED") {
    await prisma.eventUserStatus.upsert({
      where: {
        userId_eventId: {
          userId: session.user.id,
          eventId: invitation.eventId,
        },
      },
      update: {
        status: "WANT",
      },
      create: {
        userId: session.user.id,
        eventId: invitation.eventId,
        status: "WANT",
      },
    });
  }

  return NextResponse.json({ invitation: updated });
}
