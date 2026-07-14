import ScrollSection from "./ScrollSection";
import SectionDivider from "./SectionDivider";
import EventCardCompact from "./EventCardCompact";
import PlaceCardCompact from "./PlaceCardCompact";
import GuideCard from "./GuideCard";
import LastUpdatedIndicator from "./LastUpdatedIndicator";
import OutsideYourUsualRail from "./OutsideYourUsualRail";
import RegionalScopeFilter from "./RegionalScopeFilter";
import EventDateFilter from "./EventDateFilter";
import DayGroupLabel from "@/components/browse/DayGroupLabel";
import type { HomeFeedResponse } from "@/lib/home/types";
import { RAIL_LABELS, type RailCategory } from "@/lib/home/category-filters";
import { type FeedbackMaps, isFilteredFromFeed } from "@/lib/feedback/server";

interface Props {
  category: RailCategory;
  data: HomeFeedResponse;
  feedbackMaps?: FeedbackMaps;
}

// selectedDate.iso values that are presets (use the label verbatim);
// everything else is a concrete date/range and gets an "On " prefix.
const PRESET_DATE_ISOS = ["tomorrow", "weekend", "this-week", "next-week", "next-7"];

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

export default function EventsTabBody({ category, data, feedbackMaps }: Props) {
  const {
    today,
    todayCount,
    weekendPicks,
    newInDenver,
    outsideTheCity,
    worthAWeekend,
    comingUp,
    outsideYourUsual,
    guidesFromCreators,
    lastUpdatedAt,
    regionalScope,
    selectedDate,
    weekAgenda,
    selectedDateFilter,
  } = data;
  const todayIsoDenver = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const eventStatus = (id: string) => feedbackMaps?.byEventId.get(id) ?? null;
  const placeStatus = (id: string) => feedbackMaps?.byPlaceId.get(id) ?? null;

  // Drop PASS/DONE items from the agenda and skip days that empty out.
  const agendaDays = weekAgenda
    ? weekAgenda.days
        .map((d) => ({
          ...d,
          items: d.items.filter((e) => !isFilteredFromFeed(eventStatus(e.id))),
        }))
        .filter((d) => d.items.length > 0)
    : [];

  return (
    <>
      {/* Date selector — Today/Tomorrow/This-weekend/This-week/Next-week +
          custom date. When a non-today filter is active, fetchHomeFeed returns
          selectedDate and the default Today/Weekend rails are suppressed. */}
      <EventDateFilter value={selectedDateFilter} minDate={todayIsoDenver} />

      {/* PRD 2 §5.3 — "Near Denver" / "All" filter chip. Defaults to "near" so
          mountain-destination content doesn't surprise first-time users. */}
      <RegionalScopeFilter scope={regionalScope} />

      {weekAgenda ? (
        // Multi-day agenda: events grouped by Denver day. Replaces the
        // Today + This-weekend rails entirely.
        <div className="pb-1">
          <div className="px-5 pt-3 pb-1">
            <h2 className="text-display-sm font-display text-ink">{weekAgenda.rangeLabel}</h2>
            <p className="mt-0.5 text-body text-mute">What&apos;s on, day by day</p>
          </div>
          {agendaDays.length === 0 ? (
            <div className="mx-5 rounded-card bg-mute-hush p-4 text-body text-mute">
              No events in this range. Try another week →
            </div>
          ) : (
            agendaDays.map((day) => (
              <div key={day.iso}>
                <DayGroupLabel label={`${day.label} · ${day.items.length}`} />
                <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-2">
                  {day.items.map((e) => (
                    <EventCardCompact
                      key={e.id}
                      event={e}
                      variant="standard"
                      feedbackStatus={eventStatus(e.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : selectedDate ? (
        // Single rail in place of Today + This-weekend. Presets use the label
        // verbatim ("Tomorrow", "This weekend"); specific dates get "On Mon, May 11".
        <ScrollSection
          title={
            PRESET_DATE_ISOS.includes(selectedDate.iso)
              ? selectedDate.label
              : `On ${selectedDate.label}`
          }
          subtitle="Events for the time you picked"
          count={selectedDate.count}
          empty={
            <div className="rounded-card bg-mute-hush p-4 text-body text-mute">
              No events found. Try another date →
            </div>
          }
        >
          {selectedDate.items.map((e) => (
            <EventCardCompact
              key={e.id}
              event={e}
              variant="standard"
              feedbackStatus={eventStatus(e.id)}
            />
          ))}
        </ScrollSection>
      ) : (
        <>
          {/* Section 1: Today */}
          {today.length === 0 && category !== "all" ? (
            <CollapsedSection title="Today" category={category} />
          ) : (
            <ScrollSection
              title="Today"
              subtitle="Happening in Denver right now"
              count={today.length}
              seeAllHref={todayCount > 25 ? "/browse/today" : undefined}
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
                  feedbackStatus={eventStatus(e.id)}
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
                <EventCardCompact
                  key={e.id}
                  event={e}
                  variant="wide"
                  feedbackStatus={eventStatus(e.id)}
                />
              ))}
            </ScrollSection>
          )}
        </>
      )}

      {/* Coming up — longer-horizon upcoming events (after this weekend).
          Only shown in the default view; comingUp is [] under a date filter. */}
      {comingUp.length > 0 && (
        <ScrollSection
          title="Coming up"
          subtitle="On the calendar over the next few weeks"
        >
          {comingUp.map((e) => (
            <EventCardCompact
              key={`cu-${e.id}`}
              event={e}
              variant="standard"
              feedbackStatus={eventStatus(e.id)}
            />
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
            <PlaceCardCompact
              key={p.id}
              place={p}
              variant="standard"
              feedbackStatus={placeStatus(p.id)}
            />
          ))}
        </ScrollSection>
      )}

      {/* PRD 6 Phase 5 — "Outside your usual" rail. Appears between
          "Just added on Pulse" (Section 3) and "Outside the city"
          (Section 4). Auto-hides when empty (flag off, anon, <5 feedback,
          or cache miss). */}
      <OutsideYourUsualRail
        items={outsideYourUsual ?? []}
        eventStatus={eventStatus}
        placeStatus={placeStatus}
      />

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
              <EventCardCompact
                key={`e-${item.id}`}
                event={item}
                variant="wide"
                feedbackStatus={eventStatus(item.id)}
              />
            ) : (
              <PlaceCardCompact
                key={`p-${item.id}`}
                place={item}
                variant="wide"
                feedbackStatus={placeStatus(item.id)}
              />
            )
          )}
        </ScrollSection>
      )}

      {/* Section 4b: Worth a weekend — PRD 2 §5.4. Only rendered when the
          feed returns ≥3 qualifying mountain-destination events AND the
          user has switched scope to "all". fetchHomeFeed handles both
          guards — worthAWeekend is [] otherwise. */}
      {worthAWeekend.length > 0 && (
        <ScrollSection
          title="Worth a weekend"
          subtitle="Mountain-town trips that earn the drive"
          seeAllHref="/browse/weekend-guides"
        >
          {worthAWeekend.map((e) => (
            <EventCardCompact
              key={`ww-${e.id}`}
              event={e}
              variant="wide"
              feedbackStatus={eventStatus(e.id)}
            />
          ))}
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
