import type { RankSentiment } from "@prisma/client";

// Wave 4 Rate & Rank — client-side types for the rating flow. Content-native
// refs only (no legacy Item bridge; legacy cards fall back to plain DONE).
export type RankRefClient =
  | { eventId: string }
  | { placeId: string }
  | { discoveryId: string }
  | { seriesId: string }; // Wave 6A — the server may promote an event to its series

export interface SentimentOption {
  sentiment: RankSentiment;
  label: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconText: string;
}

export const SENTIMENT_OPTIONS: SentimentOption[] = [
  {
    sentiment: "LIKED",
    label: "Loved it",
    subtitle: "One of the good ones",
    icon: "🔥",
    iconBg: "bg-coral/10",
    iconText: "text-coral",
  },
  {
    sentiment: "FINE",
    label: "It was fine",
    subtitle: "Solid, not special",
    icon: "👌",
    iconBg: "bg-slate-100",
    iconText: "text-slate-500",
  },
  {
    sentiment: "DISLIKED",
    label: "Didn't like it",
    subtitle: "🔒 Private · tunes your feed",
    icon: "👎",
    iconBg: "bg-mute-hush",
    iconText: "text-mute",
  },
];

export const SENTIMENT_LABELS: Record<RankSentiment, string> = {
  LIKED: "Loved it",
  FINE: "It was fine",
  DISLIKED: "Didn't like it",
};

/** Score chip color by sentiment — shared by /rankings + rate blocks. */
export const SENTIMENT_SCORE_CLASSES: Record<RankSentiment, string> = {
  LIKED: "bg-teal-soft text-teal",
  FINE: "bg-slate-100 text-slate-600",
  DISLIKED: "bg-mute-hush text-mute",
};

export interface RankFlowResult {
  /** DONE was recorded (begin succeeded or plain been-there). */
  committed: boolean;
  /** A ranked placement was confirmed (duels finished). */
  ranked: boolean;
}
