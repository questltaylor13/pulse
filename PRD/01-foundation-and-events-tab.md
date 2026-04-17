# Phase 1: Foundation + Events Tab + Bug Fixes

**Status:** Ready to implement
**Estimated scope:** Large (foundational; blocks all other phases)
**Dependencies:** None. Start here.

---

## TL;DR

Replace the current landing page + feed architecture with a single content-forward home experience. Build the three-tab system (Events / Places / Guides — only Events has content in this phase; the other two are empty placeholder tabs with a "coming soon" state). Move the search bar above the tabs. Add a horizontal category icon rail (All, Music, Food, Weird, Off-beat, Art, Outdoors, Comedy, Pop-ups). Populate the Events tab with four horizontal scrolling sections: Today, This Weekend's Picks, New in Denver, Outside the City. Add a fifth section for creator Guides ("Guides from local creators") even though the full Guides tab isn't built yet — use seed data. Simplify the bottom nav to three items (Home, Saved, Profile). Fix all known bugs: stale past events, broken card links, stale "New in Denver," missing mobile tabs.

---

## What we're building

### 1. New home page architecture

Replace the current `/` (landing page) and `/feed` (logged-in feed) with a single unified home route that looks identical whether the user is logged in or out. Content personalization happens silently in the background based on user preferences; it does not gate access.

**Route consolidation:**
- `/` renders the new home page
- `/feed` redirects to `/` (preserve existing links)
- The old landing page content (hero, "how it works," feature grid, "build this with me," stats block) is removed entirely

**Public access:**
- All sections on the home page are visible without authentication
- The save button on any card triggers a soft auth prompt ("Sign in to save this") if the user is not authenticated
- The share button is always available

### 2. Top chrome (sticky header)

Order from top to bottom:

1. **Header bar** (height ~48px): "Pulse" wordmark on the left in coral `#E85D3A`, 22px weight 500. Profile avatar on the right (32px circle with user initial or generic icon if not logged in).
2. **Search bar** (height ~44px, margin 4px 20px 12px): Rounded pill, background `#f5f5f5`, placeholder "What are you in the mood for?" with 16px search icon on the left. Clicking opens a full-screen search overlay (covered in Phase 4; for Phase 1, clicking the search bar can open a simple text input filter that searches event/place titles client-side).
3. **Tab row**: Three equal-width tabs — Events, Places, Guides. Active tab has 2px solid `#1a1a1a` bottom border and 500 weight; inactive tabs are 400 weight in `#999`.
4. **Category icon rail** (Events tab only): Horizontal scroll of icon + label cells. Icons 22×26px stroke SVG, labels 11px. Active cell has 2px bottom border and darker color.

All four of these elements stick to the top when the user scrolls. The sticky stack order must be: header (z-19) → search (z-18) → tabs (z-17) → category rail (z-16, Events tab only; no rail on Places/Guides in Phase 1 since those tabs are placeholders).

### 3. Events tab content

The Events tab is the only fully populated tab in Phase 1. It contains five sections, each a horizontal scroll row with a section header (title + optional count pill + "See all →" link):

**Section 1: Today**
- Pulls events with `startTime` between now and end-of-day today
- Sorted by soonest first
- Empty state if no events today: "No events today. Check out this weekend →" (links to section 2)
- Card size: 220px wide × 150px tall image
- Shows a "Tonight" badge on events starting after 5pm today

**Section 2: This weekend's picks**
- Pulls events between Friday 12:00 PM and Sunday 11:59 PM of the upcoming weekend
- Uses editorial ranking (manual `isEditorsPick` flag on Event model + algorithmic ranking)
- Card size: 280px wide × 180px tall image (wider than Today cards)
- Shows "Editor's pick" or "Trending" badge where applicable

**Section 3: New in Denver**
- Pulls places (not events) with `createdAt` within the last 45 days
- Card size: 220px wide × 150px tall
- Shows "Just opened" badge for places within 14 days of creation
- Cross-category: restaurants, bars, coffee shops, venues all eligible

