import type { Category } from "@prisma/client";
import { CATEGORY_LABELS } from "@/lib/constants/categories";
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
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today · ${time}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();
  if (isTomorrow) return `Tomorrow · ${time}`;

  const datePart = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  return `${datePart} · ${time}`;
}

export function eventSecondaryMeta(e: EventCompact): string {
  const parts: string[] = [];
  if (e.neighborhood) parts.push(e.neighborhood);
  if (e.priceRange) parts.push(e.priceRange);
  if (e.driveTimeFromDenver) parts.push(`${e.driveTimeFromDenver} min from Denver`);
  return parts.join(" · ");
}

export function placeSecondaryMeta(p: PlaceCompact): string {
  const parts: string[] = [];
  if (p.neighborhood) parts.push(p.neighborhood);
  if (p.priceLevel !== null) parts.push("$".repeat(Math.max(1, p.priceLevel)));
  if (p.vibeTags?.length) parts.push(p.vibeTags.slice(0, 2).join(" · "));
  return parts.join(" · ");
}

export function startsAfterPM(iso: string, hour = 17): boolean {
  const d = new Date(iso);
  return d.getHours() >= hour;
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}
