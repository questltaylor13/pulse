import {
  HeroSection,
  FeaturedEventsSection,
  HowItWorksSection,
  NewPlacesSection,
  FeatureHighlightsSection,
  CreatorPicksSection,
  CreatorSpotlightSection,
  CategoryGridSection,
  NeighborhoodSection,
  StatsBar,
  FinalCTASection,
  LandingFooter,
} from "@/components/landing";

async function getLandingData() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/landing`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch landing data");
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching landing data:", error);
    // Return empty data structure as fallback
    return {
      featuredEvents: [],
      newPlaces: [],
      upcomingPlaces: [],
      featuredCreators: [],
      spotlightCreator: null,
      categoryCounts: {},
      neighborhoodCounts: {},
      stats: { events: 0, places: 0, users: 0 },
    };
  }
}

export default async function HomePage() {
  const data = await getLandingData();

  return (
    <div className="-mx-4 -mt-10 sm:-mx-0">
      {/* Hero */}
      <HeroSection />

      {/* Featured Events */}
      <FeaturedEventsSection events={data.featuredEvents} />

      {/* How It Works */}
      <HowItWorksSection />

      {/* New & Upcoming Places */}
      <NewPlacesSection
        newPlaces={data.newPlaces}
        upcomingPlaces={data.upcomingPlaces}
      />

      {/* Feature Highlights */}
      <FeatureHighlightsSection />

      {/* Creator Picks */}
      <CreatorPicksSection creators={data.featuredCreators} />

      {/* Creator Spotlight */}
      <CreatorSpotlightSection creator={data.spotlightCreator} />

      {/* Category Grid */}
      <CategoryGridSection categoryCounts={data.categoryCounts} />

      {/* Neighborhoods */}
      <NeighborhoodSection neighborhoodCounts={data.neighborhoodCounts} />

      {/* Stats Bar */}
      <StatsBar stats={data.stats} />

      {/* Final CTA */}
      <FinalCTASection />

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
