// PRD 5 Phase 6 §6.1 — analytics event signatures.
//
// No analytics vendor wired yet. This module declares the event shape so
// all call sites speak the same language, and currently just logs via
// console.debug in dev / no-ops in prod. When a real provider lands
// (PostHog / Mixpanel / etc.) wire it up here in one place; call sites
// stay untouched.

import type { FeedbackSource, ItemStatus } from "@prisma/client";

export type FeedbackAnalyticsEvent =
  | { type: "feedback_given"; source: FeedbackSource; itemType: "event" | "place" | "discovery"; status: ItemStatus }
  | { type: "feedback_undone"; source: FeedbackSource; itemType: "event" | "place" | "discovery"; previousStatus: ItemStatus }
  | { type: "action_sheet_opened"; source: FeedbackSource }
  | { type: "action_sheet_dismissed_no_action"; source: FeedbackSource }
  | { type: "profile_strip_shown" }
  | { type: "profile_strip_dismissed" }
  | { type: "swiper_started" }
  | { type: "swiper_completed"; interestedCount: number; beenCount: number; passCount: number; skippedCount: number }
  | { type: "swiper_abandoned"; atItemIndex: number }
  | { type: "your_denver_viewed"; entryCount: number };

export function track(event: FeedbackAnalyticsEvent): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[feedback.analytics]", event);
  }
  // TODO(PRD 6+): forward to configured analytics provider when wired.
}
