"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Record an event view
 * Deduped within 1 hour to prevent spam from page refreshes
 */
export async function recordEventView(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return; // Silent fail for anonymous users
  }

  const userId = session.user.id;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Check for recent view
  const recentView = await prisma.eventView.findFirst({
    where: {
      userId,
      eventId,
      createdAt: { gte: oneHourAgo },
    },
  });

  // Only create if no recent view exists
  if (!recentView) {
    await prisma.eventView.create({
      data: { userId, eventId },
    });
  }
}

/**
 * Get event by ID with all details
 */
export async function getEvent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      city: { select: { slug: true, name: true } },
    },
  });

  return event;
}

/**
 * Get event with user's status and extended data for detail page
 */
export async function getEventWithStatus(eventId: string) {
  const session = await getServerSession(authOptions);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      city: { select: { slug: true, name: true } },
      place: {
        select: {
          id: true,
          googleRating: true,
          googleReviewCount: true,
          priceLevel: true,
          vibeTags: true,
          companionTags: true,
          pulseDescription: true,
          googleMapsUrl: true,
        },
      },
      creatorFeatures: {
        include: {
          influencer: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              profileImageUrl: true,
              profileColor: true,
            },
          },
        },
      },
    },
  });

  if (!event) return null;

  // Get save count for social proof
  const saveCount = await prisma.eventUserStatus.count({
    where: { eventId, status: "WANT" },
  });

  // Get done count
  const doneCount = await prisma.eventUserStatus.count({
    where: { eventId, status: "DONE" },
  });

  let userStatus = null;
  let userPreferences = null;
  if (session?.user?.id) {
    const [status, preferences, categoryPrefs] = await Promise.all([
      prisma.eventUserStatus.findUnique({
        where: {
          userId_eventId: { userId: session.user.id, eventId },
        },
      }),
      prisma.detailedPreferences.findUnique({
        where: { userId: session.user.id },
        select: {
          goingSolo: true,
          goingDate: true,
          goingFriends: true,
          goingFamily: true,
          budget: true,
          vibeChill: true,
          vibeModerate: true,
          vibeHighEnergy: true,
        },
      }),
      prisma.preference.findMany({
        where: { userId: session.user.id },
        select: { category: true },
      }),
    ]);
    userStatus = status?.status || null;

    // Transform preferences into the format expected by the client
    if (preferences || categoryPrefs.length > 0) {
      const vibes: string[] = [];
      if (preferences?.vibeChill && preferences.vibeChill >= 3) vibes.push("chill");
      if (preferences?.vibeModerate && preferences.vibeModerate >= 3) vibes.push("moderate");
      if (preferences?.vibeHighEnergy && preferences.vibeHighEnergy >= 3) vibes.push("high-energy");

      userPreferences = {
        categories: categoryPrefs.map(p => p.category),
        vibes,
        budgetMax: preferences?.budget === "FREE" ? 0 : preferences?.budget === "BUDGET" ? 20 : null,
      };
    }
  }

  return { ...event, userStatus, saveCount, doneCount, userPreferences };
}

/**
 * Submit feedback for tuning recommendations
 */
export async function submitEventFeedback(
  eventId: string,
  feedbackType: "MORE" | "LESS" | "HIDE"
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  // Get event details for feedback context
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { category: true, venueName: true, neighborhood: true },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Record the feedback
  await prisma.userFeedback.upsert({
    where: {
      userId_eventId: { userId: session.user.id, eventId },
    },
    update: {
      feedbackType,
      updatedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      eventId,
      feedbackType,
    },
  });

  return { success: true, feedbackType };
}
