import { Suspense } from "react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StickyChrome from "@/components/home/StickyChrome";
import BottomNav from "@/components/home/BottomNav";
import EventsTabBody from "@/components/home/EventsTabBody";
import PlacesTabBody from "@/components/home/PlacesTabBody";
import GuidesTabBody from "@/components/home/GuidesTabBody";
import EventsTabSkeleton from "@/components/home/EventsTabSkeleton";
import NoticeToast from "@/components/home/NoticeToast";
import ProfileCompletionStrip from "@/components/feedback/ProfileCompletionStrip";
import TasteSwiper from "@/components/feedback/TasteSwiper";
import { fetchHomeFeed, fetchPlacesFeed, fetchGuidesFeed } from "@/components/home/fetch-home-feed";
import { getFeedbackMaps, isFilteredFromFeed } from "@/lib/feedback/server";
import { calculateCompletion } from "@/lib/feedback/profile-completion";
import type { HomeTab } from "@/components/home/TopTabs";
import { isRailCategory, type RailCategory } from "@/lib/home/category-filters";
import { isPlacesRailCategory, type PlacesRailCategory } from "@/lib/home/places-rail-filters";
import { isOccasionTag } from "@/lib/constants/occasion-tags";
import type { EventCompact, HomeFeedResponse, PlaceCompact, PlacesFeedResponse, GuidesFeedResponse } from "@/lib/home/types";

// PRD 5 §2.1 — strip auto-hides for 48h after dismiss + permanently at 80%.
const STRIP_DISMISS_WINDOW_MS = 48 * 60 * 60 * 1000;
const STRIP_AUTO_HIDE_PCT = 80;

export const metadata: Metadata = {
  title: "Pulse — Denver tonight, this weekend, and beyond",
  description:
    "Discover Denver's best events, places, and creator-curated plans — no sign-up required.",
};

// The API route (/api/home/events-feed) handles tag-revalidated caching.
// This page relies on Next.js's default request dedup; for SSR freshness
// we revalidate the shell every 60 seconds.
export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{ tab?: string; cat?: string; occasion?: string; scope?: string; swiper?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tab: HomeTab =
    sp.tab === "places" || sp.tab === "guides" ? sp.tab : "events";
  const category: RailCategory | PlacesRailCategory =
    tab === "places"
      ? isPlacesRailCategory(sp.cat) ? sp.cat : "all"
      : isRailCategory(sp.cat) ? sp.cat : "all";
  const occasion: string =
    tab === "guides" && isOccasionTag(sp.occasion) ? sp.occasion : "all";
  // PRD 2 §5.3 — "Near Denver" default ON. Only "all" overrides.
  const scope: "near" | "all" = sp.scope === "all" ? "all" : "near";
  const swiperOpen = sp.swiper === "1";

  return (
    <div className="relative flex min-h-screen flex-col bg-surface pb-[72px] md:pb-0">
      <Suspense fallback={<EventsTabSkeleton />}>
        <HomeBody tab={tab} category={category} occasion={occasion} scope={scope} />
      </Suspense>
      <BottomNav />
      <NoticeToast />
      {swiperOpen && <TasteSwiper />}
    </div>
  );
}

