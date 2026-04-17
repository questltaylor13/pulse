import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Guide definitions
// ---------------------------------------------------------------------------

interface GuideDef {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  durationLabel: string;
  durationMinutes: number;
  costRangeLabel: string;
  occasionTags: string[];
  vibeTags: string[];
  coverImageUrl: string;
  neighborhoodHub?: string;
  stops: StopDef[];
  creatorHandle?: string; // defaults to "pulse-editors"
}

interface StopDef {
  order: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  note: string;
  insiderTip?: string;
  placeQuery: {
    neighborhood?: string;
    category?: Category;
    name?: string; // partial match fallback
    tags?: string[];
  };
}

const GUIDES: GuideDef[] = [
  {
    slug: "pulse-perfect-rino-saturday",
    title: "The Perfect RiNo Saturday",
    tagline: "Art, eats, and good company from morning to midnight.",
    description:
      "RiNo is Denver's creative heartbeat, and Saturdays are when it truly comes alive. This full-day guide walks you through a lazy brunch, an afternoon of gallery hopping and street art, golden-hour drinks on a rooftop, and a dinner that'll make you cancel your Sunday plans. Bring someone you like — or someone you want to impress.",
    durationLabel: "Full day",
    durationMinutes: 480,
    costRangeLabel: "$$",
    occasionTags: ["date-night", "with-friends"],
    vibeTags: ["lively", "walkable", "creative"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=1200&q=70",
    neighborhoodHub: "RiNo",
    stops: [
      {
        order: 1,
        timeWindowStart: "9:00 AM",
        timeWindowEnd: "10:30 AM",
        note: "Start with brunch — something hearty to fuel the day. The vibe is loud, the coffee is strong, and the wait is worth it.",
        insiderTip: "Get there by 9 to beat the weekend rush. The back patio is a hidden gem.",
        placeQuery: { neighborhood: "RiNo", category: "RESTAURANT" },
      },
      {
        order: 2,
        timeWindowStart: "11:00 AM",
        timeWindowEnd: "1:00 PM",
        note: "Wander the galleries and street art along Larimer. Every block has something new. Don't rush this — the whole point is to get lost.",
        placeQuery: { neighborhood: "RiNo", category: "ART" },
      },
      {
        order: 3,
        timeWindowStart: "1:30 PM",
        timeWindowEnd: "2:30 PM",
        note: "Grab an afternoon pick-me-up. The local roasters here take their craft seriously, and the space is perfect for people-watching.",
        placeQuery: { neighborhood: "RiNo", category: "COFFEE" },
      },
      {
        order: 4,
        timeWindowStart: "5:00 PM",
        timeWindowEnd: "7:00 PM",
        note: "Golden hour drinks on a rooftop. Watch the sun set behind the mountains while the city lights start to flicker on.",
        insiderTip: "Ask for the seasonal cocktail — it's never on the menu but always worth it.",
        placeQuery: { neighborhood: "RiNo", category: "BARS" },
      },
      {
        order: 5,
        timeWindowStart: "7:30 PM",
        timeWindowEnd: "9:30 PM",
        note: "Dinner at one of RiNo's best. This is the kind of place where the chef actually cares and it shows in every bite.",
        placeQuery: { neighborhood: "RiNo", category: "FOOD" },
      },
    ],
  },
  {
    slug: "pulse-active-date-day",
    title: "Active Date Day",
    tagline: "Skip the small talk — go do something.",
    description:
      "Dinner and drinks are fine, but nothing builds chemistry like scrambling up rocks together or racing down a trail. This half-day date swaps candlelight for sunlight and cocktails for endorphins. You'll still end with food — you've earned it.",
    durationLabel: "Half day",
    durationMinutes: 240,
    costRangeLabel: "$-$$",
    occasionTags: ["date-night", "outdoors"],
    vibeTags: ["energetic", "adventurous", "casual"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=70",
    stops: [
      {
        order: 1,
        timeWindowStart: "9:00 AM",
        timeWindowEnd: "11:00 AM",
        note: "Kick things off with something active. Whether it's climbing, hiking, or a fitness class, the point is to move together and have fun.",
        placeQuery: { category: "FITNESS" },
      },
      {
        order: 2,
        timeWindowStart: "11:30 AM",
        timeWindowEnd: "12:30 PM",
        note: "Cool down with good coffee and easy conversation. You just climbed a wall together — the small talk phase is officially over.",
        placeQuery: { category: "COFFEE" },
      },
      {
        order: 3,
        timeWindowStart: "12:30 PM",
        timeWindowEnd: "1:30 PM",
        note: "Refuel with a casual lunch. Keep it laid-back — tacos, bowls, something you can eat without a reservation.",
        placeQuery: { category: "RESTAURANT" },
      },
    ],
  },
  {
    slug: "pulse-denver-on-a-budget",
    title: "Denver on a Budget",
    tagline: "Great city, light wallet, no compromises.",
    description:
      "Denver doesn't have to be expensive to be incredible. This full-day guide sticks to free and cheap spots that locals actually love — not tourist traps. Public art, park hangs, $5 tacos, and free live music. Your bank account will thank you; your Instagram won't know the difference.",
    durationLabel: "Full day",
    durationMinutes: 480,
    costRangeLabel: "$",
    occasionTags: ["with-friends", "solo"],
    vibeTags: ["casual", "walkable", "chill"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1619856699906-09e1f4ef06c1?auto=format&fit=crop&w=1200&q=70",
    stops: [
      {
        order: 1,
        timeWindowStart: "9:00 AM",
        timeWindowEnd: "10:00 AM",
        note: "Start cheap and caffeinated. A solid drip coffee and a pastry from a local spot that doesn't charge $8 for a latte.",
        placeQuery: { category: "COFFEE" },
      },
      {
        order: 2,
        timeWindowStart: "10:30 AM",
        timeWindowEnd: "12:00 PM",
        note: "Free art and culture. Denver has world-class public art and free museum days — take advantage.",
        placeQuery: { category: "ART" },
      },
      {
        order: 3,
        timeWindowStart: "12:30 PM",
        timeWindowEnd: "1:30 PM",
        note: "Cheap eats that don't taste cheap. Street tacos, a pho spot, a food truck — some of Denver's best food costs under $10.",
        placeQuery: { category: "FOOD" },
      },
      {
        order: 4,
        timeWindowStart: "2:00 PM",
        timeWindowEnd: "4:00 PM",
        note: "Hit the parks. Denver averages 300 days of sunshine — there's no excuse not to be outside.",
        placeQuery: { category: "OUTDOORS" },
      },
    ],
  },
  {
    slug: "pulse-visiting-denver-48-hours",
    title: "Visiting Denver in 48 Hours",
    tagline: "The locals-approved crash course.",
    description:
      "You've got two days and zero time for tourist traps. This guide covers the spots that actual Denver people go to — the restaurants we argue about, the coffee shops we're protective of, and the views that still stop us in our tracks. Follow this and you'll leave knowing Denver, not just having visited it.",
    durationLabel: "Full day",
    durationMinutes: 480,
    costRangeLabel: "$$",
    occasionTags: ["visiting-denver"],
    vibeTags: ["walkable", "lively", "iconic"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1546156929-a4c0ac411f47?auto=format&fit=crop&w=1200&q=70",
    stops: [
      {
        order: 1,
        timeWindowStart: "8:30 AM",
        timeWindowEnd: "9:30 AM",
        note: "Coffee first. This is the spot locals are weirdly loyal to. Order the house blend and sit outside if the weather cooperates (it probably will).",
        placeQuery: { neighborhood: "Capitol Hill", category: "COFFEE" },
      },
      {
        order: 2,
        timeWindowStart: "10:00 AM",
        timeWindowEnd: "12:00 PM",
        note: "Get the lay of the land. Walk through the neighborhood, check out the street art, pop into a bookshop. Denver rewards wandering.",
        placeQuery: { neighborhood: "LoDo", category: "ART" },
      },
      {
        order: 3,
        timeWindowStart: "12:30 PM",
        timeWindowEnd: "2:00 PM",
        note: "Lunch at a Denver institution. This is the kind of place where you'll overhear locals debating whether it's better than it was five years ago (it is).",
        placeQuery: { category: "RESTAURANT" },
      },
      {
        order: 4,
        timeWindowStart: "3:00 PM",
        timeWindowEnd: "5:00 PM",
        note: "Get outside. You can see the mountains from here, and the light in the afternoon is unreal.",
        placeQuery: { category: "OUTDOORS" },
      },
      {
        order: 5,
        timeWindowStart: "6:00 PM",
        timeWindowEnd: "8:00 PM",
        note: "Dinner somewhere that shows off what Denver's food scene is really about. Local ingredients, creative menus, zero pretension.",
        insiderTip: "Sit at the bar if you're solo — the bartenders here are half the experience.",
        placeQuery: { neighborhood: "Highlands", category: "RESTAURANT" },
      },
    ],
  },
  {
    slug: "pulse-wine-bar-hop-highlands",
    title: "Wine Bar Hop in Highlands",
    tagline: "Three pours, one perfect evening.",
    description:
      "Highlands is walkable, the wine bars are within stumbling distance of each other, and the vibes range from cozy candlelit to buzzy rooftop. This evening guide takes you through three distinct wine spots, each with its own personality. Bring a date or a friend who appreciates a good pour.",
    durationLabel: "Evening",
    durationMinutes: 180,
    costRangeLabel: "$$$",
    occasionTags: ["date-night"],
    vibeTags: ["cozy", "walkable", "intimate"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=70",
    neighborhoodHub: "Highlands",
    stops: [
      {
        order: 1,
        timeWindowStart: "6:00 PM",
        timeWindowEnd: "7:15 PM",
        note: "Start somewhere cozy. Low lighting, good by-the-glass list, the kind of place where you settle in and forget what time it is.",
        insiderTip: "Ask about the reserve list — they keep a few bottles off-menu for regulars.",
        placeQuery: { neighborhood: "Highlands", category: "BARS" },
      },
      {
        order: 2,
        timeWindowStart: "7:30 PM",
        timeWindowEnd: "8:30 PM",
        note: "Walk a few blocks to something livelier. This spot has more energy, a great snack menu, and wines you've never heard of (in a good way).",
        placeQuery: { neighborhood: "Highlands", category: "BARS" },
      },
      {
        order: 3,
        timeWindowStart: "8:45 PM",
        timeWindowEnd: "10:00 PM",
        note: "End the night with a view. Rooftop or patio, a final glass, and the kind of conversation that only happens after the third pour.",
        placeQuery: { neighborhood: "Highlands", category: "RESTAURANT" },
      },
    ],
  },
  {
    slug: "pulse-golden-hour-date",
    title: "Golden Hour Date",
    tagline: "Chase the light, keep the magic.",
    description:
      "Denver's golden hour hits different — the mountains turn pink, the city glows, and everything feels like a movie. This evening guide is built around that magic window: a scenic walk, sunset drinks with a view, and dinner somewhere worth dressing up for. Timing is everything.",
    durationLabel: "Evening",
    durationMinutes: 180,
    costRangeLabel: "$$",
    occasionTags: ["date-night"],
    vibeTags: ["romantic", "scenic", "walkable"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1570477236840-6fbe3fd0e440?auto=format&fit=crop&w=1200&q=70",
    stops: [
      {
        order: 1,
        timeWindowStart: "5:30 PM",
        timeWindowEnd: "6:30 PM",
        note: "Start with a walk somewhere scenic. The light is getting good, and you want to be moving when the sky starts doing its thing.",
        placeQuery: { category: "OUTDOORS" },
      },
      {
        order: 2,
        timeWindowStart: "6:30 PM",
        timeWindowEnd: "7:30 PM",
        note: "Sunset drinks at a spot with a view. Time this right and the sky does all the work for you.",
        insiderTip: "West-facing patios are the move. Arrive 30 minutes before sunset for the best seats.",
        placeQuery: { category: "BARS" },
      },
      {
        order: 3,
        timeWindowStart: "8:00 PM",
        timeWindowEnd: "9:30 PM",
        note: "Dinner somewhere that matches the evening's energy. Warm lighting, great food, the kind of place where you linger over the last course.",
        placeQuery: { category: "RESTAURANT" },
      },
    ],
  },
  {
    slug: "pulse-solo-sunday-morning",
    title: "Solo Sunday Morning",
    tagline: "Your time, your pace, your city.",
    description:
      "Not every Sunday needs brunch plans and group texts. This quick solo guide is for the mornings when you want good coffee, a little movement, and your own company. It's short, it's simple, and it's surprisingly restorative. Main-character energy, no audience required.",
    durationLabel: "Quick (2-3 hrs)",
    durationMinutes: 150,
    costRangeLabel: "$",
    occasionTags: ["solo"],
    vibeTags: ["chill", "peaceful", "cozy"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=70",
    stops: [
      {
        order: 1,
        timeWindowStart: "8:00 AM",
        timeWindowEnd: "9:00 AM",
        note: "Coffee and a window seat. Bring a book or just sit there — nobody's judging. The baristas here are friendly but not chatty, which is exactly what you want.",
        placeQuery: { category: "COFFEE" },
      },
      {
        order: 2,
        timeWindowStart: "9:15 AM",
        timeWindowEnd: "10:00 AM",
        note: "A short walk somewhere green. Nothing strenuous — just fresh air, some trees, and room to think.",
        placeQuery: { category: "OUTDOORS" },
      },
      {
        order: 3,
        timeWindowStart: "10:00 AM",
        timeWindowEnd: "10:30 AM",
        note: "One more stop for a pastry or a second coffee. You earned it by going outside. Treat yourself.",
        placeQuery: { category: "COFFEE" },
      },
    ],
  },
  {
    slug: "pulse-rainy-afternoon-indoors",
    title: "Rainy Afternoon Indoors",
    tagline: "Denver gets 300 days of sun. This isn't one of them.",
    description:
      "When the rare rainy day hits Denver, most people panic. Not you. This half-day guide turns a gray afternoon into a cozy adventure: a long coffee session, a museum or gallery visit, and comfort food that pairs perfectly with the sound of rain on the windows.",
    durationLabel: "Half day",
    durationMinutes: 240,
    costRangeLabel: "$-$$",
    occasionTags: ["rainy-day", "solo"],
    vibeTags: ["cozy", "chill", "indoor"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1200&q=70",
    stops: [
      {
        order: 1,
        timeWindowStart: "12:00 PM",
        timeWindowEnd: "1:30 PM",
        note: "Camp out at a coffee shop with good wi-fi and better ambiance. Rain on the windows, latte in hand, nowhere to be.",
        insiderTip: "The corner seats by the window are the rainy-day sweet spot.",
        placeQuery: { category: "COFFEE" },
      },
      {
        order: 2,
        timeWindowStart: "2:00 PM",
        timeWindowEnd: "3:30 PM",
        note: "Gallery or museum time. Denver's art scene is seriously underrated, and rainy days are when you actually have the space to yourself.",
        placeQuery: { category: "ART" },
      },
      {
        order: 3,
        timeWindowStart: "4:00 PM",
        timeWindowEnd: "5:00 PM",
        note: "Comfort food to cap the day. Something warm, something rich, something that makes the rain feel like a feature, not a bug.",
        placeQuery: { category: "FOOD" },
      },
    ],
  },
  {
    slug: "pulse-morning-with-the-dog",
    title: "Morning with the Dog",
    tagline: "Your best friend deserves a good morning too.",
    description:
      "Denver is absurdly dog-friendly, and your pup knows it. This quick morning guide hits the best dog-welcome spots: a park run, a patio coffee, and a treat stop. Short, sweet, and tail-wagging approved.",
    durationLabel: "Quick (2-3 hrs)",
    durationMinutes: 150,
    costRangeLabel: "$",
    occasionTags: ["with-the-dog", "outdoors"],
    vibeTags: ["casual", "energetic", "outdoor"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?auto=format&fit=crop&w=1200&q=70",
    stops: [
      {
        order: 1,
        timeWindowStart: "7:30 AM",
        timeWindowEnd: "8:30 AM",
        note: "Let the dog run. Find a park with off-leash hours and let them go full speed while you stand there pretending to be awake.",
        placeQuery: { category: "OUTDOORS" },
      },
      {
        order: 2,
        timeWindowStart: "8:45 AM",
        timeWindowEnd: "9:30 AM",
        note: "Patio coffee with your co-pilot. The good dog-friendly spots have water bowls out before you even ask.",
        insiderTip: "Most Denver patios are dog-friendly by default, but call ahead if you've got a big breed.",
        placeQuery: { category: "COFFEE" },
      },
      {
        order: 3,
        timeWindowStart: "9:30 AM",
        timeWindowEnd: "10:00 AM",
        note: "One more quick stop — a bakery, a pet store, whatever catches your eye on the walk back. The dog doesn't care; they're just happy to be outside.",
        placeQuery: { category: "FOOD" },
      },
    ],
  },
  {
    slug: "pulse-first-friday-art-crawl",
    title: "First Friday Art Crawl",
    tagline: "Free art, full bars, good energy.",
    description:
      "First Friday in Denver is the real deal — galleries throw open their doors, the streets fill up, and there's an energy that's hard to replicate. This evening guide maps out the best route through RiNo and Santa Fe's gallery district so you hit the highlights without backtracking.",
    durationLabel: "Evening",
    durationMinutes: 180,
    costRangeLabel: "$",
    occasionTags: ["with-friends"],
    vibeTags: ["lively", "creative", "walkable"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1561839561-b13bcfe95249?auto=format&fit=crop&w=1200&q=70",
    neighborhoodHub: "RiNo",
    stops: [
      {
        order: 1,
        timeWindowStart: "5:30 PM",
        timeWindowEnd: "6:30 PM",
        note: "Start early at a gallery before the crowds hit. The work here rotates monthly and always surprises.",
        placeQuery: { neighborhood: "RiNo", category: "ART" },
      },
      {
        order: 2,
        timeWindowStart: "6:30 PM",
        timeWindowEnd: "7:30 PM",
        note: "Grab a drink at a nearby bar — you'll need fuel for the rest of the crawl. The energy should be picking up by now.",
        placeQuery: { neighborhood: "RiNo", category: "BARS" },
      },
      {
        order: 3,
        timeWindowStart: "7:30 PM",
        timeWindowEnd: "9:00 PM",
        note: "Hit the main stretch. This is when First Friday peaks — live music, pop-ups, and art everywhere you look.",
        placeQuery: { category: "ART" },
      },
    ],
  },
  {
    slug: "pulse-brunch-bookshop-sunday",
    title: "Brunch + Bookshop Sunday",
    tagline: "Feed your stomach, then your brain.",
    description:
      "The perfect low-key Sunday: a long, lazy brunch followed by browsing at Denver's best independent bookshops. This guide pairs great food with great reads, and it works whether you're solo, on a date, or just avoiding your to-do list.",
    durationLabel: "Quick (2-3 hrs)",
    durationMinutes: 150,
    costRangeLabel: "$-$$",
    occasionTags: ["solo", "date-night"],
    vibeTags: ["cozy", "chill", "walkable"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=70",
    stops: [
      {
        order: 1,
        timeWindowStart: "10:00 AM",
        timeWindowEnd: "11:30 AM",
        note: "Brunch somewhere that takes it seriously. We're talking real hollandaise, fresh-squeezed juice, and zero rush to turn your table.",
        insiderTip: "Ask for the off-menu specials — the kitchen usually has something they're testing.",
        placeQuery: { category: "RESTAURANT" },
      },
      {
        order: 2,
        timeWindowStart: "11:45 AM",
        timeWindowEnd: "12:30 PM",
        note: "Walk it off with a browse through an independent bookshop. Denver's indie book scene is quietly one of the best in the country.",
        placeQuery: { category: "ACTIVITY_VENUE" },
      },
      {
        order: 3,
        timeWindowStart: "12:30 PM",
        timeWindowEnd: "1:00 PM",
        note: "One last coffee to pair with your new book. Find a sunny spot and settle in. Sunday accomplished.",
        placeQuery: { category: "COFFEE" },
      },
    ],
  },
  {
    slug: "pulse-mountain-town-day-trip",
    title: "Mountain Town Day Trip",
    tagline: "Altitude adjustment recommended.",
    description:
      "Sometimes you need to get out of Denver to remember why you live near the mountains. This full-day guide takes you up to a nearby mountain town for hiking, main-street wandering, and a meal with a view. Leave early, come back tired and happy.",
    durationLabel: "Full day",
    durationMinutes: 480,
    costRangeLabel: "$$",
    occasionTags: ["outdoors", "with-friends"],
    vibeTags: ["adventurous", "scenic", "casual"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=70",
    stops: [
      {
        order: 1,
        timeWindowStart: "7:00 AM",
        timeWindowEnd: "8:00 AM",
        note: "Coffee for the road. You're leaving early, and the drive is gorgeous, but you still need caffeine to appreciate it.",
        placeQuery: { category: "COFFEE" },
      },
      {
        order: 2,
        timeWindowStart: "9:30 AM",
        timeWindowEnd: "12:00 PM",
        note: "Hit the trail. The hike doesn't have to be hard — even an easy mountain trail feels dramatic when you're surrounded by pines and peaks.",
        placeQuery: { category: "OUTDOORS" },
      },
      {
        order: 3,
        timeWindowStart: "12:30 PM",
        timeWindowEnd: "2:00 PM",
        note: "Lunch in town. Mountain town restaurants have a different energy — slower, friendlier, and the portions are bigger.",
        placeQuery: { category: "RESTAURANT" },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findPlace(query: StopDef["placeQuery"]): Promise<string | null> {
  const where: Record<string, unknown> = {};
  if (query.neighborhood) where.neighborhood = query.neighborhood;
  if (query.category) where.category = query.category;

  const place = await prisma.place.findFirst({ where, select: { id: true } });
  return place?.id ?? null;
}

async function findCreator(handle: string) {
  return prisma.influencer.findUnique({ where: { handle }, select: { id: true } });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Resolve creators
  let pulseEditors = await findCreator("pulse-editors");
  if (!pulseEditors) {
    // Fallback: use the first existing influencer
    pulseEditors = await prisma.influencer.findFirst({ select: { id: true } });
    if (!pulseEditors) {
      console.error("No influencers found in the database. Run seed-pulse-editors.ts first.");
      process.exit(1);
    }
    console.warn("pulse-editors not found; using fallback influencer:", pulseEditors.id);
  }

  const haleigh = await findCreator("haleighwatts");
  const secondCreator = haleigh ?? pulseEditors;

  let guidesCreated = 0;
  let guidesSkipped = 0;
  const creatorGuideCounts: Record<string, number> = {};

  for (const def of GUIDES) {
    // Resolve stops to real places
    const resolvedStops: Array<{
      order: number;
      timeWindowStart?: string;
      timeWindowEnd?: string;
      note: string;
      insiderTip?: string;
      placeId: string;
    }> = [];

    for (const stopDef of def.stops) {
      const placeId = await findPlace(stopDef.placeQuery);
      if (!placeId) {
        console.warn(
          `  [${def.slug}] No place found for stop ${stopDef.order} (${JSON.stringify(stopDef.placeQuery)}). Skipping stop.`
        );
        continue;
      }
      resolvedStops.push({
        order: stopDef.order,
        timeWindowStart: stopDef.timeWindowStart,
        timeWindowEnd: stopDef.timeWindowEnd,
        note: stopDef.note,
        insiderTip: stopDef.insiderTip,
        placeId,
      });
    }

    if (resolvedStops.length < 2) {
      console.warn(`  [${def.slug}] Only ${resolvedStops.length} stops resolved — need ≥2. Skipping guide.`);
      guidesSkipped++;
      continue;
    }

    // Assign creator: give a few guides to the second creator for variety
    const useSecondCreator =
      def.creatorHandle === "haleighwatts" ||
      ["pulse-wine-bar-hop-highlands", "pulse-golden-hour-date", "pulse-brunch-bookshop-sunday"].includes(def.slug);
    const creatorId = useSecondCreator ? secondCreator.id : pulseEditors.id;

    // Upsert guide
    const guide = await prisma.guide.upsert({
      where: { slug: def.slug },
      update: {
        title: def.title,
        tagline: def.tagline,
        description: def.description,
        durationLabel: def.durationLabel,
        durationMinutes: def.durationMinutes,
        costRangeLabel: def.costRangeLabel,
        occasionTags: def.occasionTags,
        vibeTags: def.vibeTags,
        coverImageUrl: def.coverImageUrl,
        neighborhoodHub: def.neighborhoodHub ?? null,
        creatorId,
        isPublished: true,
      },
      create: {
        slug: def.slug,
        title: def.title,
        tagline: def.tagline,
        description: def.description,
        durationLabel: def.durationLabel,
        durationMinutes: def.durationMinutes,
        costRangeLabel: def.costRangeLabel,
        occasionTags: def.occasionTags,
        vibeTags: def.vibeTags,
        coverImageUrl: def.coverImageUrl,
        neighborhoodHub: def.neighborhoodHub ?? null,
        creatorId,
        isPublished: true,
      },
    });

    // Delete existing stops and re-create (idempotent)
    await prisma.guideStop.deleteMany({ where: { guideId: guide.id } });
    for (const stop of resolvedStops) {
      await prisma.guideStop.create({
        data: {
          guideId: guide.id,
          order: stop.order,
          timeWindowStart: stop.timeWindowStart,
          timeWindowEnd: stop.timeWindowEnd,
          note: stop.note,
          insiderTip: stop.insiderTip,
          placeId: stop.placeId,
        },
      });
    }

    creatorGuideCounts[creatorId] = (creatorGuideCounts[creatorId] ?? 0) + 1;
    guidesCreated++;
    console.log(`  ✓ ${def.title} — ${resolvedStops.length} stops`);
  }

  // Update guide counts on influencers
  for (const [creatorId, count] of Object.entries(creatorGuideCounts)) {
    const totalPublished = await prisma.guide.count({
      where: { creatorId, isPublished: true },
    });
    await prisma.influencer.update({
      where: { id: creatorId },
      data: { guideCount: totalPublished },
    });
    console.log(`  Updated guideCount for ${creatorId}: ${totalPublished}`);
  }

  console.log(`\nDone: ${guidesCreated} guides created, ${guidesSkipped} skipped.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
