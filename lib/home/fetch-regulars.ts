import "server-only";
import { prisma } from "@/lib/prisma";
import { isSeriesV1Enabled } from "@/lib/ranking/flags";
import { selectRegulars, REGULARS_HORIZON_DAYS, type RegularItem } from "./regulars";

/**
 * Wave 6A — the series you ranked LIKED, on again in the next week.
 *
 * Two queries: your LIKED ranked series, then their upcoming occurrences. The
 * selection itself is pure (lib/home/regulars.ts) so the interesting rules —
 * next-occurrence-only, ordered by your rank — are testable without a database.
 */
export async function fetchRegulars(
  userId: string | null | undefined,
  now: Date = new Date()
): Promise<RegularItem[]> {
  if (!userId || !isSeriesV1Enabled()) return [];

  try {
    const entries = await prisma.userRankedEntry.findMany({
      where: {
        userId,
        seriesId: { not: null },
        sentiment: "LIKED",
        isPlacementConfirmed: true,
      },
      orderBy: { position: "asc" },
      select: {
        position: true,
        series: { select: { id: true, title: true, venueName: true, cadence: true } },
      },
    });
    if (entries.length === 0) return [];

    const ranked = entries
      .filter((e) => e.series !== null)
      .map((e) => ({
        seriesId: e.series!.id,
        title: e.series!.title,
        venueName: e.series!.venueName,
        cadence: e.series!.cadence,
        // Positions are dense within a category, so rank = position + 1.
        rank: e.position + 1,
      }));

    const horizon = new Date(now.getTime() + REGULARS_HORIZON_DAYS * 86_400_000);
    const occurrences = await prisma.event.findMany({
      where: {
        seriesId: { in: ranked.map((r) => r.seriesId) },
        status: "PUBLISHED",
        isArchived: false,
        startTime: { gte: now, lte: horizon },
      },
      orderBy: { startTime: "asc" },
      select: { id: true, seriesId: true, startTime: true, imageUrl: true },
    });

    return selectRegulars(
      ranked,
      occurrences.map((o) => ({
        eventId: o.id,
        seriesId: o.seriesId!,
        startTime: o.startTime,
        imageUrl: o.imageUrl,
      })),
      now
    );
  } catch (err) {
    // A bonus rail must never take the home feed down with it.
    console.warn("[home.fetchRegulars] failed:", err);
    return [];
  }
}