// Server component that fetches data once and fans it out to chrome + body.
async function HomeBody({
  tab,
  category,
  occasion,
  scope,
}: {
  tab: HomeTab;
  category: RailCategory | PlacesRailCategory;
  occasion: string;
  scope: "near" | "all";
}) {
  const eventsData: HomeFeedResponse | null =
    tab === "events"
      ? await fetchHomeFeed(category as RailCategory, scope).catch((err) => {
          console.error("[home] fetchHomeFeed failed:", err);
          return null;
        })
      : null;

  const placesData: PlacesFeedResponse | null =
    tab === "places"
      ? await fetchPlacesFeed(category as PlacesRailCategory).catch((err) => {
          console.error("[home] fetchPlacesFeed failed:", err);
          return null;
        })
      : null;

  const guidesData: GuidesFeedResponse | null =
    tab === "guides"
      ? await fetchGuidesFeed(occasion).catch((err) => {
          console.error("[home] fetchGuidesFeed failed:", err);
          return null;
        })
      : null;

  const events: EventCompact[] = eventsData
    ? [
        ...eventsData.today,
        ...eventsData.weekendPicks,
        ...eventsData.outsideTheCity.filter((x) => x.kind === "event").map((x) => x as EventCompact & { kind: "event" }),
      ]
    : [];
  const places: PlaceCompact[] = eventsData
    ? [
        ...eventsData.newInDenver,
        ...eventsData.outsideTheCity.filter((x) => x.kind === "place").map((x) => x as PlaceCompact & { kind: "place" }),
      ]
    : placesData
      ? [...placesData.newInDenver, ...placesData.localFavorites]
      : [];

  // PRD 5 Phase 1 — batch-fetch current user's feedback for every item the
  // feed will render. One query per page load; used to (a) stamp the
  // "Interested" pill on WANT cards, (b) hide PASS/DONE cards pre-render.
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const feedbackMaps = await getFeedbackMaps({
    userId,
    eventIds: events.map((e) => e.id),
    placeIds: places.map((p) => p.id),
  });

  // PRD 5 Phase 2 §2.1 — profile-completion strip visibility. Computed here
  // so SSR doesn't ship DOM when it shouldn't show (clean no-flash render).
  let showCompletionStrip = false;
  let completionPct = 0;
  if (userId) {
    const [userRow, feedbackCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { onboardingComplete: true, profileStripDismissedAt: true },
      }),
      prisma.userItemStatus.count({ where: { userId } }),
    ]);
    completionPct = calculateCompletion({
      onboardingComplete: Boolean(userRow?.onboardingComplete),
      feedbackCount,
    });
    const dismissedWithinWindow =
      userRow?.profileStripDismissedAt
        ? Date.now() - userRow.profileStripDismissedAt.getTime() < STRIP_DISMISS_WINDOW_MS
        : false;
    showCompletionStrip =
      completionPct < STRIP_AUTO_HIDE_PCT && !dismissedWithinWindow;
  }

  // Filtered copies of the feed structures with PASS/DONE excluded.
  const filteredEventsData: HomeFeedResponse | null = eventsData
    ? {
        ...eventsData,
        today: eventsData.today.filter(
          (e) => !isFilteredFromFeed(feedbackMaps.byEventId.get(e.id))
        ),
        weekendPicks: eventsData.weekendPicks.filter(
          (e) => !isFilteredFromFeed(feedbackMaps.byEventId.get(e.id))
        ),
        newInDenver: eventsData.newInDenver.filter(
          (p) => !isFilteredFromFeed(feedbackMaps.byPlaceId.get(p.id))
        ),
        outsideTheCity: eventsData.outsideTheCity.filter((x) => {
          const status =
            x.kind === "event"
              ? feedbackMaps.byEventId.get(x.id)
              : feedbackMaps.byPlaceId.get(x.id);
          return !isFilteredFromFeed(status);
        }),
        worthAWeekend: eventsData.worthAWeekend.filter(
          (e) => !isFilteredFromFeed(feedbackMaps.byEventId.get(e.id))
        ),
      }
    : null;
  const filteredPlacesData: PlacesFeedResponse | null = placesData
    ? {
        ...placesData,
        newInDenver: placesData.newInDenver.filter(
          (p) => !isFilteredFromFeed(feedbackMaps.byPlaceId.get(p.id))
        ),
        localFavorites: placesData.localFavorites.filter(
          (p) => !isFilteredFromFeed(feedbackMaps.byPlaceId.get(p.id))
        ),
      }
    : null;

  return (
    <>
      <StickyChrome
        tab={tab}
        category={category}
        occasion={occasion}
        searchableEvents={events}
        searchablePlaces={places}
      />
      {showCompletionStrip && (
        <ProfileCompletionStrip completion={completionPct} />
      )}
      <div className="flex-1" id={`panel-${tab}`} role="tabpanel">
        {tab === "events" && filteredEventsData && (
          <EventsTabBody
            category={category as RailCategory}
            data={filteredEventsData}
            feedbackMaps={feedbackMaps}
          />
        )}
        {tab === "events" && !filteredEventsData && (
          <div className="px-5 py-10 text-center text-body text-mute">
            Couldn't load events right now. Try again in a moment.
          </div>
        )}
        {tab === "places" && filteredPlacesData && (
          <PlacesTabBody
            category={category as PlacesRailCategory}
            data={filteredPlacesData}
            feedbackMaps={feedbackMaps}
          />
        )}
        {tab === "places" && !filteredPlacesData && (
          <div className="px-5 py-10 text-center text-body text-mute">
            Couldn't load places right now. Try again in a moment.
          </div>
        )}
        {tab === "guides" && guidesData && (
          <GuidesTabBody occasion={occasion} data={guidesData} />
        )}
        {tab === "guides" && !guidesData && (
          <div className="px-5 py-10 text-center text-body text-mute">
            Couldn't load guides right now. Try again in a moment.
          </div>
        )}
      </div>
    </>
  );
}
