/**
 * Comprehensive Seed Script for Pulse App
 *
 * This script seeds the database with:
 * - 60-120 upcoming Denver events across all categories
 * - 12 fake users in 4 distinct taste clusters
 * - Preferences, Want/Done lists, and EventViews for each user
 *
 * Usage:
 *   npm run db:seed
 *
 * Test Accounts (all use password: "password123"):
 *   Music/Nightlife cluster:
 *     - music1@pulse.local, music2@pulse.local, music3@pulse.local
 *   Wellness/Outdoors cluster:
 *     - wellness1@pulse.local, wellness2@pulse.local, wellness3@pulse.local
 *   Art/Food cluster:
 *     - artfood1@pulse.local, artfood2@pulse.local, artfood3@pulse.local
 *   Comedy/Community cluster:
 *     - community1@pulse.local, community2@pulse.local, community3@pulse.local
 *
 * The script is idempotent - running multiple times will not create duplicates.
 */

import { PrismaClient, Category, RelationshipStatus, DenverTenure, PreferenceType, EventListStatus, InteractionStatus, ItemType, ItemStatus, PickSetRange, FeedbackType, GoingWith, DayOfWeek, TimeOfDay, BudgetPreference, PlanType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Seeded random number generator for deterministic results
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  pickN<T>(array: T[], n: number): T[] {
    return this.shuffle(array).slice(0, n);
  }
}

const rng = new SeededRandom(42);