**Section 4: Outside the city**
- Pulls events AND places tagged with a `location` field value in a list of nearby regions: Idaho Springs, Morrison, Boulder, Golden, Evergreen, Estes Park, Fort Collins, Colorado Springs, Palisade, Breckenridge, Vail, Aspen
- Card size: 280px wide × 180px tall
- Shows drive time from Denver in meta line (e.g., "45 min from Denver")

**Section 5: Guides from local creators**
- Pulls from seed Guides (full Guides infrastructure ships in Phase 3; this is a read-only preview)
- Card size: 260px wide × 160px tall with gradient overlay and title rendered on the image
- Creator attribution row below image (avatar + name + label)
- Tapping a card shows a "Coming soon — full guides launching in May" modal in Phase 1; becomes a real guide detail page in Phase 3

A thin 8px `#fafafa` horizontal divider separates Section 2 from Section 3, and Section 4 from Section 5, to visually group events/places/guides.

### 4. Category icon rail (Events tab)

Categories in order:
- **All** — shows everything
- **Music** — filters sections to music events only
- **Food** — filters to food events + restaurant + bar places
- **Weird** — filters to events/places with `tags` containing "weird" or `novelty_score >= 0.75` (from AI enrichment pipeline)
- **Off-beat** — filters to events/places with `tags` containing "off-beat" or curator-tagged as hidden gem
- **Art** — filters to art-category events + gallery places
- **Outdoors** — filters to outdoor events + outdoor places
- **Comedy** — filters to comedy events
- **Pop-ups** — filters to events with `eventType = POP_UP`

Selecting a category filters every visible section on the page. Sections with zero matches collapse with a subtle "No {category} in {section}" state rather than disappearing entirely. Switching back to "All" restores the full feed.

### 5. Bottom nav

Three items, equal width: **Home**, **Saved**, **Profile**. Remove the "Search" bottom nav item from the initial v1 mockup since search is handled by the top search bar. Each item is 22×22px SVG icon + 10px label. Active state uses coral `#E85D3A`; inactive is `#bbb`. The bottom nav sticks to the bottom of the viewport and has a 1px top border.

- **Home** → the home page (`/`)
- **Saved** → existing `/lists` route, rebranded as "Saved" in the UI
- **Profile** → existing `/profile` or `/auth/signin` if not logged in

### 6. Mobile navigation parity

The existing desktop nav includes Feed, Places, Lists, Community. On mobile, those links are not currently accessible. For Phase 1:

- Desktop keeps its top nav as-is but updates links: Feed → Home, Places stays, Lists → Saved, Community stays
- Mobile uses only the bottom nav (Home/Saved/Profile) plus the three tabs (Events/Places/Guides). Community is accessible via a link in the Profile tab on mobile. This is intentional — Community is a secondary surface and shouldn't clutter the main nav.

---

## Data model changes

No new tables required in Phase 1, but several field additions to existing models:

### Event model
- Add `isEditorsPick: Boolean @default(false)` — manually flag for the "This weekend's picks" section
- Add `tags: String[]` — array of free-form tags for category filtering ("weird," "off-beat," "date-friendly," etc.)
- Add `noveltyScore: Float?` — populated by AI enrichment pipeline for "weird" filter
- Add `driveTimeFromDenver: Int?` — minutes, for "Outside the city" section meta

### Place model
- Add `isNewOpening: Boolean @default(false)` — alternative to computing from `createdAt` for edge cases (e.g., place was added to DB late but opened recently)
- Add `openedDate: DateTime?` — actual opening date, used by "New in Denver" section logic
- Add `tags: String[]`
- Add `vibeTags: String[]` — populated by AI enrichment ("cozy," "date spot," "good for groups") — will be surfaced in Phase 2
- Add `neighborhood: String?` — must be populated for all places (migrate existing data)

### Ranking helper
- Add a shared utility `lib/ranking.ts` that computes editorial rank for a list of events/places. Uses a weighted formula: `editorsPick * 0.4 + recency * 0.2 + popularity * 0.3 + personalFit * 0.1`. This is used by "This weekend's picks" and "Editor's pick" badge logic.

---

## Bug fixes folded into Phase 1

### Bug 1: Stale events showing past start date/time

**Current behavior:** Events with `startTime` in the past still appear in the feed.

