import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/places/[id]/visited - Mark a place as visited (especially for soft opens)
 * Body: { rating?: number (1-5), notes?: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: placeId } = params;
    const body = await request.json().catch(() => ({}));
    const { rating, notes } = body;

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

    // Find any Item associated with this place to create a rating
    // For now, we'll record as a user activity
    await prisma.userActivity.create({
      data: {
        userId: session.user.id,
        type: "RATED_PLACE",
        metadata: JSON.stringify({
          placeId,
          placeName: place.name,
          rating,
          notes,
          openingStatus: place.openingStatus,
          visitedDuringSoftOpen: place.openingStatus === "SOFT_OPEN",
          visitedAt: new Date().toISOString(),
        }),
      },
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