// Helper to create dates relative to now
function daysFromNow(days: number, hour: number = 19): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function hoursAgo(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

// Denver neighborhoods list
const DENVER_NEIGHBORHOODS = [
  "LoDo", "RiNo", "LoHi", "Highlands", "Capitol Hill", "Cherry Creek",
  "Wash Park", "Baker", "Five Points", "Uptown", "City Park", "Sloan's Lake",
  "Berkeley", "Tennyson", "SoBo", "Golden Triangle", "Ballpark", "Curtis Park",
  "Cole", "Union Station"
];

// Venue to neighborhood mapping
const VENUE_NEIGHBORHOODS: Record<string, string> = {
  "Red Rocks Amphitheatre": "Morrison",
  "Dazzle Jazz": "LoDo",
  "Globe Hall": "RiNo",
  "Cervantes Masterpiece Ballroom": "Five Points",
  "Mission Ballroom": "RiNo",
  "Ophelia's Electric Soapbox": "LoDo",
  "Your Mom's House": "RiNo",
  "Meow Wolf Denver": "RiNo",
  "Denver Art Museum": "Golden Triangle",
  "Museum of Contemporary Art Denver": "LoDo",
  "Denver Botanic Gardens": "Cheesman Park",
  "Williams & Graham": "LoHi",
  "54thirty Rooftop": "LoDo",
  "Ratio Beerworks": "RiNo",
  "Pints Pub": "Golden Triangle",
  "Nocturne": "RiNo",
  "Atomic Cowboy": "Baker",
  "Little Man Ice Cream": "LoHi",
  "Black Book": "RiNo",
  "Death & Co Denver": "RiNo",
  "City Park": "City Park",
  "Washington Park": "Wash Park",
  "Cheesman Park": "Capitol Hill",
  "Sloan's Lake Park": "Sloan's Lake",
  "Cherry Creek Shopping Center": "Cherry Creek",
  "Larimer Square": "LoDo",
  "Union Station": "Union Station",
  "RiNo Art District": "RiNo",
  "South Pearl Street": "Wash Park",
  "Coors Field": "Ballpark",
  "Denver Coliseum": "Cole",
  "Curtis Park": "Curtis Park",
  "Baker Historic Neighborhood": "Baker",
  "Tennyson Street": "Tennyson",
  "Berkeley Park": "Berkeley",
  "Highland Square": "Highlands",
  "Denver Central Market": "RiNo",
  "Source Hotel": "RiNo",
  "The Ramble Hotel": "RiNo",
  "The Rally Hotel": "RiNo",
  "Avanti F&B": "LoHi",
  "Stanley Marketplace": "Aurora",
  "Odell Brewing Co": "RiNo",
  "Epic Brewing Company": "RiNo",
  "Improper City": "RiNo",
  "Work & Class": "RiNo",
  "Denver Beer Co": "LoHi",
};

// Generate fake ratings based on venue name seed
function generateRatings(venueName: string): {
  googleRating: number | null;
  googleRatingCount: number | null;
  appleRating: number | null;
  appleRatingCount: number | null;
} {
  // Use venue name to seed random - ensures consistent ratings per venue
  const seed = venueName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const localRng = new SeededRandom(seed);

  // 80% chance of having Google rating
  const hasGoogle = localRng.next() < 0.8;
  // 50% chance of having Apple rating
  const hasApple = localRng.next() < 0.5;

  return {
    googleRating: hasGoogle ? Math.round((3.5 + localRng.next() * 1.5) * 10) / 10 : null,
    googleRatingCount: hasGoogle ? localRng.nextInt(50, 1500) : null,
    appleRating: hasApple ? Math.round((3.5 + localRng.next() * 1.5) * 10) / 10 : null,
    appleRatingCount: hasApple ? localRng.nextInt(20, 500) : null,
  };
}

// Get neighborhood for a venue
function getNeighborhood(venueName: string, address: string): string | null {
  // Check direct venue mapping
  if (VENUE_NEIGHBORHOODS[venueName]) {
    return VENUE_NEIGHBORHOODS[venueName];
  }

  // Try to extract neighborhood from address
  for (const neighborhood of DENVER_NEIGHBORHOODS) {
    if (address.toLowerCase().includes(neighborhood.toLowerCase())) {
      return neighborhood;
    }
  }

  // Assign based on street patterns
  if (address.includes("Larimer") || address.includes("Curtis") || address.includes("16th")) {
    return "LoDo";
  }
  if (address.includes("Broadway") && address.includes("S ")) {
    return "SoBo";
  }
  if (address.includes("Colfax")) {
    return "Capitol Hill";
  }
  if (address.includes("Welton") || address.includes("25th")) {
    return "Five Points";
  }
  if (address.includes("Tennyson")) {
    return "Tennyson";
  }
  if (address.includes("32nd") || address.includes("Tejon")) {
    return "LoHi";
  }
  if (address.includes("Pearl")) {
    return "Wash Park";
  }

  // Random fallback for Denver addresses
  if (address.includes("Denver")) {
    const seed = address.length;
    const localRng = new SeededRandom(seed);
    return localRng.pick(DENVER_NEIGHBORHOODS);
  }

  return null;
}

// ============================================================================
// TAG ENRICHMENT FOR DETAILED PREFERENCES
// ============================================================================

// Maps to enrich events with companion/vibe/social tags
const TAG_ENRICHMENT: Record<string, string[]> = {
  // Companion tags
  "family-friendly": ["family-friendly", "all-ages"],
  "all-ages": ["family-friendly"],
  "kid-friendly": ["family-friendly"],
  "children": ["family-friendly"],
  "romantic": ["date-friendly"],
  "intimate": ["date-friendly", "solo-friendly"],
  "upscale": ["date-friendly"],
  "date": ["date-friendly"],
  "brunch": ["date-friendly", "friends-group"],
  "group": ["friends-group"],
  "party": ["friends-group", "high-energy"],
  "social": ["friends-group", "meetup"],
  "trivia": ["friends-group"],
  "workshop": ["solo-friendly", "moderate"],
  "class": ["solo-friendly", "meetup"],
  "museum": ["solo-friendly", "date-friendly"],
  "gallery": ["solo-friendly", "date-friendly"],
  "coffee": ["solo-friendly", "chill"],
  "yoga": ["solo-friendly", "chill", "self-care"],
  "meditation": ["solo-friendly", "chill", "self-care"],
  "spa": ["solo-friendly", "chill", "self-care"],
  // Vibe tags
  "chill": ["chill", "relaxed"],
  "relaxed": ["chill"],
  "acoustic": ["chill", "moderate"],
  "jazz": ["chill", "moderate", "date-friendly"],
  "classical": ["chill", "date-friendly"],
  "dancing": ["high-energy", "friends-group"],
  "edm": ["high-energy", "party"],
  "electronic": ["high-energy"],
  "festival": ["high-energy", "friends-group"],
  "concert": ["high-energy", "friends-group"],
  "sports": ["high-energy", "friends-group"],
  "fitness": ["high-energy", "solo-friendly"],
  "hiking": ["moderate", "solo-friendly", "friends-group"],
  "outdoor": ["moderate", "family-friendly"],
  "live-music": ["moderate", "friends-group"],
  "comedy": ["moderate", "date-friendly", "friends-group"],
  "fun": ["moderate", "friends-group"],
  // Social tags
  "meetup": ["meetup", "social"],
  "networking": ["meetup", "social"],
  "singles": ["meetup", "social"],
  "community": ["meetup", "social"],
  "happy-hour": ["social", "friends-group"],
  "bar-crawl": ["social", "friends-group", "high-energy"],
  "tour": ["social", "meetup"],
  "walking-tour": ["social", "meetup"],
  "exhibition": ["solo-friendly", "self-paced"],
  "reading": ["solo-friendly", "chill"],
};

// Category-based default tags (only categories defined in schema)
const CATEGORY_DEFAULT_TAGS: Record<Category, string[]> = {
  [Category.ART]: ["solo-friendly", "moderate", "date-friendly"],
  [Category.LIVE_MUSIC]: ["friends-group", "moderate"],
  [Category.BARS]: ["friends-group", "social", "moderate"],
  [Category.FOOD]: ["date-friendly", "friends-group", "moderate"],
  [Category.COFFEE]: ["solo-friendly", "chill", "date-friendly"],
  [Category.OUTDOORS]: ["moderate", "friends-group", "family-friendly"],
  [Category.FITNESS]: ["solo-friendly", "high-energy"],
  [Category.SEASONAL]: ["family-friendly", "friends-group", "moderate"],
  [Category.POPUP]: ["friends-group", "social", "moderate"],
  [Category.OTHER]: ["moderate"],
  [Category.RESTAURANT]: ["date-friendly", "friends-group", "moderate"],
  [Category.ACTIVITY_VENUE]: ["friends-group", "family-friendly", "high-energy"],
};

/**
 * Enriches event tags with companion/vibe/social tags for detailed preferences scoring
 */
function enrichEventTags(tags: string[], category: Category): string[] {
  const enrichedTags = new Set(tags.map(t => t.toLowerCase()));

  // Add category defaults
  const categoryDefaults = CATEGORY_DEFAULT_TAGS[category] || [];
  categoryDefaults.forEach(tag => enrichedTags.add(tag));

  // Add enrichment based on existing tags
  for (const tag of tags) {
    const lowerTag = tag.toLowerCase();
    const enrichment = TAG_ENRICHMENT[lowerTag];
    if (enrichment) {
      enrichment.forEach(t => enrichedTags.add(t));
    }
  }

  return Array.from(enrichedTags);
}

// ============================================================================
// EVENT DATA - 80+ Denver events across all categories
// ============================================================================

const DENVER_EVENTS = [
  // LIVE MUSIC (15 events)
  {
    title: "Nathaniel Rateliff & The Night Sweats",
    description: "Denver's own Nathaniel Rateliff brings his soulful rock sound to Red Rocks for an unforgettable night under the stars.",
    category: Category.LIVE_MUSIC,
    tags: ["rock", "soul", "red-rocks", "outdoor", "headliner"],
    venueName: "Red Rocks Amphitheatre",
    address: "18300 W Alameda Pkwy, Morrison, CO 80465",
    startTime: daysFromNow(3, 19),
    endTime: daysFromNow(3, 23),
    priceRange: "$65-$125",
    source: "Do303",
    sourceUrl: "https://do303.com",
    externalId: "seed-rateliff",
  },
  {
    title: "Jazz at the Dazzle",
    description: "Weekly jazz night featuring Denver's finest musicians. This week: The Ron Miles Quartet performs post-bop and avant-garde jazz.",
    category: Category.LIVE_MUSIC,
    tags: ["jazz", "live-music", "intimate", "weekly"],
    venueName: "Dazzle Jazz",
    address: "1512 Curtis St, Denver, CO 80202",
    startTime: daysFromNow(1, 20),
    endTime: daysFromNow(1, 23),
    priceRange: "$20-$35",
    source: "Do303",
    externalId: "seed-dazzle-jazz",
  },
  {
    title: "Indie Night at Globe Hall",
    description: "Local indie bands showcase featuring Slow Caves, Plasma Canvas, and Snake Rattle Rattle Snake. All ages welcome.",
    category: Category.LIVE_MUSIC,
    tags: ["indie", "local", "all-ages", "underground"],
    venueName: "Globe Hall",
    address: "4483 Logan St, Denver, CO 80216",
    startTime: daysFromNow(5, 20),
    endTime: daysFromNow(5, 24),
    priceRange: "$15",
    source: "Do303",
    externalId: "seed-globe-indie",
  },
  {
    title: "Bluegrass Brunch at Cervantes",
    description: "Start your Sunday with bluegrass and breakfast burritos. Local bluegrass bands perform while you enjoy brunch.",
    category: Category.LIVE_MUSIC,
    tags: ["bluegrass", "brunch", "sunday", "local"],
    venueName: "Cervantes Masterpiece Ballroom",
    address: "2637 Welton St, Denver, CO 80205",
    startTime: daysFromNow(7, 10),
    endTime: daysFromNow(7, 14),
    priceRange: "$15-$25",
    source: "Do303",
    externalId: "seed-bluegrass-brunch",
  },
  {
    title: "Electronic Music Night at Mission Ballroom",
    description: "Denver's premier EDM showcase featuring Illenium and special guests. State-of-the-art sound system.",
    category: Category.LIVE_MUSIC,
    tags: ["edm", "electronic", "dancing", "late-night"],
    venueName: "Mission Ballroom",
    address: "4242 Wynkoop St, Denver, CO 80216",
    startTime: daysFromNow(10, 21),
    endTime: daysFromNow(11, 2),
    priceRange: "$45-$85",
    source: "Do303",
    externalId: "seed-edm-mission",
  },
  {
    title: "Open Mic Night at Mercury Cafe",
    description: "Bring your guitar, poetry, or comedy set. All performers welcome. Sign up starts at 7pm.",
    category: Category.LIVE_MUSIC,
    tags: ["open-mic", "acoustic", "free", "community"],
    venueName: "Mercury Cafe",
    address: "2199 California St, Denver, CO 80205",
    startTime: daysFromNow(2, 19),
    endTime: daysFromNow(2, 23),
    priceRange: "Free",
    source: "Do303",
    externalId: "seed-openmic-mercury",
  },
  {
    title: "Hip-Hop Showcase at Ophelia's",
    description: "Local hip-hop artists take the stage. Featuring Trev Rich, Joel Neville, and more Denver talent.",
    category: Category.LIVE_MUSIC,
    tags: ["hip-hop", "rap", "local", "21+"],
    venueName: "Ophelia's Electric Soapbox",
    address: "1215 20th St, Denver, CO 80202",
    startTime: daysFromNow(8, 21),
    endTime: daysFromNow(9, 1),
    priceRange: "$20",
    source: "Do303",
    externalId: "seed-hiphop-ophelias",
  },
  {
    title: "Classical Piano Recital",
    description: "Internationally acclaimed pianist performs Chopin and Debussy at the historic Paramount Theatre.",
    category: Category.LIVE_MUSIC,
    tags: ["classical", "piano", "formal", "theater"],
    venueName: "Paramount Theatre",
    address: "1621 Glenarm Pl, Denver, CO 80202",
    startTime: daysFromNow(14, 19),
    endTime: daysFromNow(14, 21),
    priceRange: "$35-$75",
    source: "Denver Post",
    externalId: "seed-classical-paramount",
  },
  {
    title: "Country Night at Grizzly Rose",
    description: "Line dancing, live country music, and the best mechanical bull in Denver. Two-step lessons at 7pm.",
    category: Category.LIVE_MUSIC,
    tags: ["country", "dancing", "line-dancing", "bull-riding"],
    venueName: "Grizzly Rose",
    address: "5450 N Valley Hwy, Denver, CO 80216",
    startTime: daysFromNow(4, 19),
    endTime: daysFromNow(5, 1),
    priceRange: "$10",
    source: "Do303",
    externalId: "seed-country-grizzly",
  },
  {
    title: "Latin Night at La Rumba",
    description: "Salsa, bachata, and merengue all night. Free salsa lessons at 9pm. Live band at 10pm.",
    category: Category.LIVE_MUSIC,
    tags: ["latin", "salsa", "dancing", "lessons"],
    venueName: "La Rumba",
    address: "99 W 9th Ave, Denver, CO 80204",
    startTime: daysFromNow(6, 21),
    endTime: daysFromNow(7, 2),
    priceRange: "$15",
    source: "Do303",
    externalId: "seed-latin-larumba",
  },
  {
    title: "Punk Rock Bowling Alley Show",
    description: "Underground punk bands perform at Denver's last bowling alley concert venue. All ages, all chaos.",
    category: Category.LIVE_MUSIC,
    tags: ["punk", "underground", "all-ages", "diy"],
    venueName: "Hi-Dive",
    address: "7 S Broadway, Denver, CO 80203",
    startTime: daysFromNow(9, 21),
    endTime: daysFromNow(10, 1),
    priceRange: "$12",
    source: "Do303",
    externalId: "seed-punk-hidive",
  },
  {
    title: "Reggae Sunday Funday",
    description: "Chill vibes and roots reggae to close out your weekend. Food trucks and craft beer on the patio.",
    category: Category.LIVE_MUSIC,
    tags: ["reggae", "outdoor", "chill", "food-trucks"],
    venueName: "Levitt Pavilion",
    address: "1380 W Florida Ave, Denver, CO 80223",
    startTime: daysFromNow(14, 16),
    endTime: daysFromNow(14, 20),
    priceRange: "Free",
    source: "Visit Denver",
    externalId: "seed-reggae-levitt",
  },
  {
    title: "Singer-Songwriter Night",
    description: "Intimate acoustic performances from Colorado's best singer-songwriters. Coffee and wine available.",
    category: Category.LIVE_MUSIC,
    tags: ["acoustic", "singer-songwriter", "intimate", "seated"],
    venueName: "Swallow Hill Music",
    address: "71 E Yale Ave, Denver, CO 80210",
    startTime: daysFromNow(11, 19),
    endTime: daysFromNow(11, 22),
    priceRange: "$18",
    source: "Denver Post",
    externalId: "seed-songwriter-swallowhill",
  },
  {
    title: "Metal Monday at 3 Kings",
    description: "Heavy metal showcase featuring local bands. Headbanging encouraged. $3 PBRs all night.",
    category: Category.LIVE_MUSIC,
    tags: ["metal", "heavy", "local", "cheap-drinks"],
    venueName: "3 Kings Tavern",
    address: "60 S Broadway, Denver, CO 80203",
    startTime: daysFromNow(15, 21),
    endTime: daysFromNow(16, 1),
    priceRange: "$8",
    source: "Do303",
    externalId: "seed-metal-3kings",
  },
  {
    title: "World Music Festival",
    description: "Celebrate global sounds with performances from African, Middle Eastern, and Asian musicians.",
    category: Category.LIVE_MUSIC,
    tags: ["world-music", "multicultural", "festival", "family-friendly"],
    venueName: "City Park",
    address: "2001 Colorado Blvd, Denver, CO 80205",
    startTime: daysFromNow(21, 12),
    endTime: daysFromNow(21, 20),
    priceRange: "Free",
    source: "Visit Denver",
    externalId: "seed-worldmusic-citypark",
  },

  // ART (12 events)
  {
    title: "First Friday Art Walk - RiNo",
    description: "Explore dozens of galleries, studios, and pop-up exhibitions in Denver's arts district. Live music and food trucks.",
    category: Category.ART,
    tags: ["gallery", "free", "walking", "first-friday", "rino"],
    venueName: "RiNo Art District",
    address: "Brighton Blvd & Walnut St, Denver, CO 80216",
    startTime: daysFromNow(7, 17),
    endTime: daysFromNow(7, 21),
    priceRange: "Free",
    source: "Visit Denver",
    externalId: "seed-first-friday",
  },
  {
    title: "Immersive Van Gogh Experience",
    description: "Step inside the paintings of Vincent van Gogh in this stunning digital art experience.",
    category: Category.ART,
    tags: ["immersive", "digital-art", "family-friendly", "exhibition"],
    venueName: "Lighthouse Denver",
    address: "3900 Elati St, Denver, CO 80216",
    startTime: daysFromNow(2, 10),
    endTime: daysFromNow(2, 20),
    priceRange: "$30-$50",
    source: "Visit Denver",
    externalId: "seed-vangogh",
  },
  {
    title: "Denver Art Museum: New Acquisitions",
    description: "Special exhibition showcasing the museum's latest acquisitions including works by contemporary Indigenous artists.",
    category: Category.ART,
    tags: ["museum", "contemporary", "indigenous", "exhibition"],
    venueName: "Denver Art Museum",
    address: "100 W 14th Ave Pkwy, Denver, CO 80204",
    startTime: daysFromNow(0, 10),
    endTime: daysFromNow(0, 17),
    priceRange: "$15",
    source: "Denver Post",
    externalId: "seed-dam-acquisitions",
  },
  {
    title: "Street Art Tour of Denver",
    description: "Guided walking tour of Denver's best murals and street art. Learn about the artists and their stories.",
    category: Category.ART,
    tags: ["street-art", "murals", "walking-tour", "outdoor"],
    venueName: "Meeting at Union Station",
    address: "1701 Wynkoop St, Denver, CO 80202",
    startTime: daysFromNow(5, 14),
    endTime: daysFromNow(5, 17),
    priceRange: "$25",
    source: "Visit Denver",
    externalId: "seed-streetart-tour",
  },
  {
    title: "Life Drawing Session",
    description: "Untutored figure drawing session with live models. All skill levels welcome. Bring your own supplies.",
    category: Category.ART,
    tags: ["drawing", "figure-drawing", "workshop", "byos"],
    venueName: "Art Students League of Denver",
    address: "200 Grant St, Denver, CO 80203",
    startTime: daysFromNow(3, 18),
    endTime: daysFromNow(3, 21),
    priceRange: "$15",
    source: "Denver Post",
    externalId: "seed-lifedrawing",
  },
  {
    title: "Ceramics Workshop",
    description: "Learn the basics of wheel throwing in this hands-on ceramics workshop. All materials included.",
    category: Category.ART,
    tags: ["ceramics", "pottery", "workshop", "hands-on"],
    venueName: "Pottery Lab",
    address: "3851 Steele St, Denver, CO 80205",
    startTime: daysFromNow(9, 10),
    endTime: daysFromNow(9, 13),
    priceRange: "$65",
    source: "Do303",
    externalId: "seed-ceramics-workshop",
  },
  {
    title: "Photography Walk in LoDo",
    description: "Guided photography walk through historic Lower Downtown. Tips for architecture and street photography.",
    category: Category.ART,
    tags: ["photography", "walking", "lodo", "architecture"],
    venueName: "Tattered Cover LoDo",
    address: "1628 16th St, Denver, CO 80202",
    startTime: daysFromNow(8, 9),
    endTime: daysFromNow(8, 12),
    priceRange: "$35",
    source: "Denver Post",
    externalId: "seed-photo-walk",
  },
  {
    title: "MCA Denver: New Media Exhibition",
    description: "Cutting-edge digital and new media art from emerging artists exploring technology and identity.",
    category: Category.ART,
    tags: ["new-media", "digital", "contemporary", "museum"],
    venueName: "Museum of Contemporary Art Denver",
    address: "1485 Delgany St, Denver, CO 80202",
    startTime: daysFromNow(1, 10),
    endTime: daysFromNow(1, 18),
    priceRange: "$12",
    source: "Visit Denver",
    externalId: "seed-mca-newmedia",
  },
  {
    title: "Printmaking Workshop",
    description: "Learn relief printmaking techniques. Create your own prints to take home. No experience needed.",
    category: Category.ART,
    tags: ["printmaking", "workshop", "hands-on", "beginner"],
    venueName: "Dateline Gallery",
    address: "3004 Larimer St, Denver, CO 80205",
    startTime: daysFromNow(12, 14),
    endTime: daysFromNow(12, 17),
    priceRange: "$55",
    source: "Do303",
    externalId: "seed-printmaking",
  },
  {
    title: "Gallery Night: Emerging Artists",
    description: "Opening reception for exhibition featuring Denver's most promising emerging artists. Wine and light bites.",
    category: Category.ART,
    tags: ["gallery", "opening", "emerging", "networking"],
    venueName: "Robischon Gallery",
    address: "1740 Wazee St, Denver, CO 80202",
    startTime: daysFromNow(10, 18),
    endTime: daysFromNow(10, 21),
    priceRange: "Free",
    source: "Denver Post",
    externalId: "seed-emerging-artists",
  },
  {
    title: "Sculpture Garden After Hours",
    description: "Evening access to the outdoor sculpture garden with special lighting and live acoustic music.",
    category: Category.ART,
    tags: ["sculpture", "garden", "outdoor", "evening"],
    venueName: "Denver Botanic Gardens",
    address: "1007 York St, Denver, CO 80206",
    startTime: daysFromNow(13, 18),
    endTime: daysFromNow(13, 21),
    priceRange: "$18",
    source: "Visit Denver",
    externalId: "seed-sculpture-garden",
  },
  {
    title: "Watercolor Workshop for Beginners",
    description: "Learn watercolor fundamentals in this relaxed, beginner-friendly workshop. All supplies provided.",
    category: Category.ART,
    tags: ["watercolor", "workshop", "beginner", "painting"],
    venueName: "Meininger Art Materials",
    address: "499 Broadway, Denver, CO 80203",
    startTime: daysFromNow(16, 10),
    endTime: daysFromNow(16, 13),
    priceRange: "$45",
    source: "Do303",
    externalId: "seed-watercolor",
  },

  // FOOD (12 events)
  {
    title: "Denver Ramen Festival",
    description: "Sample ramen from over 15 of Denver's best ramen shops. Vote for your favorite and enjoy sake tastings.",
    category: Category.FOOD,
    tags: ["festival", "ramen", "japanese", "tastings"],
    venueName: "Empower Field Parking Lot",
    address: "1701 Bryant St, Denver, CO 80204",
    startTime: daysFromNow(10, 11),
    endTime: daysFromNow(10, 18),
    priceRange: "$25-$45",
    source: "Do303",
    externalId: "seed-ramen-fest",
  },
  {
    title: "Sunday Farmers Market at Union Station",
    description: "Fresh produce, artisan goods, and prepared foods from local farms and vendors. Live music.",
    category: Category.FOOD,
    tags: ["farmers-market", "local", "family-friendly", "outdoor"],
    venueName: "Union Station",
    address: "1701 Wynkoop St, Denver, CO 80202",
    startTime: daysFromNow(6, 9),
    endTime: daysFromNow(6, 14),
    priceRange: "Free",
    source: "Visit Denver",
    externalId: "seed-union-farmers",
  },
  {
    title: "Tacos & Tequila Crawl - LoHi",
    description: "Guided taco crawl through LoHi's best taquerias with tequila pairings at each stop.",
    category: Category.FOOD,
    tags: ["tacos", "tequila", "crawl", "lohi", "guided"],
    venueName: "Lola Coastal Mexican",
    address: "1575 Boulder St, Denver, CO 80211",
    startTime: daysFromNow(4, 18),
    endTime: daysFromNow(4, 22),
    priceRange: "$75",
    source: "Do303",
    externalId: "seed-taco-crawl",
  },
  {
    title: "Sushi Making Class",
    description: "Learn to make sushi rolls with a professional chef. Includes sake pairing and all ingredients.",
    category: Category.FOOD,
    tags: ["sushi", "cooking-class", "japanese", "hands-on"],
    venueName: "Sushi Den",
    address: "1487 S Pearl St, Denver, CO 80210",
    startTime: daysFromNow(8, 18),
    endTime: daysFromNow(8, 21),
    priceRange: "$85",
    source: "Denver Post",
    externalId: "seed-sushi-class",
  },
  {
    title: "BBQ & Blues Festival",
    description: "Denver's best BBQ joints compete while live blues bands perform. All-you-can-sample tickets available.",
    category: Category.FOOD,
    tags: ["bbq", "festival", "blues", "competition"],
    venueName: "Civic Center Park",
    address: "101 W 14th Ave, Denver, CO 80202",
    startTime: daysFromNow(14, 11),
    endTime: daysFromNow(14, 19),
    priceRange: "$35-$60",
    source: "Visit Denver",
    externalId: "seed-bbq-blues",
  },
  {
    title: "Wine Tasting: Colorado Vineyards",
    description: "Discover Colorado's wine country without leaving Denver. Sample 12 wines from 6 local vineyards.",
    category: Category.FOOD,
    tags: ["wine", "tasting", "colorado", "local"],
    venueName: "Bigsby's Folly",
    address: "3563 Wazee St, Denver, CO 80216",
    startTime: daysFromNow(5, 17),
    endTime: daysFromNow(5, 20),
    priceRange: "$45",
    source: "Do303",
    externalId: "seed-wine-tasting",
  },
  {
    title: "Pasta Making Workshop",
    description: "Hand-roll fresh pasta with an Italian chef. Take home your creations and recipes.",
    category: Category.FOOD,
    tags: ["pasta", "cooking-class", "italian", "hands-on"],
    venueName: "Tavernetta",
    address: "1889 16th St, Denver, CO 80202",
    startTime: daysFromNow(11, 10),
    endTime: daysFromNow(11, 13),
    priceRange: "$75",
    source: "Denver Post",
    externalId: "seed-pasta-workshop",
  },
  {
    title: "Cheese & Charcuterie Pairing",
    description: "Learn to build the perfect cheese board with expert pairings. Wine included.",
    category: Category.FOOD,
    tags: ["cheese", "charcuterie", "wine", "class"],
    venueName: "Culture Meat & Cheese",
    address: "2669 Larimer St, Denver, CO 80205",
    startTime: daysFromNow(9, 18),
    endTime: daysFromNow(9, 20),
    priceRange: "$55",
    source: "Do303",
    externalId: "seed-cheese-class",
  },
  {
    title: "South Pearl Street Food Walk",
    description: "Guided food tour of South Pearl Street's best restaurants. Sample dishes from 6 spots.",
    category: Category.FOOD,
    tags: ["food-tour", "walking", "south-pearl", "guided"],
    venueName: "South Pearl Street",
    address: "1400 S Pearl St, Denver, CO 80210",
    startTime: daysFromNow(7, 14),
    endTime: daysFromNow(7, 17),
    priceRange: "$65",
    source: "Visit Denver",
    externalId: "seed-pearl-foodwalk",
  },
  {
    title: "Dim Sum Brunch",
    description: "Authentic Hong Kong-style dim sum brunch. Cart service with over 40 items.",
    category: Category.FOOD,
    tags: ["dim-sum", "brunch", "chinese", "family-friendly"],
    venueName: "Star Kitchen",
    address: "2917 W Mississippi Ave, Denver, CO 80219",
    startTime: daysFromNow(13, 10),
    endTime: daysFromNow(13, 14),
    priceRange: "$20-$35",
    source: "Denver Post",
    externalId: "seed-dimsum",
  },
  {
    title: "Cocktail & Small Plates Pairing",
    description: "Four-course small plates paired with craft cocktails. Learn about flavor combinations.",
    category: Category.FOOD,
    tags: ["cocktails", "small-plates", "pairing", "upscale"],
    venueName: "Death & Co Denver",
    address: "1280 25th St, Denver, CO 80205",
    startTime: daysFromNow(15, 19),
    endTime: daysFromNow(15, 22),
    priceRange: "$95",
    source: "Do303",
    externalId: "seed-cocktail-pairing",
  },
  {
    title: "Vegan Food Festival",
    description: "Plant-based food from Denver's best vegan restaurants. Cooking demos and sustainability talks.",
    category: Category.FOOD,
    tags: ["vegan", "plant-based", "festival", "sustainable"],
    venueName: "City Park",
    address: "2001 Colorado Blvd, Denver, CO 80205",
    startTime: daysFromNow(20, 11),
    endTime: daysFromNow(20, 18),
    priceRange: "Free entry",
    source: "Visit Denver",
    externalId: "seed-vegan-fest",
  },

  // BARS (10 events)
  {
    title: "Speakeasy Cocktail Class",
    description: "Learn prohibition-era cocktails at Williams & Graham. Make three classic drinks.",
    category: Category.BARS,
    tags: ["cocktails", "class", "speakeasy", "prohibition"],
    venueName: "Williams & Graham",
    address: "3160 Tejon St, Denver, CO 80211",
    startTime: daysFromNow(8, 19),
    endTime: daysFromNow(8, 21),
    priceRange: "$65",
    source: "Do303",
    externalId: "seed-speakeasy-class",
  },
  {
    title: "Rooftop Happy Hour at 54thirty",
    description: "Denver's highest rooftop bar offers happy hour with stunning views of the Rocky Mountains.",
    category: Category.BARS,
    tags: ["rooftop", "happy-hour", "views", "cocktails"],
    venueName: "54thirty Rooftop",
    address: "1475 California St, Denver, CO 80202",
    startTime: daysFromNow(1, 16),
    endTime: daysFromNow(1, 19),
    priceRange: "$8-$15",
    source: "Visit Denver",
    externalId: "seed-54thirty-hh",
  },
  {
    title: "Craft Beer Crawl - RiNo",
    description: "Visit 5 of RiNo's best craft breweries. Includes samples at each stop and a commemorative glass.",
    category: Category.BARS,
    tags: ["beer", "crawl", "craft-beer", "rino"],
    venueName: "Ratio Beerworks",
    address: "2920 Larimer St, Denver, CO 80205",
    startTime: daysFromNow(6, 14),
    endTime: daysFromNow(6, 19),
    priceRange: "$40",
    source: "Do303",
    externalId: "seed-beer-crawl",
  },
  {
    title: "Whiskey Tasting Night",
    description: "Sample 6 premium whiskeys with expert commentary. Light snacks included.",
    category: Category.BARS,
    tags: ["whiskey", "tasting", "spirits", "educational"],
    venueName: "Pints Pub",
    address: "221 W 13th Ave, Denver, CO 80204",
    startTime: daysFromNow(4, 19),
    endTime: daysFromNow(4, 22),
    priceRange: "$55",
    source: "Denver Post",
    externalId: "seed-whiskey-tasting",
  },
  {
    title: "Drag Queen Bingo",
    description: "Outrageous bingo night hosted by Denver's favorite drag queens. Prizes and performances.",
    category: Category.BARS,
    tags: ["drag", "bingo", "lgbtq", "entertainment"],
    venueName: "Hamburger Mary's",
    address: "700 E 17th Ave, Denver, CO 80203",
    startTime: daysFromNow(3, 20),
    endTime: daysFromNow(3, 23),
    priceRange: "$10",
    source: "Do303",
    externalId: "seed-drag-bingo",
  },
  {
    title: "Mezcal Tasting Experience",
    description: "Discover the world of mezcal with 5 premium pours. Learn about production and terroir.",
    category: Category.BARS,
    tags: ["mezcal", "tasting", "mexican", "educational"],
    venueName: "Kachina Cantina",
    address: "1890 Wazee St, Denver, CO 80202",
    startTime: daysFromNow(10, 19),
    endTime: daysFromNow(10, 21),
    priceRange: "$45",
    source: "Do303",
    externalId: "seed-mezcal",
  },
  {
    title: "Karaoke Night at Voicebox",
    description: "Private karaoke rooms with full bar service. Book by the hour. Song library of 20,000+.",
    category: Category.BARS,
    tags: ["karaoke", "private-rooms", "nightlife", "singing"],
    venueName: "Voicebox Karaoke",
    address: "1601 Market St, Denver, CO 80202",
    startTime: daysFromNow(5, 19),
    endTime: daysFromNow(6, 1),
    priceRange: "$40-$60/hour",
    source: "Visit Denver",
    externalId: "seed-karaoke",
  },
  {
    title: "Silent Disco on the Rooftop",
    description: "Three DJs, three channels, wireless headphones. Dance under the stars with mountain views.",
    category: Category.BARS,
    tags: ["silent-disco", "rooftop", "dancing", "dj"],
    venueName: "Avanti F&B",
    address: "3200 Pecos St, Denver, CO 80211",
    startTime: daysFromNow(12, 20),
    endTime: daysFromNow(13, 1),
    priceRange: "$20",
    source: "Do303",
    externalId: "seed-silent-disco",
  },
  {
    title: "Wine Wednesday at Barcelona",
    description: "Half-price bottles of wine and tapas specials. Live flamenco guitar.",
    category: Category.BARS,
    tags: ["wine", "tapas", "spanish", "live-music"],
    venueName: "Barcelona Wine Bar",
    address: "2900 Larimer St, Denver, CO 80205",
    startTime: daysFromNow(2, 17),
    endTime: daysFromNow(2, 22),
    priceRange: "$25-$50",
    source: "Denver Post",
    externalId: "seed-wine-wednesday",
  },
  {
    title: "Game Night at Board Game Republic",
    description: "Huge library of board games, great beer selection, and nerdy fun. Games taught on request.",
    category: Category.BARS,
    tags: ["board-games", "beer", "nerdy", "social"],
    venueName: "Board Game Republic",
    address: "305 E Colfax Ave, Denver, CO 80203",
    startTime: daysFromNow(1, 17),
    endTime: daysFromNow(1, 23),
    priceRange: "$5 cover",
    source: "Do303",
    externalId: "seed-game-night",
  },

  // COFFEE (6 events)
  {
    title: "Latte Art Throwdown",
    description: "Watch Denver's best baristas compete in a latte art battle. Free tastings and prizes.",
    category: Category.COFFEE,
    tags: ["latte-art", "competition", "free", "barista"],
    venueName: "Corvus Coffee Roasters",
    address: "1740 S Broadway, Denver, CO 80210",
    startTime: daysFromNow(9, 18),
    endTime: daysFromNow(9, 21),
    priceRange: "Free",
    source: "Do303",
    externalId: "seed-latte-throwdown",
  },
  {
    title: "Coffee Cupping Workshop",
    description: "Learn professional coffee tasting techniques. Taste coffees from around the world.",
    category: Category.COFFEE,
    tags: ["cupping", "workshop", "educational", "tasting"],
    venueName: "Huckleberry Roasters",
    address: "4301 Pecos St, Denver, CO 80211",
    startTime: daysFromNow(5, 10),
    endTime: daysFromNow(5, 12),
    priceRange: "$25",
    source: "Denver Post",
    externalId: "seed-cupping",
  },
  {
    title: "Espresso Basics Class",
    description: "Learn to make cafe-quality espresso at home. Covers machine basics, grinding, and tamping.",
    category: Category.COFFEE,
    tags: ["espresso", "class", "beginner", "home-brewing"],
    venueName: "Sweet Bloom Coffee",
    address: "1619 Platte St, Denver, CO 80202",
    startTime: daysFromNow(11, 9),
    endTime: daysFromNow(11, 11),
    priceRange: "$35",
    source: "Do303",
    externalId: "seed-espresso-class",
  },
  {
    title: "Coffee & Vinyl Morning",
    description: "Browse records while sipping specialty coffee. Live DJ spins vinyl selections.",
    category: Category.COFFEE,
    tags: ["vinyl", "records", "dj", "morning"],
    venueName: "Wax Trax Records",
    address: "638 E 13th Ave, Denver, CO 80203",
    startTime: daysFromNow(7, 9),
    endTime: daysFromNow(7, 12),
    priceRange: "Free",
    source: "Denver Post",
    externalId: "seed-coffee-vinyl",
  },
  {
    title: "Cold Brew Festival",
    description: "Sample cold brew from 10 Denver roasters. Vote for your favorite. Caffeine guaranteed.",
    category: Category.COFFEE,
    tags: ["cold-brew", "festival", "tasting", "summer"],
    venueName: "Larimer Square",
    address: "1430 Larimer St, Denver, CO 80202",
    startTime: daysFromNow(15, 10),
    endTime: daysFromNow(15, 14),
    priceRange: "$15",
    source: "Visit Denver",
    externalId: "seed-coldbrew-fest",
  },
  {
    title: "Pour-Over Perfection Workshop",
    description: "Master the art of pour-over coffee. Covers technique, timing, and water temperature.",
    category: Category.COFFEE,
    tags: ["pour-over", "workshop", "technique", "specialty"],
    venueName: "Commonwealth Coffee",
    address: "1901 Blake St, Denver, CO 80202",
    startTime: daysFromNow(13, 10),
    endTime: daysFromNow(13, 12),
    priceRange: "$30",
    source: "Do303",
    externalId: "seed-pourover",
  },

  // OUTDOORS (12 events)
  {
    title: "Sunrise Yoga at Red Rocks",
    description: "Start your Saturday with yoga overlooking the Denver skyline. All levels welcome.",
    category: Category.OUTDOORS,
    tags: ["yoga", "sunrise", "red-rocks", "wellness"],
    venueName: "Red Rocks Amphitheatre",
    address: "18300 W Alameda Pkwy, Morrison, CO 80465",
    startTime: daysFromNow(6, 6),
    endTime: daysFromNow(6, 8),
    priceRange: "$20",
    source: "Visit Denver",
    externalId: "seed-redrocks-yoga",
  },
  {
    title: "Cherry Creek Trail Group Ride",
    description: "20-mile casual group bike ride along Cherry Creek Trail. All paces welcome.",
    category: Category.OUTDOORS,
    tags: ["biking", "group-ride", "trail", "casual"],
    venueName: "Confluence Park",
    address: "2250 15th St, Denver, CO 80202",
    startTime: daysFromNow(7, 8),
    endTime: daysFromNow(7, 12),
    priceRange: "Free",
    source: "Do303",
    externalId: "seed-creek-ride",
  },
  {
    title: "Full Moon Hike at Mount Falcon",
    description: "Guided night hike under the full moon with views of Denver's city lights. Moderate difficulty.",
    category: Category.OUTDOORS,
    tags: ["hiking", "night", "full-moon", "guided"],
    venueName: "Mount Falcon Park",
    address: "18798 W Falcon Ct, Morrison, CO 80465",
    startTime: daysFromNow(12, 19),
    endTime: daysFromNow(12, 22),
    priceRange: "$15",
    source: "Denver Post",
    externalId: "seed-fullmoon-hike",
  },
  {
    title: "Kayak Tour on Cherry Creek",
    description: "Guided kayak tour through downtown Denver. Equipment and instruction provided.",
    category: Category.OUTDOORS,
    tags: ["kayaking", "water", "downtown", "guided"],
    venueName: "Confluence Kayaks",
    address: "2373 15th St, Denver, CO 80202",
    startTime: daysFromNow(8, 9),
    endTime: daysFromNow(8, 12),
    priceRange: "$45",
    source: "Visit Denver",
    externalId: "seed-kayak-tour",
  },
  {
    title: "Morning Bird Walk",
    description: "Guided bird watching walk at City Park. Binoculars available. Over 200 species recorded.",
    category: Category.OUTDOORS,
    tags: ["birding", "nature", "guided", "morning"],
    venueName: "City Park",
    address: "2001 Colorado Blvd, Denver, CO 80205",
    startTime: daysFromNow(3, 7),
    endTime: daysFromNow(3, 10),
    priceRange: "$10",
    source: "Denver Post",
    externalId: "seed-bird-walk",
  },
  {
    title: "Rock Climbing Intro at REI",
    description: "Indoor rock climbing basics. Learn safety, technique, and belaying. All equipment included.",
    category: Category.OUTDOORS,
    tags: ["climbing", "indoor", "beginner", "equipment-provided"],
    venueName: "REI Denver Flagship",
    address: "1416 Platte St, Denver, CO 80202",
    startTime: daysFromNow(10, 10),
    endTime: daysFromNow(10, 13),
    priceRange: "$35",
    source: "Do303",
    externalId: "seed-climbing-intro",
  },
  {
    title: "Stand-Up Paddleboard Yoga",
    description: "Yoga on the water at Sloan's Lake. Boards provided. Some yoga experience recommended.",
    category: Category.OUTDOORS,
    tags: ["sup", "yoga", "water", "fitness"],
    venueName: "Sloan's Lake Park",
    address: "1700 N Sheridan Blvd, Denver, CO 80214",
    startTime: daysFromNow(9, 8),
    endTime: daysFromNow(9, 10),
    priceRange: "$40",
    source: "Visit Denver",
    externalId: "seed-sup-yoga",
  },
  {
    title: "Urban Foraging Walk",
    description: "Learn to identify edible plants in Denver's parks. What's safe, what's delicious.",
    category: Category.OUTDOORS,
    tags: ["foraging", "nature", "educational", "walking"],
    venueName: "Washington Park",
    address: "S Downing St & E Louisiana Ave, Denver, CO 80209",
    startTime: daysFromNow(14, 9),
    endTime: daysFromNow(14, 12),
    priceRange: "$25",
    source: "Denver Post",
    externalId: "seed-foraging",
  },
  {
    title: "Mountain Bike Trail Day",
    description: "Group mountain bike ride at North Table Mountain. Intermediate level. Helmet required.",
    category: Category.OUTDOORS,
    tags: ["mountain-biking", "trails", "intermediate", "group"],
    venueName: "North Table Mountain Park",
    address: "W 58th Ave & CO-93, Golden, CO 80403",
    startTime: daysFromNow(11, 8),
    endTime: daysFromNow(11, 12),
    priceRange: "Free",
    source: "Do303",
    externalId: "seed-mtb-day",
  },
  {
    title: "Trail Running Group",
    description: "Weekly trail run at Green Mountain. 5-7 miles, moderate pace. All levels welcome.",
    category: Category.OUTDOORS,
    tags: ["running", "trail", "group", "weekly"],
    venueName: "Green Mountain Trail",
    address: "W Alameda Pkwy & S Rooney Rd, Lakewood, CO 80228",
    startTime: daysFromNow(4, 7),
    endTime: daysFromNow(4, 9),
    priceRange: "Free",
    source: "Do303",
    externalId: "seed-trail-running",
  },
  {
    title: "Outdoor Meditation Session",
    description: "Guided meditation in nature at Cheesman Park. Bring a blanket or cushion.",
    category: Category.OUTDOORS,
    tags: ["meditation", "wellness", "nature", "mindfulness"],
    venueName: "Cheesman Park",
    address: "1599 E 8th Ave, Denver, CO 80218",
    startTime: daysFromNow(2, 8),
    endTime: daysFromNow(2, 9),
    priceRange: "Free",
    source: "Visit Denver",
    externalId: "seed-outdoor-meditation",
  },
  {
    title: "Fly Fishing Basics",
    description: "Learn fly fishing on Clear Creek. Equipment provided. Catch and release policy.",
    category: Category.OUTDOORS,
    tags: ["fishing", "fly-fishing", "beginner", "water"],
    venueName: "Clear Creek",
    address: "Clear Creek & US-6, Golden, CO 80401",
    startTime: daysFromNow(16, 8),
    endTime: daysFromNow(16, 12),
    priceRange: "$75",
    source: "Denver Post",
    externalId: "seed-fly-fishing",
  },

  // FITNESS (10 events)
  {
    title: "CrossFit in the Park",
    description: "Free outdoor CrossFit class at City Park. All fitness levels welcome.",
    category: Category.FITNESS,
    tags: ["crossfit", "outdoor", "free", "group"],
    venueName: "City Park",
    address: "2001 Colorado Blvd, Denver, CO 80205",
    startTime: daysFromNow(2, 9),
    endTime: daysFromNow(2, 10),
    priceRange: "Free",
    source: "Do303",
    externalId: "seed-crossfit-park",
  },
  {
    title: "Boxing & Brunch",
    description: "High-intensity boxing workout followed by a healthy brunch. Perfect for fitness enthusiasts.",
    category: Category.FITNESS,
    tags: ["boxing", "brunch", "workout", "high-intensity"],
    venueName: "Title Boxing Club",
    address: "1544 Platte St, Denver, CO 80202",
    startTime: daysFromNow(6, 10),
    endTime: daysFromNow(6, 13),
    priceRange: "$45",
    source: "Visit Denver",
    externalId: "seed-boxing-brunch",
  },
  {
    title: "Yoga in the Brewery",
    description: "Hour-long yoga class followed by a craft beer. Namaste and cheers.",
    category: Category.FITNESS,
    tags: ["yoga", "beer", "unique", "relaxed"],
    venueName: "Ratio Beerworks",
    address: "2920 Larimer St, Denver, CO 80205",
    startTime: daysFromNow(3, 11),
    endTime: daysFromNow(3, 13),
    priceRange: "$25",
    source: "Do303",
    externalId: "seed-yoga-brewery",
  },
  {
    title: "5K Fun Run - City Park",
    description: "Casual 5K run around City Park. Timed and untimed options. Post-run snacks provided.",
    category: Category.FITNESS,
    tags: ["running", "5k", "casual", "community"],
    venueName: "City Park",
    address: "2001 Colorado Blvd, Denver, CO 80205",
    startTime: daysFromNow(8, 8),
    endTime: daysFromNow(8, 10),
    priceRange: "$20",
    source: "Visit Denver",
    externalId: "seed-5k-funrun",
  },
  {
    title: "Dance Fitness Party",
    description: "High-energy dance workout to hip-hop and pop hits. No dance experience needed.",
    category: Category.FITNESS,
    tags: ["dance", "cardio", "fun", "beginner-friendly"],
    venueName: "Movement Denver",
    address: "1020 N Broadway, Denver, CO 80203",
    startTime: daysFromNow(5, 18),
    endTime: daysFromNow(5, 19),
    priceRange: "$18",
    source: "Do303",
    externalId: "seed-dance-fitness",
  },
  {
    title: "Pilates by the Pool",
    description: "Poolside Pilates class with post-workout swimming. Towels provided.",
    category: Category.FITNESS,
    tags: ["pilates", "pool", "summer", "unique"],
    venueName: "The ART Hotel Pool",
    address: "1201 Broadway, Denver, CO 80203",
    startTime: daysFromNow(10, 8),
    endTime: daysFromNow(10, 10),
    priceRange: "$30",
    source: "Visit Denver",
    externalId: "seed-pilates-pool",
  },
  {
    title: "Kickboxing Basics",
    description: "Learn kickboxing fundamentals in this beginner-friendly class. Gloves provided.",
    category: Category.FITNESS,
    tags: ["kickboxing", "martial-arts", "beginner", "cardio"],
    venueName: "Easton Training Center",
    address: "1939 S Broadway, Denver, CO 80210",
    startTime: daysFromNow(7, 18),
    endTime: daysFromNow(7, 19),
    priceRange: "$20",
    source: "Do303",
    externalId: "seed-kickboxing",
  },
  {
    title: "Sunrise HIIT on the Rooftop",
    description: "High-intensity interval training with skyline views. Early bird gets the workout.",
    category: Category.FITNESS,
    tags: ["hiit", "rooftop", "sunrise", "intense"],
    venueName: "Halcyon Hotel Rooftop",
    address: "245 Columbine St, Denver, CO 80206",
    startTime: daysFromNow(9, 6),
    endTime: daysFromNow(9, 7),
    priceRange: "$25",
    source: "Denver Post",
    externalId: "seed-rooftop-hiit",
  },
  {
    title: "Barre & Bubbles",
    description: "Sculpting barre workout followed by champagne toast. Fitness meets celebration.",
    category: Category.FITNESS,
    tags: ["barre", "champagne", "social", "sculpting"],
    venueName: "Pure Barre LoDo",
    address: "1515 Wynkoop St, Denver, CO 80202",
    startTime: daysFromNow(12, 10),
    endTime: daysFromNow(12, 12),
    priceRange: "$35",
    source: "Do303",
    externalId: "seed-barre-bubbles",
  },
  {
    title: "Stair Climb Challenge",
    description: "Race up the stairs of Republic Plaza (56 floors). Charity event for local nonprofits.",
    category: Category.FITNESS,
    tags: ["stair-climb", "challenge", "charity", "competitive"],
    venueName: "Republic Plaza",
    address: "370 17th St, Denver, CO 80202",
    startTime: daysFromNow(18, 8),
    endTime: daysFromNow(18, 12),
    priceRange: "$50",
    source: "Visit Denver",
    externalId: "seed-stair-climb",
  },

  // SEASONAL (8 events)
  {
    title: "Denver Christkindlmarket",
    description: "Traditional German holiday market featuring handcrafted gifts, authentic food, and warm gluhwein.",
    category: Category.SEASONAL,
    tags: ["holiday", "german", "market", "christmas", "family"],
    venueName: "Civic Center Park",
    address: "101 W 14th Ave, Denver, CO 80202",
    startTime: daysFromNow(0, 11),
    endTime: daysFromNow(0, 21),
    priceRange: "Free",
    source: "Visit Denver",
    externalId: "seed-christkindl",
  },
  {
    title: "Zoo Lights at Denver Zoo",
    description: "Over 2 million lights transform Denver Zoo into a winter wonderland. Hot cocoa and Santa.",
    category: Category.SEASONAL,
    tags: ["lights", "zoo", "family", "holiday", "christmas"],
    venueName: "Denver Zoo",
    address: "2300 Steele St, Denver, CO 80205",
    startTime: daysFromNow(3, 17),
    endTime: daysFromNow(3, 21),
    priceRange: "$20-$30",
    source: "Denver Post",
    externalId: "seed-zoo-lights",
  },
  {
    title: "Winter Solstice Celebration",
    description: "Celebrate the longest night with fire dancing, live music, and community gathering.",
    category: Category.SEASONAL,
    tags: ["solstice", "celebration", "fire", "community", "winter"],
    venueName: "Denver Botanic Gardens",
    address: "1007 York St, Denver, CO 80206",
    startTime: daysFromNow(11, 17),
    endTime: daysFromNow(11, 21),
    priceRange: "$18",
    source: "Do303",
    externalId: "seed-solstice",
  },
  {
    title: "Ice Skating at Skyline Park",
    description: "Outdoor ice skating in downtown Denver. Skate rentals available. Hot chocolate stand.",
    category: Category.SEASONAL,
    tags: ["ice-skating", "outdoor", "winter", "downtown"],
    venueName: "Skyline Park",
    address: "1701 Arapahoe St, Denver, CO 80202",
    startTime: daysFromNow(5, 12),
    endTime: daysFromNow(5, 20),
    priceRange: "$15",
    source: "Visit Denver",
    externalId: "seed-ice-skating",
  },
  {
    title: "Holiday Lights Tour by Trolley",
    description: "Ride a vintage trolley through Denver's best holiday light displays. Caroling and cocoa included.",
    category: Category.SEASONAL,
    tags: ["lights", "trolley", "tour", "holiday", "nostalgic"],
    venueName: "Union Station",
    address: "1701 Wynkoop St, Denver, CO 80202",
    startTime: daysFromNow(8, 18),
    endTime: daysFromNow(8, 21),
    priceRange: "$35",
    source: "Denver Post",
    externalId: "seed-trolley-lights",
  },
  {
    title: "New Year's Eve Fireworks",
    description: "Ring in the new year with fireworks over downtown Denver. Food vendors and live music.",
    category: Category.SEASONAL,
    tags: ["new-years", "fireworks", "celebration", "downtown"],
    venueName: "16th Street Mall",
    address: "16th Street Mall, Denver, CO 80202",
    startTime: daysFromNow(20, 21),
    endTime: daysFromNow(21, 1),
    priceRange: "Free",
    source: "Visit Denver",
    externalId: "seed-nye-fireworks",
  },
  {
    title: "Blossoms of Light",
    description: "Million-light display at Denver Botanic Gardens. Warm beverages and live music.",
    category: Category.SEASONAL,
    tags: ["lights", "garden", "holiday", "romantic"],
    venueName: "Denver Botanic Gardens",
    address: "1007 York St, Denver, CO 80206",
    startTime: daysFromNow(4, 17),
    endTime: daysFromNow(4, 21),
    priceRange: "$22",
    source: "Visit Denver",
    externalId: "seed-blossoms-light",
  },
  {
    title: "Winter Craft Fair",
    description: "Local artisans sell handmade goods. Perfect for holiday shopping. Live music.",
    category: Category.SEASONAL,
    tags: ["craft-fair", "shopping", "local", "artisan", "holiday"],
    venueName: "Denver Mart",
    address: "451 E 58th Ave, Denver, CO 80216",
    startTime: daysFromNow(9, 10),
    endTime: daysFromNow(9, 17),
    priceRange: "$5 entry",
    source: "Denver Post",
    externalId: "seed-winter-craft",
  },

  // POPUP (8 events)
  {
    title: "Secret Supper Club - Location TBA",
    description: "Underground dining experience at a secret location. Five-course tasting menu from award-winning chef.",
    category: Category.POPUP,
    tags: ["popup", "dinner", "secret", "tasting", "exclusive"],
    venueName: "Secret Location",
    address: "Denver, CO (revealed 24hrs before)",
    startTime: daysFromNow(8, 19),
    endTime: daysFromNow(8, 23),
    priceRange: "$125",
    source: "Do303",
    externalId: "seed-secret-supper",
  },
  {
    title: "Vintage Market Pop-Up",
    description: "Curated vintage clothing, furniture, and collectibles from Denver's best vintage dealers.",
    category: Category.POPUP,
    tags: ["vintage", "shopping", "one-day", "fashion"],
    venueName: "The Source Hotel",
    address: "3330 Brighton Blvd, Denver, CO 80216",
    startTime: daysFromNow(6, 10),
    endTime: daysFromNow(6, 16),
    priceRange: "Free",
    source: "Visit Denver",
    externalId: "seed-vintage-popup",
  },
  {
    title: "Makers Market at Stanley",
    description: "Local makers sell handmade goods, art, and crafts. Support Denver creators.",
    category: Category.POPUP,
    tags: ["makers", "handmade", "local", "shopping"],
    venueName: "Stanley Marketplace",
    address: "2501 Dallas St, Aurora, CO 80010",
    startTime: daysFromNow(7, 10),
    endTime: daysFromNow(7, 15),
    priceRange: "Free",
    source: "Do303",
    externalId: "seed-makers-stanley",
  },
  {
    title: "Night Market on Larimer",
    description: "Evening pop-up market with street food, live music, and local vendors. Asian-inspired.",
    category: Category.POPUP,
    tags: ["night-market", "asian", "food", "evening"],
    venueName: "Larimer Square",
    address: "1430 Larimer St, Denver, CO 80202",
    startTime: daysFromNow(10, 18),
    endTime: daysFromNow(10, 22),
    priceRange: "Free entry",
    source: "Visit Denver",
    externalId: "seed-night-market",
  },
  {
    title: "Record Store Pop-Up",
    description: "Rare vinyl and collectible records from private collectors. Limited one-day sale.",
    category: Category.POPUP,
    tags: ["records", "vinyl", "music", "collectors"],
    venueName: "Denver Central Market",
    address: "2669 Larimer St, Denver, CO 80205",
    startTime: daysFromNow(12, 11),
    endTime: daysFromNow(12, 17),
    priceRange: "Free entry",
    source: "Do303",
    externalId: "seed-record-popup",
  },
  {
    title: "Plant Swap & Shop",
    description: "Trade your plant cuttings and buy rare houseplants from local growers.",
    category: Category.POPUP,
    tags: ["plants", "swap", "gardening", "community"],
    venueName: "City Park Pavilion",
    address: "2001 Colorado Blvd, Denver, CO 80205",
    startTime: daysFromNow(13, 10),
    endTime: daysFromNow(13, 14),
    priceRange: "Free",
    source: "Denver Post",
    externalId: "seed-plant-swap",
  },
  {
    title: "Food Truck Rally",
    description: "30+ food trucks converge for one epic night. Live DJ, lawn games, and unlimited options.",
    category: Category.POPUP,
    tags: ["food-trucks", "outdoor", "variety", "social"],
    venueName: "Civic Center Park",
    address: "101 W 14th Ave, Denver, CO 80202",
    startTime: daysFromNow(14, 16),
    endTime: daysFromNow(14, 21),
    priceRange: "Free entry",
    source: "Do303",
    externalId: "seed-food-truck-rally",
  },
  {
    title: "Art Book Fair",
    description: "Independent publishers, zine makers, and artists sell limited edition prints and books.",
    category: Category.POPUP,
    tags: ["art", "books", "zines", "independent"],
    venueName: "MCA Denver",
    address: "1485 Delgany St, Denver, CO 80202",
    startTime: daysFromNow(16, 11),
    endTime: daysFromNow(16, 17),
    priceRange: "$5",
    source: "Visit Denver",
    externalId: "seed-art-book-fair",
  },

  // OTHER (8 events - comedy, trivia, community)
  {
    title: "Denver Comedy Underground",
    description: "Stand-up comedy showcase featuring Denver's rising comedians. Two-drink minimum.",
    category: Category.OTHER,
    tags: ["comedy", "standup", "21+", "nightlife"],
    venueName: "Comedy Works South",
    address: "5345 Landmark Pl, Greenwood Village, CO 80111",
    startTime: daysFromNow(4, 20),
    endTime: daysFromNow(4, 22),
    priceRange: "$15-$20",
    source: "Do303",
    externalId: "seed-comedy-underground",
  },
  {
    title: "Trivia Night at Ratio Beerworks",
    description: "Weekly trivia with prizes for top teams. Great beer and competitive atmosphere.",
    category: Category.OTHER,
    tags: ["trivia", "beer", "weekly", "competitive"],
    venueName: "Ratio Beerworks",
    address: "2920 Larimer St, Denver, CO 80205",
    startTime: daysFromNow(2, 19),
    endTime: daysFromNow(2, 22),
    priceRange: "Free",
    source: "Denver Post",
    externalId: "seed-ratio-trivia",
  },
  {
    title: "Improv Comedy Show",
    description: "Unscripted comedy based on audience suggestions. Anything can happen!",
    category: Category.OTHER,
    tags: ["improv", "comedy", "interactive", "audience"],
    venueName: "Bovine Metropolis Theater",
    address: "1527 Champa St, Denver, CO 80202",
    startTime: daysFromNow(5, 20),
    endTime: daysFromNow(5, 22),
    priceRange: "$18",
    source: "Do303",
    externalId: "seed-improv",
  },
  {
    title: "Community Cleanup & Coffee",
    description: "Join neighbors to clean up local parks. Free coffee and breakfast for volunteers.",
    category: Category.OTHER,
    tags: ["volunteer", "community", "cleanup", "morning"],
    venueName: "Various Denver Parks",
    address: "Meeting at Union Station",
    startTime: daysFromNow(7, 8),
    endTime: daysFromNow(7, 11),
    priceRange: "Free",
    source: "Visit Denver",
    externalId: "seed-community-cleanup",
  },
  {
    title: "Open Mic Comedy Night",
    description: "Try your hand at stand-up comedy. Five minutes to make 'em laugh. Sign up at 7pm.",
    category: Category.OTHER,
    tags: ["comedy", "open-mic", "beginner", "participatory"],
    venueName: "The Squire Lounge",
    address: "1500 Stout St, Denver, CO 80202",
    startTime: daysFromNow(9, 19),
    endTime: daysFromNow(9, 22),
    priceRange: "Free",
    source: "Do303",
    externalId: "seed-openmic-comedy",
  },
  {
    title: "Speed Networking Event",
    description: "Meet fellow Denver professionals in rotating 5-minute conversations. All industries welcome.",
    category: Category.OTHER,
    tags: ["networking", "professional", "social", "business"],
    venueName: "WeWork Union Station",
    address: "1550 Wewatta St, Denver, CO 80202",
    startTime: daysFromNow(11, 18),
    endTime: daysFromNow(11, 20),
    priceRange: "$25",
    source: "Denver Post",
    externalId: "seed-speed-networking",
  },
  {
    title: "Film Discussion Club",
    description: "Watch a classic film and discuss with fellow cinephiles. This week: Chinatown.",
    category: Category.OTHER,
    tags: ["film", "discussion", "classic", "intellectual"],
    venueName: "Sie FilmCenter",
    address: "2510 E Colfax Ave, Denver, CO 80206",
    startTime: daysFromNow(10, 19),
    endTime: daysFromNow(10, 22),
    priceRange: "$12",
    source: "Visit Denver",
    externalId: "seed-film-club",
  },
  {
    title: "Dog Park Social",
    description: "Dog owners meetup at Stapleton Dog Park. Treats for dogs, coffee for humans.",
    category: Category.OTHER,
    tags: ["dogs", "social", "outdoor", "community"],
    venueName: "Stapleton Dog Park",
    address: "2401 Syracuse St, Denver, CO 80238",
    startTime: daysFromNow(6, 9),
    endTime: daysFromNow(6, 11),
    priceRange: "Free",
    source: "Do303",
    externalId: "seed-dog-social",
  },
];

// ============================================================================
// PLACES DATA - 40+ Denver places across categories
// ============================================================================

const DENVER_PLACES = [
  // RESTAURANT (15 places)
  {
    title: "Guard and Grace",
    description: "Upscale steakhouse with an extensive wine list and stunning city views. Perfect for special occasions.",
    category: Category.RESTAURANT,
    tags: ["steakhouse", "fine-dining", "wine", "date-night", "special-occasion"],
    venueName: "Guard and Grace",
    address: "1801 California St, Denver, CO 80202",
    priceRange: "$$$$",
    source: "Eater Denver",
    sourceUrl: "https://denver.eater.com",
    externalId: "place-guard-grace",
    neighborhood: "Downtown",
    hours: "Mon-Sat 5pm-10pm, Sun 5pm-9pm",
  },
  {
    title: "Tavernetta",
    description: "Italian restaurant with house-made pastas and wood-fired pizzas in a stylish Union Station setting.",
    category: Category.RESTAURANT,
    tags: ["italian", "pasta", "pizza", "upscale", "date-night"],
    venueName: "Tavernetta",
    address: "1889 16th St, Denver, CO 80202",
    priceRange: "$$$",
    source: "Eater Denver",
    externalId: "place-tavernetta",
    neighborhood: "Union Station",
    hours: "Daily 5pm-10pm",
  },
  {
    title: "Safta",
    description: "Modern Israeli restaurant by Alon Shaya featuring fresh hummus, pita, and Middle Eastern flavors.",
    category: Category.RESTAURANT,
    tags: ["israeli", "middle-eastern", "hummus", "brunch", "vegetarian-friendly"],
    venueName: "Safta",
    address: "3330 Brighton Blvd, Denver, CO 80216",
    priceRange: "$$$",
    source: "Eater Denver",
    externalId: "place-safta",
    neighborhood: "RiNo",
    hours: "Tue-Sun 11am-9pm",
  },
  {
    title: "Hop Alley",
    description: "Hip Chinese restaurant serving authentic Sichuan cuisine and creative cocktails in a stylish space.",
    category: Category.RESTAURANT,
    tags: ["chinese", "sichuan", "spicy", "cocktails", "trendy"],
    venueName: "Hop Alley",
    address: "3500 Larimer St, Denver, CO 80205",
    priceRange: "$$",
    source: "Eater Denver",
    externalId: "place-hop-alley",
    neighborhood: "RiNo",
    hours: "Tue-Sun 5pm-10pm",
  },
  {
    title: "Linger",
    description: "Global street food in a converted mortuary with rooftop bar and stunning views.",
    category: Category.RESTAURANT,
    tags: ["global", "street-food", "rooftop", "eclectic", "creative"],
    venueName: "Linger",
    address: "2030 W 30th Ave, Denver, CO 80211",
    priceRange: "$$$",
    source: "Eater Denver",
    externalId: "place-linger",
    neighborhood: "LoHi",
    hours: "Daily 11am-10pm",
  },
  {
    title: "Denver Biscuit Company",
    description: "Beloved breakfast spot famous for oversized biscuit sandwiches. Be prepared to wait.",
    category: Category.RESTAURANT,
    tags: ["breakfast", "brunch", "biscuits", "southern", "casual"],
    venueName: "Denver Biscuit Company",
    address: "3237 E Colfax Ave, Denver, CO 80206",
    priceRange: "$$",
    source: "Denver Post",
    externalId: "place-denver-biscuit",
    neighborhood: "City Park West",
    hours: "Daily 7am-2pm",
  },
  {
    title: "Work & Class",
    description: "Southern-influenced comfort food and creative cocktails in a lively RiNo atmosphere.",
    category: Category.RESTAURANT,
    tags: ["southern", "comfort-food", "cocktails", "lively", "brunch"],
    venueName: "Work & Class",
    address: "2500 Larimer St, Denver, CO 80205",
    priceRange: "$$",
    source: "Eater Denver",
    externalId: "place-work-class",
    neighborhood: "RiNo",
    hours: "Daily 11am-10pm",
  },
  {
    title: "Sushi Den",
    description: "Premier sushi destination with fish flown in daily from Japan. Reservations recommended.",
    category: Category.RESTAURANT,
    tags: ["sushi", "japanese", "fresh", "premium", "date-night"],
    venueName: "Sushi Den",
    address: "1487 S Pearl St, Denver, CO 80210",
    priceRange: "$$$$",
    source: "Denver Post",
    externalId: "place-sushi-den",
    neighborhood: "South Pearl",
    hours: "Mon-Sat 5pm-10pm",
  },
  {
    title: "El Five",
    description: "Mediterranean tapas with panoramic city views from the 5th floor of a LoHi building.",
    category: Category.RESTAURANT,
    tags: ["mediterranean", "tapas", "views", "romantic", "trendy"],
    venueName: "El Five",
    address: "2930 Umatilla St, Denver, CO 80211",
    priceRange: "$$$",
    source: "Eater Denver",
    externalId: "place-el-five",
    neighborhood: "LoHi",
    hours: "Daily 4pm-11pm",
  },
  {
    title: "The Bindery",
    description: "Farm-to-table restaurant featuring seasonal menus and house-baked bread.",
    category: Category.RESTAURANT,
    tags: ["farm-to-table", "seasonal", "bakery", "brunch", "local"],
    venueName: "The Bindery",
    address: "1817 Central St, Denver, CO 80211",
    priceRange: "$$$",
    source: "Denver Post",
    externalId: "place-bindery",
    neighborhood: "LoHi",
    hours: "Wed-Sun 8am-9pm",
  },
  {
    title: "Cart-Driver",
    description: "Wood-fired pizza and natural wine in a converted shipping container in RiNo.",
    category: Category.RESTAURANT,
    tags: ["pizza", "wine", "casual", "outdoor-seating", "unique"],
    venueName: "Cart-Driver",
    address: "2500 Larimer St Unit 100, Denver, CO 80205",
    priceRange: "$$",
    source: "Eater Denver",
    externalId: "place-cart-driver",
    neighborhood: "RiNo",
    hours: "Daily 5pm-10pm",
  },
  {
    title: "Pho 95",
    description: "Family-owned Vietnamese restaurant serving authentic pho and banh mi since 1995.",
    category: Category.RESTAURANT,
    tags: ["vietnamese", "pho", "casual", "family-owned", "affordable"],
    venueName: "Pho 95",
    address: "1401 S Federal Blvd, Denver, CO 80219",
    priceRange: "$",
    source: "Denver Post",
    externalId: "place-pho-95",
    neighborhood: "Federal Blvd",
    hours: "Daily 9am-9pm",
  },
  {
    title: "Snooze AM Eatery",
    description: "Brunch favorite known for creative pancake flights and eggs benedict variations.",
    category: Category.RESTAURANT,
    tags: ["breakfast", "brunch", "pancakes", "creative", "weekend"],
    venueName: "Snooze AM Eatery",
    address: "2262 Larimer St, Denver, CO 80205",
    priceRange: "$$",
    source: "Denver Post",
    externalId: "place-snooze",
    neighborhood: "Ballpark",
    hours: "Daily 6:30am-2:30pm",
  },
  {
    title: "Los Chingones",
    description: "Vibrant Mexican restaurant with tacos, tequila, and a lively Day of the Dead aesthetic.",
    category: Category.RESTAURANT,
    tags: ["mexican", "tacos", "tequila", "lively", "happy-hour"],
    venueName: "Los Chingones",
    address: "2463 Larimer St, Denver, CO 80205",
    priceRange: "$$",
    source: "Eater Denver",
    externalId: "place-los-chingones",
    neighborhood: "RiNo",
    hours: "Daily 11am-12am",
  },
  {
    title: "Highlands Garden Cafe",
    description: "Farm-to-table dining in a charming Victorian setting with beautiful garden patio.",
    category: Category.RESTAURANT,
    tags: ["farm-to-table", "garden", "romantic", "brunch", "local"],
    venueName: "Highlands Garden Cafe",
    address: "3927 W 32nd Ave, Denver, CO 80212",
    priceRange: "$$$",
    source: "Denver Post",
    externalId: "place-highlands-garden",
    neighborhood: "Highlands",
    hours: "Tue-Sun 8am-9pm",
  },

  // BARS (8 places)
  {
    title: "Williams & Graham",
    description: "Award-winning speakeasy hidden behind a bookshelf. Craft cocktails in a prohibition-era setting.",
    category: Category.BARS,
    tags: ["speakeasy", "cocktails", "hidden", "date-night", "craft"],
    venueName: "Williams & Graham",
    address: "3160 Tejon St, Denver, CO 80211",
    priceRange: "$$$",
    source: "Eater Denver",
    externalId: "place-williams-graham",
    neighborhood: "LoHi",
    hours: "Daily 5pm-1am",
  },
  {
    title: "Death & Co Denver",
    description: "NYC's legendary cocktail bar brings its expertise to Denver with expertly crafted drinks.",
    category: Category.BARS,
    tags: ["cocktails", "nyc", "craft", "upscale", "innovative"],
    venueName: "Death & Co Denver",
    address: "1280 25th St, Denver, CO 80205",
    priceRange: "$$$",
    source: "Eater Denver",
    externalId: "place-death-co",
    neighborhood: "RiNo",
    hours: "Daily 5pm-12am",
  },
  {
    title: "Ratio Beerworks",
    description: "Craft brewery with an industrial taproom and large patio. Dog-friendly.",
    category: Category.BARS,
    tags: ["brewery", "craft-beer", "patio", "dog-friendly", "casual"],
    venueName: "Ratio Beerworks",
    address: "2920 Larimer St, Denver, CO 80205",
    priceRange: "$$",
    source: "Denver Post",
    externalId: "place-ratio",
    neighborhood: "RiNo",
    hours: "Daily 12pm-11pm",
  },
  {
    title: "54thirty Rooftop",
    description: "Denver's highest rooftop bar with panoramic mountain views and craft cocktails.",
    category: Category.BARS,
    tags: ["rooftop", "views", "cocktails", "sunset", "trendy"],
    venueName: "54thirty Rooftop",
    address: "1475 California St, Denver, CO 80202",
    priceRange: "$$$",
    source: "Denver Post",
    externalId: "place-54thirty",
    neighborhood: "Downtown",
    hours: "Daily 4pm-12am",
  },
  {
    title: "First Draft Taproom",
    description: "Self-pour taproom with 40+ taps and pay-by-the-ounce pricing. Games available.",
    category: Category.BARS,
    tags: ["self-pour", "beer", "games", "casual", "social"],
    venueName: "First Draft Taproom",
    address: "1309 26th St, Denver, CO 80205",
    priceRange: "$$",
    source: "Denver Post",
    externalId: "place-first-draft",
    neighborhood: "RiNo",
    hours: "Daily 12pm-10pm",
  },
  {
    title: "Bar Standard",
    description: "Underground electronic music venue and bar with DJs and dancing.",
    category: Category.BARS,
    tags: ["club", "electronic", "dj", "dancing", "late-night"],
    venueName: "Bar Standard",
    address: "1037 Broadway, Denver, CO 80204",
    priceRange: "$$",
    source: "Do303",
    externalId: "place-bar-standard",
    neighborhood: "Golden Triangle",
    hours: "Thu-Sat 9pm-2am",
  },
  {
    title: "Adrift Tiki Bar",
    description: "Tropical tiki bar with rum-based cocktails and Polynesian-inspired decor.",
    category: Category.BARS,
    tags: ["tiki", "rum", "tropical", "themed", "fun"],
    venueName: "Adrift Tiki Bar",
    address: "218 S Broadway, Denver, CO 80209",
    priceRange: "$$",
    source: "Denver Post",
    externalId: "place-adrift",
    neighborhood: "Baker",
    hours: "Daily 4pm-12am",
  },
  {
    title: "Retrograde",
    description: "Ice cream shop by day, cocktail bar by night. Creative drinks in a playful atmosphere.",
    category: Category.BARS,
    tags: ["cocktails", "ice-cream", "creative", "unique", "date-night"],
    venueName: "Retrograde",
    address: "1801 33rd St, Denver, CO 80205",
    priceRange: "$$",
    source: "Eater Denver",
    externalId: "place-retrograde",
    neighborhood: "RiNo",
    hours: "Daily 12pm-12am",
  },

  // COFFEE (8 places)
  {
    title: "Corvus Coffee Roasters",
    description: "Award-winning specialty coffee roaster focused on direct trade and quality.",
    category: Category.COFFEE,
    tags: ["specialty", "roaster", "direct-trade", "quality", "local"],
    venueName: "Corvus Coffee Roasters",
    address: "1740 S Broadway, Denver, CO 80210",
    priceRange: "$$",
    source: "Denver Post",
    externalId: "place-corvus",
    neighborhood: "South Broadway",
    hours: "Daily 6:30am-6pm",
  },
  {
    title: "Huckleberry Roasters",
    description: "Community-focused coffee roaster with cozy Sunnyside and RiNo locations.",
    category: Category.COFFEE,
    tags: ["roaster", "community", "cozy", "local", "sustainable"],
    venueName: "Huckleberry Roasters",
    address: "4301 Pecos St, Denver, CO 80211",
    priceRange: "$$",
    source: "Denver Post",
    externalId: "place-huckleberry",
    neighborhood: "Sunnyside",
    hours: "Daily 7am-5pm",
  },
  {
    title: "Sweet Bloom Coffee",
    description: "Competition-winning roaster with a minimalist coffee bar in the Highlands.",
    category: Category.COFFEE,
    tags: ["specialty", "competition", "minimalist", "quality", "premium"],
    venueName: "Sweet Bloom Coffee",
    address: "1619 Platte St, Denver, CO 80202",
    priceRange: "$$",
    source: "Denver Post",
    externalId: "place-sweet-bloom",
    neighborhood: "Platte",
    hours: "Daily 7am-5pm",
  },
  {
    title: "Crema Coffee House",
    description: "Cozy neighborhood coffee shop with excellent pastries and work-friendly atmosphere.",
    category: Category.COFFEE,
    tags: ["cozy", "pastries", "workspace", "neighborhood", "wifi"],
    venueName: "Crema Coffee House",
    address: "2862 Larimer St, Denver, CO 80205",
    priceRange: "$",
    source: "Denver Post",
    externalId: "place-crema",
    neighborhood: "RiNo",
    hours: "Daily 6:30am-6pm",
  },
  {
    title: "Little Owl Coffee",
    description: "Tiny but mighty coffee shop serving excellent espresso in the Highlands.",
    category: Category.COFFEE,
    tags: ["espresso", "small", "quality", "local", "neighborhood"],
    venueName: "Little Owl Coffee",
    address: "1555 Blake St, Denver, CO 80202",
    priceRange: "$$",
    source: "Denver Post",
    externalId: "place-little-owl",
    neighborhood: "LoDo",
    hours: "Mon-Fri 7am-4pm, Sat-Sun 8am-4pm",
  },
  {
    title: "Novo Coffee",
    description: "Pioneer of Denver specialty coffee scene with multiple locations citywide.",
    category: Category.COFFEE,
    tags: ["pioneer", "specialty", "multiple-locations", "established", "quality"],
    venueName: "Novo Coffee",
    address: "1600 Glenarm Pl, Denver, CO 80202",
    priceRange: "$$",
    source: "Denver Post",
    externalId: "place-novo",
    neighborhood: "Downtown",
    hours: "Mon-Fri 6:30am-5pm",
  },
  {
    title: "Black Eye Coffee",
    description: "Industrial-chic coffee shop with strong espresso and excellent pour-overs.",
    category: Category.COFFEE,
    tags: ["industrial", "espresso", "pour-over", "workspace", "quality"],
    venueName: "Black Eye Coffee",
    address: "1528 Wazee St, Denver, CO 80202",
    priceRange: "$$",
    source: "Denver Post",
    externalId: "place-black-eye",
    neighborhood: "LoDo",
    hours: "Daily 7am-5pm",
  },
  {
    title: "Thump Coffee",
    description: "Friendly neighborhood coffee shop with great cold brew and house-baked goods.",
    category: Category.COFFEE,
    tags: ["cold-brew", "baked-goods", "friendly", "neighborhood", "casual"],
    venueName: "Thump Coffee",
    address: "1201 E 13th Ave, Denver, CO 80218",
    priceRange: "$",
    source: "Denver Post",
    externalId: "place-thump",
    neighborhood: "Capitol Hill",
    hours: "Daily 6:30am-6pm",
  },

  // ACTIVITY_VENUE (10 places)
  {
    title: "Meow Wolf Denver",
    description: "Mind-bending immersive art experience. Part art installation, part choose-your-own-adventure.",
    category: Category.ACTIVITY_VENUE,
    tags: ["immersive", "art", "interactive", "family-friendly", "unique"],
    venueName: "Meow Wolf Denver",
    address: "1338 1st St, Denver, CO 80204",
    priceRange: "$$$",
    source: "Visit Denver",
    externalId: "place-meow-wolf",
    neighborhood: "Sun Valley",
    hours: "Mon-Wed 10am-8pm, Thu-Sun 10am-10pm",
  },
  {
    title: "Escape Room Downtown",
    description: "Challenging escape rooms with multiple themed scenarios for groups.",
    category: Category.ACTIVITY_VENUE,
    tags: ["escape-room", "team-building", "puzzles", "groups", "fun"],
    venueName: "Escape Room Downtown",
    address: "1529 Champa St, Denver, CO 80202",
    priceRange: "$$",
    source: "Visit Denver",
    externalId: "place-escape-room",
    neighborhood: "Downtown",
    hours: "Daily 10am-10pm",
  },
  {
    title: "Punch Bowl Social",
    description: "Entertainment complex with bowling, karaoke, arcade games, and craft cocktails.",
    category: Category.ACTIVITY_VENUE,
    tags: ["bowling", "arcade", "karaoke", "food", "social"],
    venueName: "Punch Bowl Social",
    address: "65 Broadway, Denver, CO 80203",
    priceRange: "$$",
    source: "Visit Denver",
    externalId: "place-punch-bowl",
    neighborhood: "Baker",
    hours: "Daily 11am-2am",
  },
  {
    title: "TopGolf Denver",
    description: "High-tech driving range with games, food, and drinks. Fun for golfers and non-golfers.",
    category: Category.ACTIVITY_VENUE,
    tags: ["golf", "games", "food", "groups", "casual"],
    venueName: "TopGolf Denver",
    address: "500 Centennial Pkwy, Thornton, CO 80229",
    priceRange: "$$$",
    source: "Visit Denver",
    externalId: "place-topgolf",
    neighborhood: "Thornton",
    hours: "Sun-Thu 9am-11pm, Fri-Sat 9am-12am",
  },
  {
    title: "Denver Botanic Gardens",
    description: "23-acre urban oasis with diverse plant collections and seasonal exhibitions.",
    category: Category.ACTIVITY_VENUE,
    tags: ["gardens", "nature", "peaceful", "family-friendly", "seasonal"],
    venueName: "Denver Botanic Gardens",
    address: "1007 York St, Denver, CO 80206",
    priceRange: "$$",
    source: "Visit Denver",
    externalId: "place-botanic-gardens",
    neighborhood: "Cheesman Park",
    hours: "Daily 9am-5pm",
  },
  {
    title: "Denver Art Museum",
    description: "World-class art museum with American Indian art, Western American art, and global collections.",
    category: Category.ACTIVITY_VENUE,
    tags: ["museum", "art", "culture", "family-friendly", "educational"],
    venueName: "Denver Art Museum",
    address: "100 W 14th Ave Pkwy, Denver, CO 80204",
    priceRange: "$$",
    source: "Visit Denver",
    externalId: "place-dam",
    neighborhood: "Golden Triangle",
    hours: "Daily 10am-5pm, Fri 10am-8pm",
  },
  {
    title: "REI Denver Flagship",
    description: "Massive outdoor gear store with climbing wall, classes, and rentals.",
    category: Category.ACTIVITY_VENUE,
    tags: ["outdoor-gear", "climbing", "classes", "rentals", "adventure"],
    venueName: "REI Denver Flagship",
    address: "1416 Platte St, Denver, CO 80202",
    priceRange: "$$",
    source: "Visit Denver",
    externalId: "place-rei",
    neighborhood: "Platte",
    hours: "Mon-Sat 9am-9pm, Sun 10am-7pm",
  },
  {
    title: "Movement Climbing Gym",
    description: "Premier climbing gym with bouldering, rope climbing, yoga, and fitness.",
    category: Category.ACTIVITY_VENUE,
    tags: ["climbing", "bouldering", "fitness", "yoga", "community"],
    venueName: "Movement Climbing Gym",
    address: "1020 N Broadway, Denver, CO 80203",
    priceRange: "$$",
    source: "Denver Post",
    externalId: "place-movement",
    neighborhood: "Capitol Hill",
    hours: "Mon-Fri 6am-11pm, Sat-Sun 8am-8pm",
  },
  {
    title: "Denver Zoo",
    description: "Home to 3,000+ animals. Family favorite with conservation programs and special events.",
    category: Category.ACTIVITY_VENUE,
    tags: ["zoo", "animals", "family-friendly", "educational", "outdoor"],
    venueName: "Denver Zoo",
    address: "2300 Steele St, Denver, CO 80205",
    priceRange: "$$",
    source: "Visit Denver",
    externalId: "place-zoo",
    neighborhood: "City Park",
    hours: "Daily 10am-5pm",
  },
  {
    title: "Stanley Marketplace",
    description: "Former aviation factory transformed into food hall and marketplace with 50+ vendors.",
    category: Category.ACTIVITY_VENUE,
    tags: ["food-hall", "shopping", "marketplace", "local", "community"],
    venueName: "Stanley Marketplace",
    address: "2501 Dallas St, Aurora, CO 80010",
    priceRange: "$$",
    source: "Visit Denver",
    externalId: "place-stanley",
    neighborhood: "Stapleton",
    hours: "Daily 7am-9pm",
  },
];

// ============================================================================
// USER CLUSTERS - 4 taste clusters with 3 users each
// ============================================================================

interface UserCluster {
  name: string;
  users: {
    email: string;
    name: string;
    relationshipStatus: RelationshipStatus;
    denverTenure: DenverTenure;
  }[];
  likedCategories: Category[];
  dislikedCategories: Category[];
  preferredTags: string[];
}

const USER_CLUSTERS: UserCluster[] = [
  {
    name: "Music & Nightlife",
    users: [
      { email: "music1@pulse.local", name: "Alex Rivera", relationshipStatus: RelationshipStatus.SINGLE, denverTenure: DenverTenure.ONE_TO_TWO_YEARS },
      { email: "music2@pulse.local", name: "Jordan Chen", relationshipStatus: RelationshipStatus.SINGLE, denverTenure: DenverTenure.TWO_TO_FIVE_YEARS },
      { email: "music3@pulse.local", name: "Sam Martinez", relationshipStatus: RelationshipStatus.COUPLE, denverTenure: DenverTenure.FIVE_PLUS_YEARS },
    ],
    likedCategories: [Category.LIVE_MUSIC, Category.BARS],
    dislikedCategories: [Category.FITNESS],
    preferredTags: ["live-music", "jazz", "rock", "indie", "dancing", "cocktails", "nightlife", "21+", "late-night"],
  },
  {
    name: "Wellness & Outdoors",
    users: [
      { email: "wellness1@pulse.local", name: "Taylor Green", relationshipStatus: RelationshipStatus.SINGLE, denverTenure: DenverTenure.NEW_TO_DENVER },
      { email: "wellness2@pulse.local", name: "Morgan Brooks", relationshipStatus: RelationshipStatus.COUPLE, denverTenure: DenverTenure.TWO_TO_FIVE_YEARS },
      { email: "wellness3@pulse.local", name: "Casey Wilson", relationshipStatus: RelationshipStatus.SINGLE, denverTenure: DenverTenure.FIVE_PLUS_YEARS },
    ],
    likedCategories: [Category.OUTDOORS, Category.FITNESS, Category.COFFEE],
    dislikedCategories: [Category.BARS],
    preferredTags: ["yoga", "hiking", "running", "wellness", "outdoor", "nature", "fitness", "morning", "healthy"],
  },
  {
    name: "Art & Food",
    users: [
      { email: "artfood1@pulse.local", name: "Riley Parker", relationshipStatus: RelationshipStatus.COUPLE, denverTenure: DenverTenure.TWO_TO_FIVE_YEARS },
      { email: "artfood2@pulse.local", name: "Avery Kim", relationshipStatus: RelationshipStatus.SINGLE, denverTenure: DenverTenure.ONE_TO_TWO_YEARS },
      { email: "artfood3@pulse.local", name: "Quinn Davis", relationshipStatus: RelationshipStatus.COUPLE, denverTenure: DenverTenure.FIVE_PLUS_YEARS },
    ],
    likedCategories: [Category.ART, Category.FOOD, Category.POPUP],
    dislikedCategories: [Category.FITNESS],
    preferredTags: ["gallery", "museum", "food-tour", "tasting", "workshop", "popup", "local", "artisan"],
  },
  {
    name: "Comedy & Community",
    users: [
      { email: "community1@pulse.local", name: "Drew Thompson", relationshipStatus: RelationshipStatus.SINGLE, denverTenure: DenverTenure.ONE_TO_TWO_YEARS },
      { email: "community2@pulse.local", name: "Jamie Lee", relationshipStatus: RelationshipStatus.COUPLE, denverTenure: DenverTenure.NEW_TO_DENVER },
      { email: "community3@pulse.local", name: "Chris Anderson", relationshipStatus: RelationshipStatus.SINGLE, denverTenure: DenverTenure.FIVE_PLUS_YEARS },
    ],
    likedCategories: [Category.OTHER, Category.SEASONAL, Category.BARS],
    dislikedCategories: [Category.ART],
    preferredTags: ["comedy", "trivia", "community", "social", "holiday", "family-friendly", "free", "weekly"],
  },
];

// Password for all test users
const TEST_PASSWORD = "password123";

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedCity() {
  console.log("Seeding city...");
  const denver = await prisma.city.upsert({
    where: { slug: "denver" },
    update: {},
    create: {
      name: "Denver",
      slug: "denver",
      timezone: "America/Denver",
    },
  });
  console.log(`  City: ${denver.name}`);
  return denver;
}

async function seedEvents(cityId: string) {
  console.log("\nSeeding events...");

  const events: { id: string; category: Category; tags: string[] }[] = [];

  for (const event of DENVER_EVENTS) {
    // Add neighborhood and ratings
    const neighborhood = getNeighborhood(event.venueName, event.address);
    const ratings = generateRatings(event.venueName);

    // Enrich tags with companion/vibe/social tags for detailed preferences scoring
    const enrichedTags = enrichEventTags(event.tags, event.category);

    const eventData = {
      ...event,
      tags: enrichedTags,
      cityId,
      neighborhood,
      ...ratings,
    };

    const result = await prisma.event.upsert({
      where: {
        externalId_source: {
          externalId: event.externalId,
          source: event.source,
        },
      },
      update: eventData,
      create: eventData,
    });
    events.push({ id: result.id, category: result.category, tags: result.tags });
  }

  console.log(`  Created/updated ${events.length} events`);

  // Summary by category
  const categoryCounts = events.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const [category, count] of Object.entries(categoryCounts)) {
    console.log(`    ${category}: ${count}`);
  }

  return events;
}

