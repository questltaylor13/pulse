import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeWalkTime } from "@/lib/guides/walk-time";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stops = await prisma.guideStop.findMany({
      where: { walkTimeToNext: null, walkTimeComputedAt: null },
      include: {
        place: { select: { lat: true, lng: true } },
        event: { select: { place: { select: { lat: true, lng: true } } } },
        guide: {
          select: {
            stops: {
              select: {
                id: true,
                order: true,
                placeId: true,
                eventId: true,
                place: { select: { lat: true, lng: true } },
                event: {
                  select: { place: { select: { lat: true, lng: true } } },
                },
              },
              orderBy: { order: "asc" },
            },
          },
        },
      },
      take: 50,
    });

    let updated = 0;
    for (const stop of stops) {
      const fromCoords = stop.place ?? stop.event?.place;
      if (!fromCoords?.lat || !fromCoords?.lng) continue;

      const allStops = stop.guide.stops;
      const currentIdx = allStops.findIndex((s) => s.id === stop.id);
      const nextStop = allStops[currentIdx + 1];
      if (!nextStop) continue; // Last stop, skip

      const toCoords = nextStop.place ?? nextStop.event?.place;
      if (!toCoords?.lat || !toCoords?.lng) continue;

      const result = await computeWalkTime(
        fromCoords.lat,
        fromCoords.lng,
        toCoords.lat,
        toCoords.lng
      );
      await prisma.guideStop.update({
        where: { id: stop.id },
        data: {
          walkTimeToNext: result.minutes,
          walkTimeComputedAt: new Date(),
        },
      });
      updated++;
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("[backfill-walk-times] error:", error);
    return NextResponse.json(
      {
        error: "Backfill failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
