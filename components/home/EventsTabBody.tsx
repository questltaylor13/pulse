import ScrollSection from "./ScrollSection";
import SectionDivider from "./SectionDivider";
import EventCardCompact from "./EventCardCompact";
import PlaceCardCompact from "./PlaceCardCompact";
import GuideCard from "./GuideCard";
import LastUpdatedIndicator from "./LastUpdatedIndicator";
import type { HomeFeedResponse } from "@/lib/home/types";
import { RAIL_LABELS, type RailCategory } from "@/lib/home/category-filters";

interface Props {
  category: RailCategory;
  data: HomeFeedResponse;
}

function CollapsedSection({ title, category }: { title: string; category: RailCategory }) {
  return (
    <div className="px-5 py-4">
      <p className="text-title font-medium text-ink">{title}</p>
      <p className="mt-1 text-[12px] text-mute">
        No {RAIL_LABELS[category].toLowerCase()} here right now.
      </p>
    </div>
  );
}

export default function EventsTabBody({ category, data }: Props) {
  const { today, weekendPicks, newInDenver, outsideTheCity, guidesFromCreators, lastUpdatedAt } =
    data;

  return (
    <>
      {/* Section 1: Today */}
      {today.length === 0 && category !== "all" ? (
        <CollapsedSection title="Today" category={category} />
      ) : (
        <ScrollSection
          title="Today"
          subtitle="Happening in Denver right now"
          count={today.length}
          seeAllHref="/browse/today"
          empty={
            <div className="rounded-card bg-mute-hush p-4 text-body text-mute">
              No events today. Check out this weekend →
            </div>
          }
        >
          {today.map((e) => (
            <EventCardCompact
              key={e.id}
              event={e}
              variant="standard"
              showTodayBadge
            />
          ))}
        </ScrollSection>
      )}

      {/* Section 2: This weekend's picks */}
      {weekendPicks.length === 0 && category !== "all" ? (
        <CollapsedSection title="This weekend's picks" category={category} />
      ) : (
        <ScrollSection
          title="This weekend's picks"
          subtitle="Editor-curated plans for Fri–Sun"
          seeAllHref="/browse/this-weekend"
        >
          {weekendPicks.map((e) => (
            <EventCardCompact key={e.id} event={e} variant="wide" />
          ))}
        </ScrollSection>
      )}

      <SectionDivider />

      {/* Section 3: Just added on Pulse (Places) */}
      {newInDenver.length === 0 && category !== "all" ? (
        <CollapsedSection title="Just added on Pulse" category={category} />
      ) : (
        <ScrollSection
          title="Just added on Pulse"
          subtitle="Fresh picks added to the guide"
          seeAllHref="/browse/new-in-denver"
        >
          {newInDenver.map((p) => (
            <PlaceCardCompact key={p.id} place={p} variant="standard" />
          ))}
        </ScrollSection>
      )}

      {/* Section 4: Outside the city */}
      {outsideTheCity.length === 0 && category !== "all" ? (
        <CollapsedSection title="Outside the city" category={category} />
      ) : (
        <ScrollSection
          title="Outside the city"
          subtitle="Day-trip worthy events and spots"
          seeAllHref="/browse/outside-the-city"
        >
          {outsideTheCity.map((item) =>
            item.kind === "event" ? (
              <EventCardCompact key={`e-${item.id}`} event={item} variant="wide" />
            ) : (
              <PlaceCardCompact key={`p-${item.id}`} place={item} variant="wide" />
            )
          )}
        </ScrollSection>
      )}

      <SectionDivider />

      {/* Section 5: Guides from local creators (seed data) */}
      <ScrollSection
        title="Guides from local creators"
        subtitle="Multi-stop plans — full launch in May"
      >
        {guidesFromCreators.map((g) => (
          <GuideCard key={g.id} guide={g} />
        ))}
      </ScrollSection>

      <LastUpdatedIndicator isoTimestamp={lastUpdatedAt} />
    </>
  );
}