async function seedUsers() {
  console.log("\nSeeding users...");

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const users: { id: string; email: string; cluster: string }[] = [];

  for (const cluster of USER_CLUSTERS) {
    for (const userData of cluster.users) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          relationshipStatus: userData.relationshipStatus,
          denverTenure: userData.denverTenure,
          onboardingComplete: true,
        },
        create: {
          email: userData.email,
          name: userData.name,
          passwordHash,
          relationshipStatus: userData.relationshipStatus,
          denverTenure: userData.denverTenure,
          onboardingComplete: true,
        },
      });
      users.push({ id: user.id, email: user.email, cluster: cluster.name });
    }
  }

  console.log(`  Created/updated ${users.length} users`);
  for (const cluster of USER_CLUSTERS) {
    console.log(`    ${cluster.name}: ${cluster.users.map(u => u.email.split('@')[0]).join(', ')}`);
  }

  return users;
}

async function seedPreferences(users: { id: string; email: string; cluster: string }[]) {
  console.log("\nSeeding preferences...");

  let totalPrefs = 0;

  for (const user of users) {
    const cluster = USER_CLUSTERS.find(c => c.name === user.cluster)!;

    // Delete existing preferences for this user
    await prisma.preference.deleteMany({ where: { userId: user.id } });

    const preferences: { category: Category; preferenceType: PreferenceType; intensity: number }[] = [];

    // Add strong likes for cluster categories
    for (const category of cluster.likedCategories) {
      preferences.push({
        category,
        preferenceType: PreferenceType.LIKE,
        intensity: rng.nextInt(4, 5),
      });
    }

    // Add dislikes
    for (const category of cluster.dislikedCategories) {
      preferences.push({
        category,
        preferenceType: PreferenceType.DISLIKE,
        intensity: rng.nextInt(3, 5),
      });
    }

    // Add some neutral/mild preferences for variety
    const allCategories = Object.values(Category);
    const usedCategories = new Set([...cluster.likedCategories, ...cluster.dislikedCategories]);
    const neutralCategories = allCategories.filter(c => !usedCategories.has(c));

    for (const category of rng.pickN(neutralCategories, rng.nextInt(2, 4))) {
      preferences.push({
        category,
        preferenceType: rng.next() > 0.5 ? PreferenceType.LIKE : PreferenceType.DISLIKE,
        intensity: rng.nextInt(1, 3),
      });
    }

    // Create preferences
    for (const pref of preferences) {
      await prisma.preference.create({
        data: {
          userId: user.id,
          ...pref,
        },
      });
    }

    totalPrefs += preferences.length;
  }

  console.log(`  Created ${totalPrefs} preferences`);
}

