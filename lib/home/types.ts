import type { Category, EventRegion } from "@prisma/client";
import type { SeedGuide } from "./seed-guides";

export interface GuideCompact {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  coverImageUrl: string | null;
  durationLabel: string;
  durationMinutes: number;
  costRangeLabel: string;
  occasionTags: string[];
  vibeTags: string[];
  stopsCount: number;
  saveCount: number;
  isFeatured: boolean;
  creator: {
    handle: string;
    displayName: string;
    profileImageUrl: string | null;
    label: string; // first specialty or "Creator"
  };
}

export interface CreatorCardData {
  handle: string;
  displayName: string;
  profileImageUrl: string | null;
  label: string;
  guideCount: number;
}

export interface GuidesFeedResponse {
  featuredGuide: GuideCompact | null;
  weekendReady: GuideCompact[];
  featuredCreators: CreatorCardData[];
  dateNight: GuideCompact[];
  quickPlans: GuideCompact[];
  lastUpdatedAt: string;
}

export interface EventCompact {
  id: string;
  title: string;
  category: Category;
  imageUrl: string | null;
  venueName: string;
  neighborhood: string | null;
  startTime: string; // ISO
  priceRange: string;
  isEditorsPick: boolean;
  isRecurring: boolean;
  noveltyScore: number | null;
  driveTimeFromDenver: number | null;
  tags: string[];
  oneLiner: string | null;
  // PRD 2 Phase 0: regional metadata (UI rendering lands in Phase 5)
  region: EventRegion;
  townName: string | null;
  isDayTrip: boolean;
  isWeekendTrip: boolean;
  driveNote: string | null;
  worthTheDriveScore: number | null;
}

export interface PlaceCompact {
  id: string;
  name: string;
  category: Category | null;
  imageUrl: string | null;
  neighborhood: string | null;
  address: string;
  priceLevel: number | null;
  vibeTags: string[];
  tags: string[];
  openedDate: string | null; // ISO
  isNew: boolean;
  isFeatured: boolean;
  // PRD 2 Phase 0: regional metadata
  region: EventRegion;
  townName: string | null;
  isDayTrip: boolean;
  isWeekendTrip: boolean;
  driveTimeFromDenver: number | null;
  driveNote: string | null;
}

export interface NeighborhoodCardData {
  slug: string;
  name: string;
  coverImageUrl: string | null;
  placeCount: number;
}

export interface PlacesFeedResponse {
  newInDenver: PlaceCompact[];
  neighborhoods: NeighborhoodCardData[];
  localFavorites: PlaceCompact[];
  dateNight: PlaceCompact[];
  goodForGroups: PlaceCompact[];
  workFriendly: PlaceCompact[];
  lastUpdatedAt: string;
}

export interface HomeFeedResponse {
  today: EventCompact[];
  /** Total count of events matching today's filter before the Today rail cap.
   *  Drives the "See all" link visibility (shown only when count exceeds the cap). */
  todayCount: number;
  weekendPicks: EventCompact[];
  newInDenver: PlaceCompact[];
  outsideTheCity: Array<
    | ({ kind: "event" } & EventCompact)
    | ({ kind: "place" } & PlaceCompact)
  >;
  // PRD 2 §5.4: mountain-destination events scored >= 8 on worth-the-drive.
  // Section hides when count < 3.
  worthAWeekend: EventCompact[];
  /** PRD 6 Phase 5 — "Outside your usual" horizontal rail. Serialized
   *  via lib/ranking/outside-usual.ts. Empty array when feature flag is
   *  off, user is anonymous, cache miss, or feedback count < threshold. */
  outsideYourUsual: import("@/lib/ranking/outside-usual").OutsideUsualItem[];
  guidesFromCreators: SeedGuide[];
  lastUpdatedAt: string; // ISO
  // PRD 2 §5.3: echoed back so the UI can render the filter chip in its
  // current state without re-parsing URL params.
  regionalScope: "near" | "all";
}
