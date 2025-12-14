import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFriendshipStatus } from "@/lib/friends";

// GET /api/friends/[userId] - Get friendship status with a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  const status = await getFriendshipStatus(session.user.id, userId);

  return NextResponse.json({ status });
}

// DELETE /api/friends/[userId] - Remove friend or cancel request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  // Delete any friendship between these users
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { requesterId: session.user.id, addresseeId: userId },
        { requesterId: userId, addresseeId: session.user.id },
      ],
    },
  });

  return NextResponse.json({ message: "Friend removed", status: "none" });
}