async function seedInteractions(
  users: { id: string; email: string; cluster: string }[],
  events: { id: string; category: Category; tags: string[] }[]
) {
  console.log("\nSeeding interactions (Want/Done lists)...");

  let totalWant = 0;
  let totalDone = 0;

  for (const user of users) {
    const cluster = USER_CLUSTERS.find(c => c.name === user.cluster)!;

    // Delete existing statuses for this user
    await prisma.eventUserStatus.deleteMany({ where: { userId: user.id } });

    // Filter events by taste match
    const matchingEvents = events.filter(e =>
      cluster.likedCategories.includes(e.category) ||
      e.tags.some(t => cluster.preferredTags.includes(t))
    );

    const neutralEvents = events.filter(e =>
      !cluster.likedCategories.includes(e.category) &&
      !cluster.dislikedCategories.includes(e.category)
    );

    const surprisingEvents = events.filter(e =>
      cluster.dislikedCategories.includes(e.category)
    );

    // Select events for WANT list (8-20)
    const wantCount = rng.nextInt(8, 20);
    const wantEvents: string[] = [];

    // 70% matching taste
    const matchingWant = rng.pickN(matchingEvents, Math.floor(wantCount * 0.7));
    wantEvents.push(...matchingWant.map(e => e.id));

    // 20% neutral
    const neutralWant = rng.pickN(neutralEvents.filter(e => !wantEvents.includes(e.id)), Math.floor(wantCount * 0.2));
    wantEvents.push(...neutralWant.map(e => e.id));

    // 10% surprising
    const surprisingWant = rng.pickN(surprisingEvents.filter(e => !wantEvents.includes(e.id)), Math.ceil(wantCount * 0.1));
    wantEvents.push(...surprisingWant.map(e => e.id));

    // Select events for DONE list (3-10) from the matching events primarily
    const doneCount = rng.nextInt(3, 10);
    const doneEvents = rng.pickN(
      events.filter(e => !wantEvents.includes(e.id)),
      doneCount
    ).map(e => e.id);

    // Create WANT statuses
    for (const eventId of wantEvents) {
      await prisma.eventUserStatus.create({
        data: {
          userId: user.id,
          eventId,
          status: EventListStatus.WANT,
        },
      });
    }
    totalWant += wantEvents.length;

    // Create DONE statuses
    for (const eventId of doneEvents) {
      await prisma.eventUserStatus.create({
        data: {
          userId: user.id,
          eventId,
          status: EventListStatus.DONE,
        },
      });
    }
    totalDone += doneEvents.length;
  }

  console.log(`  Created ${totalWant} WANT statuses`);
  console.log(`  Created ${totalDone} DONE statuses`);
}

