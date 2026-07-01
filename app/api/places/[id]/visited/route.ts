import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ItemStatus, FeedbackSource } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upsertFeedback } from "@/lib/feedback/api";

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/places/[id]/visited - Mark a place as visited ("been there"),
 * optionally with a 1–5 rating.
 *
 * Wave 2: replaced the dead write-only UserActivity JSON blob with a real
 * UserItemStatus DONE (+ rating) via the feedback layer — so it trains the
 * ranker (markDirty + live re-rank) and updates the place's rating aggregate,
 * exactly like the place-detail rating UI. Soft-open buzzScore bump preserved.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: placeId } = params;
    const body = await request.json().catch(() => ({}));
    const rating = typeof body.rating === "number" ? body.rating : undefined;
    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: "rating must be an integer 1–5" }, { status: 400 });
    }

    // Verify place exists
    const place = await prisma.place.findUnique({
      where: { id: placeId },
      select: {
        id: true,
        name: true,
        openingStatus: true,
      },
    });

    if (!place) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    await upsertFeedback({
      userId: session.user.id,
      ref: { placeId },
      status: ItemStatus.DONE,
      source: FeedbackSource.DETAIL_PAGE,
      rating,
    });

    // If it was a soft open, increment buzz score
    if (place.openingStatus === "SOFT_OPEN") {
      await prisma.place.update({
        where: { id: placeId },
        data: {
          buzzScore: { increment: 1 },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: place.openingStatus === "SOFT_OPEN"
        ? `Thanks for being an early explorer at ${place.name}!`
        : `Marked ${place.name} as visited!`,
      visitedDuringSoftOpen: place.openingStatus === "SOFT_OPEN",
    });
  } catch (error) {
    console.error("Error marking place as visited:", error);
    return NextResponse.json(
      { error: "Failed to mark as visited" },
      { status: 500 }
    );
  }
}
