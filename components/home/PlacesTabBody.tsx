import ScrollSection from "./ScrollSection";
import SectionDivider from "./SectionDivider";
import PlaceCardCompact from "./PlaceCardCompact";
import NeighborhoodCard from "./NeighborhoodCard";
import LastUpdatedIndicator from "./LastUpdatedIndicator";
import type { PlacesFeedResponse } from "@/lib/home/types";
import {
  PLACES_RAIL_LABELS,
  type PlacesRailCategory,
} from "@/lib/home/places-rail-filters";

interface Props {
  category: PlacesRailCategory;
  data: PlacesFeedResponse;
}

function CollapsedSection({
  title,
  category,
}: {
  title: string;
  category: PlacesRailCategory;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-title font-medium text-ink">{title}</p>
      <p className="mt-1 text-[12px] text-mute">
        No {PLACES_RAIL_LABELS[category].toLowerCase()} here right now.
      </p>
    </div>
  );
}

export default function PlacesTabBody({ category, data }: Props) {
  const {
    newInDenver,
    neighborhoods,
    localFavorites,
    dateNight,
    goodForGroups,
    workFriendly,
    lastUpdatedAt,
  } = data;

  return (
    <>
      {/* Section 1: Just added on Pulse */}
      {newInDenver.length === 0 && category !== "all" ? (
        <CollapsedSection title="Just added on Pulse" category={category} />
      ) : (
        <ScrollSection
          title="Just added on Pulse"
          subtitle="Fresh picks added to the guide"
          seeAllHref="/browse/new-in-denver"
        >
          {newInDenver.map((p) => (
            <PlaceCardCompact key={p.id} place={p} />
          ))}
        </ScrollSection>
      )}

      {/* Section 2: Explore by neighborhood */}
      <ScrollSection title="Explore by neighborhood">
        {neighborhoods.map((n) => (
          <NeighborhoodCard key={n.slug} neighborhood={n} />
        ))}
      </ScrollSection>

      <SectionDivider />

      {/* Section 3: Where locals actually go */}
      {localFavorites.length === 0 && category !== "all" ? (
        <CollapsedSection title="Where locals actually go" category={category} />
      ) : (
        <ScrollSection
          title="Where locals actually go"
          subtitle="No tourist traps, no chains"
        >
          {localFavorites.map((p) => (
            <PlaceCardCompact key={p.id} place={p} />
          ))}
        </ScrollSection>
      )}

      {/* Section 4: Perfect for a first date */}
      {dateNight.length === 0 && category !== "all" ? (
        <CollapsedSection title="Perfect for a first date" category={category} />
      ) : (
        <ScrollSection
          title="Perfect for a first date"
          subtitle="Low-pressure, conversation-friendly"
        >
          {dateNight.map((p) => (
            <PlaceCardCompact key={p.id} place={p} />
          ))}
        </ScrollSection>
      )}

      <SectionDivider />

      {/* Section 5: Good for groups */}
      {goodForGroups.length === 0 && category !== "all" ? (
        <CollapsedSection title="Good for groups" category={category} />
      ) : (
        <ScrollSection
          title="Good for groups"
          subtitle="Big tables, shareable plates, loud enough"
        >
          {goodForGroups.map((p) => (
            <PlaceCardCompact key={p.id} place={p} />
          ))}
        </ScrollSection>
      )}

      {/* Section 6: Where to work from */}
      {workFriendly.length === 0 && category !== "all" ? (
        <CollapsedSection title="Where to work from" category={category} />
      ) : (
        <ScrollSection
          title="Where to work from"
          subtitle="Wifi, outlets, quiet enough"
        >
          {workFriendly.map((p) => (
            <PlaceCardCompact key={p.id} place={p} />
          ))}
        </ScrollSection>
      )}

      <LastUpdatedIndicator isoTimestamp={lastUpdatedAt} />
    </>
  );
}
