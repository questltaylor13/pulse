/**
 * Jensen Demo Seed Script
 *
 * Adds curated Denver events/activities + Jensen's account.
 * Uses upsert logic — safe to run multiple times.
 * Does NOT delete existing data.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-jensen.ts
 */

import { PrismaClient, Category, PreferenceType, RelationshipStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { classifyEvent } from "../lib/scrapers/classify";

const prisma = new PrismaClient();

// ============================================================================
// SEED DATA
// ============================================================================

interface SeedEvent {
  title: string;
  venueName: string;
  address: string;
  description: string;
  category: Category;
  tags: string[];
  priceRange: string;
  startTime: Date;
  isRecurring: boolean;
  source: string;
  externalId: string;
}

// Helper: date relative to today
function daysFromNow(days: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// Far future for permanent activities
const FAR_FUTURE = new Date("2026-12-31T00:00:00.000Z");

const SEED_EVENTS: SeedEvent[] = [
  // ========== FITNESS & SPORTS (Permanent) ==========
  {
    title: "Denver Bouldering Club",
    venueName: "Denver Bouldering Club",
    address: "1235 Delaware St, Denver CO",
    description: "Over 35,000 sq ft of climbing terrain across three locations. 24/7 member access, 120+ boulder problems maintained daily. Community vibes, coffee, and gear on site.",
    category: "FITNESS" as Category,
    tags: ["bouldering", "climbing", "fitness", "indoor", "social", "high-energy", "friends-group"],
    priceRange: "$20 day pass / $79/mo membership",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-denver-bouldering-club",
  },
  {
    title: "Movement RiNo",
    venueName: "Movement RiNo",
    address: "3201 Walnut St Suite 107, Denver CO",
    description: "40,000 sq ft bouldering facility in a converted tin factory, partnered with Improper City. Nearly 200 boulder problems for all levels. Yoga and fitness classes included.",
    category: "FITNESS" as Category,
    tags: ["bouldering", "climbing", "yoga", "fitness", "social", "RiNo", "high-energy", "friends-group"],
    priceRange: "$24 day pass",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-movement-rino",
  },
  {
    title: "The Spot Denver",
    venueName: "The Spot Denver",
    address: "Golden Triangle, Denver CO",
    description: "19,000 sq ft of bouldering with sweeping walls, tons of natural light, and beer on tap. One of Denver's most welcoming climbing communities. Yoga classes and a full gym included.",
    category: "FITNESS" as Category,
    tags: ["bouldering", "climbing", "community", "fitness", "high-energy", "friends-group"],
    priceRange: "$26 day pass",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-the-spot-denver",
  },
  {
    title: "Mile Hi Pickleball",
    venueName: "Mile Hi Pickleball",
    address: "3700 Havana St, Denver CO",
    description: "Denver's premier indoor pickleball facility with 11 climate-controlled courts. Lessons, leagues, social events, tournaments, plus a bar and lounge for post-game hangs.",
    category: "FITNESS" as Category,
    tags: ["pickleball", "sports", "social", "indoor", "leagues", "high-energy", "friends-group"],
    priceRange: "$10-15 drop-in",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-mile-hi-pickleball",
  },
  {
    title: "Pickleball Food Pub",
    venueName: "Pickleball Food Pub",
    address: "7647 W 88th Ave, Westminster CO",
    description: "Indoor and outdoor pickleball courts with a full bar serving local craft beers. Leagues, tournaments, and drop-in play.",
    category: "FITNESS" as Category,
    tags: ["pickleball", "social", "sports", "high-energy", "friends-group"],
    priceRange: "$30-40/hr court rental",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-pickleball-food-pub",
  },
  {
    title: "Play Mile High",
    venueName: "Play Mile High",
    address: "Various locations, Denver CO",
    description: "Adult sports leagues \u2014 volleyball, soccer, flag football, softball, kickball, cornhole, bocce, skeeball. 6-8 week seasons with end-of-season tournaments. Register solo or bring a team.",
    category: "SOCIAL" as Category,
    tags: ["sports leagues", "social", "team sports", "adults", "meeting people", "friends-group", "high-energy"],
    priceRange: "$40-90 per season",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-play-mile-high",
  },

  // ========== UNIQUE EXPERIENCES (Permanent) ==========
  {
    title: "Denver Curling Club",
    venueName: "Denver Curling Club",
    address: "West 7th Avenue, Golden CO",
    description: "Learn to curl at Colorado's original curling club, established 1965. Open houses, 5-session learn-to-curl courses, leagues, and corporate events. They provide all equipment.",
    category: "ACTIVITY_VENUE" as Category,
    tags: ["curling", "unique", "winter sports", "social", "team", "friends-group", "moderate"],
    priceRange: "$50-75 learn-to-curl",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-denver-curling-club",
  },
  {
    title: "Rock Creek Curling",
    venueName: "Rock Creek Curling",
    address: "Near Commerce City, CO",
    description: "Colorado's home for curling and community. Intro courses, leagues, competitions, and corporate team-building events.",
    category: "ACTIVITY_VENUE" as Category,
    tags: ["curling", "unique", "team building", "social", "friends-group", "moderate"],
    priceRange: "Varies",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-rock-creek-curling",
  },
  {
    title: "Bear Creek Archery",
    venueName: "Bear Creek Archery",
    address: "Englewood, CO",
    description: "5-star rated indoor archery range open year-round. Rent bows, demo new compound bows, take classes, or just shoot. Certified instructors and bow techs on site.",
    category: "ACTIVITY_VENUE" as Category,
    tags: ["archery", "indoor", "unique", "sport", "solo-friendly", "moderate"],
    priceRange: "$10-20/visit",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-bear-creek-archery",
  },
  {
    title: "Archery Games Denver",
    venueName: "Archery Games Denver",
    address: "Arvada, CO",
    description: "Archery Dodgeball \u2014 played on an indoor field with recurve bows and foam-tipped arrows. Denver Post calls it 'sweaty, heart-pumping, and exhilarating.' Great for groups.",
    category: "ACTIVITY_VENUE" as Category,
    tags: ["archery", "dodgeball", "unique", "group activity", "active", "friends-group", "high-energy"],
    priceRange: "$30-40/person",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-archery-games-denver",
  },
  {
    title: "Bad Axe Throwing \u2014 Downtown Denver",
    venueName: "Bad Axe Throwing",
    address: "Near The Fillmore and Ogden Theatre, Denver CO",
    description: "5,000+ sq ft with 16 targets. Licensed for beer and wine. Perfect for groups, birthdays, or just a Tuesday. Coaches teach you proper technique.",
    category: "ACTIVITY_VENUE" as Category,
    tags: ["axe throwing", "unique", "social", "group activity", "friends-group", "high-energy"],
    priceRange: "$35-50/person for 2hrs",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-bad-axe-throwing",
  },
  {
    title: "All Out Smash",
    venueName: "All Out Smash",
    address: "Denver, CO",
    description: "Three experiences under one roof: rage rooms, axe throwing, and paint splatter rooms. Full bar with signature cocktails. Ages 10+ for rage room and axes, all ages for splatter.",
    category: "ACTIVITY_VENUE" as Category,
    tags: ["rage room", "axe throwing", "splatter paint", "unique", "date night", "group", "friends-group", "high-energy"],
    priceRange: "$35-75/person",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-all-out-smash",
  },
  {
    title: "EscapeWorks Denver",
    venueName: "EscapeWorks Denver",
    address: "16th Street Mall, Denver CO",
    description: "Highly-rated escape rooms right on 16th Street. Themes include Vampire Hunter, Egyptian Tomb, Blackbeard's Brig, and Speakeasy. Walk-in friendly on weekdays.",
    category: "ACTIVITY_VENUE" as Category,
    tags: ["escape room", "puzzles", "group activity", "downtown", "friends-group", "moderate"],
    priceRange: "$30-40/person",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-escapeworks-denver",
  },
  {
    title: "House of Immersions",
    venueName: "House of Immersions",
    address: "Denver, CO",
    description: "Escape rooms, splatter paint experiences, and cutting-edge virtual reality adventures. Family-friendly and perfect for team building.",
    category: "ACTIVITY_VENUE" as Category,
    tags: ["VR", "escape room", "immersive", "family-friendly", "friends-group", "moderate"],
    priceRange: "Varies",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-house-of-immersions",
  },
  {
    title: "iFly Indoor Skydiving",
    venueName: "iFly Indoor Skydiving",
    address: "Lone Tree, CO",
    description: "Soar on a column of air in a vertical wind tunnel. No experience necessary \u2014 instructors guide you through the entire experience. Feel the rush of freefall without jumping out of a plane.",
    category: "ACTIVITY_VENUE" as Category,
    tags: ["skydiving", "indoor", "unique", "adrenaline", "experience", "high-energy"],
    priceRange: "$70-90 first-time flyers",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-ifly-indoor-skydiving",
  },

  // ========== OUTDOORS (Permanent) ==========
  {
    title: "Red Rocks Park & Amphitheatre \u2014 Hiking",
    venueName: "Red Rocks Park",
    address: "Morrison, CO",
    description: "Beyond the concerts, Red Rocks has incredible hiking and workout stairs. The Trading Post Trail (1.4 mi) loops through towering red sandstone formations. Free to visit when no event is happening.",
    category: "OUTDOORS" as Category,
    tags: ["hiking", "outdoors", "iconic", "free", "workout", "solo-friendly", "moderate"],
    priceRange: "Free",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-red-rocks-hiking",
  },
  {
    title: "Cherry Creek State Park \u2014 Archery Range & Trails",
    venueName: "Cherry Creek State Park",
    address: "Aurora, CO",
    description: "880-acre park with a reservoir, archery range, trails for hiking and biking, and paddleboard/kayak rentals in summer.",
    category: "OUTDOORS" as Category,
    tags: ["archery", "hiking", "paddleboard", "kayak", "outdoors", "nature", "moderate"],
    priceRange: "$12 daily vehicle pass",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-cherry-creek-state-park",
  },
  {
    title: "Barr Lake State Park \u2014 Archery & Wildlife",
    venueName: "Barr Lake State Park",
    address: "Brighton, CO",
    description: "Free archery range (with park pass) featuring 12 lanes from 10-100 yards plus a 3D target course with dinosaur, elk, and deer targets. Also great for birdwatching and hiking.",
    category: "OUTDOORS" as Category,
    tags: ["archery", "outdoors", "wildlife", "hiking", "solo-friendly", "moderate"],
    priceRange: "$11 daily vehicle pass",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-barr-lake-state-park",
  },
  {
    title: "Rocky Mountain Paddleboard",
    venueName: "Rocky Mountain Paddleboard",
    address: "Various Denver-area lakes",
    description: "Stand-up paddleboard rentals and guided tours on Colorado lakes. Great for beginners and experienced paddlers. Scenic views and a full-body workout.",
    category: "OUTDOORS" as Category,
    tags: ["paddleboard", "water sports", "outdoors", "summer", "moderate", "friends-group"],
    priceRange: "$45-65 rentals",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-rocky-mountain-paddleboard",
  },
  {
    title: "Colorado Mountain Club",
    venueName: "Colorado Mountain Club",
    address: "Golden, CO (HQ)",
    description: "Colorado's premier outdoor club since 1912. Organized hikes, snowshoeing, mountaineering, wildflower walks, and international adventure trips. 60,000+ members. Under-30 membership is just $30/year.",
    category: "OUTDOORS" as Category,
    tags: ["hiking", "mountaineering", "community", "outdoors", "social", "friends-group", "moderate"],
    priceRange: "$30-75/year membership",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-colorado-mountain-club",
  },

  // ========== CREATIVE & CULTURE (Permanent) ==========
  {
    title: "Community Clay Denver",
    venueName: "Community Clay Denver",
    address: "RiNo Art District, Denver CO",
    description: "Denver's friendliest pottery studio. 6-week beginner wheel classes, one-time try-it nights, private date night lessons, and group events. Adults only for a relaxed experience.",
    category: "ART" as Category,
    tags: ["pottery", "ceramics", "creative", "date night", "RiNo", "moderate", "solo-friendly"],
    priceRange: "$50 try-it night / $375 6-week course",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-community-clay-denver",
  },
  {
    title: "Meow Wolf Denver \u2014 Convergence Station",
    venueName: "Meow Wolf Denver",
    address: "1338 1st St, Denver CO",
    description: "Immersive, mind-bending art experience spanning multiple floors of surreal, psychedelic environments. Plus The Perplexiplex concert venue and the Sips cocktail lounge. Plan 2-3 hours minimum.",
    category: "ART" as Category,
    tags: ["immersive art", "experience", "unique", "must-see", "friends-group", "moderate"],
    priceRange: "$42-49 general admission",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-meow-wolf-denver",
  },
  {
    title: "Denver Art Museum",
    venueName: "Denver Art Museum",
    address: "100 W 14th Ave Pkwy, Denver CO",
    description: "One of the largest art museums between Chicago and the West Coast with 70,000+ works. The architecture alone is worth the visit. Free for Colorado residents on first Saturdays.",
    category: "ART" as Category,
    tags: ["art", "museum", "culture", "architecture", "solo-friendly", "moderate"],
    priceRange: "$15 general / free first Saturdays",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-denver-art-museum",
  },

  // ========== COMEDY (Permanent) ==========
  {
    title: "Comedy Works Downtown",
    venueName: "Comedy Works Downtown",
    address: "1226 15th St, Denver CO",
    description: "Denver's legendary comedy club since 1981. National headliners and local favorites. Two locations \u2014 Downtown (intimate basement club) and South (larger suburban venue).",
    category: "COMEDY" as Category,
    tags: ["comedy", "standup", "entertainment", "friends-group", "moderate"],
    priceRange: "$20-50+ per show",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-comedy-works-downtown",
  },
  {
    title: "RISE Comedy",
    venueName: "RISE Comedy",
    address: "Denver, CO",
    description: "Denver's premier improv comedy club. 50+ shows per month including improv, standup, sketch, and the legendary Hit and Run Musical Improv. Free community improv jam every week. Full bar with mocktails.",
    category: "COMEDY" as Category,
    tags: ["improv", "comedy", "social", "community", "classes", "friends-group", "moderate"],
    priceRange: "$14-17 per show / free improv jam",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-rise-comedy",
  },

  // ========== SOCIAL & COMMUNITY (Permanent) ==========
  {
    title: "Cooldown Running Club",
    venueName: "Cooldown Running Club",
    address: "Various Denver locations",
    description: "Denver's most popular social run club. Every Tuesday evening, runners and rollerbladers hit the streets on routes from 1-5 miles. Different routes weekly.",
    category: "SOCIAL" as Category,
    tags: ["running", "social", "free", "community", "weekly", "friends-group", "high-energy"],
    priceRange: "Free",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-cooldown-running-club",
  },
  {
    title: "Brunch Running",
    venueName: "Brunch Running",
    address: "Various Denver restaurants",
    description: "The OG Sunday recovery run club. Walkers and runners of all ages and abilities. AM run followed by post-run brunch at a different top Denver restaurant each week.",
    category: "SOCIAL" as Category,
    tags: ["running", "brunch", "social", "Sunday", "community", "friends-group", "moderate"],
    priceRange: "Free (pay for your own brunch)",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-brunch-running",
  },
  {
    title: "We're Not Really Runners (WNRR)",
    venueName: "WNRR Denver",
    address: "Various Denver locations",
    description: "National run and social club \u2014 'people over pace.' New routes every week plus non-running social events. Walk, run, or just come to socialize.",
    category: "SOCIAL" as Category,
    tags: ["running", "social", "inclusive", "community", "walking", "friends-group", "moderate"],
    priceRange: "Free",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-wnrr-denver",
  },

  // ========== CYCLING (Permanent) ==========
  {
    title: "Denver Bicycle Touring Club (DBTC)",
    venueName: "Denver Bicycle Touring Club",
    address: "Various Denver metro locations",
    description: "The oldest continuously operating cycling club in Denver. Organized group rides and social events for all levels.",
    category: "FITNESS" as Category,
    tags: ["cycling", "road biking", "social", "community", "touring", "friends-group", "moderate"],
    priceRange: "$35/year membership",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-dbtc",
  },
  {
    title: "Denver Cycling Club (DCC)",
    venueName: "Denver Cycling Club",
    address: "Various Denver/Front Range routes",
    description: "Friendly group for riders of all levels. Weekly road rides averaging 35-45 miles through Dinosaur Ridge, Red Rocks, and the Front Range. Inclusive and no-drop options.",
    category: "FITNESS" as Category,
    tags: ["cycling", "road biking", "group rides", "social", "all levels", "friends-group", "moderate"],
    priceRange: "Free",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-dcc",
  },
  {
    title: "Our Mutual Friend Cycling Club (OMFCC)",
    venueName: "Our Mutual Friend Brewing",
    address: "Our Mutual Friend Brewing, RiNo, Denver CO",
    description: "Cycling club based out of Our Mutual Friend Brewing in RiNo. Wednesday evening no-drop social rides at 6pm, 15-16 mph pace. Ride first, brewery hangs after.",
    category: "SOCIAL" as Category,
    tags: ["cycling", "social", "brewery", "RiNo", "community", "Wednesday", "friends-group", "moderate"],
    priceRange: "Free",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-omfcc",
  },
  {
    title: "Team Evergreen / Evergreen Ride Club",
    venueName: "Team Evergreen",
    address: "Evergreen/Golden/Front Range, CO",
    description: "One of Colorado's largest cycling clubs with 150+ rides per season. $4 million donated to local nonprofits. Wednesday and Sunday group road rides, plus gravel every other Saturday.",
    category: "FITNESS" as Category,
    tags: ["cycling", "road", "gravel", "mountain biking", "charity", "community", "friends-group", "moderate"],
    priceRange: "$40/year membership",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-team-evergreen",
  },
  {
    title: "Rocky Mountain Cycling Club",
    venueName: "Rocky Mountain Cycling Club",
    address: "Various Denver/Front Range routes",
    description: "A community for enthusiastic cyclists offering road, gravel, mountain biking, endurance events, and century races. Year-round club rides and social events.",
    category: "FITNESS" as Category,
    tags: ["cycling", "road", "gravel", "mountain biking", "endurance", "friends-group", "moderate"],
    priceRange: "Membership varies",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-rmcc",
  },
  {
    title: "Lookout Mountain Hill Climb \u2014 Tuesday Ride",
    venueName: "Lookout Mountain",
    address: "Lookout Mountain Parking Lot, Golden CO",
    description: "The classic Front Range cycling hill climb. 4.3 miles, 1,300ft of elevation gain to the top of Lookout Mountain. Stunning views of Denver. A rite of passage for Colorado cyclists.",
    category: "FITNESS" as Category,
    tags: ["cycling", "hill climb", "challenge", "iconic", "Golden", "solo-friendly", "high-energy"],
    priceRange: "Free",
    startTime: FAR_FUTURE,
    isRecurring: true,
    source: "pulse-curated",
    externalId: "curated-lookout-mountain-climb",
  },

  // ========== TIME-BOUND EVENTS ==========
  {
    title: "The Summer Set at Meow Wolf",
    venueName: "Meow Wolf Denver",
    address: "1338 1st St, Denver CO",
    description: "Pop-rock vibes at one of Denver's most unique venues.",
    category: "LIVE_MUSIC" as Category,
    tags: ["concert", "live-music", "friends-group", "moderate"],
    priceRange: "TBD",
    startTime: daysFromNow(1, 20, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-summer-set-meow-wolf",
  },
  {
    title: "RiNo Art Walk",
    venueName: "RiNo Art District",
    address: "RiNo Art District, Denver CO",
    description: "First Saturday Art Walk through Denver's River North Art District. Galleries open late, street art, live music, and food trucks. One of Denver's best free experiences.",
    category: "ART" as Category,
    tags: ["art", "free", "outdoor", "social", "friends-group", "moderate"],
    priceRange: "Free",
    startTime: daysFromNow(2, 17, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-rino-art-walk",
  },
  {
    title: "Colorado Mountain Club \u2014 Group Hike: South Table Mountain",
    venueName: "Colorado Mountain Club",
    address: "Golden, CO",
    description: "Moderate 4-mile loop hike with 800ft elevation gain. Panoramic views of Denver and the Front Range. Led by experienced CMC guides.",
    category: "OUTDOORS" as Category,
    tags: ["hiking", "outdoors", "social", "community", "friends-group", "moderate"],
    priceRange: "Free with membership ($30/yr under-30)",
    startTime: daysFromNow(3, 8, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-cmc-south-table",
  },
  {
    title: "Cherry Creek Bike Path \u2014 Group Ride",
    venueName: "Cherry Creek Trail",
    address: "Cherry Creek Trail, Denver CO",
    description: "Informal Sunday morning group ride along the Cherry Creek Bike Path. 20-30 miles round trip on paved trail. All paces welcome.",
    category: "OUTDOORS" as Category,
    tags: ["cycling", "outdoors", "trail", "casual", "social", "friends-group", "moderate"],
    priceRange: "Free",
    startTime: daysFromNow(4, 7, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-cherry-creek-group-ride",
  },
  {
    title: "Cooldown Run Club \u2014 Spring Kickoff",
    venueName: "Cooldown Running Club",
    address: "TBD Denver location",
    description: "Weekly social run with Denver's biggest run club. 1-5 mile routes, all paces welcome.",
    category: "SOCIAL" as Category,
    tags: ["running", "social", "free", "community", "friends-group", "high-energy"],
    priceRange: "Free",
    startTime: daysFromNow(5, 18, 30),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-cooldown-spring-kickoff",
  },
  {
    title: "Red Rocks Fitness \u2014 Stair Workout",
    venueName: "Red Rocks Amphitheatre",
    address: "Morrison, CO",
    description: "Sunrise stair workout at the iconic Red Rocks Amphitheatre. 380 steps, stunning views. Bring water and layers \u2014 it's cold at dawn but worth it.",
    category: "FITNESS" as Category,
    tags: ["workout", "fitness", "outdoor", "free", "iconic", "solo-friendly", "high-energy"],
    priceRange: "Free",
    startTime: daysFromNow(6, 6, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-red-rocks-stair-workout",
  },
  {
    title: "Traverse Fitness \u2014 Breakfast Club Track Workout",
    venueName: "D'Evelyn High School Track",
    address: "D'Evelyn High School, Denver CO",
    description: "Weekly Wednesday morning track session led by Ironman triathlete Billy LaGreca. Speed work, drills, and a community that gets after it before the sun's fully up.",
    category: "FITNESS" as Category,
    tags: ["fitness", "workout", "running", "community", "solo-friendly", "high-energy"],
    priceRange: "Free / included with membership",
    startTime: daysFromNow(7, 5, 15),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-traverse-breakfast-club",
  },
  {
    title: "Perpetual Groove at Meow Wolf",
    venueName: "Meow Wolf Denver",
    address: "1338 1st St, Denver CO",
    description: "Live music at Denver's most unique venue. Perpetual Groove brings their signature jam-band sound to the Perplexiplex stage.",
    category: "LIVE_MUSIC" as Category,
    tags: ["concert", "live-music", "jam band", "friends-group", "moderate"],
    priceRange: "From $67",
    startTime: daysFromNow(8, 20, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-perpetual-groove-1",
  },
  {
    title: "Perpetual Groove at Meow Wolf (Night 2)",
    venueName: "Meow Wolf Denver",
    address: "1338 1st St, Denver CO",
    description: "Night 2 of Perpetual Groove at The Perplexiplex.",
    category: "LIVE_MUSIC" as Category,
    tags: ["concert", "live-music", "jam band", "friends-group", "moderate"],
    priceRange: "From $60",
    startTime: daysFromNow(9, 20, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-perpetual-groove-2",
  },
  {
    title: "Denver Pork Circuit Series \u2014 2-Mile Race",
    venueName: "City Park",
    address: "City Park, Denver CO",
    description: "Kick off the 2026 Denver Pork Circuit with a 2-mile race around Denver's biggest park, followed by a post-race party at Cerebral Brewing.",
    category: "FITNESS" as Category,
    tags: ["running", "race", "fitness", "social", "friends-group", "high-energy"],
    priceRange: "$25 registration",
    startTime: daysFromNow(9, 9, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-pork-circuit-2mile",
  },
  {
    title: "Denver Botanic Gardens \u2014 Spring Bloom Walk",
    venueName: "Denver Botanic Gardens",
    address: "1007 York St, Denver CO",
    description: "Guided spring bloom walk through the gardens. Peak season for tulips, daffodils, and cherry blossoms. Stunning photo opportunities.",
    category: "OUTDOORS" as Category,
    tags: ["garden", "outdoors", "spring", "nature", "date-friendly", "moderate"],
    priceRange: "$15 general admission",
    startTime: daysFromNow(10, 10, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-botanic-gardens-spring",
  },
  {
    title: "USA Curling National Mixed Championship",
    venueName: "Denver Curling Club",
    address: "Golden, CO",
    description: "Watch Olympic-caliber curling right here in Denver. The national mixed championship brings the country's best curlers. Free to watch \u2014 great way to discover the sport.",
    category: "ACTIVITY_VENUE" as Category,
    tags: ["curling", "championship", "spectator", "free", "unique", "friends-group", "moderate"],
    priceRange: "Free to spectate",
    startTime: daysFromNow(13, 10, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-usa-curling-nationals",
  },
  {
    title: "The Unlikely Candidates at Meow Wolf",
    venueName: "Meow Wolf Denver",
    address: "1338 1st St, Denver CO",
    description: "The Unlikely Candidates bring their indie rock energy to The Perplexiplex.",
    category: "LIVE_MUSIC" as Category,
    tags: ["concert", "live-music", "indie rock", "friends-group", "moderate"],
    priceRange: "From $55",
    startTime: daysFromNow(14, 20, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-unlikely-candidates",
  },
  {
    title: "Friday Night Lights Track Meet",
    venueName: "Denver Athletics",
    address: "Denver, CO",
    description: "All-comers track & field series for all ages and abilities. Prizes, post-race interviews, music, and food trucks under the Friday night lights.",
    category: "FITNESS" as Category,
    tags: ["track", "fitness", "social", "all levels", "friends-group", "high-energy"],
    priceRange: "$15-25",
    startTime: daysFromNow(15, 19, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-friday-night-lights",
  },
  {
    title: "Community Clay \u2014 Try It Night",
    venueName: "Community Clay",
    address: "RiNo Art District, Denver CO",
    description: "One-time pottery experience for beginners. No commitment, just show up and throw some clay. Limited spots \u2014 perfect intro to ceramics.",
    category: "ART" as Category,
    tags: ["pottery", "creative", "date night", "moderate", "solo-friendly"],
    priceRange: "$50",
    startTime: daysFromNow(16, 18, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-community-clay-try-it",
  },
  {
    title: "Denver Farmers Market \u2014 Opening Weekend",
    venueName: "Union Station",
    address: "Union Station, Denver CO",
    description: "The outdoor Denver Farmers Market returns for the season. Local produce, artisan foods, live music, and good vibes at Union Station.",
    category: "FOOD" as Category,
    tags: ["farmers market", "food", "outdoor", "free", "social", "friends-group", "moderate"],
    priceRange: "Free entry",
    startTime: daysFromNow(16, 9, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-denver-farmers-market",
  },
  {
    title: "Play Mile High \u2014 Spring Kickball League",
    venueName: "Washington Park",
    address: "Washington Park, Denver CO",
    description: "Adult kickball league in Wash Park. 8-week season with a tournament finale. Register solo as a free agent or bring a squad. It's like recess, but better.",
    category: "SOCIAL" as Category,
    tags: ["kickball", "sports league", "social", "adults", "friends-group", "high-energy"],
    priceRange: "$65/season",
    startTime: daysFromNow(18, 18, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-play-mile-high-kickball",
  },
  {
    title: "Sploinky Rave at Meow Wolf",
    venueName: "Meow Wolf Denver",
    address: "1338 1st St, Denver CO",
    description: "Late-night electronic music event inside the surreal halls of Convergence Station.",
    category: "LIVE_MUSIC" as Category,
    tags: ["electronic", "rave", "party", "dancing", "high-energy", "club"],
    priceRange: "TBD",
    startTime: daysFromNow(22, 21, 0),
    isRecurring: false,
    source: "pulse-curated",
    externalId: "curated-sploinky-rave",
  },
];

// ============================================================================
// JENSEN'S PREFERENCES
// ============================================================================

const JENSEN_PREFERENCES: { category: Category; preferenceType: PreferenceType; intensity: number }[] = [
  // LOVE (intensity 5)
  { category: "FITNESS", preferenceType: "LIKE", intensity: 5 },
  { category: "OUTDOORS", preferenceType: "LIKE", intensity: 5 },
  { category: "ACTIVITY_VENUE", preferenceType: "LIKE", intensity: 5 },
  { category: "SOCIAL", preferenceType: "LIKE", intensity: 5 },
  // LIKE (intensity 3)
  { category: "COMEDY", preferenceType: "LIKE", intensity: 3 },
  { category: "ART", preferenceType: "LIKE", intensity: 3 },
  { category: "FOOD", preferenceType: "LIKE", intensity: 3 },
  { category: "LIVE_MUSIC", preferenceType: "LIKE", intensity: 3 },
  // DISLIKE
  { category: "BARS", preferenceType: "DISLIKE", intensity: 2 },
  // NEUTRAL (intensity 1)
  { category: "COFFEE", preferenceType: "LIKE", intensity: 1 },
  { category: "SEASONAL", preferenceType: "LIKE", intensity: 1 },
  { category: "POPUP", preferenceType: "LIKE", intensity: 1 },
  { category: "WELLNESS", preferenceType: "LIKE", intensity: 1 },
  { category: "RESTAURANT", preferenceType: "LIKE", intensity: 1 },
  { category: "OTHER", preferenceType: "LIKE", intensity: 1 },
];

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("Jensen Demo Seed Script\n");

  // 1. Ensure Denver city exists
  const denver = await prisma.city.upsert({
    where: { slug: "denver" },
    update: {},
    create: {
      name: "Denver",
      slug: "denver",
      timezone: "America/Denver",
    },
  });
  console.log(`City: ${denver.name} (${denver.id})`);

  // 2. Upsert curated events
  console.log(`\nSeeding ${SEED_EVENTS.length} curated events/activities...`);
  let created = 0;
  let updated = 0;

  for (const event of SEED_EVENTS) {
    const result = await prisma.event.upsert({
      where: {
        externalId_source: {
          externalId: event.externalId,
          source: event.source,
        },
      },
      update: {
        title: event.title,
        venueName: event.venueName,
        address: event.address,
        description: event.description,
        category: event.category,
        tags: event.tags,
        priceRange: event.priceRange,
        startTime: event.startTime,
        isRecurring: event.isRecurring,
      },
      create: {
        title: event.title,
        venueName: event.venueName,
        address: event.address,
        description: event.description,
        category: event.category,
        tags: event.tags,
        priceRange: event.priceRange,
        startTime: event.startTime,
        isRecurring: event.isRecurring,
        source: event.source,
        externalId: event.externalId,
        cityId: denver.id,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    const isNew = Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
    if (isNew) created++;
    else updated++;
  }
  console.log(`  Created: ${created}, Updated: ${updated}`);

  // 3. Create Jensen's account
  console.log("\nCreating Jensen's account...");
  const passwordHash = await bcrypt.hash("PulseDenver2026!", 10);

  const jensen = await prisma.user.upsert({
    where: { email: "jensen@pulse.app" },
    update: {
      name: "Jensen",
      passwordHash,
      relationshipStatus: RelationshipStatus.SINGLE,
      onboardingComplete: true,
    },
    create: {
      email: "jensen@pulse.app",
      name: "Jensen",
      passwordHash,
      relationshipStatus: RelationshipStatus.SINGLE,
      onboardingComplete: true,
    },
  });
  console.log(`  User: ${jensen.name} (${jensen.email})`);

  // 4. Set Jensen's preferences
  console.log("Setting Jensen's preferences...");
  await prisma.preference.deleteMany({ where: { userId: jensen.id } });

  for (const pref of JENSEN_PREFERENCES) {
    await prisma.preference.create({
      data: {
        userId: jensen.id,
        category: pref.category,
        preferenceType: pref.preferenceType,
        intensity: pref.intensity,
      },
    });
  }
  console.log(`  Set ${JENSEN_PREFERENCES.length} category preferences`);

  // 5. Re-classify existing events with fixed classifier
  console.log("\nRe-classifying existing events...");
  const allEvents = await prisma.event.findMany({
    select: { id: true, title: true, venueName: true, category: true },
  });

  let reclassified = 0;
  for (const event of allEvents) {
    const newCategory = classifyEvent(event.title, event.venueName);
    if (newCategory !== event.category) {
      await prisma.event.update({
        where: { id: event.id },
        data: { category: newCategory },
      });
      reclassified++;
    }
  }
  console.log(`  Re-classified ${reclassified} of ${allEvents.length} events`);

  // Summary
  console.log("\nJensen Demo Seed Complete!");
  console.log(`  Events/Activities: ${SEED_EVENTS.length} curated items`);
  console.log(`  Jensen Login: jensen@pulse.app / PulseDenver2026!`);
  console.log(`  Re-classified: ${reclassified} existing events`);
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
