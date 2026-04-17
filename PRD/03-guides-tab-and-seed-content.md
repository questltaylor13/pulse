# Phase 3: Guides Tab + Seed Content

**Status:** Blocked on Phases 1 and 2
**Estimated scope:** Large (new data model + seed content + UI)
**Dependencies:** Phases 1 and 2 complete. Guides reference Events and Places that must already exist in the database.

---

## TL;DR

Build the Guides tab: creator-curated multi-stop itineraries that string together Events and Places into a ready-to-follow plan (e.g., "The perfect RiNo Saturday: brunch → street art → rooftop drinks → late-night ramen"). This is Pulse's differentiator — it solves the "we found something, now what do we do around it?" problem that Reddit research identified. Phase 3 includes three components: (1) the Guides data model + Prisma schema, (2) the Guides tab UI with occasion pills, featured hero, creator spotlight strip, and duration-based sections, and (3) a guide detail page with timeline-style stop rendering. Also includes seeding 10–12 starter guides authored by Quest (or AI-drafted and Quest-edited) so the tab is populated on launch.

---

## What we're building

### 1. Data model (Prisma schema additions)

```prisma
model Guide {
  id                String         @id @default(cuid())
  slug              String         @unique
  title             String         // "The perfect RiNo Saturday"
  tagline           String         // "Brunch, art, rooftop drinks"
  coverImageUrl     String?
  description       String         @db.Text // 1-paragraph creator intro
  durationLabel     String         // "Full day" | "Half day" | "Evening" | "Quick (2-3 hrs)"
  durationMinutes   Int            // Actual estimate for filtering
  neighborhoodHub   String?        // Primary neighborhood if guide is geographically focused
  costRangeLabel    String         // "$" | "$$" | "$$$" | "$-$$" etc.
  occasionTags      String[]       // ["date-night", "with-friends", "solo", "outdoors", "visiting-denver", "rainy-day", "with-the-dog"]
  vibeTags          String[]       // ["romantic", "walkable", "indoor-outdoor", "active", "chill"]
  isFeatured        Boolean        @default(false) // Appears in "This week's featured guide" hero
  isPublished       Boolean        @default(false) // Draft vs live
  viewCount         Int            @default(0)
  saveCount         Int            @default(0)
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  creatorId         String
  creator           Creator        @relation(fields: [creatorId], references: [id])
  stops             GuideStop[]
  savedByUsers      UserSavedGuide[]
}

model GuideStop {
  id                String   @id @default(cuid())
  order             Int      // 1, 2, 3, ... determines order in the timeline
  timeWindowStart   String?  // "10:00 AM" - free-text to allow flexibility
  timeWindowEnd     String?  // "11:30 AM"
  note              String   @db.Text // Creator's reason for including this stop (2-3 sentences)
  insiderTip        String?  @db.Text // Optional "pro tip" callout
  walkTimeToNext    Int?     // Minutes, null for last stop

  guideId           String
  guide             Guide    @relation(fields: [guideId], references: [id], onDelete: Cascade)

  // Polymorphic reference — a stop is either an Event or a Place
  eventId           String?
  event             Event?   @relation(fields: [eventId], references: [id])
  placeId           String?
  place             Place?   @relation(fields: [placeId], references: [id])

  @@index([guideId, order])
}

model Creator {
  id                String   @id @default(cuid())
  slug              String   @unique
  name              String   // "Sarah M."
  label             String   // "Local foodie"
  bio               String   @db.Text
  avatarUrl         String?
  coverImageUrl     String?
  followerCount     Int      @default(0)
  guideCount        Int      @default(0) // Denormalized
  isFeatured        Boolean  @default(false)
  createdAt         DateTime @default(now())

  guides            Guide[]
  followedByUsers   UserFollowsCreator[]
}

model UserSavedGuide {
  userId    String
  guideId   String
  savedAt   DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  guide     Guide    @relation(fields: [guideId], references: [id], onDelete: Cascade)
  @@id([userId, guideId])
}

model UserFollowsCreator {
  userId    String
  creatorId String
  followedAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  creator   Creator  @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  @@id([userId, creatorId])
}
```

**Enforcement rules:**
- A `GuideStop` must have exactly one of `eventId` or `placeId` set, never both, never neither. Enforce at the application layer and with a DB check constraint.
- A `Guide` with `isPublished: true` must have at least 2 stops.
- `Guide.creatorId` is required; there are no creatorless guides in Phase 3. (Editorial "from Pulse" guides can use a house creator account.)

### 2. Guides tab UI

The Guides tab transforms from its Phase 1 "Coming soon" placeholder into a fully populated surface.

**Search bar placeholder** updates to "What kind of plan are you looking for?"

**No category icon rail on Guides** (Events has one, Places has one, Guides does not — different filter mechanism).

