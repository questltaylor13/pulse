import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

// Daily archival cron: flips isArchived=true for non-recurring events whose
// start time is more than 2 hours in the past. Scheduled at 10 UTC (≈ 3am MT MDT / 4am MST).
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const result = await prisma.event.updateMany({
    where: {
      startTime: { lt: twoHoursAgo },
      isRecurring: false,
      isArchived: false,
    },
    data: { isArchived: true },
  });

  revalidateTag("home-feed");

  return NextResponse.json({
    success: true,
    archivedCount: result.count,
    cutoff: twoHoursAgo.toISOString(),
  });
}
