/**
 * Seed guide cards for Phase 1's "Guides from local creators" section.
 * Tapping any card opens a "Coming soon" modal until the full Guides
 * infrastructure ships in Phase 3.
 */

export interface SeedGuide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  creator: {
    name: string;
    label: string;
    avatarUrl: string;
  };
}

export const SEED_GUIDES: SeedGuide[] = [
  {
    id: "seed-rino-saturday",
    title: "The perfect RiNo Saturday",
    subtitle: "Brunch, murals, rooftop drinks",
    imageUrl:
      "https://images.unsplash.com/photo-1519867857289-e90a9f10c59d?auto=format&fit=crop&w=1080&q=70",
    creator: {
      name: "Sarah M.",
      label: "Local foodie",
      avatarUrl:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2.5&w=200&h=200&q=70",
    },
  },
  {
    id: "seed-active-date-day",
    title: "Active date day",
    subtitle: "Morning hike, patio lunch, bookshop",
    imageUrl:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1080&q=70",
    creator: {
      name: "Mike T.",
      label: "Outdoor enthusiast",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2.5&w=200&h=200&q=70",
    },
  },
  {
    id: "seed-highlands-wine-hop",
    title: "Wine bar hop in Highlands",
    subtitle: "Three bars, one neighborhood",
    imageUrl:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1080&q=70",
    creator: {
      name: "Jess L.",
      label: "Denver native",
      avatarUrl:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2.5&w=200&h=200&q=70",
    },
  },
];
