import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFriends, getPendingFriendRequests, getFriendCount, getPendingRequestCount } from "@/lib/friends";

// GET /api/friends - Get friends list and pending requests
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [friends, pendingRequests, friendCount, pendingCount] = await Promise.all([
    getFriends(session.user.id),
    getPendingFriendRequests(session.user.id),
    getFriendCount(session.user.id),
    getPendingRequestCount(session.user.id),
  ]);

  return NextResponse.json({
    friends,
    pendingRequests,
    friendCount,
    pendingCount,
  });
}
