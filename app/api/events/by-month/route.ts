import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { denverDateKey } from "@/lib/time/denver";

// Wave 2 — month density endpoint for the discovery calendar. Given ?month=
// YYYY-MM, returns per-Denver-day event counts so the calendar can show
// density dots. Public (no auth) and cache-friendly.

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(request: NextRequest) {
  const monthParam = request.nextUrl.searchParams.get("month");
  const month = monthParam && MONTH_RE.test(monthParam)
    ? monthParam
    : denverDateKey(new Date()).slice(0, 7); // default: current Denver month

  const [year, m] = month.split("-").map(Number);

  // Query a UTC window padded ±1 day so no event whose Denver day falls in the
  // month is missed at the timezone boundary; the authoritative bucketing is
  // by denverDateKey below, and we keep only keys in the requested month.
  const from = new Date(Date.UTC(year, m - 1, 1) - 24 * 60 * 60 * 1000);
  const to = new Date(Date.UTC(year, m, 1) + 24 * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      isArchived: false,
      status: "PUBLISHED",
      startTime: { gte: from, lt: to },
    },
    select: { startTime: true },
  });

  const counts: Record<string, number> = {};
  for (const e of events) {
    const key = denverDateKey(e.startTime);
    if (key.startsWith(month)) counts[key] = (counts[key] ?? 0) + 1;
  }

  return NextResponse.json({ month, counts });
}
