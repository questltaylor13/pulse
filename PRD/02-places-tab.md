# Phase 2: Places Tab

**Status:** Blocked on Phase 1
**Estimated scope:** Medium
**Dependencies:** Phase 1 must be complete. Reuses `<Card />`, `<ScrollSection />`, `<CategoryRail />` components.

---

## TL;DR

Turn the Places tab (currently a "Coming soon" placeholder from Phase 1) into a fully populated browse surface for Denver's restaurants, bars, coffee shops, venues, and outdoor spots. The tab has its own category icon rail (All, Restaurants, Bars, Coffee, Outdoors, Venues, Nightlife), a unique "Explore by neighborhood" hero section with tappable neighborhood cards, and intent-based sections like "Where locals actually go," "Perfect for a first date," and "Good for groups." Surface vibe tags on every card (e.g., "Cozy · Good for work," "Intimate · Date spot") — these come from the AI enrichment pipeline and are Pulse's sharpest differentiator from Yelp.

---

## What we're building

### 1. Places tab activation

The Places tab in Phase 1 is a placeholder. In Phase 2, tapping Places renders the full layout below. All the top chrome (header, search, tabs) stays the same; only the tab content changes.

Search bar placeholder changes contextually when Places is active: **"Search places in Denver"**.

### 2. Category icon rail (Places-specific)

Categories in order:
- **All**
- **Restaurants**
- **Bars**
- **Coffee**
- **Outdoors**
- **Venues**
- **Nightlife**

Same component as Events' rail (`<CategoryRail />`) but different categories. Selecting a category filters every section on the Places tab. The two rails don't share state — switching from Events to Places and back preserves each tab's independent filter.

### 3. Sections

In order from top to bottom:

**Section 1: New in Denver**
- Same query as Phase 1's "New in Denver" section but limited to places only (no events)
- Card size: 240×170 image
- "Just opened" badge with a teal dot prefix for places within 14 days of `openedDate`
- Vibe tag row: "Cozy · Good for work," "Intimate · Date spot," etc. — rendered as a small pill below the meta line

**Section 2: Explore by neighborhood** (hero section)
- Four to six tappable neighborhood cards
- Each card: 180×200 with a full-bleed image of the neighborhood + gradient overlay + neighborhood name + place count (e.g., "RiNo · 48 places")
- Tapping a neighborhood card routes to `/places/neighborhood/[slug]` which is a filtered Places view
- Seed neighborhoods for Phase 2: RiNo, LoDo, Highlands, Cap Hill, Baker, Sloan's Lake, Cherry Creek
- This section does **not** horizontally scroll by default; instead it's a grid or a scrollable row (design decision for implementation — either works, prefer horizontal scroll for consistency with other sections)

**Section 3: Where locals actually go**
- Places tagged `isLocalFavorite: true` and with `touristTrapScore < 0.3`
- Section subtitle: "No tourist traps, no chains"
- Standard card size (240×170)
- Max 8 places surfaced; "See all →" links to full list

**Section 4: Perfect for a first date**
- Places with `vibeTags` containing any of: "intimate," "conversation-friendly," "date-spot," "romantic," "cozy"
- Excludes places tagged "loud," "crowded," "family-friendly"
- Subtitle: "Low-pressure, conversation-friendly"
- Standard card size

**Section 5: Good for groups**
- Places with `vibeTags` containing any of: "group-friendly," "big tables," "shareable plates," "lively," "communal"
- Subtitle: "Big tables, shareable plates, loud enough"
- Standard card size

**Section 6: Where to work from**
- Places tagged `goodForWorking: true` (derived from wifi + outlet + not-too-loud signals)
- Subtitle: "Wifi, outlets, quiet enough"
- Standard card size

Dividers (8px `#fafafa`) separate the hero neighborhood section from the rest, and between sections 3 and 4.

### 4. Vibe tag system

The single most important differentiator in Phase 2. Every place card displays a vibe tag below its meta line. The tag is a pill with light gray background and dark gray text.

**Vibe tag sources** (in priority order):
1. Manually curated by admin (highest priority)
2. AI enrichment pipeline output, confidence score ≥ 0.7
3. Derived from review sentiment analysis (lowest priority, fallback)

**Vibe tag examples:**
- Cozy · Good for work
- Intimate · Date spot
- Lively · Group-friendly
- Big patio · Dog-friendly
- Hidden · Speakeasy
- Neighborhood spot
- Special occasion
- Chef-driven · Quiet

Tags are comma-separated in display, max 2 tags per card to avoid clutter.

### 5. Neighborhood detail route

New route: `/places/neighborhood/[slug]`

When a user taps a neighborhood card on the Places tab, they land on a filtered view showing:

- **Top chrome:** Same as main app (header, search, tabs)
- **Page header:** Large neighborhood name (20px, weight 500) + place count + one-paragraph neighborhood description (editorial, written by admin). Example for RiNo: *"River North. Murals, breweries, and restored warehouses. Denver's art district has become one of the most dense food-and-drink destinations in the city."*
- **Category filter chips** (different from the icon rail): horizontal row of pills — All, Eat, Drink, Coffee, Things to do — that filter the list below
- **Vertical list of places** in that neighborhood, using the horizontal list-card pattern from the Phase 4 "See all" view. (Note: this view is similar to the Phase 4 "See all" but scoped to a neighborhood. If Phase 4 hasn't shipped yet when Phase 2 is being built, implement a simpler version here and refactor during Phase 4.)
- **"View on map" floating button** at the bottom (defer full map implementation to Phase 4; in Phase 2, this button can be a placeholder that shows a "Coming soon" toast)

---

## Data model changes

### Place model (add to Phase 1's additions)
- `vibeTags: String[]` — already added in Phase 1 spec; now surfaced in UI
- `isLocalFavorite: Boolean @default(false)`
- `touristTrapScore: Float?` — 0.0 to 1.0, higher = more touristy
- `goodForWorking: Boolean @default(false)`
- `openedDate: DateTime?` — already in Phase 1
- `neighborhood: String?` — already in Phase 1; now must be populated for ALL places before Phase 2 ships

### New model: Neighborhood
```prisma
model Neighborhood {
  id            String   @id @default(cuid())
  slug          String   @unique
  name          String
  description   String   @db.Text
  coverImageUrl String?
  placeCount    Int      @default(0) // Denormalized for perf; updated nightly
  isFeatured    Boolean  @default(false) // Controls whether it appears in the Places tab hero section
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

Seed data for Phase 2:
- RiNo (`rino`)
- LoDo (`lodo`)
- Highlands (`highlands`)
- Cap Hill (`cap-hill`)
- Baker (`baker`)
- Sloan's Lake (`sloans-lake`)
- Cherry Creek (`cherry-creek`)

Each neighborhood needs:
- A 3-sentence description
- A cover image URL (editorial photo of the neighborhood)
- `isFeatured: true` for all seven on initial deploy

---

## UI specs (component-level)

### `<NeighborhoodCard neighborhood />`
- 180px wide × 200px tall
- Full-bleed background image with `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75))` overlay
- Content aligned bottom: name (18px 500 white) + place count (12px rgba(255,255,255,0.85))
- Rounded corners 14px
- Tappable, routes to `/places/neighborhood/[slug]`

### `<PlaceCard place />` (extends the Phase 1 Card)
- Adds `<VibeTag />` element below the meta line
- Standard size is 240×170 for Places (vs 220×150 for Events)

### `<VibeTag tags />`
- Small inline pill, 11px text, `#f5f5f5` background, `#666` text
- Displays comma-separated tags ("Cozy · Good for work")
- Max 2 tags rendered; truncate additional tags with no visual indicator

### `<NeighborhoodDetailPage />`
- Uses existing layout shell
- Adds `<NeighborhoodHeader />` component with name, count, and description
- Adds `<FilterChips />` row for sub-category filtering
- Uses `<ListCard />` pattern from Phase 4 (or local simpler implementation if Phase 4 hasn't shipped)

---

## Acceptance criteria

Phase 2 is done when:

1. Places tab renders full content (no more "Coming soon" placeholder).
2. Category rail on Places shows the seven categories and filtering works.
3. All six sections appear in the correct order with appropriate content.
4. Every place card shows a vibe tag row below its meta.
5. Neighborhood hero section shows at least four neighborhoods with cover images and place counts.
6. Tapping a neighborhood card routes to `/places/neighborhood/[slug]` and loads the neighborhood detail page.
7. The Place model has all new fields populated for at least 100 places (seed data).
8. Vibe tags are populated for 80%+ of places, either manually or via AI enrichment.
9. Mobile viewport tested — neighborhood cards look correct at 375px.

---

## Open questions for Quest

1. **Neighborhood list:** Is the seven-neighborhood initial set complete, or should we add more? Five Points, LoHi, Santa Fe Art District, Berkeley, Park Hill are candidates.

2. **Who writes the neighborhood descriptions?** Three sentences each, editorial voice. Options: (a) Quest writes them, (b) generate with AI and Quest edits, (c) sourced from existing content.

3. **Cover images for neighborhoods:** Where do these come from? Unsplash/Pexels licensed, custom shoots, or existing Pulse imagery?

4. **Vibe tag vocabulary:** Should there be a closed vocabulary (Quest curates 20–30 tags, enrichment picks from that list) or open-ended (enrichment generates free-form tags)? **Recommendation: closed vocabulary for consistency.** If yes, Quest needs to define the list before implementation.

5. **"Where locals actually go" tagging:** `isLocalFavorite` needs to be set for a meaningful seed set (30+ places). Who does that — manual curation by Quest, or algorithmic based on existing data signals?

6. **Map view:** Confirmed deferred to Phase 4? Or should a basic map view ship in Phase 2 for the neighborhood detail page?