async function seedEventViews(
  users: { id: string; email: string; cluster: string }[],
  events: { id: string; category: Category; tags: string[] }[]
) {
  console.log("\nSeeding event views (for stats)...");

  let totalViews = 0;

  for (const user of users) {
    // Delete existing views for this user
    await prisma.eventView.deleteMany({ where: { userId: user.id } });

    // Each user views 15-40 events
    const viewCount = rng.nextInt(15, 40);
    const viewedEvents = rng.pickN(events, viewCount);

    for (const event of viewedEvents) {
      // Create 1-3 views per event (simulating revisits)
      const viewsForEvent = rng.nextInt(1, 3);

      for (let i = 0; i < viewsForEvent; i++) {
        await prisma.eventView.create({
          data: {
            userId: user.id,
            eventId: event.id,
            createdAt: hoursAgo(rng.nextInt(1, 720)), // Random time in last 30 days
          },
        });
        totalViews++;
      }
    }
  }

  console.log(`  Created ${totalViews} event views`);
}

async function seedUserEventInteractions(
  users: { id: string; email: string; cluster: string }[],
  events: { id: string; category: Category; tags: string[] }[]
) {
  console.log("\nSeeding UserEventInteraction (likes for recommendations)...");

  let totalLikes = 0;

  for (const user of users) {
    const cluster = USER_CLUSTERS.find(c => c.name === user.cluster)!;

    // Delete existing interactions for this user
    await prisma.userEventInteraction.deleteMany({ where: { userId: user.id } });

    // Like events that match user's taste
    const matchingEvents = events.filter(e =>
      cluster.likedCategories.includes(e.category) ||
      e.tags.some(t => cluster.preferredTags.includes(t))
    );

    // Like 10-25 events
    const likeCount = rng.nextInt(10, 25);
    const likedEvents = rng.pickN(matchingEvents, Math.min(likeCount, matchingEvents.length));

    for (const event of likedEvents) {
      await prisma.userEventInteraction.create({
        data: {
          userId: user.id,
          eventId: event.id,
          status: InteractionStatus.SAVED,
          liked: true,
        },
      });
      totalLikes++;
    }

    // Add some non-liked saved events for variety
    const otherEvents = rng.pickN(
      events.filter(e => !likedEvents.some(le => le.id === e.id)),
      rng.nextInt(3, 8)
    );

    for (const event of otherEvents) {
      await prisma.userEventInteraction.create({
        data: {
          userId: user.id,
          eventId: event.id,
          status: InteractionStatus.SAVED,
          liked: false,
        },
      });
    }
  }

  console.log(`  Created ${totalLikes} liked interactions`);
}

