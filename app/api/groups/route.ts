import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createGroup,
  getUserGroups,
  joinGroup,
  getGroupByJoinCode,
} from "@/lib/groups";

// Get user's groups
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const joinCode = searchParams.get("joinCode");

  // If joinCode provided, look up group by code
  if (joinCode) {
    const group = await getGroupByJoinCode(joinCode);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json({ group });
  }

  const groups = await getUserGroups(session.user.id);
  return NextResponse.json({ groups });
}

// Create group or join group
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === "create") {
    const { name, emoji, description, isPublic } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const group = await createGroup({
      name: name.trim(),
      emoji,
      description,
      isPublic,
      ownerId: session.user.id,
    });

    return NextResponse.json({ group });
  }

  if (action === "join") {
    const { joinCode } = body;

    if (!joinCode) {
      return NextResponse.json({ error: "Join code is required" }, { status: 400 });
    }

    try {
      const group = await joinGroup(joinCode, session.user.id);
      return NextResponse.json({ group, joined: true });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to join group" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
