import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/friends/respond - Accept or decline friend request
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friendshipId, action } = await request.json();

  if (!friendshipId || !action) {
    return NextResponse.json(
      { error: "Friendship ID and action required" },
      { status: 400 }
    );
  }

  if (action !== "accept" && action !== "decline") {
    return NextResponse.json(
      { error: "Invalid action. Use 'accept' or 'decline'" },
      { status: 400 }
    );
  }

  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
    include: {
      requester: {
        select: { id: true, name: true },
      },
    },
  });

  if (!friendship) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Only the addressee can respond
  if (friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (friendship.status !== "PENDING") {
    return NextResponse.json({ error: "Already responded" }, { status: 400 });
  }

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: {
      status: action === "accept" ? "ACCEPTED" : "DECLINED",
    },
  });

  return NextResponse.json({
    friendship: updated,
    message:
      action === "accept"
        ? `You're now friends with ${friendship.requester.name || "this user"}!`
        : "Request declined",
  });
}
