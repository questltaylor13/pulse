/**
 * Groups Service - Group creation, membership, and event voting
 */

import { prisma } from "@/lib/prisma";
import { GroupRole, GroupEventStatus } from "@prisma/client";

/**
 * Generate a unique 6-character join code
 */
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new group
 */
export async function createGroup(data: {
  name: string;
  emoji?: string;
  description?: string;
  isPublic?: boolean;
  ownerId: string;
}) {
  // Generate unique join code
  let joinCode = generateJoinCode();
  let attempts = 0;

  while (attempts < 10) {
    const existing = await prisma.group.findUnique({
      where: { joinCode },
    });
    if (!existing) break;
    joinCode = generateJoinCode();
    attempts++;
  }

  const group = await prisma.group.create({
    data: {
      name: data.name,
      emoji: data.emoji || "👥",
      description: data.description,
      joinCode,
      isPublic: data.isPublic || false,
      memberCount: 1,
      members: {
        create: {
          userId: data.ownerId,
          role: GroupRole.OWNER,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              profileImageUrl: true,
            },
          },
        },
      },
    },
  });

  return group;
}

/**
 * Get group by ID with members and events
 */
export async function getGroupById(groupId: string, userId?: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              profileImageUrl: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      groupEvents: {
        include: {
          event: true,
          suggestedBy: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      groupPlaces: {
        include: {
          place: true,
          suggestedBy: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!group) return null;

  // Check if user is a member
  const isMember = userId ? group.members.some((m) => m.userId === userId) : false;
  const userRole = userId ? group.members.find((m) => m.userId === userId)?.role : null;

  return {
    ...group,
    isMember,
    userRole,
  };
}

/**
 * Get group by join code
 */
export async function getGroupByJoinCode(joinCode: string) {
  return prisma.group.findUnique({
    where: { joinCode: joinCode.toUpperCase() },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImageUrl: true,
            },
          },
        },
        take: 5,
      },
      _count: {
        select: { members: true },
      },
    },
  });
}

/**
 * Get user's groups
 */
export async function getUserGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  profileImageUrl: true,
                },
              },
            },
            take: 5,
          },
          groupEvents: {
            where: {
              status: {
                in: [GroupEventStatus.SUGGESTED, GroupEventStatus.VOTING, GroupEventStatus.CONFIRMED],
              },
            },
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  startTime: true,
                },
              },
            },
            take: 3,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((m) => ({
    ...m.group,
    role: m.role,
  }));
}

/**
 * Join a group by code
 */
export async function joinGroup(joinCode: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { joinCode: joinCode.toUpperCase() },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  // Check if already a member
  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });

  if (existing) {
    throw new Error("Already a member of this group");
  }

  // Add member
  await prisma.groupMember.create({
    data: {
      groupId: group.id,
      userId,
      role: GroupRole.MEMBER,
    },
  });

  // Update member count
  await prisma.group.update({
    where: { id: group.id },
    data: { memberCount: { increment: 1 } },
  });

  return group;
}

/**
 * Leave a group
 */
export async function leaveGroup(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership) {
    throw new Error("Not a member of this group");
  }

  if (membership.role === GroupRole.OWNER) {
    // Check if there are other members
    const memberCount = await prisma.groupMember.count({
      where: { groupId },
    });

    if (memberCount > 1) {
      // Transfer ownership to oldest admin, or oldest member
      const newOwner = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: { not: userId },
          role: GroupRole.ADMIN,
        },
        orderBy: { createdAt: "asc" },
      });

      if (newOwner) {
        await prisma.groupMember.update({
          where: { id: newOwner.id },
          data: { role: GroupRole.OWNER },
        });
      } else {
        const firstMember = await prisma.groupMember.findFirst({
          where: {
            groupId,
            userId: { not: userId },
          },
          orderBy: { createdAt: "asc" },
        });

        if (firstMember) {
          await prisma.groupMember.update({
            where: { id: firstMember.id },
            data: { role: GroupRole.OWNER },
          });
        }
      }
    } else {
      // Delete the group if owner is the only member
      await prisma.groupMember.delete({
        where: { groupId_userId: { groupId, userId } },
      });
      await prisma.group.delete({
        where: { id: groupId },
      });
      return { deleted: true };
    }
  }

  // Remove member
  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId } },
  });

  // Update member count
  await prisma.group.update({
    where: { id: groupId },
    data: { memberCount: { decrement: 1 } },
  });

  return { left: true };
}

/**
 * Suggest an event to the group
 */
export async function suggestEventToGroup(groupId: string, eventId: string, userId: string) {
  // Verify user is a member
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership) {
    throw new Error("Not a member of this group");
  }

  // Check if event already suggested
  const existing = await prisma.groupEvent.findUnique({
    where: { groupId_eventId: { groupId, eventId } },
  });

  if (existing) {
    throw new Error("Event already suggested to this group");
  }

  return prisma.groupEvent.create({
    data: {
      groupId,
      eventId,
      suggestedById: userId,
      status: GroupEventStatus.VOTING,
      votesYes: [userId], // Suggester automatically votes yes
      votesNo: [],
      votesMaybe: [],
    },
    include: {
      event: true,
      suggestedBy: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });
}

/**
 * Vote on a group event
 */
