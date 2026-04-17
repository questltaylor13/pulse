# Phase 4: See-All Views + Detail Pages + Map

**Status:** Blocked on Phases 1, 2, and 3
**Estimated scope:** Medium-large
**Dependencies:** All previous phases complete. This phase iterates on the surfaces already built.

---

## TL;DR

The home page built in Phases 1–3 gives users a scroll-and-browse experience. Phase 4 deepens it with tappable "See all →" views for every section, richer single-item detail pages, and a map view for the Events tab. Once someone commits to deeper browsing, they need denser information and stronger filters. The See-all views use day-grouped vertical lists with filter chips, day pills, and a floating "View on map" button. Single event/place detail pages get a proper layout with all metadata, vibe tags, save/share actions, and a "Similar" section. Map view renders events/places as pins on a Mapbox map with clusterable markers.

---

## What we're building

### 1. See-all views (primary new surface)

Every `<ScrollSection>` on the home page has a "See all →" link in its header. In Phases 1–3 these links were non-functional. In Phase 4, they route to a dedicated list view.

**Route pattern:** `/browse/[category]` where `[category]` is:
- `/browse/today` — all events today
- `/browse/this-weekend` — all weekend events (the surface shown in the mockup)
- `/browse/new-in-denver` — new places
- `/browse/outside-the-city` — events + places outside Denver
- `/browse/date-night` — date-appropriate guides
- `/browse/locals` — "Where locals actually go" places
- `/browse/groups` — good-for-groups places
- etc.

These are not separate static pages; they're variations of a single `<BrowseListPage />` component that takes a category/filter configuration.

**Page structure** for the See-all view (using "This weekend's picks" as the reference implementation from the mockup):

1. **Sub-header** (sticky): back button (circle, 36px, light gray) + page title ("This weekend's picks") + subtitle (the active date range, e.g., "Fri, Apr 18 – Sun, Apr 20") + share button on the right. Underneath, a 1px bottom border separator.

2. **Day pills** (sticky, under sub-header): Horizontal row of pill-shaped filters — All weekend, Fri, Sat, Sun. Active pill: dark background, white text. Tapping a day filters the list.

3. **Filter chip row** (sticky, under day pills): "Filters · N" chip on the far left (opens a full filter sheet), followed by commonly-used one-tap chips — Any category, Free, Dog friendly, Outdoors, Tonight. The Filters chip shows a count badge when 1+ filters are active.

4. **Results summary row**: "24 picks this weekend" on the left, sort dropdown on the right ("Top picks ▾"). Sort options: Top picks (default), Soonest first, Price low to high, Distance.

5. **Grouped day list**: Events grouped by day with a small uppercase day label ("FRIDAY, APR 18") that has a thin line extending to the right. Under each day label, a vertical stack of `<ListCard />` items.