**Fix:** Every query that fetches events for the home page must include `WHERE startTime > NOW()`. Update:
- The "Today" query filters to events between `NOW()` and `end of today`
- The "This weekend's picks" query filters to events between `Fri 00:00` and `Sun 23:59` of the upcoming weekend, AND `startTime > NOW()` if weekend has already started
- Add a daily cron job (Vercel Cron) that runs at 3:00 AM MT and marks any event with `startTime < NOW() - 2 hours` as `isArchived: true`. Use this flag to exclude archived events from all queries. Preserve the records; don't delete.

### Bug 2: Broken card click-through links

**Current behavior:** Clicking certain events leads to 404s or blank pages.

**Fix:**
- Audit all event and place detail routes. Ensure every record in the database has a corresponding detail page that renders without error.
- Add a fallback error boundary on detail pages: if the event/place ID is invalid, redirect to the home page with a toast "This event is no longer available."
- Validate that all cards use a consistent link pattern. The card should always wrap in `<Link href={`/events/${id}`}>` or `<Link href={`/places/${id}`}>`.
- Add a middleware check that logs any 404 from an `/events/*` or `/places/*` route so we can monitor recurring issues.

### Bug 3: Stale "New in Denver" section

**Current behavior:** The section doesn't update daily; stale content persists.

**Fix:**
- The "New in Denver" query must be dynamic, not cached. Pull fresh on every page load using `fetchCache: 'force-no-store'` or an ISR revalidation of `60` seconds.
- Add a scheduled scraper job (Vercel Cron, 4:00 AM MT daily) that runs the existing scraping pipeline against configured sources (Eventbrite, venue sites, etc.), enriches new records with AI, and inserts them into the DB.
- After the scraper completes, run a `revalidateTag('home-feed')` call so the home page reflects the new data.
- Add a lightweight "Last updated: [time]" indicator at the bottom of the home page in small gray text. If no new content was added in the last 24 hours, show "No new spots today — check back tomorrow" instead of stale content.

### Bug 4: Missing mobile nav tabs

**Current behavior:** Desktop shows Feed, Places, Lists, Community tabs. Mobile shows only the logo and profile avatar.

**Fix:** Handled by the bottom nav implementation above. Mobile gets full parity via bottom nav + tab row. No hamburger menu needed for v1.

---

## UI specs (component-level)

### `<HomePage />` (the root page component)
- Layout: flex column, full viewport
- Top chrome: sticky, contained in a single wrapper so the whole stack scrolls together when needed
- Main content: each section rendered by a `<ScrollSection />` component
- Bottom nav: sticky bottom

### `<ScrollSection title count href children />`
- Renders the section header (title + optional count pill + "See all →")
- Wraps children in a horizontal scroll container with scroll-snap
- Children are rendered as `<Card />` or `<GuideCard />` depending on the section

### `<Card variant="standard|wide|featured" />`
- Variant `standard`: 220×150 image
- Variant `wide`: 280×180 image
- Image + optional top-left badge + top-right save button
- Body: category label (uppercase, colored, 11px) + title (14px 500) + 1–2 meta lines (12px gray)

### `<GuideCard />`
- 260×160 image with gradient overlay
- Title + subtitle rendered white on the overlay
- Body row: creator avatar + name + label (12px)

### `<CategoryRail categories activeId onSelect />`
- Horizontal scroll of icon+label cells
- Active state: 2px bottom border, darker text/icon

### `<BottomNav activeId />`
- Three items, equal width
- Icon 22×22 + label 10px

### `<SearchBar placeholder onSearch />`
- Full-width pill
- Left-aligned search icon
- Opens a simple filter overlay in Phase 1

---

## Acceptance criteria

Phase 1 is done when **all** of the following are true:

