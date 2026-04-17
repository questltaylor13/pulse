import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

// Daily cron: recomputes placeCount for each neighborhood by counting
// OPEN places whose neighborhood field matches. Scheduled at 09 UTC (≈ 2am MT MDT / 3am MST).
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const neighborhoods = await prisma.neighborhood.findMany();
    let updated = 0;

    for (const n of neighborhoods) {
      const count = await prisma.place.count({
        where: { neighborhood: n.name, openingStatus: "OPEN" },
      });

      await prisma.neighborhood.update({
        where: { id: n.id },
        data: { placeCount: count },
      });

      updated++;
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("[refresh-neighborhood-counts] error:", error);
    return NextResponse.json(
      {
        error: "Refresh failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
