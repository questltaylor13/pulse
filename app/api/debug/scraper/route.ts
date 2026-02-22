import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const denver = await prisma.city.findUnique({
    where: { slug: "denver" },
  });

  // Match the feed's timezone-aware date logic
  const denverDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
  }).format(new Date());
  const startOfTodayDenver = new Date(denverDateStr + "T00:00:00.000Z");
  const twoWeeks = new Date(startOfTodayDenver.getTime() + 14 * 24 * 60 * 60 * 1000);

  const feedCount = denver
    ? await prisma.event.count({
        where: {
          cityId: denver.id,
          startTime: { gte: startOfTodayDenver, lte: twoWeeks },
        },
      })
    : "no city";

  const sampleEvents = await prisma.event.findMany({
    where: { source: { in: ["do303", "303magazine"] } },
    select: { title: true, startTime: true, source: true },
    orderBy: { startTime: "asc" },
    take: 5,
  });

  return NextResponse.json({
    denverDate: denverDateStr,
    startOfTodayDenver: startOfTodayDenver.toISOString(),
    twoWeeks: twoWeeks.toISOString(),
    utcNow: new Date().toISOString(),
    feedCount,
    sampleEvents,
  });
}
