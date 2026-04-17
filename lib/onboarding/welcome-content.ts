import type { ContextSegment } from "@prisma/client";

export interface DiscoveryCard {
  emoji: string;
  title: string;
  description: string;
}

interface WelcomeContent {
  headline: string;
  cards: DiscoveryCard[];
}

const WELCOME_MAP: Record<ContextSegment, WelcomeContent> = {
  NEW_TO_CITY: {
    headline:
      "Welcome to Denver. Here are the things locals wish someone had told them.",
    cards: [
      {
        emoji: "🎨",
        title: "Self-Guided Street Art Tour in RiNo",
        description:
          "The River North Art District has over 200 murals. Grab a coffee and walk Larimer Street — it's free and changes every year.",
      },
      {
        emoji: "🌅",
        title: "Sunset at Sloan's Lake",
        description:
          "Best free sunset spot in the city. Locals bring blankets and picnics. The mountain views are unbeatable.",
      },
      {
        emoji: "🔭",
        title: "Denver Astronomical Society Public Nights",
        description:
          "Free stargazing at Chamberlin Observatory. Volunteers set up telescopes and walk you through the sky.",
      },
    ],
  },
  IN_A_RUT: {
    headline:
      "Time to shake things up. Here's something you probably haven't tried.",
    cards: [
      {
        emoji: "🤘",
        title: "The Brutal Poodle",
        description:
          "A metal bar with surprisingly good food in Baker. Not your usual Tuesday night — and that's the point.",
      },
      {
        emoji: "🔍",
        title: "Hidden Gnome Hunt at the Museum of Nature & Science",
        description:
          "There are hidden gnomes throughout the museum. Most Denver locals have no idea. It's weirdly fun.",
      },
      {
        emoji: "🎭",
        title: "Improv Comedy at Bovine Metropolis",
        description:
          "Drop-in improv shows every weekend. Cheap tickets, great energy, and way more fun than another brewery.",
      },
    ],
  },
  LOCAL_EXPLORER: {
    headline:
      "You know your city. But we found some things that might surprise you.",
    cards: [
      {
        emoji: "🍜",
        title: "Far East Center on Federal",
        description:
          "Denver's best-kept food secret. Authentic Vietnamese, Lao, and Chinese spots that most locals drive right past.",
      },
      {
        emoji: "🏔️",
        title: "Lookout Mountain Nature Center",
        description:
          "15 minutes from downtown, feels like a different world. Free trails, wildlife programs, and zero crowds.",
      },
      {
        emoji: "🎵",
        title: "Dazzle Jazz at Baur's",
        description:
          "World-class jazz in a historic LoDo building. Dinner and a show without the Red Rocks parking lot.",
      },
    ],
  },
  VISITING: {
    headline: "Make every day count. Here's where to start.",
    cards: [
      {
        emoji: "🏔️",
        title: "Red Rocks Park (Not Just Concerts)",
        description:
          "The amphitheater is iconic, but the free hiking trails around it are stunning. Go early morning for the best light.",
      },
      {
        emoji: "🍺",
        title: "Denver Beer Trail in RiNo",
        description:
          "Walk between Ratio, Epic, and Great Divide — all within blocks of each other. No Uber needed.",
      },
      {
        emoji: "🛍️",
        title: "Larimer Square",
        description:
          "Denver's oldest block. Great restaurants, string lights, and the best people-watching in the city.",
      },
    ],
  },
};

export function getWelcomeContent(segment: ContextSegment): WelcomeContent {
  return WELCOME_MAP[segment];
}
