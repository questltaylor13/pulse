# Pulse — Jensen Demo Update PRD
## Claude Code Session Handoff — April 2, 2026

---

## Context

Pulse is an AI-powered events and activity discovery platform for Denver, CO. It's deployed on Vercel at `pulse-three-eta.vercel.app`. The founder wants to share the site with a friend (Jensen) today to pitch a potential partnership. Jensen needs to log in, see a personalized feed that feels alive and relevant to his interests, and immediately understand the value of the platform.

**Jensen's profile:** Big fitness guy, doesn't drink, loves outdoors and cycling, social, enjoys unique/fun activities with friends. Not into bar/nightlife scene.

**Tech Stack:** Next.js 14, Prisma ORM, NextAuth (JWT, credentials), Tailwind CSS, Neon PostgreSQL, deployed on Vercel.

**Known bugs:** Event categorization is broken — almost everything gets classified as "Food" regardless of actual type. Match scoring is inflated (many events showing 95-100%) likely because of the categorization bug.

**Repo:** https://github.com/questltaylor13/pulse

---

## Priority 1A: Fix Feed Date Filtering (Quick Win)

Past events are showing in the feed (e.g., April 1st events still visible on April 2nd). The feed query needs to filter these out.

### Steps:
1. Find the feed data query (likely in `app/feed/page.tsx` or a server action / API route that fetches events)
2. Add a WHERE clause: for time-bound events, only show events where `date >= new Date()` (today at midnight in America/Denver timezone)
3. For recurring activities (isRecurring = true, or events with no end date / ACTIVITY_VENUE type), ALWAYS show them regardless of date
4. Sort the feed: upcoming events first (nearest date at top), then activities/recurring items after
5. Also: when the daily scraper runs, it should NOT re-insert events whose date has already passed. If events already in the database have passed, either delete them or mark them as `archived: true` and exclude from the feed query.

---

## Priority 1B: Fix Event Categorization

The classify.ts / categorization logic is tagging nearly all events as "Food." This completely breaks the personalization story, which is the core value prop.

### Steps:
1. Find the classification logic (likely `lib/classify.ts` or within the scraper pipeline)
2. The classifier should use these signals in order of strength:
   - **Venue name** (strongest signal — "Comedy Works" = comedy, "Red Rocks" = live music, "Denver Bouldering Club" = fitness)
   - **Event title keywords** (e.g., "5K", "run", "hike" = fitness/outdoors; "comedy show" = entertainment; "art walk" = art)
   - **Event description** (weakest signal, use as tiebreaker)
3. If using OpenAI for enrichment, make sure the prompt explicitly asks for category assignment and that the response actually overwrites the category field in the database
4. If the AI enrichment is unreliable, fall back to a keyword-based classifier as the primary method

### Category Enum (verify these exist in Prisma schema):
- `ART` — Art galleries, museums, exhibitions, art walks
- `LIVE_MUSIC` — Concerts, live performances, open mic
- `BARS` — Bar crawls, nightlife, happy hours (Jensen will see these ranked LOW)
- `FOOD` — Food festivals, cooking classes, food tours
- `COFFEE` — Coffee shops, tastings
- `OUTDOORS` — Hiking, camping, paddleboarding, outdoor adventures
- `FITNESS` — Gym classes, running clubs, climbing, sports leagues
- `SEASONAL` — Holiday events, seasonal festivals
- `POPUP` — Pop-up markets, temporary experiences
- `RESTAURANT` — Dining experiences (if this exists)
- `ACTIVITY_VENUE` — Permanent activities like archery, curling, axe throwing, escape rooms
- `OTHER` — Anything that doesn't fit

**If `ACTIVITY_VENUE` doesn't exist in the enum, ADD IT.** Also add `COMEDY`, `SOCIAL`, and `WELLNESS` if they don't exist. Update ALL files that reference the Category enum (Record<Category, string> maps, label files, filter components, seed scripts, onboarding interests page, summary page). The Vercel build WILL fail if any file has an incomplete Category mapping — search the entire codebase for every reference.

---

## Priority 2: Comprehensive Seed Data

**IMPORTANT: Do NOT delete existing data.** The site already has real events being scraped daily from Eventbrite, Meetup, and Denver calendar sources. That data is valuable. Instead, AUGMENT the database by INSERTING additional curated items below. Use upsert logic (match on venue name + title) so running the seed script twice doesn't create duplicates. Existing scraped events should remain untouched.