1. `/` renders the new home page. Old landing-page content is gone.
2. Logged-out and logged-in users see identical layouts; personalization is invisible.
3. Three tabs (Events, Places, Guides) are present. Events is populated; Places and Guides show a "Coming soon" empty state with a single line of copy.
4. Search bar is above the tabs. The category rail sits below the tabs on the Events tab only.
5. Events tab shows five sections in this order: Today, This weekend's picks, New in Denver, Outside the city, Guides from local creators.
6. Every card has a working link. Clicking a card never results in a 404.
7. No event with a past `startTime` appears anywhere in the feed.
8. The "New in Denver" section contains at least one place added in the last 7 days (verified by deploying and checking daily).
9. The daily cron job runs successfully at 3:00 AM MT and archives stale events.
10. The daily scraper cron job runs successfully at 4:00 AM MT.
11. Bottom nav has three items (Home, Saved, Profile) and sticks to the bottom.
12. All nine category-rail filters work: tapping any filter (including "Weird" and "Off-beat") narrows the visible sections accordingly.
13. Mobile tested on iOS Safari and Chrome at 375px, 390px, and 414px viewport widths. Desktop tested at 1024px, 1280px, 1440px.
14. Lighthouse mobile performance score ≥ 75; accessibility score ≥ 90.

---

## Open questions for Quest

Before Claude Code starts implementing, Quest should answer these:

1. **Category rail defaults on first load:** Should the rail default to "All" for every user, or should it remember the user's last selected category across sessions? (Recommendation: default to "All" for simplicity; revisit in Phase 5.)

2. **"Outside the city" radius:** Is the list of nearby regions I'm proposing (Idaho Springs, Morrison, Boulder, Golden, Evergreen, Estes Park, Fort Collins, Colorado Springs, Palisade, Breckenridge, Vail, Aspen) complete? Any to add or remove?

3. **"Editor's pick" flagging:** Who sets `isEditorsPick`? Just you for now via a simple admin UI, or does this auto-compute from popularity? (Recommendation: manual flag via a simple `/admin/events` form — gives you editorial voice; can automate later.)

4. **Seed guide content for Section 5:** Phase 3 creates the full Guides infrastructure and seeds ~12 guides. But Phase 1 needs something in "Guides from local creators" to demo. Options: (a) hardcode 3 placeholder guide cards that render a "Coming soon" modal on tap, or (b) defer the section entirely to Phase 3. (Recommendation: option a — keeps the home page feeling complete.)

5. **Route naming:** Do you want to keep `/feed` as a redirect forever, or eventually remove it? (Recommendation: redirect indefinitely; it's cheap and protects external links.)

6. **Community tab in mobile:** Confirmed acceptable to access Community only via the Profile tab on mobile? Or should it be more prominent?

---

## Testing checklist (for Quest to run after Claude Code delivers)

- [ ] Open `/` on my phone. Feed loads in under 2 seconds on LTE.
- [ ] Scroll through every section. Horizontal scrolling is smooth, snaps into place.
- [ ] Tap a card in each section. Every one opens a valid detail page.
- [ ] Tap each category in the rail. Filtering visibly narrows each section.
- [ ] Tap "Weird" — confirm I see something that actually feels weird.
- [ ] Check the time on an event that just started. Confirm it disappears within 2 hours.
- [ ] Visit `/feed` directly in a fresh browser. Confirm it redirects to `/`.
- [ ] Sign out. Visit `/`. Confirm I see the same content (just with a "Sign in" profile icon).
- [ ] Tap the save button on a card while signed out. Confirm the soft auth prompt appears.
- [ ] Open the site on desktop at 1440px. Confirm the layout is sensible (not a stretched mobile view, not broken).

---

## Status tracking

Claude Code should maintain `PULSE_STATUS.md` with a dedicated Phase 1 section:

```markdown
## Phase 1: Foundation + Events Tab + Bug Fixes
- [x] New home page architecture
- [x] Top chrome (header, search, tabs, category rail)
- [ ] Events tab — Today section
- [ ] Events tab — This weekend's picks
- [ ] Events tab — New in Denver
- [ ] Events tab — Outside the city
- [ ] Events tab — Guides preview section
- [ ] Bottom nav
- [ ] Bug fix: stale events
- [ ] Bug fix: broken links
- [ ] Bug fix: stale New in Denver
- [ ] Data model migrations
- [ ] Daily cron jobs
- [ ] Category rail filtering
- [ ] Testing on mobile + desktop
- [ ] Lighthouse scores verified
```
