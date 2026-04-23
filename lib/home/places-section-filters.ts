import type { Prisma } from "@prisma/client";

// Actual tag vocabulary (Title-case) from our Place corpus. The enrichment
// pipeline writes Title-case values; filters below must match that, not
// lowercased/kebab-cased theoretical versions.

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
// Signal mix: vibe ("Intimate" / "Cozy" / "Sophisticated"), companion
// ("Date Night" / "Couples"), occasion ("First Date" / "Anniversary").
// Any match qualifies. Family-tagged spots explicitly excluded.
export function dateNightPlacesWhere(): Prisma.PlaceWhereInput {
  return {
    OR: [
      { vibeTags: { hasSome: ["Intimate", "Cozy", "Sophisticated", "Upscale"] } },
      { companionTags: { hasSome: ["Date Night", "Couples"] } },
      { occasionTags: { hasSome: ["First Date", "Anniversary"] } },
    ],
    NOT: { companionTags: { hasSome: ["Family"] } },
  };
}

// Section 5: Good for groups
// "Groups" companionTag covers 294 places; broad Lively/Celebration catch
// picks up the rest of the group-friendly energy.
export function groupFriendlyPlacesWhere(): Prisma.PlaceWhereInput {
  return {
    OR: [
      { companionTags: { hasSome: ["Groups", "Friends"] } },
      { vibeTags: { hasSome: ["Lively", "Energetic"] } },
      { occasionTags: { hasSome: ["Celebration", "Birthday", "Happy Hour"] } },
    ],
  };
}

// Section 6: Where to work from
// `goodForWorking` flag isn't populated in the current Place corpus (0/460).
// Fall back to goodForTags "Work Remote" (65) and "Coffee Meeting" (50)
// which the enrichment pipeline does populate.
export function workFriendlyPlacesWhere(): Prisma.PlaceWhereInput {
  return {
    OR: [
      { goodForWorking: true },
      { goodForTags: { hasSome: ["Work Remote", "Coffee Meeting"] } },
    ],
  };
}
