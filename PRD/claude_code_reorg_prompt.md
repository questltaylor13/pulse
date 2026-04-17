# Feed Reorganization: Declutter + New Openings + Pre-Made Lists

The feed has too many sections now and it's overwhelming. We need to simplify the layout, fix the sidebar scroll, and add a "New This Month" section. Read this fully before starting.

---

## 1. Reorganize the Feed — Fewer Sections, More Impact

The current feed has too many sections stacked: Weekend Picks → Suggested for You → Hidden Gems → Featured Lists → From Curators You Follow → Category Filters → Event Grid. That's 7 sections before you browse. Cut it to 4.

### New Feed Layout (top to bottom):

**Section 1: "Your Weekend, Sorted" hero** (KEEP AS-IS — this is working great)

**Section 2: "Featured Lists"** (MOVE UP — right below weekend picks)
- Show 3 list cards horizontally: "Stuff You Didn't Know You Could Do in Denver", "Free Fitness in Denver", "Jensen's Weekend Starter Pack"
- These are the second most compelling thing on the page

**Section 3: "New This Month" section** (NEW — see details below)
- New restaurants, new openings, new pop-ups, new venues that recently appeared in Denver
- Visually distinct from the rest — maybe a different background or a "🆕" badge

**Section 4: Event/Activity Grid with filters**
- Category pills (All Events, Art, Live Music, Bars, Food, etc.)
- Lifestyle filter tags (Dog Friendly, Drinking Optional, Free, Outdoor, Group Activity, Solo Friendly, Unique)
- Neighborhood filter
- The actual browsable grid of events and activities

### Sections to REMOVE or RELOCATE:
- **"Suggested for You"** → REMOVE entirely. The weekend picks and featured lists now serve this purpose better. The old "Suggested for You" was showing the same items (Archery Games, Red Rocks, Summer Set) that are already in the weekend hero.
- **"Hidden Gems"** → REMOVE as a standalone section. Instead, add "Hidden Gem" as one of the lifestyle filter tags so users can filter for it. Items with high novelty scores still get the "Hidden Gem" badge on their cards in the main grid.
- **"From Curators You Follow"** → MOVE to the sidebar, below "Trending This Week". Show it as a compact list: "Active Denver saved Red Rocks Fitness" / "Try Something Weird saved Denver Curling Club". 2-3 items max in the sidebar. Don't give it its own feed section.

---

## 2. Fix the Sidebar

### Scroll behavior:
The right sidebar has its own scroll that's independent from the main feed. Make the sidebar scroll WITH the page (position: sticky with a max-height, or just let it flow naturally with the page). The sidebar should stick to the top of the viewport as the user scrolls down the main feed, then unstick when they reach the bottom of the sidebar content.

### Sidebar layout (top to bottom):
1. **People You Might Like** (keep, but show follower counts properly — no more "· followers" with no number)
2. **Trending This Week** (keep as-is — this is good)
3. **From Curators You Follow** (moved here from main feed — compact format)
4. **Explore by Neighborhood** (keep as-is)
5. **Quick Links** (keep as-is)

---

## 3. "New This Month" Section

This is a NEW section that surfaces genuinely new things in Denver — not just new to the database, but actually new businesses, openings, pop-ups, and seasonal things.

