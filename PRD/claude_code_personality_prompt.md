# Make It Feel Alive: Weekend Picks, Community Profiles & Shared Lists

The feed is functionally better but it still feels like a database. We need personality, social proof, and a reason for Jensen to care RIGHT NOW. Three additions below — implement all three, deploy after each.

---

## 1. "This Weekend" Hero Section — TOP of the feed, above "Suggested for You"

Add a new section at the very top of the feed page, above everything else. This is an opinionated, editorially-curated weekend plan. It should feel like a friend texting you "here's what we're doing this weekend."

### Design:
- Full-width card or banner at the top of the feed
- Title: "Your Weekend, Sorted" with a subtitle: "3 picks for April 4-6 based on what you're into"
- Three picks displayed horizontally, each with a number (1, 2, 3), an image, and the editorial copy below
- Slightly different visual treatment from the rest of the feed — maybe a subtle background color or border that makes it feel curated/special, not algorithmic

### Content (hardcode this for the demo — these are NOT database queries):

**Pick 1:**
- Title: "Red Rocks Stairs at Sunrise"
- Editorial copy: "Free. Brutal. Totally worth it. 380 steps with views of the entire Front Range waking up. Get there by 6am before it gets crowded. Bring water and a layer — it's cold at dawn but you'll be sweating by step 50."
- Details: Wed, Apr 8 · 6:00 AM · Red Rocks Amphitheatre · Free
- Category badge: Outdoors
- Tag: 🔥 Staff Pick

**Pick 2:**
- Title: "Archery Dodgeball"
- Editorial copy: "Yes, this is real. You grab a recurve bow, load foam-tipped arrows, and play dodgeball in an indoor arena. It's as chaotic and fun as it sounds. Go with 4+ friends and prepare to talk about it for weeks."
- Details: Always Available · Archery Games Denver, Arvada · $30-40/person
- Category badge: Experience
- Tag: 🎯 You Haven't Tried This

**Pick 3:**
- Title: "The Summer Set at Meow Wolf"
- Editorial copy: "Live pop-rock inside a psychedelic, multi-floor art experience. Even if you're not a huge fan of the band, Meow Wolf's Perplexiplex stage is worth it just for the venue. Grab a mocktail at Sips and wander the exhibits before the show."
- Details: Fri, Apr 3 · 8:00 PM · Meow Wolf Denver · TBD
- Category badge: Live Music
- Tag: 🎪 Unique Venue

### Logic:
- For now, this is HARDCODED content — not dynamically generated. We can make it dynamic later.
- If the user has already saved or dismissed one of these picks, ideally swap it out (but not required for demo)
- This section should ONLY appear on the "For You" tab

---

## 2. Community Profiles — Make the sidebar feel alive

The "People You Might Like" sidebar currently shows placeholder accounts with question mark avatars and zero followers. Create these seed community profiles so it looks like real people use this platform.

### Seed Profiles to Create:

**Profile 1:**
- Display Name: "Denver Adventure Collective"
- Handle: @denveradventure
- Bio: "Group hikes, trail runs, and outdoor adventures around the Front Range. Weekend warriors welcome."
- Avatar: Use a mountain/outdoors themed placeholder image or emoji-based avatar (🏔️)
- Followers: 847
- Following: 203
- Saved Items: Red Rocks Fitness Stair Workout, Colorado Mountain Club Group Hike, Lookout Mountain Hill Climb, Cherry Creek Bike Path Group Ride, Denver Pork Circuit 2-Mile Race

**Profile 2:**
- Display Name: "Try Something Weird Denver"
- Handle: @weirddenver
- Bio: "Curling. Axe throwing. Archery dodgeball. If it's unusual and in Denver, we've tried it."
- Avatar: 🎯
- Followers: 1,243
- Following: 156
- Saved Items: Archery Games Denver, Denver Curling Club, Bad Axe Throwing, All Out Smash, EscapeWorks Denver, Rock Creek Curling

**Profile 3:**
- Display Name: "Mile High Movers"
- Handle: @milehighmovers
- Bio: "Denver's social fitness crew. Run clubs, cycling groups, sports leagues, and post-workout hangs."
- Avatar: 🏃
- Followers: 2,108
- Following: 312
- Saved Items: Cooldown Run Club, Traverse Fitness Breakfast Club, Play Mile High Spring Kickball, Denver Bouldering Club, Movement RiNo, Mile Hi Pickleball

**Profile 4:**
- Display Name: "RiNo Culture Guide"
- Handle: @rinoculture
- Bio: "Art walks, gallery openings, live music, and creative happenings in Denver's River North Art District."
- Avatar: 🎨
- Followers: 956
- Following: 178
- Saved Items: RiNo Art Walk, Community Clay Denver, Meow Wolf Denver, RISE Comedy

**Profile 5:**
- Display Name: "Active Denver"
- Handle: @activedenver
- Bio: "For people who'd rather do something than scroll about doing something. Fitness, outdoors, and active social events."
- Avatar: 💪
- Followers: 3,412
- Following: 445
- Saved Items: Red Rocks Fitness, Denver Bouldering Club, Lookout Mountain Hill Climb, Cooldown Run Club, Cherry Creek Bike Path Group Ride, Mile Hi Pickleball

