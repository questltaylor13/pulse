/**
 * PRD 5 feedback types + UI ↔ DB mapping.
 *
 * UI copy stays human: "Interested" / "Not for me" / "I've been there".
 * DB uses the existing ItemStatus enum values from PRD 1: WANT / PASS / DONE.
 * The mapping lives here so components don't hardcode the translation.
 */

import type { ItemStatus } from "@prisma/client";

export const UI_LABEL_TO_STATUS = {
  Interested: "WANT",
  "Not for me": "PASS",
  "I've been there": "DONE",
} as const satisfies Record<string, ItemStatus>;

export const STATUS_TO_UI_LABEL: Record<ItemStatus, string> = {
  WANT: "Interested",
  PASS: "Not for me",
  DONE: "I've been there",
};

// Short pill text rendered on cards after feedback is given (§1.3 in PRD).
// PASS has no visible pill — the card is filtered out of the feed instead.
export const STATUS_TO_PILL_TEXT: Partial<Record<ItemStatus, string>> = {
  WANT: "Interested",
  DONE: "Been there",
};

// Polymorphic ref: exactly one key populated.
//
// Feed UI uses eventId / placeId / discoveryId (the natural IDs rendered on
// cards). Server-side `resolveFeedbackTarget` in lib/feedback/api.ts bridges
// eventId/placeId → Item.id on write (find-or-create). Existing DB-level
// code that already knows the bridge Item.id can still pass itemId directly.
export type FeedbackRef =
  | { itemId: string }
  | { eventId: string }
  | { placeId: string }
  | { discoveryId: string }
  | { seriesId: string };

export function isItemRef(ref: FeedbackRef): ref is { itemId: string } {
  return "itemId" in ref && typeof ref.itemId === "string" && ref.itemId.length > 0;
}
export function isEventRef(ref: FeedbackRef): ref is { eventId: string } {
  return "eventId" in ref && typeof ref.eventId === "string" && ref.eventId.length > 0;
}
export function isPlaceRef(ref: FeedbackRef): ref is { placeId: string } {
  return "placeId" in ref && typeof ref.placeId === "string" && ref.placeId.length > 0;
}
export function isDiscoveryRef(
  ref: FeedbackRef
): ref is { discoveryId: string } {
  return (
    "discoveryId" in ref &&
    typeof ref.discoveryId === "string" &&
    ref.discoveryId.length > 0
  );
}
/**
 * Wave 6A — a recurring series. Rating one Tuesday's trivia rates THE trivia.
 *
 * The UI never constructs one of these: it sends { eventId } as it always has,
 * and the server promotes it (see lib/series/resolve.ts). Keeping the promotion
 * server-side means a client that has never heard of series still rates them
 * correctly.
 */
export function isSeriesRef(ref: FeedbackRef): ref is { seriesId: string } {
  return (
    "seriesId" in ref && typeof ref.seriesId === "string" && ref.seriesId.length > 0
  );
}

// ---------------------------------------------------------------------------
// Wave 4 — shared ref narrowing (previously copy-pasted in CardMoreMenu and
// DetailFeedback; one source so feed cards and detail pages can never
// disagree about which refs support the rank flow / "why" sheet).
// ---------------------------------------------------------------------------

/** Content-native ref — the shape the rank engine accepts (no Item bridge). */
export type ContentRef =
  | { eventId: string }
  | { placeId: string }
  | { discoveryId: string }
  | { seriesId: string };

/** Narrow a FeedbackRef to a content-native ref; null for legacy Item refs. */
export function resolveContentRef(ref: FeedbackRef): ContentRef | null {
  if (isEventRef(ref)) return { eventId: ref.eventId };
  if (isPlaceRef(ref)) return { placeId: ref.placeId };
  if (isDiscoveryRef(ref)) return { discoveryId: ref.discoveryId };
  if (isSeriesRef(ref)) return { seriesId: ref.seriesId };
  return null;
}

/**
 * itemType/itemId pair for ranking-cache lookups ("Why am I seeing this?").
 *
 * Null for a series, deliberately. The why-sheet explains why an item is in your
 * ranked FEED, and the feed ranks occurrences, not series — a series has no
 * RankedFeedCache entry to explain. Same reason the legacy Item bridge returns
 * null: no cache entry, no explanation, so hide the row rather than show an
 * empty sheet.
 */
export function resolveItemTarget(
  ref: FeedbackRef
): { itemType: "event" | "place" | "discovery"; itemId: string } | null {
  if (isEventRef(ref)) return { itemType: "event", itemId: ref.eventId };
  if (isPlaceRef(ref)) return { itemType: "place", itemId: ref.placeId };
  if (isDiscoveryRef(ref))
    return { itemType: "discovery", itemId: ref.discoveryId };
  return null;
}