### Design:
- Section title: "New This Month" with subtitle "Recently opened, just launched, or new to Denver"
- 3-4 cards in a horizontal scroll
- Each card has a "🆕 New" badge
- Visually distinct — maybe a subtle warm background (#FFF8F0) or a left border accent

### Content Strategy:
For the demo, seed 4-6 "new" items. Mark them with an `isNew: true` flag or a `newUntil` date field on the Event/Item model.

### Seed these items (research-based, real Denver openings and new things):

**Item 1:**
- Title: "Denver Clayroom"
- Category: ART
- Description: "Brand new pottery studio built from the ground up for Denver. Classes, memberships, and drop-in times. From the team behind a beloved SF studio."
- Location: Denver, CO
- Price: Classes from ~$50
- isNew: true
- Badge: 🆕 Just Opened

**Item 2:**
- Title: "Chicken N Pickle — Thornton"
- Category: ACTIVITY_VENUE
- Description: "The popular pickleball-meets-restaurant chain just opened in Thornton. Indoor and outdoor courts, a full food menu built around chicken, and a 90-acre shopping district around it."
- Location: 14225 Lincoln St, Thornton CO
- Price: Court rental + food
- isNew: true
- Badge: 🆕 Just Opened

**Item 3:**
- Title: "Spring Farmers Markets Return"
- Category: SEASONAL
- Description: "Denver's outdoor farmers markets are back for the season. Union Station, Cherry Creek, City Park — fresh produce, artisan foods, live music, and weekend vibes."
- Location: Various (Union Station, Cherry Creek, City Park)
- Price: Free entry
- isNew: true
- Badge: 🌱 Seasonal Return

**Item 4:**
- Title: "Peak Fitness RiNo"
- Category: FITNESS  
- Description: "New fitness studio in the heart of RiNo. Strength, HIIT, and recovery classes in a sleek space."
- Location: RiNo, Denver
- Price: Class packages vary
- isNew: true
- Badge: 🆕 Just Opened

**Item 5:**
- Title: "Sploinky Rave at Meow Wolf"
- Category: LIVE_MUSIC
- Description: "New late-night electronic music series inside Convergence Station. Meow Wolf after dark hits different."
- Location: Meow Wolf Denver
- Date: Apr 24, 2026
- Price: TBD
- isNew: true
- Badge: 🆕 New Event Series

**Item 6:**
- Title: "Spring Trail Season"
- Category: OUTDOORS
- Description: "Snow's melting and the trails are opening up. South Table Mountain, Red Rocks Trading Post Trail, and Mount Falcon are all good to go. Perfect hiking weather through May."
- Location: Various Front Range trailheads
- Price: Free (some require park pass)
- isNew: true
- Badge: 🌱 Seasonal

### Query logic for "New This Month":
- Show items where `isNew = true` OR `createdAt` is within the last 30 days AND `noveltyScore >= 5`
- Sort by `createdAt` descending
- Limit to 6 items
- This section should feel fresh — if possible, rotate or randomize which 3-4 show in the horizontal scroll

---

## 4. Pre-Made Lists for Jensen's Account

Create two additional lists that are already in Jensen's account (not from community profiles — these are HIS lists):

**List 1: "Weekend Ideas"**
- Owner: Jensen
- Description: "Things I want to try"
- Items:
  1. Archery Games Denver
  2. Denver Bouldering Club  
  3. Red Rocks Fitness Stair Workout
  4. Meow Wolf Denver
  5. Mile Hi Pickleball
- This shows Jensen that he's already started curating — feels like he's been using the app

**List 2: "Date Night Ideas"**
- Owner: Jensen
- Description: "Fun stuff to do together"
- Items:
  1. Community Clay Denver — "Pottery date night. Way more fun than dinner and a movie."
  2. Meow Wolf Denver — "2-3 hours of exploring surreal art together."
  3. EscapeWorks Denver — "Speakeasy room. Work together to solve puzzles."
  4. All Out Smash — "Splatter paint room. Create art, make a mess, laugh a lot."
  5. Comedy Works Downtown — "Classic date. Great comics, intimate venue."
- This demonstrates the couple's/shared planning feature even without a linked partner account

These should appear when Jensen clicks "Lists" in the nav. They should also show in the "Quick Links" sidebar under "Your Want List."

---

## 5. Calendar View Polish

If a calendar view exists (or can be quickly added), events that Jensen has saved should appear on a calendar. Even a simple month view showing dots on dates with saved events would make the "planning" aspect tangible. If this is too heavy for today, skip it — but flag it as a next-session item.

---

## Execution Order:
1. Remove/relocate sections (declutter the feed) — biggest visual impact
2. Fix sidebar scroll behavior
3. Add "New This Month" section with seeded content
4. Add Jensen's pre-made lists
5. Calendar view (only if time)

Deploy after phases 1-2 together, then after 3-4 together. Let me review after each deploy.