// ============================================================================
// NEW ITEM MODEL SEEDING (for Places and new item-based features)
// ============================================================================

async function seedItems(cityId: string) {
  console.log("\nSeeding items (new unified model)...");

  const items: { id: string; type: ItemType; category: Category; tags: string[] }[] = [];

  // Seed events as Items
  for (const event of DENVER_EVENTS) {
    // Add neighborhood and ratings
    const neighborhood = getNeighborhood(event.venueName, event.address);
    const ratings = generateRatings(event.venueName);

    const result = await prisma.item.upsert({
      where: {
        externalId_source: {
          externalId: event.externalId,
          source: event.source,
        },
      },
      update: {
        type: ItemType.EVENT,
        cityId,
        title: event.title,
        description: event.description,
        category: event.category,
        tags: event.tags,
        venueName: event.venueName,
        address: event.address,
        neighborhood,
        startTime: event.startTime,
        endTime: event.endTime,
        priceRange: event.priceRange,
        source: event.source,
        sourceUrl: event.sourceUrl,
        ...ratings,
      },
      create: {
        type: ItemType.EVENT,
        cityId,
        title: event.title,
        description: event.description,
        category: event.category,
        tags: event.tags,
        venueName: event.venueName,
        address: event.address,
        neighborhood,
        startTime: event.startTime,
        endTime: event.endTime,
        priceRange: event.priceRange,
        source: event.source,
        sourceUrl: event.sourceUrl,
        externalId: event.externalId,
        ...ratings,
      },
    });
    items.push({ id: result.id, type: result.type, category: result.category, tags: result.tags });
  }

  console.log(`  Created/updated ${DENVER_EVENTS.length} events as items`);

  // Seed places as Items
  for (const place of DENVER_PLACES) {
    // Add ratings
    const ratings = generateRatings(place.venueName);

    const result = await prisma.item.upsert({
      where: {
        externalId_source: {
          externalId: place.externalId,
          source: place.source,
        },
      },
      update: {
        type: ItemType.PLACE,
        cityId,
        title: place.title,
        description: place.description,
        category: place.category,
        tags: place.tags,
        venueName: place.venueName,
        address: place.address,
        priceRange: place.priceRange,
        source: place.source,
        sourceUrl: place.sourceUrl,
        neighborhood: place.neighborhood,
        hours: place.hours,
        ...ratings,
      },
      create: {
        type: ItemType.PLACE,
        cityId,
        title: place.title,
        description: place.description,
        category: place.category,
        tags: place.tags,
        venueName: place.venueName,
        address: place.address,
        priceRange: place.priceRange,
        source: place.source,
        sourceUrl: place.sourceUrl,
        externalId: place.externalId,
        neighborhood: place.neighborhood,
        hours: place.hours,
        ...ratings,
      },
    });
    items.push({ id: result.id, type: result.type, category: result.category, tags: result.tags });
  }

  console.log(`  Created/updated ${DENVER_PLACES.length} places as items`);

  // Summary by type and category
  const typeCounts = items.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`  Total items: ${items.length}`);
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`    ${type}: ${count}`);
  }

  return items;
}

