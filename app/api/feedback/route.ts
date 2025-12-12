import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeedbackType } from "@prisma/client";
import { z } from "zod";

const feedbackSchema = z.object({
  eventId: z.string(),
  feedbackType: z.enum(["MORE", "LESS", "HIDE"]),
});

// Submit feedback on an event
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { eventId, feedbackType } = feedbackSchema.parse(body);

    // Get event details for category/venue
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { category: true, venueName: true, tags: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Upsert feedback
    const feedback = await prisma.userFeedback.upsert({
      where: {
        userId_eventId: {
          userId: session.user.id,
          eventId,
        },
      },
      update: {
        feedbackType: feedbackType as FeedbackType,
        category: event.category,
        venueName: event.venueName,
        tags: event.tags,
      },
      create: {
        userId: session.user.id,
        eventId,
        feedbackType: feedbackType as FeedbackType,
        category: event.category,
        venueName: event.venueName,
        tags: event.tags,
      },
    });

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}

// Get user's feedback history
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const feedback = await prisma.userFeedback.findMany({
    where: { userId: session.user.id },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          category: true,
          venueName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ feedback });
}

// Delete feedback
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  }

  await prisma.userFeedback.deleteMany({
    where: {
      userId: session.user.id,
      eventId,
    },
  });

  return NextResponse.json({ success: true });
}