6. **`<ListCard />` anatomy**:
   - 96×96 image on the left (rounded 12px corners)
   - Save button in top-right corner of the image (24px circle)
   - Body: category label (11px uppercase colored) + title (15px 500) + 2 meta lines (12px gray) + mini-badge row (Editor's pick, Trending, Free, Locally loved — 10px pills with colored backgrounds)

7. **Floating "View on map" button** at the bottom: 1a1a1a background, white text, centered pill with map icon + "View on map" label, positioned fixed/sticky at bottom with soft drop shadow (this is an exception to the "no shadows" rule because the button is floating above content).

### 2. Single detail pages

Three detail-page variants:

**Event detail page** (`/events/[id]`):
- Hero image at top (full-width, 320px tall)
- Back button, share button, save button in image corners
- Overlay at bottom of image with title (22px 500 white)
- Below image: meta row (date icon + date/time, pin icon + venue, price icon + cost)
- Category chip + vibe tags
- "About this event" description
- Venue card (if available): place name, address, distance, tap to open place detail
- "Get tickets" CTA button (external link to ticket provider)
- "Similar events" section at bottom (3 cards, horizontal scroll)

**Place detail page** (`/places/[id]`):
- Hero image(s) — single large or swipeable gallery
- Name (22px 500)
- Vibe tags + category + neighborhood + price range
- Full description (editorial)
- Quick actions row: Get directions, Call, Website, Menu (where applicable)
- Hours table (collapsible)
- "Happening here" section — events at this venue (if any)
- "Similar places" section at bottom
- Address with embedded small static map (full map opens on tap)

**Guide detail page** — already covered in Phase 3 PRD.

### 3. Map view

New route: `/browse/[category]/map`

When a user taps "View on map" on any See-all view, they're taken to the map variant.

**Map specs:**
- Full-viewport Mapbox GL map (or Google Maps — decision point)
- Denver-centered by default, zoom level 12
- All events/places from the current filter rendered as pins
- Pins color-coded by category (music = purple, food = coral, etc.)
- Tapping a pin opens a small card peek at the bottom of the screen
- Clustered markers at low zoom levels
- Search bar and filter chips remain visible at the top (sticky, overlaid on the map)
- "List view" button in top-right to return to the list

**Implementation notes:**
- Use Mapbox (recommended) — cleaner styling, better performance for this use case
- Env var `NEXT_PUBLIC_MAPBOX_TOKEN` required
- Use a custom Mapbox style matching Pulse's minimalist aesthetic (light mode, muted colors)

### 4. Filter sheet

The "Filters · N" chip on See-all views opens a full-screen filter sheet. This replaces the current disjointed filter UI on the existing `/feed` page.

**Filter sheet contents:**
- **Categories** (multi-select chips): Music, Food, Art, Outdoors, Comedy, Pop-ups, Weird, Off-beat
- **Price** (radio buttons): Any price, Free only, $, $$, $$$
- **Distance** (slider): Anywhere in Denver, Within 2 mi, Within 5 mi, Within 10 mi, Outside Denver OK
- **Vibe** (multi-select chips): Dog friendly, Drinking optional, Group friendly, Quiet, Good for work, Date spot, Kids welcome
- **Time of day** (multi-select chips): Morning, Afternoon, Evening, Late night
- **Dates** (for events only): Today, This weekend, Next 7 days, Custom range
- **Sort** (radio): Top picks, Soonest first, Price low to high, Distance

Apply and Clear buttons fixed at the bottom.

Filters persist in URL query params so deep-linking works: `/browse/this-weekend?price=free&categories=music,art`.

### 5. Search overlay

Tapping the search bar (anywhere it appears) now opens a full-screen search overlay (not just on the home page).

**Search overlay:**
- Full-screen white background
- Search input focused at the top with X to close
- Below the input, three dynamic sections:
  - **Suggestions** (when input is empty): "Music tonight," "Weekend brunch spots," "Dog-friendly patios" — curated starter searches
  - **Recent searches** (when empty and user has searched before)
  - **Autocomplete results** (when input has content): groups by Events, Places, Guides, Neighborhoods, Categories — max 3 results per group with a "See all" link per group

**No AI-powered natural language search yet.** That's a later phase. Phase 4 does smart autocomplete against existing fields.

---

## Data model changes

Minimal in Phase 4. Mostly leverages existing data:

### Event model
- Ensure `coordinates` (lat/lng) is populated for all events — required for map view

### Place model
- Ensure `coordinates` populated for all places (most likely already done in Phase 2)

### New model: UserSearchHistory
```prisma
model UserSearchHistory {
  id        String   @id @default(cuid())
  userId    String
  query     String
  resultsCount Int
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, createdAt])
}
```

Used to populate "Recent searches" in the search overlay.

---

## UI components to build

- `<BrowseListPage categoryConfig />` — the See-all view shell
- `<SubHeader title subtitle backHref onShare />` — sticky sub-header with back button
- `<DayPills days activeId onSelect />` — day filter row
- `<FilterChipRow chips onOpenFilterSheet />` — horizontal chip row with filters button
- `<ListCard item />` — the 96×96 image + body horizontal card
- `<DayGroupLabel label />` — uppercase day separator with trailing line
- `<FloatingMapButton href />` — the dark pill floating button
- `<FilterSheet config onApply onClear />` — full-screen filter modal
- `<MapView items />` — Mapbox map with pins and clustering
- `<MapPin item />` — category-colored pin
- `<MapPinPopup item />` — small card that appears when a pin is tapped
- `<SearchOverlay />` — full-screen search modal
- `<EventDetailPage event />` — event detail layout
- `<PlaceDetailPage place />` — place detail layout
- `<VenueCard venue />` — the place reference block on event detail pages
- `<HoursTable hours />` — collapsible hours widget for place detail pages

---

## Acceptance criteria

Phase 4 is done when:

1. Every "See all →" link in the home page sections routes to a working `/browse/[category]` page.
2. The See-all page for "This weekend's picks" matches the mockup exactly: day pills + filter chips + grouped list + floating map button.
3. Day pills filter the list in real time without a page reload.
4. Filter sheet opens, applies, and persists state in URL params.
5. Tapping "View on map" routes to the map variant with all filtered items rendered as pins.
6. Map pins are color-coded by category and clickable.
7. Every event/place/guide has a working detail page.
8. Search overlay opens when the search bar is tapped anywhere it's rendered.
9. Autocomplete returns results across Events, Places, Guides, Neighborhoods, Categories.
10. Recent searches persist for authenticated users.
11. Event and Place detail pages show "Similar" recommendations.
12. All pages tested on mobile and desktop.

---

## Open questions for Quest

1. **Map provider:** Mapbox (recommended) or Google Maps? Mapbox is more flexible for custom styling; Google Maps is more recognizable but has stricter branding requirements.

2. **Map tile style:** Light mode only, or dark mode for evening events? **Recommendation: light mode for v1, add dark as a later polish.**

3. **Search typeahead — how aggressive?** Full-text search across title/description of every event/place/guide, or just title matching? Full-text is slower but more powerful. **Recommendation: title + tags matching in Phase 4; full-text in a later phase with a proper search index.**

4. **Detail page CTAs:** For events, the main CTA is "Get tickets" — but what if there's no ticket link? Show "Event info" instead and link to the source URL? Or hide the CTA?

5. **Similar item algorithm:** For "Similar events" and "Similar places" — simple category+neighborhood matching, or use the AI enrichment embeddings for semantic similarity? Start simple.

6. **Filter sheet persistence:** Should applied filters persist across sessions for logged-in users, or reset on each visit? **Recommendation: reset on each new session; save via a "Save these filters" explicit action in a later phase.**
