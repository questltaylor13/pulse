# Follow-Up: Feed Quality & Recommendation Logic Fixes

The initial build is deployed but the feed isn't landing. Here's a screenshot of what Jensen sees right now and what needs to change. Read this entire prompt before making any changes, then build a plan and ask questions.

---

## Problem 1: Speakeasy Cocktail Bar is the #1 suggestion for a non-drinker

Jensen's preferences explicitly have BARS as DISLIKE. But "Speakeasy Cocktail Bar" is showing as the FIRST suggested item because it's miscategorized as "Experience / Activity Venue" instead of BARS. This is the core categorization problem.

### Fix:
1. Find every item in the database where the venue name or title contains keywords like: speakeasy, cocktail, bar, brewery, taproom, pub, lounge, tavern, saloon, wine bar, beer garden, happy hour, drinks, booze, nightclub
2. Reclassify them as BARS, not ACTIVITY_VENUE or EXPERIENCE
3. For the AI enrichment pipeline (gpt-5.4-nano), update the system prompt to explicitly say: "Bars, cocktail lounges, speakeasies, breweries, taprooms, and any venue where drinking is the primary activity should ALWAYS be categorized as BARS, never as ACTIVITY_VENUE or EXPERIENCE, even if they also offer food or entertainment."
4. Run a one-time reclassification pass on ALL existing events in the database using the updated AI prompt. Don't just fix the one item — fix the whole dataset.

---

## Problem 2: "Suggested for You" shows the same reason 3 times

All three cards say "Matches your love of activity venue" — this is lazy and tells the user nothing. The recommendation text needs to be specific and compelling.

### Fix:
Replace the generic "Matches your love of [category]" text with the `oneLiner` field from the AI enrichment. If `oneLiner` doesn't exist yet on the Event model, add it as an optional string field and populate it during enrichment.

Examples of what it should say instead:
- "Learn to curl at Colorado's oldest curling club — equipment provided"
- "Archery meets dodgeball in this indoor arena. Yes, really."
- "40,000 sq ft of bouldering next to a beer garden and food trucks"
- "Immersive, mind-bending art across multiple surreal floors"

If the oneLiner field isn't populated for an item, fall back to a category-specific template that's at least more interesting than the current one:
- FITNESS: "Matches your active lifestyle"
- OUTDOORS: "Right up your alley — get outside"
- ACTIVITY_VENUE: "Something different to try"
- SOCIAL: "Great way to meet people"
- ART: "Feed your creative side"
- COMEDY: "You could use a laugh"

---

## Problem 3: No unique/novel content in the feed

The feed looks like Yelp. There's nothing that makes Jensen go "wait, I didn't know you could do that in Denver." The curated seed data from the PRD (curling, archery, archery dodgeball, bouldering clubs, cycling clubs, axe throwing, escape rooms, etc.) should be prominent in the feed but it's not showing up.

### Fix:
1. First, verify the seed data actually made it into the database. Query for items with titles containing: "curling", "archery", "bouldering", "cycling", "axe throwing", "escape". If they're missing, run the seed script again.
2. If they exist but aren't showing, the recommendation algorithm is deprioritizing them. The algorithm needs a NOVELTY BOOST — unique/unusual activities should rank higher than generic restaurants and coffee shops, especially for users who have ACTIVITY_VENUE as a top preference.
3. Add a `noveltyScore` field (integer 1-10) to the Event model, or use the existing `qualityScore` if it exists. During enrichment, the AI prompt should include: "Also rate novelty 1-10: how unique or surprising is this? A regular restaurant = 2. A curling club = 9. An archery dodgeball arena = 10. A coffee shop = 1. A rage room = 8."
4. The "Suggested for You" query should sort by: `(categoryMatchWeight * 0.4) + (noveltyScore * 0.35) + (qualityScore * 0.25)` — this ensures unique activities surface above generic places.
5. The "Suggested for You" section should show a VARIETY of categories, not 3 items from the same category. If the first card is ACTIVITY_VENUE, the second should be FITNESS or OUTDOORS, the third should be SOCIAL or ART. Deduplicate by category in the top suggestions.

---

## Problem 4: "New in Denver" section is generic

It's showing Rosetta Hall (restaurant), Retrograde Coffee (coffee shop), and Peak Fitness RiNo (gym). These are fine businesses but they're not exciting discoveries. This section should surface genuinely new and interesting things.

### Fix:
1. "New in Denver" should prioritize items with high novelty scores and recent `createdAt` dates
2. Add an `isNew` boolean or `featuredAt` date field to flag items for this section
3. The AI enrichment should also return an `isNewOrNotable` boolean: "Is this a new opening, a seasonal pop-up, a limited-time experience, or something that recently launched in Denver?"
4. If there aren't enough genuinely "new" items, rename the section to "Hidden Gems" or "You Might Not Know About" and populate it with high-novelty items regardless of when they were added
5. The "Editor's Pick" badge should be reserved for items with qualityScore >= 8 AND noveltyScore >= 7 — not generic restaurants

---

## Problem 5: Feed cards need more visual variety

Every card looks the same. Unique experiences should FEEL different from regular places.

### Fix:
1. Add badges/tags that create visual hierarchy:
   - 🔥 "Hidden Gem" — for noveltyScore >= 8
   - ⚡ "Unique Experience" — for ACTIVITY_VENUE items
   - 🆓 "Free" — for items with price = "Free" or $0
   - 👥 "Great for Groups" — for items tagged with "group activity" or "social"
   - 🏃 "Active" — for FITNESS and OUTDOORS items
   - 🎯 "Try Something New" — for items in categories the user hasn't explored yet
2. The category pill on each card (like the teal "Coffee" or coral "Restaurant" labels) should use distinct colors per category so they're instantly scannable
3. For the "Suggested for You" horizontal scroll, show the match percentage as a subtle visual element (not the primary text, but visible) — like a small "94% match" in the corner

---

## Problem 6: The "Drinking Optional" filter tag is good — expand on this

I see "Dog Friendly" and "Drinking Optional" as filter tags at the bottom. This is actually a great feature for Jensen. Expand it:

### Fix:
1. Add more lifestyle filter tags: "No Alcohol Required", "Outdoor", "Free or Cheap", "Date Night", "Solo Friendly", "Group Activity", "Unique/Unusual", "Weekend Morning", "After Work"
2. For Jensen specifically, since his preference is BARS = DISLIKE, auto-apply a subtle "alcohol-free prioritized" filter that pushes bar/drinking-primary venues to the bottom without hiding them entirely
3. These filter tags should be persisted in the user's session so they don't have to re-select every time

---

## Execution Order:

1. **Reclassify the database** — Run the one-time AI reclassification pass on all existing events using gpt-5.4-nano with the updated prompt. This fixes the speakeasy problem and any other miscategorized items. Do this FIRST because everything else depends on correct categories.
2. **Verify seed data exists** — Make sure the curated activities (curling, archery, cycling, etc.) are in the database. If not, run the seed script.
3. **Add noveltyScore and oneLiner fields** — Prisma migration, then populate via AI enrichment pass on existing data.
4. **Update the recommendation algorithm** — New sorting logic with novelty boost and category deduplication.
5. **Update the suggestion text** — Replace "Matches your love of..." with oneLiner or better category templates.
6. **Update "New in Denver" section** — New query logic prioritizing novelty and genuine newness.
7. **Add visual badges** — Hidden Gem, Unique Experience, Free, etc.
8. **Expand filter tags** — More lifestyle filters.

Build me a plan, tell me what files you'll touch, and ask any questions before starting. Push and deploy after each major phase so we can see progress on the live site.
