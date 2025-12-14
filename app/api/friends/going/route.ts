import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFriendsGoingToEvents } from "@/lib/friends";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ friendsGoing: {} });
    }

    const { eventIds } = await request.json();

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json({ friendsGoing: {} });
    }

    const friendsGoing = await getFriendsGoingToEvents(session.user.id, eventIds);

    return NextResponse.json({ friendsGoing });
  } catch (error) {
    console.error("Error fetching friends going:", error);
    return NextResponse.json({ friendsGoing: {} });
  }
}
