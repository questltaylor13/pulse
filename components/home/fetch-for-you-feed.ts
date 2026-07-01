import "server-only";
import { prisma } from "@/lib/prisma";
import {
  getRankedFeedHydrated,
  EVENT_SELECT,
  PLACE_SELECT,
  rowToEventCompact,
  rowToPlaceCompact,
} from "@/lib/ranking/rails";
import { isForYouEnabled } from "@/lib/ranking/flags";
import {
  activeEventsWhere,
  regionalScopeWhere,
  regionalScopePlaceWhere,
  type RegionalScope,
} from "@/lib/queries/events";
import { addDaysDenver } from "@/lib/time/denver";
import { bucketByHorizon, type ForYouMixedItem } from "@/lib/home/for-you-buckets";
import type {
  ForYouFeedResponse,
  ForYouSection,
} from "@/lib/home/types";

/**
 * The personalized "For You" landing feed: a blended, ranked feed of
 * time-relevant events + open places, grouped into Tonight / This weekend /
 * Coming up / Places horizons.
 *
 * Ordering comes from the user's RankedFeedCache (true candidate selection,
 * via getRankedFeedHydrated) when FOR_YOU_ENABLED + a userId + a cache hit.
 * Otherwise it falls back to quality-ordered window queries so the surface
 * always renders (anonymous users, cache miss).
 */
export async function fetchForYouFeed(
  scope: RegionalScope = "near",
  userId?: string | null,
): Promise<ForYouFeedResponse> {
  const now = new Date();
  const horizonEnd = addDaysDenver(now, 21);

  const ranked =
    userId && isForYouEnabled()
      ? await getRankedFeedHydrated(userId, { scope, limit: 200 }).catch(() => null)
      : null;

  let allItems: ForYouMixedItem[];
  let personalized: boolean;

  if (ranked && ranked.length > 0) {
    // RankedFeedItem carries extra score/reasons but is structurally a ForYouMixedItem.
    personalized = true;
    allItems = ranked;
  } else {
    personalized = false;
    const [evRows, plRows] = await Promise.all([
      prisma.event.findMany({
        where: {
          AND: [
            activeEventsWhere(now),
            regionalScopeWhere(scope),
            { startTime: { gte: now, lte: horizonEnd } },
          ],
        },
        select: EVENT_SELECT,
        orderBy: [{ isEditorsPick: "desc" }, { startTime: "asc" }],
        take: 80,
      }),
      prisma.place.findMany({
        where: {
          AND: [
            regionalScopePlaceWhere(scope),
            { openingStatus: "OPEN" },
            { OR: [{ isLocalFavorite: true }, { isFeatured: true }] },
          ],
        },
        select: PLACE_SELECT,
        orderBy: [{ combinedScore: { sort: "desc", nulls: "last" } }],
        take: 24,
      }),
    ]);
    allItems = [
      ...evRows.map((e) => ({ kind: "event" as const, ...rowToEventCompact(e) })),
      ...plRows.map((p) => ({ kind: "place" as const, ...rowToPlaceCompact(p) })),
    ];
  }

  const { tonight, weekend, nextWeek, comingUp } = bucketByHorizon(allItems, now);
  const places = allItems.filter((i) => i.kind === "place");

  const sections: ForYouSection[] = [];

  if (tonight.length > 0) {
    sections.push({
      id: "tonight",
      title: personalized ? "Tonight, for you" : "Tonight in Denver",
      subtitle: personalized ? "Matched to your taste" : "Happening today",
      items: tonight.slice(0, 12),
    });
  } else {
    // No events tonight — lead with the top blended picks so it never opens empty.
    sections.push({
      id: "top",
      title: personalized ? "Top picks for you" : "Top picks in Denver",
      subtitle: "A mix of events and places to start with",
      items: allItems.slice(0, 12),
    });
  }

  if (weekend.length > 0) {
    sections.push({
      id: "weekend",
      title: "This weekend",
      subtitle: "Plans worth blocking off",
      items: weekend.slice(0, 12),
    });
  }
  if (nextWeek.length > 0) {
    sections.push({
      id: "next-week",
      title: "Next week",
      subtitle: "Get a head start",
      items: nextWeek.slice(0, 12),
    });
  }
  if (comingUp.length > 0) {
    sections.push({
      id: "coming-up",
      title: "Coming up",
      subtitle: "On the calendar soon",
      items: comingUp.slice(0, 12),
    });
  }
  if (places.length > 0) {
    sections.push({
      id: "places",
      title: personalized ? "Places you'll love" : "Local favorites",
      subtitle: "Spots to check out",
      items: places.slice(0, 12),
    });
  }

  return {
    sections: sections.filter((s) => s.items.length > 0),
    personalized,
    lastUpdatedAt: now.toISOString(),
  };
}