### Data Model Notes:
- Events with a specific date are time-bound (concerts, festivals, etc.)
- "Activities" are permanent venues/experiences — seed these with `isRecurring: true` or whatever flag exists, or with dates far in the future and a recurring indicator
- All dates should be set relative to TODAY (April 2, 2026) — spread across the next 3 weeks
- Make sure a Denver city record exists first (slug: "denver", name: "Denver", state: "CO", timezone: "America/Denver")

### SEED DATA — ACTIVITIES (Permanent / Always Available)

These are the "you didn't know you could do this in Denver" discoveries. They don't expire.

#### FITNESS & SPORTS
1. **Denver Bouldering Club** — Category: FITNESS
   - Location: 1235 Delaware St, Denver CO (also locations in Englewood and Centennial)
   - Description: "Over 35,000 sq ft of climbing terrain across three locations. 24/7 member access, 120+ boulder problems maintained daily. Community vibes, coffee, and gear on site."
   - Price: Day pass ~$20, Membership ~$79/mo
   - Tags: bouldering, climbing, fitness, indoor, social

2. **Movement RiNo** — Category: FITNESS
   - Location: 3201 Walnut St Suite 107, Denver CO (Five Points / RiNo)
   - Description: "40,000 sq ft bouldering facility in a converted tin factory, partnered with Improper City — a cafe, food truck park, and beer garden. Nearly 200 boulder problems for all levels. Yoga and fitness classes included."
   - Price: Day pass ~$24, Membership varies
   - Tags: bouldering, climbing, yoga, fitness, social, RiNo

3. **The Spot Denver** — Category: FITNESS
   - Location: Golden Triangle, Denver CO
   - Description: "19,000 sq ft of bouldering with sweeping walls, tons of natural light, and beer on tap. One of Denver's most welcoming climbing communities. Yoga classes and a full gym included."
   - Price: Day pass ~$26
   - Tags: bouldering, climbing, community, fitness

4. **Mile Hi Pickleball** — Category: FITNESS
   - Location: 3700 Havana St, Denver CO (Central Park neighborhood)
   - Description: "Denver's premier indoor pickleball facility with 11 climate-controlled courts. Lessons, leagues, social events, tournaments, plus a bar and lounge for post-game hangs."
   - Price: Drop-in ~$10-15, Membership available
   - Tags: pickleball, sports, social, indoor, leagues

5. **Pickleball Food Pub** — Category: FITNESS
   - Location: 7647 W 88th Ave, Westminster CO & 15453 E Hampden Ave, Aurora CO
   - Description: "Indoor and outdoor pickleball courts with a full bar serving local craft beers. Leagues, tournaments, and drop-in play. Bring your own food from nearby restaurants."
   - Price: Court rental ~$30-40/hr
   - Tags: pickleball, social, sports, food-adjacent

