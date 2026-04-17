import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { runAllScrapers } from "@/lib/scrapers";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

// Daily scrape cron: runs all configured scrapers then invalidates the home-feed
// cache so the "New in Denver" section reflects freshly-inserted content.
// Scheduled at 11 UTC (≈ 4am MT MDT / 5am MST).
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAllScrapers();

    // Phase 2: auto-flag local favorites after scraping new data
    await prisma.place.updateMany({
      where: {
        isLocalFavorite: false,
        googleRating: { gte: 4.5 },
        googleReviewCount: { gte: 100 },
        OR: [
          { touristTrapScore: { lte: 0.3 } },
          { touristTrapScore: null },
        ],
      },
      data: { isLocalFavorite: true },
    });

    revalidateTag("home-feed");
    return NextResponse.json({ ...result, revalidated: true });
  } catch (error) {
    console.error("[scrape-and-revalidate] error:", error);
    return NextResponse.json(
      {
        error: "Scrape failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
