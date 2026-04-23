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
  | { discoveryId: string };

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