async function seedItemStatuses(
  users: { id: string; email: string; cluster: string }[],
  items: { id: string; type: ItemType; category: Category; tags: string[] }[]
) {
  console.log("\nSeeding item statuses (WANT/DONE/PASS)...");

  let totalWant = 0;
  let totalDone = 0;
  let totalPass = 0;

  for (const user of users) {
    const cluster = USER_CLUSTERS.find(c => c.name === user.cluster)!;

    // Delete existing statuses for this user
    await prisma.userItemStatus.deleteMany({ where: { userId: user.id } });

    // Filter items by taste match
    const matchingItems = items.filter(i =>
      cluster.likedCategories.includes(i.category) ||
      i.tags.some(t => cluster.preferredTags.includes(t))
    );

    const dislikedItems = items.filter(i =>
      cluster.dislikedCategories.includes(i.category)
    );

    const neutralItems = items.filter(i =>
      !cluster.likedCategories.includes(i.category) &&
      !cluster.dislikedCategories.includes(i.category)
    );

    // Select items for WANT list (10-25)
    const wantCount = rng.nextInt(10, 25);
    const wantItems = rng.pickN(matchingItems, Math.min(wantCount, matchingItems.length));

    // Select items for DONE list (5-15)
    const doneCount = rng.nextInt(5, 15);
    const doneItems = rng.pickN(
      [...matchingItems, ...neutralItems].filter(i => !wantItems.some(w => w.id === i.id)),
      doneCount
    );

    // Select items for PASS list (3-10) - primarily from disliked categories
    const passCount = rng.nextInt(3, 10);
    const passItems = rng.pickN(
      [...dislikedItems, ...rng.pickN(neutralItems, 5)].filter(
        i => !wantItems.some(w => w.id === i.id) && !doneItems.some(d => d.id === i.id)
      ),
      passCount
    );

    // Create statuses using upsert to handle any potential duplicates
    for (const item of wantItems) {
      await prisma.userItemStatus.upsert({
        where: { userId_itemId: { userId: user.id, itemId: item.id } },
        update: { status: ItemStatus.WANT },
        create: { userId: user.id, itemId: item.id, status: ItemStatus.WANT },
      });
    }
    totalWant += wantItems.length;

    for (const item of doneItems) {
      await prisma.userItemStatus.upsert({
        where: { userId_itemId: { userId: user.id, itemId: item.id } },
        update: { status: ItemStatus.DONE },
        create: { userId: user.id, itemId: item.id, status: ItemStatus.DONE },
      });
    }
    totalDone += doneItems.length;

    for (const item of passItems) {
      await prisma.userItemStatus.upsert({
        where: { userId_itemId: { userId: user.id, itemId: item.id } },
        update: { status: ItemStatus.PASS },
        create: { userId: user.id, itemId: item.id, status: ItemStatus.PASS },
      });
    }
    totalPass += passItems.length;
  }

  console.log(`  Created ${totalWant} WANT statuses`);
  console.log(`  Created ${totalDone} DONE statuses`);
  console.log(`  Created ${totalPass} PASS statuses`);
}

async function seedItemRatings(
  users: { id: string; email: string; cluster: string }[],
  items: { id: string; type: ItemType; category: Category; tags: string[] }[]
) {
  console.log("\nSeeding item ratings...");

  let totalRatings = 0;

  for (const user of users) {
    const cluster = USER_CLUSTERS.find(c => c.name === user.cluster)!;

    // Delete existing ratings for this user
    await prisma.userItemRating.deleteMany({ where: { userId: user.id } });

    // Get user's DONE items
    const doneStatuses = await prisma.userItemStatus.findMany({
      where: { userId: user.id, status: ItemStatus.DONE },
      select: { itemId: true },
    });

    if (doneStatuses.length === 0) continue;

    // Rate 60-90% of done items
    const rateCount = Math.floor(doneStatuses.length * (0.6 + rng.next() * 0.3));
    const itemsToRate = rng.pickN(doneStatuses.map(s => s.itemId), rateCount);

    for (const itemId of itemsToRate) {
      const item = items.find(i => i.id === itemId);
      if (!item) continue;

      // Rating based on taste match
      let rating: number;
      if (cluster.likedCategories.includes(item.category)) {
        // Liked categories: mostly 4-5, occasionally 3
        rating = rng.next() < 0.8 ? rng.nextInt(4, 5) : 3;
      } else if (cluster.dislikedCategories.includes(item.category)) {
        // Disliked categories: mostly 1-2, occasionally 3
        rating = rng.next() < 0.8 ? rng.nextInt(1, 2) : 3;
      } else {
        // Neutral: bell curve around 3
        rating = rng.nextInt(2, 4);
      }

      // Optional notes for high/low ratings
      let notes: string | undefined;
      if (rating === 5) {
        notes = rng.pick(["Amazing!", "Would definitely go again", "Highly recommend", "Best in Denver"]);
      } else if (rating === 1) {
        notes = rng.pick(["Not for me", "Disappointing", "Expected more", "Wouldn't return"]);
      }

      await prisma.userItemRating.create({
        data: {
          userId: user.id,
          itemId,
          rating,
          notes,
        },
      });
      totalRatings++;
    }
  }

  console.log(`  Created ${totalRatings} ratings`);
}

async function seedItemViews(
  users: { id: string; email: string; cluster: string }[],
  items: { id: string; type: ItemType; category: Category; tags: string[] }[]
) {
  console.log("\nSeeding item views...");

  let totalViews = 0;

  for (const user of users) {
    // Delete existing views for this user
    await prisma.itemView.deleteMany({ where: { userId: user.id } });

    // Each user views 20-50 items
    const viewCount = rng.nextInt(20, 50);
    const viewedItems = rng.pickN(items, viewCount);

    for (const item of viewedItems) {
      // Create 1-3 views per item
      const viewsForItem = rng.nextInt(1, 3);

      for (let i = 0; i < viewsForItem; i++) {
        await prisma.itemView.create({
          data: {
            userId: user.id,
            itemId: item.id,
            createdAt: hoursAgo(rng.nextInt(1, 720)),
          },
        });
        totalViews++;
      }
    }
  }

  console.log(`  Created ${totalViews} item views`);
}

// ============================================================================
// INFLUENCER DATA
// ============================================================================

interface InfluencerData {
  handle: string;
  displayName: string;
  bio: string;
  vibeDescription: string;
  preferredCategories: Category[];
}

const INFLUENCERS: InfluencerData[] = [
  {
    handle: "denverdate",
    displayName: "Denver Date Night",
    bio: "Curating the most romantic spots in the Mile High City. From sunset dinners to intimate bars, I find the perfect places for you and your special someone.",
    vibeDescription: "Romantic spots, upscale dining, sunset views, intimate atmosphere",
    preferredCategories: [Category.RESTAURANT, Category.BARS, Category.ART],
  },
  {
    handle: "milehighoutdoors",
    displayName: "Mile High Outdoors",
    bio: "Adventure seeker exploring Denver's best outdoor activities. Hiking, biking, and everything under the Colorado sun.",
    vibeDescription: "Outdoor activities, fitness, nature, adventure sports",
    preferredCategories: [Category.OUTDOORS, Category.FITNESS, Category.ACTIVITY_VENUE],
  },
  {
    handle: "denverbeats",
    displayName: "Denver Beats",
    bio: "Your guide to Denver's vibrant music scene. Live shows, hidden venues, and the best sounds in town.",
    vibeDescription: "Live music, concerts, nightlife, emerging artists",
    preferredCategories: [Category.LIVE_MUSIC, Category.BARS, Category.POPUP],
  },
  {
    handle: "5280foodie",
    displayName: "5280 Foodie",
    bio: "Eating my way through Denver one restaurant at a time. From food trucks to fine dining, I've got your next meal covered.",
    vibeDescription: "Restaurants, new openings, food trends, culinary experiences",
    preferredCategories: [Category.RESTAURANT, Category.FOOD, Category.COFFEE],
  },
  {
    handle: "freeinflyover",
    displayName: "Free in Flyover",
    bio: "Proving you don't need a big budget to have big fun in Denver. Free events, cheap eats, and budget-friendly adventures.",
    vibeDescription: "Free events, budget activities, affordable dining, local secrets",
    preferredCategories: [Category.OUTDOORS, Category.ART, Category.SEASONAL],
  },
  {
    handle: "artdenver",
    displayName: "Art Denver",
    bio: "Celebrating Denver's creative spirit. Galleries, museums, street art, and everything that inspires the soul.",
    vibeDescription: "Art exhibitions, museums, cultural events, creative spaces",
    preferredCategories: [Category.ART, Category.ACTIVITY_VENUE, Category.POPUP],
  },
  {
    handle: "denverwellness",
    displayName: "Denver Wellness",
    bio: "Mind, body, and spirit in the Mile High City. Yoga, meditation, healthy eats, and spaces to find your zen.",
    vibeDescription: "Wellness, yoga, meditation, healthy dining, self-care",
    preferredCategories: [Category.FITNESS, Category.COFFEE, Category.OUTDOORS],
  },
  {
    handle: "lodonights",
    displayName: "LoDo Nights",
    bio: "When the sun goes down, Denver comes alive. Your insider guide to the best bars, clubs, and late-night spots.",
    vibeDescription: "Nightlife, bars, clubs, late-night dining, party scene",
    preferredCategories: [Category.BARS, Category.LIVE_MUSIC, Category.FOOD],
  },
];

// Pick reasons by category
const PICK_REASONS: Record<Category, string[]> = {
  [Category.RESTAURANT]: ["Best new opening this month", "A must-try for foodies", "Perfect for a special night out", "My current obsession"],
  [Category.BARS]: ["Killer cocktails here", "Best vibe in town", "Hidden gem alert", "Where I go to unwind"],
  [Category.LIVE_MUSIC]: ["Don't miss this show", "Incredible live performance", "The sound is unreal", "Future headliner material"],
  [Category.ART]: ["Stunning exhibition", "Mind-blowing creativity", "Art that moves you", "Culture at its finest"],
  [Category.COFFEE]: ["Best brew in Denver", "Perfect for remote work", "Cozy vibes guaranteed", "My morning ritual spot"],
  [Category.OUTDOORS]: ["Views for days", "Adventure awaits", "Fresh air therapy", "Colorado at its best"],
  [Category.FITNESS]: ["Great workout spot", "Get your sweat on", "Community vibes here", "Fitness goals achieved"],
  [Category.SEASONAL]: ["Limited time only!", "Seasonal must-do", "Holiday magic", "Don't miss the season"],
  [Category.POPUP]: ["Here today, gone tomorrow", "Exclusive find", "Pop-up perfection", "Catch it while you can"],
  [Category.OTHER]: ["Something special", "Worth checking out", "Hidden treasure", "On my radar"],
  [Category.ACTIVITY_VENUE]: ["So much fun here", "Perfect for groups", "Entertainment central", "Great for a day out"],
  [Category.FOOD]: ["Delicious discovery", "Taste sensation", "Foodie heaven", "Flavor explosion"],
};

async function seedInfluencers() {
  console.log("\nSeeding influencers...");

  const createdInfluencers: { id: string; handle: string; preferredCategories: Category[] }[] = [];

  for (const inf of INFLUENCERS) {
    const existing = await prisma.influencer.findUnique({
      where: { handle: inf.handle },
    });

    if (existing) {
      createdInfluencers.push({
        id: existing.id,
        handle: existing.handle,
        preferredCategories: inf.preferredCategories,
      });
      continue;
    }

    const influencer = await prisma.influencer.create({
      data: {
        handle: inf.handle,
        displayName: inf.displayName,
        bio: inf.bio,
        vibeDescription: inf.vibeDescription,
        preferredCategories: inf.preferredCategories,
        profileImageUrl: `/influencers/${inf.handle}.png`,
        citySlug: "denver",
      },
    });

    createdInfluencers.push({
      id: influencer.id,
      handle: influencer.handle,
      preferredCategories: inf.preferredCategories,
    });
  }

  console.log(`  Created/updated ${createdInfluencers.length} influencers`);
  return createdInfluencers;
}

async function seedInfluencerPicks(
  influencers: { id: string; handle: string; preferredCategories: Category[] }[],
  items: { id: string; type: ItemType; category: Category; tags: string[] }[]
) {
  console.log("\nSeeding influencer picks...");

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let totalPickSets = 0;
  let totalPicks = 0;

  for (const influencer of influencers) {
    // Delete existing pick sets for this influencer
    await prisma.influencerPickSet.deleteMany({
      where: { influencerId: influencer.id },
    });

    // Get items matching this influencer's preferred categories
    const matchingItems = items.filter(
      (i) => influencer.preferredCategories.includes(i.category)
    );

    if (matchingItems.length < 5) continue;

    // Create weekly pick set
    const weeklyPicks = rng.pickN(matchingItems, Math.min(8, matchingItems.length));
    const weeklySet = await prisma.influencerPickSet.create({
      data: {
        influencerId: influencer.id,
        range: PickSetRange.WEEK,
        title: `${INFLUENCERS.find((i) => i.handle === influencer.handle)?.displayName}'s Weekly Picks`,
        summaryText: `Here are my top picks for this week! Each one has been personally vetted.`,
        expiresAt: weekFromNow,
        isAiGenerated: false,
      },
    });
    totalPickSets++;

    for (let i = 0; i < weeklyPicks.length; i++) {
      const pick = weeklyPicks[i];
      const reasons = PICK_REASONS[pick.category] || PICK_REASONS[Category.OTHER];
      await prisma.influencerPick.create({
        data: {
          pickSetId: weeklySet.id,
          itemId: pick.id,
          rank: i + 1,
          reason: rng.pick(reasons),
        },
      });
      totalPicks++;
    }

    // Create monthly pick set
    const monthlyItems = items.filter(
      (i) =>
        influencer.preferredCategories.includes(i.category) &&
        !weeklyPicks.some((w) => w.id === i.id)
    );
    const monthlyPicks = rng.pickN(monthlyItems, Math.min(15, monthlyItems.length));

    const monthlySet = await prisma.influencerPickSet.create({
      data: {
        influencerId: influencer.id,
        range: PickSetRange.MONTH,
        title: `${INFLUENCERS.find((i) => i.handle === influencer.handle)?.displayName}'s Monthly Favorites`,
        summaryText: `My top discoveries and favorites for the month. Take your time exploring these gems!`,
        expiresAt: monthFromNow,
        isAiGenerated: false,
      },
    });
    totalPickSets++;

    for (let i = 0; i < monthlyPicks.length; i++) {
      const pick = monthlyPicks[i];
      const reasons = PICK_REASONS[pick.category] || PICK_REASONS[Category.OTHER];
      await prisma.influencerPick.create({
        data: {
          pickSetId: monthlySet.id,
          itemId: pick.id,
          rank: i + 1,
          reason: rng.pick(reasons),
        },
      });
      totalPicks++;
    }
  }

  console.log(`  Created ${totalPickSets} pick sets with ${totalPicks} total picks`);
}

