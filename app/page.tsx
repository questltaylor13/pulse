import {
  HeroSection,
  HowItWorksSection,
  FeatureHighlightsSection,
  ExploreSection,
  StatsBar,
  CoFounderCTASection,
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
      {/* Hero with rotating videos */}
      <HeroSection />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Explore by Category & Neighborhood (combined) */}
      <ExploreSection
        categoryCounts={data.categoryCounts}
        neighborhoodCounts={data.neighborhoodCounts}
      />

      {/* Feature Highlights */}
      <FeatureHighlightsSection />

      {/* Stats Bar */}
      <StatsBar stats={data.stats} />

      {/* Co-Founder CTA */}
      <CoFounderCTASection />

      {/* Final CTA */}
      <FinalCTASection />

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
