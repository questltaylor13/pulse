import ScrollSection from "./ScrollSection";
import SectionDivider from "./SectionDivider";
import FeaturedGuideCard from "./FeaturedGuideCard";
import GuideCardDB from "./GuideCardDB";
import CreatorSpotlightStrip from "./CreatorSpotlightStrip";
import LastUpdatedIndicator from "./LastUpdatedIndicator";
import type { GuidesFeedResponse } from "@/lib/home/types";
import { OCCASION_LABELS, isOccasionTag } from "@/lib/constants/occasion-tags";

interface Props {
  occasion: string;
  data: GuidesFeedResponse;
}

function CollapsedSection({
  title,
  occasion,
}: {
  title: string;
  occasion: string;
}) {
  const label = isOccasionTag(occasion)
    ? OCCASION_LABELS[occasion].toLowerCase()
    : occasion;
  return (
    <div className="px-5 py-4">
      <p className="text-title font-medium text-ink">{title}</p>
      <p className="mt-1 text-[12px] text-mute">
        No {label} guides here right now.
      </p>
    </div>
  );
}

export default function GuidesTabBody({ occasion, data }: Props) {
  const {
    featuredGuide,
    weekendReady,
    featuredCreators,
    dateNight,
    quickPlans,
    lastUpdatedAt,
  } = data;

  return (
    <>
      {/* Section 1: Featured guide */}
      {featuredGuide && (
        <section className="px-5 py-6">
          <header className="mb-3">
            <h2 className="text-title font-medium text-ink">
              This week&apos;s featured guide
            </h2>
          </header>
          <FeaturedGuideCard guide={featuredGuide} />
        </section>
      )}

      {/* Section 2: Ready for this weekend */}
      {weekendReady.length === 0 && occasion !== "all" ? (
        <CollapsedSection
          title="Ready for this weekend"
          occasion={occasion}
        />
      ) : (
        <ScrollSection
          title="Ready for this weekend"
          subtitle="Plans you can follow Fri-Sun"
        >
          {weekendReady.map((g) => (
            <GuideCardDB key={g.id} guide={g} />
          ))}
        </ScrollSection>
      )}

      {/* Section 3: Local creators */}
      <CreatorSpotlightStrip creators={featuredCreators} />

      <SectionDivider />

      {/* Section 4: Date night plans */}
      {dateNight.length === 0 && occasion !== "all" ? (
        <CollapsedSection title="Date night plans" occasion={occasion} />
      ) : (
        <ScrollSection
          title="Date night plans"
          subtitle="Tested itineraries that actually flow"
          seeAllHref="/browse/date-night"
        >
          {dateNight.map((g) => (
            <GuideCardDB key={g.id} guide={g} />
          ))}
        </ScrollSection>
      )}

      {/* Section 5: Got 3 hours? */}
      {quickPlans.length === 0 && occasion !== "all" ? (
        <CollapsedSection title="Got 3 hours?" occasion={occasion} />
      ) : (
        <ScrollSection
          title="Got 3 hours?"
          subtitle="Quick plans you can squeeze in"
          seeAllHref="/browse/quick-plans"
        >
          {quickPlans.map((g) => (
            <GuideCardDB key={g.id} guide={g} />
          ))}
        </ScrollSection>
      )}

      <LastUpdatedIndicator isoTimestamp={lastUpdatedAt} />
    </>
  );
}
