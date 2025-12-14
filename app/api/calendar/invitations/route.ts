import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "PENDING";

  const invitations = await prisma.eventInvitation.findMany({
    where: {
      inviteeId: session.user.id,
      status: status as "PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE",
    },
    include: {
      event: {
        include: {
          place: true,
        },
      },
      inviter: {
        select: { id: true, name: true, username: true, profileImageUrl: true },
      },
      group: {
        select: { id: true, name: true, emoji: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ invitations });
}
