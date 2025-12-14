import { prisma } from "@/lib/prisma";

export type FriendUser = {
  id: string;
  name: string | null;
  username: string | null;
  profileImageUrl: string | null;
};

// Get all accepted friends for a user
export async function getFriends(userId: string): Promise<FriendUser[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId, status: "ACCEPTED" },
        { addresseeId: userId, status: "ACCEPTED" },
      ],
    },
    include: {
      requester: {
        select: { id: true, name: true, username: true, profileImageUrl: true },
      },
      addressee: {
        select: { id: true, name: true, username: true, profileImageUrl: true },
      },
    },
  });

  // Return the friend (the other person in the friendship)
  return friendships.map((f) =>
    f.requesterId === userId ? f.addressee : f.requester
  );
}

// Get pending friend requests received
export async function getPendingFriendRequests(userId: string) {
  return prisma.friendship.findMany({
    where: {
      addresseeId: userId,
      status: "PENDING",
    },
    include: {
      requester: {
        select: { id: true, name: true, username: true, profileImageUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get pending friend requests sent
export async function getSentFriendRequests(userId: string) {
  return prisma.friendship.findMany({
    where: {
      requesterId: userId,
      status: "PENDING",
    },
    include: {
      addressee: {
        select: { id: true, name: true, username: true, profileImageUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Check if two users are friends
export async function areFriends(
  userId1: string,
  userId2: string
): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId1, addresseeId: userId2, status: "ACCEPTED" },
        { requesterId: userId2, addresseeId: userId1, status: "ACCEPTED" },
      ],
    },
  });
  return !!friendship;
}

// Get friendship status between two users
export async function getFriendshipStatus(
  userId: string,
  otherUserId: string
): Promise<"none" | "pending_sent" | "pending_received" | "friends" | "blocked"> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: otherUserId },
        { requesterId: otherUserId, addresseeId: userId },
      ],
    },
  });

  if (!friendship) return "none";

  if (friendship.status === "ACCEPTED") return "friends";
  if (friendship.status === "BLOCKED") return "blocked";
  if (friendship.status === "PENDING") {
    return friendship.requesterId === userId ? "pending_sent" : "pending_received";
  }

  return "none";
}

// Get friend IDs for a user (useful for queries)
export async function getFriendIds(userId: string): Promise<string[]> {
  const friends = await getFriends(userId);
  return friends.map((f) => f.id);
}

// Get friends going to a specific event
export async function getFriendsGoingToEvent(userId: string, eventId: string) {
  const friendIds = await getFriendIds(userId);

  if (friendIds.length === 0) return [];

  const interactions = await prisma.eventUserStatus.findMany({
    where: {
      eventId,
      userId: { in: friendIds },
      status: "WANT",
    },
    include: {
      user: {
        select: { id: true, name: true, username: true, profileImageUrl: true },
      },
    },
  });

  return interactions.map((i) => i.user);
}

// Get friends going to a Labs item
export async function getFriendsGoingToLabsItem(
  userId: string,
  labsItemId: string
) {
  const friendIds = await getFriendIds(userId);

  if (friendIds.length === 0) return [];

  const rsvps = await prisma.labsRSVP.findMany({
    where: {
      labsItemId,
      userId: { in: friendIds },
      status: "GOING",
    },
    include: {
      user: {
        select: { id: true, name: true, username: true, profileImageUrl: true },
      },
    },
  });

  return rsvps.map((r) => r.user);
}

// Batch get friends going to multiple events (efficient for feed)
export async function getFriendsGoingToEvents(
  userId: string,
  eventIds: string[]
): Promise<Record<string, FriendUser[]>> {
  const friendIds = await getFriendIds(userId);

  if (friendIds.length === 0 || eventIds.length === 0) {
    return eventIds.reduce((acc, id) => ({ ...acc, [id]: [] }), {});
  }

  const interactions = await prisma.eventUserStatus.findMany({
    where: {
      eventId: { in: eventIds },
      userId: { in: friendIds },
      status: "WANT",
    },
    include: {
      user: {
        select: { id: true, name: true, username: true, profileImageUrl: true },
      },
    },
  });

  // Group by event
  const result: Record<string, FriendUser[]> = {};
  for (const eventId of eventIds) {
    result[eventId] = interactions
      .filter((i) => i.eventId === eventId)
      .map((i) => i.user);
  }

  return result;
}

// Get friend count for a user
export async function getFriendCount(userId: string): Promise<number> {
  const count = await prisma.friendship.count({
    where: {
      OR: [
        { requesterId: userId, status: "ACCEPTED" },
        { addresseeId: userId, status: "ACCEPTED" },
      ],
    },
  });
  return count;
}

// Get pending request count for a user
export async function getPendingRequestCount(userId: string): Promise<number> {
  return prisma.friendship.count({
    where: {
      addresseeId: userId,
      status: "PENDING",
    },
  });
}
