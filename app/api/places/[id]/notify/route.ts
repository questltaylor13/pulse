import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AlertType } from "@prisma/client";

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/places/[id]/notify - Subscribe to notifications for a place
 * Body: { alertType: "NOTIFY_ON_OPEN" | "SOFT_OPEN_ALERT" | "FIRST_WEEK" }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: placeId } = params;
    const body = await request.json();
    const alertType = (body.alertType as AlertType) || "NOTIFY_ON_OPEN";

    // Verify place exists
    const place = await prisma.place.findUnique({
      where: { id: placeId },
      select: {
        id: true,
        name: true,
        openingStatus: true,
        isUpcoming: true,
      },
    });

    if (!place) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    // Create or update the alert
    const alert = await prisma.newPlaceAlert.upsert({
      where: {
        userId_placeId_alertType: {
          userId: session.user.id,
          placeId,
          alertType,
        },
      },
      update: {
        notified: false, // Reset notification if re-subscribing
        notifiedAt: null,
      },
      create: {
        userId: session.user.id,
        placeId,
        alertType,
      },
    });

    // Increment preOpeningSaves count
    await prisma.place.update({
      where: { id: placeId },
      data: {
        preOpeningSaves: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      alert,
      message: `You'll be notified when ${place.name} ${alertType === "SOFT_OPEN_ALERT" ? "has a soft opening" : alertType === "FIRST_WEEK" ? "is in its first week" : "opens"}!`,
    });
  } catch (error) {
    console.error("Error creating place alert:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/places/[id]/notify - Unsubscribe from notifications
 * Query param: alertType (optional, removes all if not specified)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: placeId } = params;
    const { searchParams } = new URL(request.url);
    const alertType = searchParams.get("alertType") as AlertType | null;

    if (alertType) {
      // Delete specific alert type
      await prisma.newPlaceAlert.delete({
        where: {
          userId_placeId_alertType: {
            userId: session.user.id,
            placeId,
            alertType,
          },
        },
      });
    } else {
      // Delete all alerts for this place
      await prisma.newPlaceAlert.deleteMany({
        where: {
          userId: session.user.id,
          placeId,
        },
      });
    }

    // Decrement preOpeningSaves count
    await prisma.place.update({
      where: { id: placeId },
      data: {
        preOpeningSaves: { decrement: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing place alert:", error);
    return NextResponse.json(
      { error: "Failed to remove notification" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/places/[id]/notify - Check if user has notification set
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: placeId } = params;

    const alerts = await prisma.newPlaceAlert.findMany({
      where: {
        userId: session.user.id,
        placeId,
      },
    });

    return NextResponse.json({
      hasAlert: alerts.length > 0,
      alerts: alerts.map((a) => a.alertType),
    });
  } catch (error) {
    console.error("Error checking place alerts:", error);
    return NextResponse.json(
      { error: "Failed to check notifications" },
      { status: 500 }
    );
  }
}