// ============================================================================
// RECOMMENDATION TUNING SEED FUNCTIONS
// ============================================================================

// Constraints profiles for different user types
const CONSTRAINT_PROFILES: Record<string, {
  preferredDays: DayOfWeek[];
  preferredTimes: TimeOfDay[];
  budgetMax: BudgetPreference;
  homeNeighborhood: string | null;
  neighborhoods: string[];
  freeEventsOnly: boolean;
  discoveryMode: boolean;
  travelRadius: number | null;
}> = {
  "Music & Nightlife": {
    preferredDays: [DayOfWeek.FRIDAY, DayOfWeek.SATURDAY],
    preferredTimes: [TimeOfDay.EVENING, TimeOfDay.LATE_NIGHT],
    budgetMax: BudgetPreference.UNDER_100,
    homeNeighborhood: "RiNo",
    neighborhoods: ["RiNo", "LoDo", "Five Points", "Capitol Hill"],
    freeEventsOnly: false,
    discoveryMode: true,
    travelRadius: null,
  },
  "Wellness & Outdoors": {
    preferredDays: [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY, DayOfWeek.WEDNESDAY],
    preferredTimes: [TimeOfDay.MORNING, TimeOfDay.AFTERNOON],
    budgetMax: BudgetPreference.UNDER_50,
    homeNeighborhood: "Wash Park",
    neighborhoods: ["Wash Park", "City Park", "Cheesman Park", "Sloan's Lake"],
    freeEventsOnly: false,
    discoveryMode: false,
    travelRadius: 15,
  },
  "Art & Food": {
    preferredDays: [DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY],
    preferredTimes: [TimeOfDay.AFTERNOON, TimeOfDay.EVENING],
    budgetMax: BudgetPreference.ANY,
    homeNeighborhood: "LoHi",
    neighborhoods: ["LoHi", "RiNo", "LoDo", "Cherry Creek", "Golden Triangle"],
    freeEventsOnly: false,
    discoveryMode: true,
    travelRadius: null,
  },
  "Comedy & Community": {
    preferredDays: [DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY],
    preferredTimes: [TimeOfDay.EVENING],
    budgetMax: BudgetPreference.UNDER_25,
    homeNeighborhood: "Capitol Hill",
    neighborhoods: ["Capitol Hill", "Baker", "LoDo", "RiNo"],
    freeEventsOnly: false,
    discoveryMode: false,
    travelRadius: 10,
  },
};

async function seedUserFeedback(
  users: { id: string; email: string; cluster: string }[],
  events: { id: string; category: Category; tags: string[] }[]
) {
  console.log("\nSeeding user feedback (tuning controls)...");

  let totalFeedback = 0;

  for (const user of users) {
    const cluster = USER_CLUSTERS.find(c => c.name === user.cluster)!;

    // Delete existing feedback
    await prisma.userFeedback.deleteMany({ where: { userId: user.id } });

    // Create MORE feedback for events in liked categories
    const likedEvents = events.filter(e => cluster.likedCategories.includes(e.category));
    const moreFeedbackEvents = rng.pickN(likedEvents, Math.min(5, likedEvents.length));

    for (const event of moreFeedbackEvents) {
      await prisma.userFeedback.create({
        data: {
          userId: user.id,
          eventId: event.id,
          feedbackType: FeedbackType.MORE,
          category: event.category,
          tags: event.tags.slice(0, 3),
        },
      });
      totalFeedback++;
    }

    // Create LESS feedback for events in disliked categories
    const dislikedEvents = events.filter(e => cluster.dislikedCategories.includes(e.category));
    const lessFeedbackEvents = rng.pickN(dislikedEvents, Math.min(3, dislikedEvents.length));

    for (const event of lessFeedbackEvents) {
      await prisma.userFeedback.create({
        data: {
          userId: user.id,
          eventId: event.id,
          feedbackType: FeedbackType.LESS,
          category: event.category,
          tags: event.tags.slice(0, 3),
        },
      });
      totalFeedback++;
    }

    // Create HIDE feedback for a few random events (simulating passed events)
    const otherEvents = events.filter(
      e => !cluster.likedCategories.includes(e.category) &&
           !cluster.dislikedCategories.includes(e.category)
    );
    const hideFeedbackEvents = rng.pickN(otherEvents, Math.min(2, otherEvents.length));

    for (const event of hideFeedbackEvents) {
      await prisma.userFeedback.create({
        data: {
          userId: user.id,
          eventId: event.id,
          feedbackType: FeedbackType.HIDE,
          category: event.category,
          tags: event.tags.slice(0, 2),
        },
      });
      totalFeedback++;
    }
  }

  console.log(`  Created ${totalFeedback} feedback entries`);
}

async function seedUserConstraints(
  users: { id: string; email: string; cluster: string }[]
) {
  console.log("\nSeeding user constraints (preferences)...");

  let totalConstraints = 0;

  for (const user of users) {
    const profile = CONSTRAINT_PROFILES[user.cluster];
    if (!profile) continue;

    await prisma.userConstraints.upsert({
      where: { userId: user.id },
      update: {
        preferredDays: profile.preferredDays,
        preferredTimes: profile.preferredTimes,
        budgetMax: profile.budgetMax,
        homeNeighborhood: profile.homeNeighborhood,
        neighborhoods: profile.neighborhoods,
        freeEventsOnly: profile.freeEventsOnly,
        discoveryMode: profile.discoveryMode,
        travelRadius: profile.travelRadius,
      },
      create: {
        userId: user.id,
        preferredDays: profile.preferredDays,
        preferredTimes: profile.preferredTimes,
        budgetMax: profile.budgetMax,
        homeNeighborhood: profile.homeNeighborhood,
        neighborhoods: profile.neighborhoods,
        freeEventsOnly: profile.freeEventsOnly,
        discoveryMode: profile.discoveryMode,
        travelRadius: profile.travelRadius,
      },
    });
    totalConstraints++;
  }

  console.log(`  Created ${totalConstraints} user constraint profiles`);
}

async function seedEventFeedViews(
  users: { id: string; email: string; cluster: string }[],
  events: { id: string; category: Category; tags: string[] }[]
) {
  console.log("\nSeeding event feed views (for diversity/decay)...");

  let totalFeedViews = 0;

  for (const user of users) {
    const cluster = USER_CLUSTERS.find(c => c.name === user.cluster)!;

    // Delete existing feed views
    await prisma.eventFeedView.deleteMany({ where: { userId: user.id } });

    // Create feed views for events the user might have seen
    const viewedEvents = rng.pickN(events, rng.nextInt(15, 30));

    for (const event of viewedEvents) {
      const isLikedCategory = cluster.likedCategories.includes(event.category);
      const seenCount = rng.nextInt(1, isLikedCategory ? 5 : 2);
      const interacted = isLikedCategory && rng.next() > 0.4;

      await prisma.eventFeedView.create({
        data: {
          userId: user.id,
          eventId: event.id,
          seenCount,
          lastShownAt: hoursAgo(rng.nextInt(1, 72)),
          interacted,
        },
      });
      totalFeedViews++;
    }
  }

  console.log(`  Created ${totalFeedViews} feed view entries`);
}

// Plan templates by type
const PLAN_TEMPLATES: Record<PlanType, { names: string[]; descriptions: string[] }> = {
  DATE_NIGHT: {
    names: ["Perfect Date Night", "Romantic Evening", "Anniversary Celebration", "Friday Night Date"],
    descriptions: ["A romantic evening exploring the best of Denver", "Quality time with someone special"],
  },
  SOCIAL: {
    names: ["Weekend with Friends", "Squad Night Out", "Birthday Celebration", "Reunion Hangout"],
    descriptions: ["Fun times with the crew", "Making memories with friends"],
  },
  SOLO_CHILL: {
    names: ["Me Time Sunday", "Self-Care Saturday", "Solo Adventure", "Personal Discovery Day"],
    descriptions: ["Quality time for yourself", "Exploring at your own pace"],
  },
  FAMILY_FUN: {
    names: ["Family Fun Day", "Weekend Family Outing", "Kid-Friendly Adventure", "Family Exploration"],
    descriptions: ["Activities the whole family will love", "Creating family memories"],
  },
  CUSTOM: {
    names: ["My Custom Plan", "Personalized Itinerary", "Mix & Match Day"],
    descriptions: ["A unique plan tailored to your interests"],
  },
};

async function seedPlans(
  users: { id: string; email: string; cluster: string }[],
  events: { id: string; category: Category; tags: string[] }[]
) {
  console.log("\nSeeding plans...");

  let totalPlans = 0;
  let totalPlanEvents = 0;

  // Create 1-2 plans per user
  for (const user of users) {
    const cluster = USER_CLUSTERS.find(c => c.name === user.cluster)!;

    // Delete existing plans
    await prisma.plan.deleteMany({ where: { userId: user.id } });

    // Determine plan type based on user cluster
    let planTypes: PlanType[] = [];
    if (user.cluster === "Music & Nightlife") {
      planTypes = [PlanType.SOCIAL, PlanType.DATE_NIGHT];
    } else if (user.cluster === "Wellness & Outdoors") {
      planTypes = [PlanType.SOLO_CHILL, PlanType.FAMILY_FUN];
    } else if (user.cluster === "Art & Food") {
      planTypes = [PlanType.DATE_NIGHT, PlanType.CUSTOM];
    } else {
      planTypes = [PlanType.SOCIAL, PlanType.FAMILY_FUN];
    }

    const numPlans = rng.nextInt(1, 2);
    for (let p = 0; p < numPlans; p++) {
      const planType = planTypes[p % planTypes.length];
      const template = PLAN_TEMPLATES[planType];

      // Get events matching the user's preferences
      const matchingEvents = events.filter(e => cluster.likedCategories.includes(e.category));
      const planEvents = rng.pickN(matchingEvents, rng.nextInt(2, 4));

      if (planEvents.length < 2) continue;

      // Determine going with based on plan type
      let goingWith: GoingWith;
      switch (planType) {
        case PlanType.DATE_NIGHT:
          goingWith = GoingWith.DATE;
          break;
        case PlanType.SOCIAL:
          goingWith = GoingWith.FRIENDS;
          break;
        case PlanType.FAMILY_FUN:
          goingWith = GoingWith.FAMILY;
          break;
        default:
          goingWith = GoingWith.SOLO;
      }

      // Create plan
      const daysFromNowStart = rng.nextInt(1, 14);
      const plan = await prisma.plan.create({
        data: {
          userId: user.id,
          name: rng.pick(template.names),
          planType,
          goingWith,
          dateStart: daysFromNow(daysFromNowStart, 10),
          dateEnd: daysFromNow(daysFromNowStart, 23),
          totalCost: rng.pick(["Free", "Under $25", "Under $50", "Under $100"]),
          neighborhoods: [...new Set(CONSTRAINT_PROFILES[user.cluster]?.neighborhoods || ["LoDo", "RiNo"])].slice(0, 3),
          isPublic: rng.next() > 0.7,
        },
      });
      totalPlans++;

      // Add events to plan
      for (let i = 0; i < planEvents.length; i++) {
        await prisma.planEvent.create({
          data: {
            planId: plan.id,
            eventId: planEvents[i].id,
            order: i,
            notes: i === 0 ? "Starting point!" : null,
          },
        });
        totalPlanEvents++;
      }
    }
  }

  console.log(`  Created ${totalPlans} plans with ${totalPlanEvents} plan events`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("PULSE APP - COMPREHENSIVE SEED SCRIPT");
  console.log("=".repeat(60));
  console.log("\nThis script creates test data for:");
  console.log("  - 80+ Denver events across all categories");
  console.log("  - 40+ Denver places (restaurants, bars, coffee, activities)");
  console.log("  - 12 test users in 4 taste clusters");
  console.log("  - Preferences, Want/Done/Pass lists, ratings, and views");
  console.log("  - User feedback (tuning controls) and constraints");
  console.log("  - Sample plans with events");
  console.log("");

  const city = await seedCity();

  // Legacy event model (kept for backward compatibility)
  const events = await seedEvents(city.id);

  // New unified Item model (events + places)
  const items = await seedItems(city.id);

  // Users and preferences
  const users = await seedUsers();
  await seedPreferences(users);

  // Legacy interactions
  await seedInteractions(users, events);
  await seedEventViews(users, events);
  await seedUserEventInteractions(users, events);

  // New item-based interactions
  await seedItemStatuses(users, items);
  await seedItemRatings(users, items);
  await seedItemViews(users, items);

  // Influencer system
  const influencers = await seedInfluencers();
  await seedInfluencerPicks(influencers, items);

  // Recommendation tuning features
  await seedUserFeedback(users, events);
  await seedUserConstraints(users);
  await seedEventFeedViews(users, events);
  await seedPlans(users, events);

  console.log("\n" + "=".repeat(60));
  console.log("SEED COMPLETE!");
  console.log("=".repeat(60));
  console.log("\nTest accounts (password: password123):");
  console.log("");
  console.log("  Music/Nightlife cluster:");
  console.log("    music1@pulse.local, music2@pulse.local, music3@pulse.local");
  console.log("");
  console.log("  Wellness/Outdoors cluster:");
  console.log("    wellness1@pulse.local, wellness2@pulse.local, wellness3@pulse.local");
  console.log("");
  console.log("  Art/Food cluster:");
  console.log("    artfood1@pulse.local, artfood2@pulse.local, artfood3@pulse.local");
  console.log("");
  console.log("  Comedy/Community cluster:");
  console.log("    community1@pulse.local, community2@pulse.local, community3@pulse.local");
  console.log("");
  console.log("Features to test:");
  console.log("  - /feed → Events with 'Suggested for you' section");
  console.log("  - /places → Places browse page with category filtering");
  console.log("  - /places/[id] → Place detail with WANT/DONE/PASS and ratings");
  console.log("  - Recommendations based on user's taste profile");
  console.log("  - EventCard tuning controls (More/Less like this, Hide)");
  console.log("  - Calendar integration (Google/Outlook/Apple)");
  console.log("  - Sharing functionality");
  console.log("  - User constraints/preferences");
  console.log("  - Plan Builder feature");
  console.log("");
  console.log("Verification by cluster:");
  console.log("  - music1@pulse.local → music/bar events & places");
  console.log("    Constraints: Fri-Sat evenings, RiNo neighborhood");
  console.log("  - wellness1@pulse.local → outdoor/fitness & coffee places");
  console.log("    Constraints: Weekend mornings, Wash Park neighborhood");
  console.log("  - artfood1@pulse.local → art/food events & restaurants");
  console.log("    Constraints: Thu-Sun afternoons, LoHi neighborhood");
  console.log("  - community1@pulse.local → comedy/community & activity venues");
  console.log("    Constraints: Wed-Sat evenings, Capitol Hill neighborhood");
  console.log("");
  console.log("Influencers:");
  console.log("  - @denverdate (Date Night) - romantic spots, dining");
  console.log("  - @milehighoutdoors - outdoor adventures");
  console.log("  - @denverbeats - live music, nightlife");
  console.log("  - @5280foodie - restaurants, food trends");
  console.log("  - @freeinflyover - budget-friendly activities");
  console.log("  - @artdenver - art, museums, culture");
  console.log("  - @denverwellness - fitness, wellness, coffee");
  console.log("  - @lodonights - bars, clubs, late-night");
  console.log("");
  console.log("To generate AI influencer avatars (requires OPENAI_API_KEY):");
  console.log("  npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' scripts/generate-influencer-avatars.ts");
  console.log("");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
