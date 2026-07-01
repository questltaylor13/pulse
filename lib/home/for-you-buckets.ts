import { endOfTodayLocal, upcomingWeekendRange } from "@/lib/queries/events";
import { addDaysDenver } from "@/lib/time/denver";
import type { ScoreReason } from "@/lib/ranking/types";
import type { EventCompact, PlaceCompact } from "./types";

/**
 * The blended event+place item the For-You feed operates on. Structurally a
 * superset carried at runtime by RankedFeedItem; `reasons` is optional so
 * both the personalized (ranked) and fallback (quality) paths type-check.
 */
export type ForYouMixedItem =
  | ({ kind: "event"; reasons?: ScoreReason[] } & EventCompact)
  | ({ kind: "place"; reasons?: ScoreReason[] } & PlaceCompact);

export interface HorizonBuckets {
  tonight: ForYouMixedItem[];
  weekend: ForYouMixedItem[];
  nextWeek: ForYouMixedItem[];
  comingUp: ForYouMixedItem[];
}

/**
 * Bucket blended items into time horizons using HALF-OPEN [lo, hi) bands so
 * an event on a boundary lands in exactly one bucket:
 *   tonight  = [now, endOfToday)
 *   weekend  = [max(endOfToday, weekendStart), weekendEnd)
 *   nextWeek = [weekendEnd, weekendEnd + 7d)
 *   comingUp = [weekendEnd + 7d, now + 21d)
 * Places (no startTime) are excluded from all event buckets.
 */
export function bucketByHorizon(items: ForYouMixedItem[], now: Date): HorizonBuckets {
  const nowMs = now.getTime();
  const eodMs = endOfTodayLocal(now).getTime();
  const { start: wkStart, end: wkEnd } = upcomingWeekendRange(now);
  const wkStartMs = wkStart.getTime();
  const wkEndMs = wkEnd.getTime();
  const nextWeekEndMs = addDaysDenver(wkEnd, 7).getTime();
  const comingUpEndMs = addDaysDenver(now, 21).getTime();

  const events = items.filter((i) => i.kind === "event");

  const startMs = (i: ForYouMixedItem): number | null =>
    i.kind === "event" ? new Date(i.startTime).getTime() : null;

  // half-open [lo, hi)
  const inBand = (i: ForYouMixedItem, lo: number, hi: number): boolean => {
    const t = startMs(i);
    return t !== null && t >= lo && t < hi;
  };

  return {
    tonight: events.filter((e) => inBand(e, nowMs, eodMs)),
    weekend: events.filter((e) => inBand(e, Math.max(eodMs, wkStartMs), wkEndMs)),
    nextWeek: events.filter((e) => inBand(e, wkEndMs, nextWeekEndMs)),
    comingUp: events.filter((e) => inBand(e, nextWeekEndMs, comingUpEndMs)),
  };
}
