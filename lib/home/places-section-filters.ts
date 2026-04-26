import type { Prisma } from "@prisma/client";

// Actual tag vocabulary (Title-case) from our Place corpus. The enrichment
// pipeline writes Title-case values; filters below must match that, not
// lowercased/kebab-cased theoretical versions.

// Section 3: Where locals actually go
// Category gate: locals go everywhere except gyms-as-discovery — exclude
// FITNESS so yoga/gym places don't dominate this rail.
export function localFavoritesWhere(): Prisma.PlaceWhereInput {
  return {
    isLocalFavorite: true,
    category: { notIn: ["FITNESS"] },
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
    // Category gate: yoga studios and gyms get "Cozy"/"Intimate" vibe tags
    // from the LLM enrichment, which clears the OR below. Restrict to the
    // categories that actually fit "first date / low-pressure / conversation".
    category: { in: ["RESTAURANT", "BARS", "COFFEE"] },
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
    // Category gate: groups go to restaurants, bars, and activity venues
    // (bowling, etc.). Cafes and gyms don't fit "big tables, shareable
    // plates, loud enough" — exclude.
    category: { in: ["RESTAURANT", "BARS", "ACTIVITY_VENUE"] },
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
    // Category gate: work-from-here means cafes (and the occasional
    // restaurant that doubles as one). Yoga, gyms, bars don't fit
    // "wifi, outlets, quiet enough".
    category: { in: ["COFFEE", "RESTAURANT"] },
    OR: [
      { goodForWorking: true },
      { goodForTags: { hasSome: ["Work Remote", "Coffee Meeting"] } },
    ],
  };
}