6. **Play Mile High** — Category: SOCIAL
   - Location: Various locations across Denver (Wash Park, Cap Hill, Sloan's Lake, Cherry Creek, Downtown, LoDo, Uptown)
   - Description: "Adult sports leagues — volleyball, soccer, flag football, softball, kickball, cornhole, bocce, skeeball. 6-8 week seasons with end-of-season tournaments. Register solo as a free agent or bring a team."
   - Price: $40-90 per season
   - Tags: sports leagues, social, team sports, adults, meeting people

#### UNIQUE EXPERIENCES
7. **Denver Curling Club** — Category: ACTIVITY_VENUE
   - Location: Golden, CO (West 7th Avenue)
   - Description: "Learn to curl at Colorado's original curling club, established 1965. Open houses, 5-session learn-to-curl courses, leagues, and corporate events. Season runs Oct-April. They provide all equipment — just bring warm layers and clean rubber-soled shoes."
   - Price: Learn-to-curl sessions ~$50-75
   - Tags: curling, unique, winter sports, social, team

8. **Rock Creek Curling** — Category: ACTIVITY_VENUE
   - Location: Near Commerce City, CO
   - Description: "Colorado's home for curling and community. Intro courses, leagues, competitions, and corporate team-building events. Open Mon-Thu 5-10pm, Sat 9:30am-3pm."
   - Price: Intro sessions vary
   - Tags: curling, unique, team building, social

9. **Bear Creek Archery** — Category: ACTIVITY_VENUE
   - Location: Englewood, CO
   - Description: "5-star rated indoor archery range open year-round. Rent bows, demo new compound bows, take classes, or just shoot. Certified instructors and bow techs on site. Upgraded lighting with TV screen camera system."
   - Price: Range fee ~$10-20/visit
   - Tags: archery, indoor, unique, sport

10. **Archery Games Denver** — Category: ACTIVITY_VENUE
    - Location: Arvada, CO
    - Description: "Archery Dodgeball — played on an indoor field with recurve bows and foam-tipped arrows. All sessions start with 15 min on the practice range. Denver Post calls it 'sweaty, heart-pumping, and exhilarating.' Great for groups."
    - Price: ~$30-40/person
    - Tags: archery, dodgeball, unique, group activity, active

11. **Bad Axe Throwing — Downtown Denver** — Category: ACTIVITY_VENUE
    - Location: Near The Fillmore and Ogden Theatre, Denver CO
    - Description: "5,000+ sq ft with 16 targets. Licensed for beer and wine. Perfect for groups, birthdays, bachelor/ette parties, or just a Tuesday. Coaches teach you proper technique."
    - Price: ~$35-50/person for 2hrs
    - Tags: axe throwing, unique, social, group activity

12. **All Out Smash** — Category: ACTIVITY_VENUE
    - Location: Denver, CO
    - Description: "Three experiences under one roof: rage rooms, axe throwing, and paint splatter rooms. Full bar (The Smash Shack) with signature cocktails. Ages 10+ for rage room and axes, all ages for splatter."
    - Price: Packages from ~$35-75/person
    - Tags: rage room, axe throwing, splatter paint, unique, date night, group

13. **EscapeWorks Denver** — Category: ACTIVITY_VENUE
    - Location: 16th Street Mall, Denver CO
    - Description: "Highly-rated escape rooms right on 16th Street. Themes include Vampire Hunter, Egyptian Tomb, Blackbeard's Brig, and Speakeasy. Walk-in friendly on weekdays. Great for 2-4 people."
    - Price: ~$30-40/person
    - Tags: escape room, puzzles, group activity, downtown

14. **House of Immersions** — Category: ACTIVITY_VENUE
    - Location: Denver, CO
    - Description: "Escape rooms, splatter paint experiences, and cutting-edge virtual reality adventures. Family-friendly and perfect for team building."
    - Price: Varies by experience
    - Tags: VR, escape room, immersive, family-friendly

15. **iFly Indoor Skydiving** — Category: ACTIVITY_VENUE
    - Location: Lone Tree, CO
    - Description: "Soar on a column of air in a vertical wind tunnel. No experience necessary — instructors guide you through the entire experience. Feel the rush of freefall without jumping out of a plane."
    - Price: ~$70-90 for first-time flyers
    - Tags: skydiving, indoor, unique, adrenaline, experience

#### OUTDOORS
16. **Red Rocks Park & Amphitheatre — Hiking** — Category: OUTDOORS
    - Location: Morrison, CO
    - Description: "Beyond the concerts, Red Rocks has incredible hiking and workout stairs. The Trading Post Trail (1.4 mi) loops through towering red sandstone formations. Free to visit when no event is happening."
    - Price: Free (parking fee for some areas)
    - Tags: hiking, outdoors, iconic, free, workout

17. **Cherry Creek State Park — Archery Range & Trails** — Category: OUTDOORS
    - Location: Aurora, CO
    - Description: "880-acre park with a reservoir, archery range, trails for hiking and biking, and paddleboard/kayak rentals in summer. The archery range is set in a natural outdoor environment."
    - Price: $12 daily vehicle pass
    - Tags: archery, hiking, paddleboard, kayak, outdoors, nature

18. **Barr Lake State Park — Archery & Wildlife** — Category: OUTDOORS
    - Location: Brighton, CO (20 min NE of Denver)
    - Description: "Free archery range (with park pass) featuring 12 lanes from 10-100 yards plus a 3D target course with dinosaur, elk, and deer targets. Also great for birdwatching and hiking."
    - Price: $11 daily vehicle pass
    - Tags: archery, outdoors, wildlife, hiking, free range

19. **Rocky Mountain Paddleboard** — Category: OUTDOORS
    - Location: Various Denver-area lakes and reservoirs
    - Description: "Stand-up paddleboard rentals and guided tours on Colorado lakes. Great for beginners and experienced paddlers. Scenic views and a full-body workout."
    - Price: ~$45-65 for rentals
    - Tags: paddleboard, water sports, outdoors, summer

20. **Colorado Mountain Club** — Category: OUTDOORS
    - Location: Various (headquartered in Golden, CO)
    - Description: "Colorado's premier outdoor club since 1912. Organized hikes, snowshoeing, mountaineering, wildflower walks, and international adventure trips. 60,000+ members. Under-30 membership is just $30/year."
    - Price: $30-75/year membership
    - Tags: hiking, mountaineering, community, outdoors, social

#### CREATIVE & CULTURE
21. **Community Clay Denver** — Category: ART
    - Location: RiNo Art District & Congress Park, Denver CO
    - Description: "Denver's friendliest pottery studio. 6-week beginner wheel classes, one-time try-it nights, private date night lessons, and group events. Adults only for a relaxed experience. $375 for a 6-week course."
    - Price: Classes from ~$50 (try-it night) to $375 (6-week)
    - Tags: pottery, ceramics, creative, date night, RiNo

22. **Meow Wolf Denver — Convergence Station** — Category: ART
    - Location: 1338 1st St, Denver CO
    - Description: "Immersive, mind-bending art experience spanning multiple floors of surreal, psychedelic environments. Plus The Perplexiplex concert venue and the Sips cocktail lounge. Plan 2-3 hours minimum."
    - Price: ~$42-49 general admission
    - Tags: immersive art, experience, unique, must-see

23. **Denver Art Museum** — Category: ART
    - Location: 100 W 14th Ave Pkwy, Denver CO
    - Description: "One of the largest art museums between Chicago and the West Coast with 70,000+ works. The architecture alone is worth the visit. Free for Colorado residents on first Saturdays."
    - Price: $15 general, free first Saturdays for CO residents
    - Tags: art, museum, culture, architecture

#### COMEDY & ENTERTAINMENT
24. **Comedy Works Downtown** — Category: COMEDY
    - Location: 1226 15th St, Denver CO
    - Description: "Denver's legendary comedy club since 1981. National headliners and local favorites. Two locations — Downtown (intimate basement club) and South (larger suburban venue). Some of the biggest names in comedy have performed here."
    - Price: $20-50+ per show
    - Tags: comedy, standup, nightlife, entertainment

25. **RISE Comedy** — Category: COMEDY
    - Location: Denver, CO
    - Description: "Denver's premier improv comedy club. 50+ shows per month including improv, standup, sketch, and the legendary Hit and Run Musical Improv (18th year!). Free community improv jam every week. Full bar with mocktails."
    - Price: $14-17 per show, free improv jam
    - Tags: improv, comedy, social, community, classes

#### SOCIAL & COMMUNITY
26. **Cooldown Running Club** — Category: SOCIAL
    - Location: Various Denver locations (meets every Tuesday 6:30pm)
    - Description: "Denver's most popular social run club. Every Tuesday evening, runners and rollerbladers hit the streets on routes from 1-5 miles. Different routes weekly. Come for the run, stay for the community."
    - Price: Free
    - Tags: running, social, free, community, weekly

27. **Brunch Running** — Category: SOCIAL
    - Location: Various Denver brunch restaurants (Sundays)
    - Description: "The OG Sunday recovery run club. Walkers and runners of all ages and abilities. AM run followed by post-run brunch at a different top Denver restaurant each week."
    - Price: Free (pay for your own brunch)
    - Tags: running, brunch, social, Sunday, community

28. **We're Not Really Runners (WNRR)** — Category: SOCIAL
    - Location: Various Denver locations
    - Description: "National run and social club — 'people over pace.' New routes every week plus non-running social events. Walk, run, or just come to socialize. Denver chapter is thriving."
    - Price: Free
    - Tags: running, social, inclusive, community, walking


### SEED DATA — TIME-BOUND EVENTS (Next 3 Weeks)

Set dates relative to April 2, 2026. Spread them across the calendar.

29. **Perpetual Groove at Meow Wolf** — Category: LIVE_MUSIC
    - Date: April 10, 2026, 8:00 PM
    - Location: Meow Wolf Denver, 1338 1st St
    - Price: From $67
    - Description: "Live music at Denver's most unique venue. Perpetual Groove brings their signature jam-band sound to the Perplexiplex stage."

30. **Perpetual Groove at Meow Wolf (Night 2)** — Category: LIVE_MUSIC
    - Date: April 11, 2026, 8:00 PM
    - Location: Meow Wolf Denver
    - Price: From $60

31. **The Unlikely Candidates at Meow Wolf** — Category: LIVE_MUSIC
    - Date: April 16, 2026, 8:00 PM
    - Location: Meow Wolf Denver
    - Price: From $55

32. **Denver Pork Circuit Series — 2-Mile Race** — Category: FITNESS
    - Date: April 11, 2026 (Saturday morning)
    - Location: City Park, Denver → post-race at Cerebral Brewing
    - Price: ~$25 registration
    - Description: "Kick off the 2026 Denver Pork Circuit with a 2-mile race around Denver's biggest park, followed by a post-race party at Cerebral Brewing."

33. **Friday Night Lights Track Meet** — Category: FITNESS
    - Date: April 17, 2026, 7:00 PM
    - Location: Denver (Denver Athletics venue)
    - Price: ~$15-25
    - Description: "All-comers track & field series for all ages and abilities. Prizes, post-race interviews, music, and food trucks under the Friday night lights."

34. **RiNo Art Walk** — Category: ART
    - Date: April 4, 2026 (First Saturday)
    - Location: RiNo Art District, Denver
    - Price: Free
    - Description: "First Saturday Art Walk through Denver's River North Art District. Galleries open late, street art, live music, and food trucks. One of Denver's best free experiences."

35. **Denver Botanic Gardens — Spring Bloom Walk** — Category: OUTDOORS
    - Date: April 12, 2026
    - Location: Denver Botanic Gardens, 1007 York St
    - Price: $15 general admission
    - Description: "Guided spring bloom walk through the gardens. Peak season for tulips, daffodils, and cherry blossoms. Stunning photo opportunities."

36. **Sploinky Rave at Meow Wolf** — Category: LIVE_MUSIC
    - Date: April 24, 2026, 9:00 PM
    - Location: Meow Wolf Denver
    - Price: TBD
    - Description: "Late-night electronic music event inside the surreal halls of Convergence Station."

37. **Community Clay — Try It Night** — Category: ART
    - Date: April 18, 2026, 6:00 PM
    - Location: Community Clay, RiNo
    - Price: ~$50
    - Description: "One-time pottery experience for beginners. No commitment, just show up and throw some clay. Limited spots — perfect intro to ceramics."

38. **Colorado Mountain Club — Group Hike: South Table Mountain** — Category: OUTDOORS
    - Date: April 5, 2026 (Saturday morning)
    - Location: Golden, CO
    - Price: Free with membership ($30/yr for under-30)
    - Description: "Moderate 4-mile loop hike with 800ft elevation gain. Panoramic views of Denver and the Front Range. Led by experienced CMC guides. Great for meeting other hikers."

39. **USA Curling National Mixed Championship** — Category: ACTIVITY_VENUE
    - Date: April 15-19, 2026
    - Location: Denver Curling Club, Golden CO
    - Price: Free to spectate
    - Description: "Watch Olympic-caliber curling right here in Denver. The national mixed championship brings the country's best curlers to the Denver Curling Club. Free to watch — great way to discover the sport."

40. **Cooldown Run Club — Spring Kickoff** — Category: SOCIAL
    - Date: April 7, 2026, 6:30 PM (Tuesday)
    - Location: TBD Denver location
    - Price: Free
    - Description: "Weekly social run with Denver's biggest run club. 1-5 mile routes, all paces welcome. Runners and rollerbladers alike."

41. **The Summer Set at Meow Wolf** — Category: LIVE_MUSIC
    - Date: April 3, 2026, 8:00 PM
    - Location: Meow Wolf Denver
    - Price: TBD
    - Description: "Pop-rock vibes at one of Denver's most unique venues."

42. **Red Rocks Fitness — Stair Workout** — Category: FITNESS
    - Date: April 8, 2026, 6:00 AM
    - Location: Red Rocks Amphitheatre, Morrison CO
    - Price: Free
    - Description: "Sunrise stair workout at the iconic Red Rocks Amphitheatre. 380 steps, stunning views. Bring water and layers — it's cold at dawn but worth it."

43. **Denver Farmers Market — Opening Weekend** — Category: FOOD
    - Date: April 18, 2026
    - Location: Union Station, Denver
    - Price: Free entry
    - Description: "The outdoor Denver Farmers Market returns for the season. Local produce, artisan foods, live music, and good vibes at Union Station."

44. **Play Mile High — Spring Kickball League Registration** — Category: SOCIAL
    - Date: Registration open, league starts April 20, 2026
    - Location: Washington Park, Denver
    - Price: ~$65/season
    - Description: "Adult kickball league in Wash Park. 8-week season with a tournament finale. Register solo as a free agent or bring a squad. It's like recess, but better."

45. **Traverse Fitness — Breakfast Club Track Workout** — Category: FITNESS
    - Date: April 9, 2026, 5:15 AM
    - Location: D'Evelyn High School Track, Denver
    - Price: Free / included with membership
    - Description: "Weekly Wednesday morning track session led by Ironman triathlete Billy LaGreca. Speed work, drills, and a community that gets after it before the sun's fully up."

### SEED DATA — CYCLING (Jensen loves cycling)

46. **Denver Bicycle Touring Club (DBTC)** — Category: FITNESS
    - Location: Various Denver metro locations
    - Description: "The oldest continuously operating cycling club in Denver. Organized group rides and social events for all levels. Road rides, scenic tours, and a welcoming volunteer-run community."
    - Price: Membership ~$35/year
    - Tags: cycling, road biking, social, community, touring
    - isRecurring: true

47. **Denver Cycling Club (DCC)** — Category: FITNESS
    - Location: Various Denver/Front Range routes (via Meetup)
    - Description: "Friendly group for riders of all levels. Weekly road rides averaging 35-45 miles through routes like Dinosaur Ridge, Red Rocks, and the Front Range. Inclusive, supportive, and no-drop options available."
    - Price: Free
    - Tags: cycling, road biking, group rides, social, all levels
    - isRecurring: true

48. **Our Mutual Friend Cycling Club (OMFCC)** — Category: SOCIAL
    - Location: Our Mutual Friend Brewing, RiNo, Denver CO
    - Description: "Cycling club based out of Our Mutual Friend Brewing in RiNo. Wednesday evening no-drop social rides at 6pm, 15-16 mph pace. Ride first, brewery hangs after. Community-first vibes."
    - Price: Free
    - Tags: cycling, social, brewery, RiNo, community, Wednesday
    - isRecurring: true

49. **Team Evergreen / Evergreen Ride Club** — Category: FITNESS
    - Location: Various (Evergreen/Golden/Front Range)
    - Description: "One of Colorado's largest cycling clubs with 150+ rides per season across road, mountain, and gravel from April to October. $4 million donated to local nonprofits. Wednesday and Sunday group road rides, plus gravel every other Saturday."
    - Price: Membership ~$40/year
    - Tags: cycling, road, gravel, mountain biking, charity, community
    - isRecurring: true

50. **Rocky Mountain Cycling Club** — Category: FITNESS
    - Location: Various Denver/Front Range routes
    - Description: "A community for enthusiastic cyclists offering road, gravel, mountain biking, endurance events, and century races. Year-round club rides and social events. Supportive riders working toward personal cycling goals."
    - Price: Membership varies
    - Tags: cycling, road, gravel, mountain biking, endurance
    - isRecurring: true

51. **Cherry Creek Bike Path — Group Ride** — Category: OUTDOORS
    - Date: April 6, 2026, 7:00 AM (Sunday)
    - Location: Cherry Creek Trail, Denver CO
    - Description: "Informal Sunday morning group ride along the Cherry Creek Bike Path. 20-30 miles round trip on paved trail. All paces welcome — just show up with a helmet and a good attitude."
    - Price: Free
    - Tags: cycling, outdoors, trail, casual, social

52. **Lookout Mountain Hill Climb — Tuesday Ride** — Category: FITNESS
    - Date: Every Tuesday during DST, 5:30 PM
    - Location: Lookout Mountain Parking Lot, Golden CO
    - Description: "The classic Front Range cycling hill climb. 4.3 miles, 1,300ft of elevation gain to the top of Lookout Mountain. Stunning views of Denver. A rite of passage for Colorado cyclists."
    - Price: Free
    - Tags: cycling, hill climb, challenge, iconic, Golden

---

## Priority 3: Create Jensen's Account

### Pre-create the account in the seed script:
```
Email: jensen@pulse.app (or whatever test email format you use)
Password: PulseDenver2026! (hashed with bcryptjs)
Name: Jensen
Onboarding completed: true
Relationship status: Single
```

### Jensen's Preference Profile:
- **FITNESS** → LOVE (weight: 5)
- **OUTDOORS** → LOVE (weight: 5)
- **ACTIVITY_VENUE** → LOVE (weight: 5)
- **SOCIAL** → LOVE (weight: 5)
- **COMEDY** → LIKE (weight: 3)
- **ART** → LIKE (weight: 3)
- **FOOD** → LIKE (weight: 3)
- **LIVE_MUSIC** → LIKE (weight: 3)
- **BARS** → DISLIKE (weight: -2)
- **COFFEE** → NEUTRAL (weight: 1)
- **SEASONAL** → NEUTRAL (weight: 1)
- **POPUP** → NEUTRAL (weight: 1)

### Expected Behavior When Jensen Logs In:
- Feed should show FITNESS, OUTDOORS, ACTIVITY_VENUE, and SOCIAL items ranked highest (85-98% match)
- Bar/nightlife events should appear low or filtered out
- Match scores should feel real and varied — NOT everything at 95%+
  - Denver Bouldering Club: 96%
  - Cooldown Run Club: 94%
  - Archery Games Denver: 91%
  - Meow Wolf: 78%
  - RiNo Art Walk: 72%
  - Sploinky Rave: 45%

---

## Priority 4: Fix Match Scoring

The match scoring likely shows inflated numbers because of the categorization bug (everything is "Food" and users probably selected Food as a preference). With categories fixed, the scoring should improve, but verify:

1. Match score should be based on: user preference weight for the event's category, plus any tag-level matching if that exists
2. Scores should range from ~30% to ~98% — if everything is above 85%, the algorithm needs more variance
3. Consider adding secondary factors: social (group activity vs solo), energy level (high intensity vs chill), novelty (unique vs common)

---

## Priority 5: Feed UI Improvements

### Add filtering/tabs to the feed:
- **For You** (default) — personalized feed sorted by match score
- **This Weekend** — events happening in the next 3-7 days
- **Activities** — permanent venues and recurring activities (no expiration)
- **Trending** — highest engagement / most saved (can be simulated with seed data)

### Event Card Improvements:
- Show the category as a colored pill/badge on each card
- Show match percentage with a visual indicator (not just a number)
- Add a "Save" / bookmark button on each card
- Show price range if available ("Free", "$", "$$", "$$$")
- For activities (non-dated), show "Always Available" instead of a date

### Quick Wins:
- If the landing page still says "MVP setup" or has developer-facing language, replace it with consumer-facing copy
- Make sure the "Pulse" branding is prominent — dark theme, coral (#FF4D4F) and teal (#00D4AA) accents

---

## Priority 6: Premium Page (Nice to Have)

If time allows, create a `/premium` or `/pricing` page that outlines the premium vision:

### Free Tier (Current):
- Browse events and activities
- Personalized recommendations
- Save and bookmark
- Basic search and filters

### Pulse Premium ($9/mo):
- Creator-curated lists from Denver locals
- Shared lists with friends/partner (couple's mode)
- Member-only deals at featured venues (rotating monthly)
- Priority access to sold-out events
- Year-end Wrapped-style recap of your Denver adventures
- Ad-free experience

### For Venues (Partnership):
- "Opening Soon" alerts to Pulse members
- Featured placement for new locations (rotating monthly)
- Member-deal partnerships (e.g., "Pulse members get 15% off first visit")
- Analytics dashboard on engagement

**This page doesn't need to be functional — just a polished static page that communicates the vision.**

---

## Deployment Notes

- After changes, push to GitHub: `git add -A && git commit -m "Jensen demo: seed data, categorization fix, premium page" && git push origin main`
- Vercel should auto-deploy from the repo
- After deploy, run migrations if schema changed: `DATABASE_URL="..." npx prisma migrate dev` (or `deploy` for production)
- Then run the seed script: `DATABASE_URL="..." npx prisma db seed`
- Test Jensen's login: email `jensen@pulse.app`, password `PulseDenver2026!`
- Verify the feed shows personalized, varied results

---

## Environment Variables (Already Set in Vercel):
- `DATABASE_URL` — Neon connection string
- `NEXTAUTH_SECRET` — JWT secret
- `NEXTAUTH_URL` — Vercel deployment URL
- `CRON_SECRET` — for scraper endpoint
- `OPENAI_API_KEY` — for AI enrichment (UPDATE the model in code from gpt-4o-mini to gpt-5.4-nano for classification, gpt-5.4-mini for enrichment)

---

## Success Criteria

When Jensen logs in, he should:
1. See a feed full of real Denver activities and events — not empty, not all "Food"
2. See fitness, outdoor, cycling, and unique activity content ranked highest
3. See varied match scores that make sense (bouldering = 96%, rave = 45%)
4. Be able to filter between "For You", "This Weekend", "Activities"
5. Understand the value immediately — "oh shit, I didn't know Denver had curling" or "there's an archery dodgeball place?"
6. See a premium page (or at least a teaser) that shows where this is headed

---

## Priority 7: Scraping Quality Improvements (Next Session — Not Required Today)

The current scrapers (Eventbrite, Do303, Westword, Denver calendar) pull in volume but quality is inconsistent. The fix is a two-layer architecture:

### LAYER 1: Scrapers (already exists, needs tuning)

Sources already in the pipeline (verify these are working):
- **Eventbrite** — Good volume, mixed quality
- **Do303** (do303.com) — Denver's best curated event source
- **Westword** (westword.com/events) — Well-curated, covers music/food/art/comedy
- **Denver city calendar** — Official city events

Sources to add (high value, not yet scraped):
- **Denver Botanic Gardens events** — seasonal, always high quality
- **Red Rocks concert/event calendar** — iconic venue, high interest
- **Comedy Works schedule** — standup shows, reliable data
- **Meow Wolf Denver events** — immersive art + concerts

Scraper fixes:
- Filter out events with dates in the past BEFORE inserting
- Deduplicate on (title + venue + date) to avoid the same event from multiple sources
- Store the source URL so users can click through to buy tickets

### LAYER 2: AI Quality Filter & Categorizer (the big improvement)

This is what fixes the "shitty events" problem AND the categorization bug in one shot. After Layer 1 scrapes raw data, BEFORE inserting into the database, every event passes through an OpenAI call.

**You already have OpenAI in the stack** — you do NOT need Perplexity, Gemini, or any additional AI service. Update the model from the old gpt-4o-mini to the latest models released March 17, 2026:

- **`gpt-5.4-nano`** — Use for the quality filter and categorization. It's designed specifically for classification, data extraction, and ranking. Costs $0.20/million input tokens (essentially free). Model string: `gpt-5.4-nano-2026-03-17`
- **`gpt-5.4-mini`** — Use for heavier enrichment like generating one-liner descriptions or tag extraction if nano isn't cutting it. Model string: `gpt-5.4-mini-2026-03-17`

Implementation:
```typescript
// lib/enrichment.ts (or wherever the AI pipeline lives)
// UPDATE THE MODEL — the old gpt-4o-mini is likely why categorization is broken

async function enrichEvent(rawEvent: ScrapedEvent): Promise<EnrichedEvent | null> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4-nano",  // UPDATED — was gpt-4o-mini, now using latest nano for classification
    response_format: { type: "json_object" },
    messages: [{
      role: "system",
      content: `You are a quality filter for Pulse, an events discovery platform for 21-40 year olds in Denver, CO. 
      
      For each event, return JSON with:
      - quality_score: 1-10 (how interesting/worth-attending is this for a young professional in Denver? Filter out webinars, MLM events, corporate trainings, generic meetups with no clear activity)
      - category: one of [ART, LIVE_MUSIC, BARS, FOOD, COFFEE, OUTDOORS, FITNESS, SEASONAL, POPUP, ACTIVITY_VENUE, COMEDY, SOCIAL, WELLNESS, OTHER]
      - tags: array of 3-5 descriptive tags (e.g., ["group activity", "outdoor", "free", "beginner-friendly", "date night"])
      - one_liner: a punchy 10-15 word description that makes someone want to go
      
      Be strict on quality. Score 1-3 for junk (webinars, MLM, corporate). Score 4-6 for decent but generic. Score 7-10 for genuinely interesting, unique, or high-quality experiences.`
    }, {
      role: "user", 
      content: `Title: ${rawEvent.title}\nVenue: ${rawEvent.venue}\nDescription: ${rawEvent.description}\nDate: ${rawEvent.date}\nPrice: ${rawEvent.price}`
    }]
  });
  
  const result = JSON.parse(response.choices[0].message.content);
  
  // Filter out low-quality events
  if (result.quality_score < 4) return null;
  
  return {
    ...rawEvent,
    category: result.category,
    tags: result.tags,
    qualityScore: result.quality_score,
    oneLiner: result.one_liner,
  };
}
```

This single function:
1. Fixes the categorization bug (AI assigns category instead of broken classify.ts)
2. Filters out junk events (score < 4 gets dropped)
3. Generates tags for better matching
4. Creates a punchy one-liner for the feed card UI

Cost estimate: gpt-5.4-nano is $0.20/million input tokens — scraping 200 events/day costs literally less than a penny. Even if you upgrade to gpt-5.4-mini for better one-liners, it's still under $0.10/day.

### LAYER 3 (Future): AI Discovery Agent + Community Submissions

Not needed today. Two future additions:
1. **Weekly AI discovery job**: Use an LLM with web search to find "interesting things to do in Denver this week that aren't on Eventbrite." Catches the hidden gems that scrapers miss.
2. **Community submissions**: `/submit` page where users and venues can add events. Moderation queue before they go live. This is the flywheel that makes Pulse a platform.

### Permanent Activities vs. Events:
Activities (climbing gyms, archery ranges, cycling clubs) should NOT come from daily scraping — they're curated once and maintained. Add a `type` field on the Event model (`EVENT` vs `ACTIVITY`) or use `isRecurring: true` so they can be filtered and displayed differently. Activities always show in the feed; events expire.

