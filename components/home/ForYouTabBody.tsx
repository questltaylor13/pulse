import ScrollSection from "./ScrollSection";
import SectionDivider from "./SectionDivider";
import ListsRail from "./ListsRail";
import EventCardCompact from "./EventCardCompact";
import PlaceCardCompact from "./PlaceCardCompact";
import LastUpdatedIndicator from "./LastUpdatedIndicator";
import type { ForYouFeedResponse } from "@/lib/home/types";
import { type FeedbackMaps, isFilteredFromFeed } from "@/lib/feedback/server";
import { pickCardReason } from "@/lib/ranking/explanation";

interface Props {
  data: ForYouFeedResponse;
  feedbackMaps?: FeedbackMaps;
}

/**
 * The "For You" tab body. Renders the blended event+place horizon sections
 * from fetchForYouFeed, reusing the same {kind:'event'|'place'} card-union
 * pattern as the "Outside the city" rail. PASS/DONE items are filtered here
 * so the feed never shows something the user already dismissed.
 */
export default function ForYouTabBody({ data, feedbackMaps }: Props) {
  const eventStatus = (id: string) => feedbackMaps?.byEventId.get(id) ?? null;
  const placeStatus = (id: string) => feedbackMaps?.byPlaceId.get(id) ?? null;

  const sections = data.sections
    .map((s) => ({
      ...s,
      items: s.items.filter((item) =>
        item.kind === "event"
          ? !isFilteredFromFeed(feedbackMaps?.byEventId.get(item.id))
          : !isFilteredFromFeed(feedbackMaps?.byPlaceId.get(item.id)),
      ),
    }))
    .filter((s) => s.items.length > 0);

  if (sections.length === 0) {
    return (
      <>
        <div className="px-5 py-12 text-center text-body text-mute">
          Your feed is warming up — save a few things you like (tap the heart) and
          we&apos;ll tune this to your taste.
        </div>
        {/* A warming-up feed is exactly when someone else's list is most useful. */}
        <ListsRail lists={data.featuredLists} />
      </>
    );
  }

  return (
    <>
      {sections.map((section, idx) => (
        <div key={section.id}>
          {idx > 0 && idx % 2 === 0 && <SectionDivider />}
          <ScrollSection title={section.title} subtitle={section.subtitle}>
            {section.items.map((item) => {
              const reasonLine =
                data.personalized && item.reasons ? pickCardReason(item.reasons) : null;
              return item.kind === "event" ? (
                <EventCardCompact
                  key={`e-${item.id}`}
                  event={item}
                  variant="standard"
                  feedbackStatus={eventStatus(item.id)}
                  reasonLine={reasonLine}
                />
              ) : (
                <PlaceCardCompact
                  key={`p-${item.id}`}
                  place={item}
                  variant="standard"
                  feedbackStatus={placeStatus(item.id)}
                  reasonLine={reasonLine}
                />
              );
            })}
          </ScrollSection>
        </div>
      ))}
      <ListsRail lists={data.featuredLists} />
      <LastUpdatedIndicator isoTimestamp={data.lastUpdatedAt} />
    </>
  );
}
