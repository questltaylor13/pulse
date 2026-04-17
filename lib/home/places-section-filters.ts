import type { Prisma } from "@prisma/client";

// Section 3: Where locals actually go
export function localFavoritesWhere(): Prisma.PlaceWhereInput {
  return {
    isLocalFavorite: true,
    OR: [
      { touristTrapScore: { lte: 0.3 } },
      { touristTrapScore: null },
    ],
  };
}

// Section 4: Perfect for a first date
const DATE_INCLUDE = ["intimate", "conversation-friendly", "date-spot", "romantic", "cozy"];
const DATE_EXCLUDE = ["loud", "family-friendly"];

export function dateNightPlacesWhere(): Prisma.PlaceWhereInput {
  return {
    vibeTags: { hasSome: DATE_INCLUDE },
    NOT: { vibeTags: { hasSome: DATE_EXCLUDE } },
  };
}

// Section 5: Good for groups
const GROUP_TAGS = ["group-friendly", "shareable-plates", "lively"];

export function groupFriendlyPlacesWhere(): Prisma.PlaceWhereInput {
  return { vibeTags: { hasSome: GROUP_TAGS } };
}

// Section 6: Where to work from
export function workFriendlyPlacesWhere(): Prisma.PlaceWhereInput {
  return { goodForWorking: true };
}
