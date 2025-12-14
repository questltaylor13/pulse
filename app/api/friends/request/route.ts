import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/friends/request - Send friend request
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  // Can't friend yourself
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });
  }

  // Check if user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if friendship already exists
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.user.id, addresseeId: userId },
        { requesterId: userId, addresseeId: session.user.id },
      ],
    },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") {
      return NextResponse.json({ error: "Already friends" }, { status: 400 });
    }
    if (existing.status === "PENDING") {
      // If they sent us a request, accept it
      if (existing.addresseeId === session.user.id) {
        const updated = await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: "ACCEPTED" },
        });
        return NextResponse.json({
          friendship: updated,
          message: "Friend request accepted!",
          status: "friends",
        });
      }
      return NextResponse.json(
        { error: "Friend request already sent" },
        { status: 400 }
      );
    }
    if (existing.status === "BLOCKED") {
      return NextResponse.json(
        { error: "Unable to send request" },
        { status: 400 }
      );
    }
    if (existing.status === "DECLINED") {
      // Allow resending after decline
      const updated = await prisma.friendship.update({
        where: { id: existing.id },
        data: {
          requesterId: session.user.id,
          addresseeId: userId,
          status: "PENDING",
        },
      });
      return NextResponse.json({
        friendship: updated,
        message: "Friend request sent!",
        status: "pending_sent",
      });
    }
  }

  // Create new friend request
  const friendship = await prisma.friendship.create({
    data: {
      requesterId: session.user.id,
      addresseeId: userId,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    friendship,
    message: "Friend request sent!",
    status: "pending_sent",
  });
}