### Implementation:
- Create these as User records with a `isCreator: true` or `isCommunityProfile: true` flag
- Pre-populate their "saved" items by creating the appropriate save/bookmark records
- The "People You Might Like" sidebar should show these profiles WITH follower counts and real avatars/emojis
- Auto-follow Jensen to "Active Denver" and "Try Something Weird Denver" since those match his preferences — when he logs in, he should already be following 2 profiles and see their saves in his feed
- The sidebar should show profiles Jensen ISN'T following yet as suggestions

---

## 3. Shared Lists — Give Jensen something to browse

Create pre-made lists from the community profiles above. These should appear when Jensen clicks on "Lists" in the nav, and at least one should be visible in the feed or sidebar.

### Lists to Create:

**List 1:** (by @weirddenver)
- Title: "Stuff You Didn't Know You Could Do in Denver"
- Description: "Forget the same old bars and restaurants. Here's the weird, wonderful, and genuinely surprising stuff happening in this city."
- Items (in order):
  1. Denver Curling Club — "Yes, curling. Like the Olympics. They teach you everything and provide all the gear."
  2. Archery Games Denver — "Dodgeball. With bows and arrows. Need I say more?"
  3. All Out Smash — "Rage room + axe throwing + paint splatter room, all under one roof. Bring friends."
  4. Rock Creek Curling — "Colorado's home for curling. Intro courses, leagues, and corporate events."
  5. iFly Indoor Skydiving — "Feel the rush of freefall without the whole jumping-out-of-a-plane thing."
  6. EscapeWorks Denver — "Right on 16th Street. Walk-in friendly on weekdays. The Speakeasy room is the move."
- Saves: 234
- Public: true

**List 2:** (by @milehighmovers)
- Title: "Free Fitness in Denver"
- Description: "You don't need a gym membership to stay active in this city. Here's the best free stuff."
- Items (in order):
  1. Red Rocks Fitness Stair Workout — "380 steps at sunrise. Free. Show up early."
  2. Cooldown Run Club — "Every Tuesday at 6:30pm. 1-5 miles, all paces. Denver's biggest social run."
  3. Cherry Creek Bike Path Group Ride — "Sunday mornings. 20-30 miles on paved trail. Just bring a helmet."
  4. Lookout Mountain Hill Climb — "The rite of passage for Colorado cyclists. 4.3 miles, 1,300ft up."
  5. Colorado Mountain Club Group Hike — "Under-30 membership is $30/year. Organized hikes every weekend."
  6. Brunch Running — "Run first, brunch after. Different restaurant every Sunday."
- Saves: 412
- Public: true

**List 3:** (by @activedenver)
- Title: "Jensen's Weekend Starter Pack"
- Description: "New to Pulse? Start here. The best active, social, no-alcohol-required things to do this month."
- Items (in order):
  1. Denver Bouldering Club — "24/7 access, 35,000 sq ft of climbing. The community alone is worth it."
  2. Archery Games Denver — "The most fun you'll have losing a dodgeball game."
  3. Mile Hi Pickleball — "11 indoor courts, leagues, and a lounge for post-game hangs."
  4. Denver Pork Circuit 2-Mile Race — "2 miles + post-race party at Cerebral Brewing. Apr 11."
  5. Play Mile High Spring Kickball — "Adult kickball league in Wash Park. Register solo or bring a squad."
  6. Meow Wolf Denver — "2-3 hours of mind-bending immersive art. Even if you're not an 'art person.'"
- Saves: 189
- Public: true

### Implementation:
- Create List records owned by the community profiles
- Each list item should reference the actual Event/Item records in the database
- The editorial comments (the quoted text after each item) should be stored as a `note` or `comment` field on the list item — this is what gives the list personality
- Jensen should see "Jensen's Weekend Starter Pack" prominently — either pinned to the top of his Lists page or shown in a "Lists For You" section on the feed
- Show a "Featured Lists" section somewhere visible — either in the sidebar below "Trending This Week" or as a horizontal scroll section in the feed between "Hidden Gems" and the main event grid

---

## 4. Auto-follow Jensen into a "Denver Crew"

Create a Community group that Jensen is auto-added to:

- Group Name: "Denver Active Crew"
- Description: "Fitness, outdoors, and adventures around the Mile High City. Share what you're doing this weekend."
- Members: Jensen + Active Denver + Mile High Movers + Denver Adventure Collective + Try Something Weird Denver (5 members)
- A few seed "posts" or activity items in the group:
  - @milehighmovers saved "Red Rocks Fitness — Stair Workout" — "Who's in for Wednesday sunrise?"
  - @weirddenver saved "Denver Curling Club" — "Just did the learn-to-curl session. Absolutely addicted now."
  - @denveradventure saved "Colorado Mountain Club Group Hike" — "South Table Mountain this Saturday. Perfect spring hike."
  - @activedenver saved "Archery Games Denver" — "Took 8 people last weekend. Lost my voice from yelling. 10/10."

This makes the Community tab feel alive when Jensen clicks into it.

---

## Deploy order:
1. Weekend Picks hero section (biggest visual impact, fast to implement since it's hardcoded)
2. Community profiles with follower counts and avatars (fixes the sad sidebar)
3. Shared lists with editorial comments (gives Jensen something to browse and share)
4. Auto-follow + Denver Active Crew group (makes Community tab not empty)

Deploy after each. Let me review after #1 and #2.
