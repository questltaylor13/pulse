import type { Category } from "@prisma/client";
import { CATEGORY_LABELS } from "@/lib/constants/categories";
import {
  addDaysDenver,
  denverDateKey,
  formatTimeDenver,
  formatWeekdayDateDenver,
} from "@/lib/time/denver";
import type { EventCompact, PlaceCompact } from "./types";

// Sentence-case category label (lowercase for display per PRD typography rule).
export function categoryLabel(cat: Category | null | undefined): string {
  if (!cat) return "Place";
  return CATEGORY_LABELS[cat] || "Event";
}

export function formatEventTime(iso: string, isRecurring: boolean): string {
  if (isRecurring) return "Ongoing";
  const d = new Date(iso);
  const now = new Date();
  const time = formatTimeDenver(d);
  const dayKey = denverDateKey(d);
  if (dayKey === denverDateKey(now)) return `Today · ${time}`;
  if (dayKey === denverDateKey(addDaysDenver(now, 1))) return `Tomorrow · ${time}`;
  return `${formatWeekdayDateDenver(d)} · ${time}`;
}

/**
 * PRD 2 Phase 5: when an event is outside Denver metro, lead with
 * "{townName} · {driveTime} min" instead of the Denver-biased
 * "{neighborhood} · ... · N min from Denver" string.
 *
 * Mountain destination events get a "Weekend trip · {town}" prefix.
 */
export function eventSecondaryMeta(e: EventCompact): string {
  const parts: string[] = [];
  if (e.region !== "DENVER_METRO" && e.townName) {
    if (e.isWeekendTrip) {
      parts.push(`Weekend trip · ${e.townName}`);
    } else {
      parts.push(e.townName);
    }
    if (e.driveTimeFromDenver) parts.push(`${e.driveTimeFromDenver} min`);
    if (e.priceRange) parts.push(e.priceRange);
    return parts.join(" · ");
  }
  if (e.neighborhood) parts.push(e.neighborhood);
  if (e.priceRange) parts.push(e.priceRange);
  if (e.driveTimeFromDenver) parts.push(`${e.driveTimeFromDenver} min from Denver`);
  return parts.join(" · ");
}

export function placeSecondaryMeta(p: PlaceCompact): string {
  const parts: string[] = [];
  if (p.region !== "DENVER_METRO" && p.townName) {
    if (p.isWeekendTrip) {
      parts.push(`Weekend trip · ${p.townName}`);
    } else {
      parts.push(p.townName);
    }
    if (p.driveTimeFromDenver) parts.push(`${p.driveTimeFromDenver} min`);
  } else if (p.neighborhood) {
    parts.push(p.neighborhood);
  }
  if (p.priceLevel !== null) parts.push("$".repeat(Math.max(1, p.priceLevel)));
  if (p.vibeTags?.length) parts.push(p.vibeTags.slice(0, 2).join(" · "));
  return parts.join(" · ");
}

export function startsAfterPM(iso: string, hour = 17): boolean {
  const d = new Date(iso);
  const denverHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Denver",
      hour: "numeric",
      hour12: false,
    }).format(d),
  );
  return denverHour >= hour;
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}
