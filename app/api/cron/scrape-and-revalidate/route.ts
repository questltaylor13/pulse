import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { runAllScrapers } from "@/lib/scrapers";
import { backfillEventPlaces } from "@/lib/scrapers/venue-match";
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

    // Wave 2 — recompute Place.isNew from openedDate (it was a stale, hand-set
    // seed flag that never updated). 45-day window matches the browse "new"
    // filter. Promote recently-opened places; demote ones whose openedDate has
    // aged out. Leave isNew flags on places WITHOUT an openedDate untouched —
    // those are editorial/seed decisions we can't date-reason about.
    const newCutoff = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    await prisma.place.updateMany({
      where: { isNew: false, openedDate: { gte: newCutoff } },
      data: { isNew: true },
    });
    await prisma.place.updateMany({
      where: { isNew: true, openedDate: { not: null, lt: newCutoff } },
      data: { isNew: false },
    });

    // Wave 2 — link freshly-scraped events to their venue Place so the
    // place-detail "Upcoming Events" block + "Live tonight" badge populate.
    // Best-effort: a match failure must not fail the scrape.
    let venueMatch: Awaited<ReturnType<typeof backfillEventPlaces>> | null = null;
    try {
      venueMatch = await backfillEventPlaces(prisma);
    } catch (err) {
      console.error("[scrape-and-revalidate] venue-match failed:", err);
    }

    revalidateTag("home-feed");
    return NextResponse.json({ ...result, venueMatch, revalidated: true });
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