export async function voteOnGroupEvent(
  groupEventId: string,
  userId: string,
  vote: "yes" | "no" | "maybe"
) {
  const groupEvent = await prisma.groupEvent.findUnique({
    where: { id: groupEventId },
    include: { group: true },
  });

  if (!groupEvent) {
    throw new Error("Group event not found");
  }

  // Verify user is a member
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: groupEvent.groupId, userId } },
  });

  if (!membership) {
    throw new Error("Not a member of this group");
  }

  // Remove user from all vote arrays first
  const votesYes = groupEvent.votesYes.filter((id) => id !== userId);
  const votesNo = groupEvent.votesNo.filter((id) => id !== userId);
  const votesMaybe = groupEvent.votesMaybe.filter((id) => id !== userId);

  // Add to appropriate array
  if (vote === "yes") votesYes.push(userId);
  else if (vote === "no") votesNo.push(userId);
  else if (vote === "maybe") votesMaybe.push(userId);

  // Determine new status based on votes
  let newStatus = groupEvent.status;
  const memberCount = groupEvent.group.memberCount;
  const yesPercentage = votesYes.length / memberCount;

  // If more than 50% voted yes, confirm the event
  if (yesPercentage > 0.5 && groupEvent.status === GroupEventStatus.VOTING) {
    newStatus = GroupEventStatus.CONFIRMED;
  }

  return prisma.groupEvent.update({
    where: { id: groupEventId },
    data: {
      votesYes,
      votesNo,
      votesMaybe,
      status: newStatus,
    },
    include: {
      event: true,
      suggestedBy: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });
}

/**
 * Update group details (admin/owner only)
 */
export async function updateGroup(
  groupId: string,
  userId: string,
  data: {
    name?: string;
    emoji?: string;
    description?: string;
    isPublic?: boolean;
  }
) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership || (membership.role !== GroupRole.OWNER && membership.role !== GroupRole.ADMIN)) {
    throw new Error("Only admins and owners can update group settings");
  }

  return prisma.group.update({
    where: { id: groupId },
    data,
  });
}

/**
 * Update member role (owner only)
 */
export async function updateMemberRole(
  groupId: string,
  ownerId: string,
  targetUserId: string,
  newRole: GroupRole
) {
  const ownerMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: ownerId } },
  });

  if (!ownerMembership || ownerMembership.role !== GroupRole.OWNER) {
    throw new Error("Only the owner can change member roles");
  }

  if (newRole === GroupRole.OWNER) {
    // Transfer ownership
    await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId: ownerId } },
      data: { role: GroupRole.ADMIN },
    });
  }

  return prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: targetUserId } },
    data: { role: newRole },
  });
}

/**
 * Remove a member (admin/owner only)
 */
export async function removeMember(groupId: string, adminId: string, targetUserId: string) {
  const adminMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: adminId } },
  });

  if (
    !adminMembership ||
    (adminMembership.role !== GroupRole.OWNER && adminMembership.role !== GroupRole.ADMIN)
  ) {
    throw new Error("Only admins and owners can remove members");
  }

  const targetMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });

  if (!targetMembership) {
    throw new Error("User is not a member");
  }

  // Admins can't remove owners or other admins
  if (
    adminMembership.role === GroupRole.ADMIN &&
    (targetMembership.role === GroupRole.OWNER || targetMembership.role === GroupRole.ADMIN)
  ) {
    throw new Error("Admins cannot remove owners or other admins");
  }

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });

  await prisma.group.update({
    where: { id: groupId },
    data: { memberCount: { decrement: 1 } },
  });

  return { removed: true };
}

/**
 * Suggest a place to the group
 */
export async function suggestPlaceToGroup(groupId: string, placeId: string, userId: string) {
  // Verify user is a member
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership) {
    throw new Error("Not a member of this group");
  }

  // Check if place already suggested
  const existing = await prisma.groupPlace.findUnique({
    where: { groupId_placeId: { groupId, placeId } },
  });

  if (existing) {
    throw new Error("Place already suggested to this group");
  }

  return prisma.groupPlace.create({
    data: {
      groupId,
      placeId,
      suggestedById: userId,
      status: GroupEventStatus.VOTING,
      votesYes: [userId], // Suggester automatically votes yes
      votesNo: [],
      votesMaybe: [],
    },
    include: {
      place: true,
      suggestedBy: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });
}

/**
 * Vote on a group place
 */
export async function voteOnGroupPlace(
  groupPlaceId: string,
  userId: string,
  vote: "yes" | "no" | "maybe"
) {
  const groupPlace = await prisma.groupPlace.findUnique({
    where: { id: groupPlaceId },
    include: { group: true },
  });

  if (!groupPlace) {
    throw new Error("Group place not found");
  }

  // Verify user is a member
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: groupPlace.groupId, userId } },
  });

  if (!membership) {
    throw new Error("Not a member of this group");
  }

  // Remove user from all vote arrays first
  const votesYes = groupPlace.votesYes.filter((id) => id !== userId);
  const votesNo = groupPlace.votesNo.filter((id) => id !== userId);
  const votesMaybe = groupPlace.votesMaybe.filter((id) => id !== userId);

  // Add to appropriate array
  if (vote === "yes") votesYes.push(userId);
  else if (vote === "no") votesNo.push(userId);
  else if (vote === "maybe") votesMaybe.push(userId);

  // Determine new status based on votes
  let newStatus = groupPlace.status;
  const memberCount = groupPlace.group.memberCount;
  const yesPercentage = votesYes.length / memberCount;

  // If more than 50% voted yes, confirm the place
  if (yesPercentage > 0.5 && groupPlace.status === GroupEventStatus.VOTING) {
    newStatus = GroupEventStatus.CONFIRMED;
  }

  return prisma.groupPlace.update({
    where: { id: groupPlaceId },
    data: {
      votesYes,
      votesNo,
      votesMaybe,
      status: newStatus,
    },
    include: {
      place: true,
      suggestedBy: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });
}