**Occasion pill rail** (replaces the icon rail for Guides):
- Horizontal scroll of pill-shaped filter chips
- Each pill has an icon + label, combined in a 22px pill with 8px 14px padding
- Active state: dark `#1a1a1a` background, white text
- Inactive: white background, `#e0e0e0` border, `#444` text
- Pills: All guides, Date night, With friends, Solo, Outdoors, Visiting Denver, Rainy day, With the dog
- Selecting a pill filters every section below to guides with that `occasionTag`

**Sections** in order:

**Section 1: This week's featured guide** (hero)
- Single large featured guide card
- 220px tall cover image
- "Editor's pick" badge in top-left (dark `#1a1a1a` background, 11px, with star icon)
- Overlay at bottom with title (20px 500 white) + tagline (13px rgba(255,255,255,0.85))
- Below the image: creator row (32px avatar + name + label + follower count) and meta row (duration icon + stops count + cost range, all 12px gray)
- Queried by `isFeatured: true`, sorted by `updatedAt` desc, limit 1
- Rotates weekly (Quest sets `isFeatured: true` on one guide per week)

**Section 2: Ready for this weekend**
- Horizontal scroll of `<GuideCard />`
- 260×170 cover image with gradient overlay
- Title + subtitle on overlay; stops count badge in top-right ("4 stops")
- Creator row below image with save button on the right
- Queried: guides where `occasionTags` excludes "rainy-day" (weekend guides should assume sun) OR sorted by `saveCount` recent
- Subtitle: "Plans you can follow Fri–Sun"

**Section 3: Local creators** (creator spotlight strip)
- Horizontal scroll of creator avatars, Instagram-story style
- 72×72 circular avatar with 2px coral `#E85D3A` ring, 2px white inner padding
- Creator name below (12px 500) + label below that (10px gray)
- Tapping a creator avatar routes to `/creators/[slug]` — their full library
- Section subtitle: "Follow the people who know Denver"

**Section 4: Date night plans**
- Standard horizontal scroll of guide cards
- Filtered to `occasionTags: ["date-night"]`
- Subtitle: "Tested itineraries that actually flow"

**Section 5: Got 3 hours?**
- Filtered to `durationMinutes <= 180`
- Subtitle: "Quick plans you can squeeze in"

A `<Divider />` appears between Section 3 (creator spotlight) and Section 4 (Date night) to visually separate the creator-centric section from the guide-centric sections.

### 3. Guide detail page

New route: `/guides/[slug]`

**Page structure** (top to bottom):

1. **Cover image hero** — full-width, 280px tall, cover image with gradient overlay. Back button top-left, share button top-right. Title (22px 500 white) and tagline (13px white) at the bottom of the image.

2. **Creator block** — immediately below the hero. Large avatar (44px) + creator name + label + "Follow" button. Below that, the creator's short bio if this is the guide's first view from this creator.

3. **Guide meta row** — duration, stops count, neighborhood hub, cost range, all as icon+text pairs.

4. **"About this guide" description** — the creator's intro paragraph.

5. **Primary CTA** — "Use this guide" button, full-width, coral `#E85D3A` background, white text. Tapping starts active-guide mode (defer full active-guide functionality to a later phase; in Phase 3, this button can simply save the guide and show a toast "Guide saved. Active mode coming soon.").

6. **Stops timeline** — vertical list of each stop in order. Each stop:
   - Number circle (1, 2, 3, ...) on the left with a vertical line connecting to the next stop
   - Time window at the top (e.g., "10:00 AM – 11:30 AM")
   - Place/event name (16px 500)
   - Neighborhood · category
   - Cover image of the place/event (full-width, 160px tall)
   - Creator's note (the 2-3 sentences explaining why this stop is here)
   - Insider tip callout if present — yellow `#fef5e7` background, 13px text, with a lightbulb icon
   - Walk time to next stop (e.g., "↓ 8 min walk") below, before the next stop's number circle

7. **"Similar guides" section** at the bottom — 2–3 guide cards based on shared `occasionTags`.

### 4. Creator detail page

New route: `/creators/[slug]`

**Page structure:**

1. Cover image banner (150px)
2. Avatar (72px, overlapping the banner)
3. Name + label + bio + follower count + "Follow" button
4. Grid of all that creator's published guides (2 columns on mobile, 3-4 on desktop)

### 5. Seed guide content

Phase 3 includes creating 10–12 seed guides so the tab looks populated on launch. This is a content task, not a code task, but it's required for the phase to ship.

**Required seed guides** (each with at least 3 stops, references to existing events/places in the DB):

