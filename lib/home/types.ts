import type { Category } from "@prisma/client";
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
  weekendPicks: EventCompact[];
  newInDenver: PlaceCompact[];
  outsideTheCity: Array<
    | ({ kind: "event" } & EventCompact)
    | ({ kind: "place" } & PlaceCompact)
  >;
  guidesFromCreators: SeedGuide[];
  lastUpdatedAt: string; // ISO
}
