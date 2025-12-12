import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getGroupById,
  leaveGroup,
  updateGroup,
  suggestEventToGroup,
  voteOnGroupEvent,
  suggestPlaceToGroup,
  voteOnGroupPlace,
  removeMember,
  updateMemberRole,
} from "@/lib/groups";
import { GroupRole } from "@prisma/client";

// Get group details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const group = await getGroupById(id, session?.user?.id);

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Only allow viewing if public or user is a member
  if (!group.isPublic && !group.isMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({ group });
}

// Group actions: leave, update, suggest event, vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;
  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      case "leave": {
        const result = await leaveGroup(groupId, session.user.id);
        return NextResponse.json(result);
      }

      case "update": {
        const { name, emoji, description, isPublic } = body;
        const group = await updateGroup(groupId, session.user.id, {
          name,
          emoji,
          description,
          isPublic,
        });
        return NextResponse.json({ group });
      }

      case "suggest_event": {
        const { eventId } = body;
        if (!eventId) {
          return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
        }
        const groupEvent = await suggestEventToGroup(groupId, eventId, session.user.id);
        return NextResponse.json({ groupEvent });
      }

      case "vote": {
        const { groupEventId, vote } = body;
        if (!groupEventId || !vote) {
          return NextResponse.json(
            { error: "Group event ID and vote are required" },
            { status: 400 }
          );
        }
        if (!["yes", "no", "maybe"].includes(vote)) {
          return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
        }
        const groupEvent = await voteOnGroupEvent(groupEventId, session.user.id, vote);
        return NextResponse.json({ groupEvent });
      }

      case "suggest_place": {
        const { placeId } = body;
        if (!placeId) {
          return NextResponse.json({ error: "Place ID is required" }, { status: 400 });
        }
        const groupPlace = await suggestPlaceToGroup(groupId, placeId, session.user.id);
        return NextResponse.json({ groupPlace });
      }

      case "vote_place": {
        const { groupPlaceId, vote } = body;
        if (!groupPlaceId || !vote) {
          return NextResponse.json(
            { error: "Group place ID and vote are required" },
            { status: 400 }
          );
        }
        if (!["yes", "no", "maybe"].includes(vote)) {
          return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
        }
        const groupPlace = await voteOnGroupPlace(groupPlaceId, session.user.id, vote);
        return NextResponse.json({ groupPlace });
      }

      case "remove_member": {
        const { targetUserId } = body;
        if (!targetUserId) {
          return NextResponse.json({ error: "Target user ID is required" }, { status: 400 });
        }
        const result = await removeMember(groupId, session.user.id, targetUserId);
        return NextResponse.json(result);
      }

      case "update_role": {
        const { targetUserId, role } = body;
        if (!targetUserId || !role) {
          return NextResponse.json(
            { error: "Target user ID and role are required" },
            { status: 400 }
          );
        }
        if (!Object.values(GroupRole).includes(role)) {
          return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }
        const member = await updateMemberRole(groupId, session.user.id, targetUserId, role);
        return NextResponse.json({ member });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operation failed" },
      { status: 400 }
    );
  }
}

// Delete group (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  // Leave as owner will delete the group if they're the only member
  // or transfer ownership and leave
  try {
    const result = await leaveGroup(groupId, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete group" },
      { status: 400 }
    );
  }
}
