import type { Prisma } from "@prisma/client";

// Tag vocabulary note (Wave 6B).
//
// `vibeTags` is migrating to ONE canonical kebab-case vocabulary
// (20260714130000_normalize_vibe_tags). The `vibeTags` filters below therefore
// list BOTH spellings, deliberately and permanently: a data migration and a code
// deploy cannot be atomic, and matching both makes the ordering irrelevant —
// correct before the migration, correct after it, correct if it is re-run. It
// costs an array literal inside a `hasSome`.
//
// `companionTags` / `occasionTags` / `goodForTags` are NOT migrating. They are
// internally consistent — enrichment writes Title-case and every reader queries
// Title-case — so they are left exactly as they are. Only vibeTags had the split
// (kebab allowlist vs Title-case writer), and only vibeTags is fixed here.

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
      { vibeTags: { hasSome: ["intimate", "cozy", "sophisticated", "upscale", "Intimate", "Cozy", "Sophisticated", "Upscale"] } },
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
      { vibeTags: { hasSome: ["lively", "energetic", "Lively", "Energetic"] } },
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