1. **The perfect RiNo Saturday** — Sarah M. — Full day — Date night, With friends
2. **Active date day** — Mike T. — Half day — Date night, Outdoors
3. **Denver on a budget** — Jess L. — Full day — With friends, Solo
4. **Visiting Denver in 48 hours** — Tom K. — Full day — Visiting Denver
5. **Wine bar hop in Highlands** — Jess L. — Evening — Date night
6. **Golden hour date** — Sarah M. — Evening — Date night
7. **Solo Sunday morning** — Alex R. — Quick — Solo
8. **Rainy afternoon indoors** — Tom K. — Half day — Rainy day, Solo
9. **Morning with the dog** — Mike T. — Quick — With the dog, Outdoors
10. **First Friday art crawl** — Alex R. — Evening — With friends
11. **Brunch + bookshop Sunday** — Sarah M. — Quick — Solo, Date night
12. **Mountain town day trip: Idaho Springs** — Mike T. — Full day — Outdoors, With friends

**Required seed creators** (5):

- **Sarah M.** — Local foodie — Writes food + date content
- **Mike T.** — Outdoor enthusiast — Writes active + outdoor content
- **Jess L.** — Denver native — Writes budget + neighborhood content
- **Tom K.** — City guide — Writes visitor + rainy-day content
- **Alex R.** — Nightlife + solo traveler — Writes evening + solo content

Each creator needs a real avatar (can be generated or editorial photo), a real bio (2-3 sentences), and a unique voice. Quest should draft/edit all creator bios and guide descriptions — this is the editorial voice of Pulse and cannot be AI-generated without a human pass.

---

## UI components to build

- `<GuideCard guide />` — the 260×170 overlay card used in scroll sections
- `<FeaturedGuideCard guide />` — the full-width hero card for Section 1
- `<OccasionPillRail pills activeId onSelect />` — horizontal scroll of pill filters
- `<CreatorSpotlight creator />` — 72px avatar + name + label cell
- `<GuideStop stop showWalkTime />` — single stop in the timeline
- `<GuideTimeline stops />` — full vertical timeline rendering
- `<UseThisGuideButton guideId />` — primary CTA component
- `<CreatorBlock creator />` — avatar + name + label + follow button

---

## Acceptance criteria

Phase 3 is done when:

1. Guides tab renders full content (no more placeholder).
2. Occasion pill rail works — tapping any pill filters the sections.
3. Featured guide hero shows the current week's featured guide.
4. Creator spotlight strip shows all 5 seed creators.
5. At least 10 guides are live (`isPublished: true`) in the database.
6. Every guide has at least 3 stops, each referencing a valid Event or Place.
7. Tapping a guide card routes to `/guides/[slug]` and renders the full detail page.
8. The detail page shows the timeline with numbered stops, creator notes, and walk times.
9. Tapping a creator avatar routes to `/creators/[slug]` and renders their library.
10. "This weekend" section shows current guides that apply to the upcoming Fri–Sun.
11. Save button on guide cards works for authenticated users (saves to `UserSavedGuide`).
12. The "Guides from local creators" section in the Events tab (Phase 1 preview) now links to real guide detail pages instead of showing the "Coming soon" modal.
13. Share functionality works: tapping share on a guide copies `https://denverand.co/guides/[slug]` to clipboard and/or opens the native share sheet on mobile.

---

## Open questions for Quest

1. **Creator identities:** The five seed creators above — are these real people (Denver-based creators Quest knows or will recruit) or fictional personas for the seed phase? If fictional, we need to be careful about claims ("local foodie") and avatars (generated vs. stock). **Recommendation: real people. Recruit 2–3 actual Denver creators for the launch and use them; supplement with "editorial" house accounts where needed.**

2. **"Editorial" guides vs. creator guides:** Should there be a "Pulse Editors" creator account that publishes guides directly from the brand (vs. always attributing to an individual)? This gives you flexibility for guides that don't have a natural human author.

3. **Can users create guides?** Not in Phase 3. Confirmed this is creator-only for now? User-generated guides are a future phase.

4. **Guide rotation / freshness:** How often should `isFeatured: true` rotate? Weekly? Is there an automated rotation or manual? **Recommendation: manual weekly, controlled by Quest via a simple admin form.**

5. **Active guide mode:** The "Use this guide" button currently just saves the guide in Phase 3. The full active-mode (progressing through stops, directions, check-ins) is deferred. Confirm this deferral is OK?

6. **Guide cover images:** Where do these come from? Each guide needs a compelling cover photo. Options: use the cover image of the guide's first stop, commission photos, or use generated/stock imagery. **Recommendation: use the cover of the first stop for v1; iterate later.**

7. **Walk time calculation:** Stored manually by the creator, or auto-computed from Google Directions API? Auto-computing is nicer but adds API cost. **Recommendation: manual in Phase 3 to keep it simple; automate in a later phase.**
