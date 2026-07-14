/**
 * The attribute chips on place detail.
 *
 * Wave 6B. isDogFriendly / isDrinkingOptional / hasMocktailMenu already existed
 * on the model and are rendered on the CARDS (components/badges/DogFriendlyBadge,
 * SoberFriendlyBadge, via PlaceCard + EventCard) — but not on the detail page,
 * which drew vibe chips and nothing else. They are surfaced here alongside the
 * five new situational booleans because they answer the same kind of question,
 * and the copy deliberately matches the badges so the same fact does not speak in
 * two voices ("Great without drinking", not the column name).
 */

export interface PlaceAttributes {
  goodForWatchingSports: boolean;
  isKidFriendly: boolean;
  hasOutdoorSeating: boolean;
  hasIndoorSeating: boolean;
  fitsLargeGroups: boolean;
  isDogFriendly: boolean;
  isDrinkingOptional: boolean;
  isAlcoholFree: boolean;
  hasMocktailMenu: boolean;
}

export interface AttributeChip {
  key: string;
  label: string;
}

/**
 * Only TRUE attributes become chips. An un-enriched place (all false) yields an
 * empty row rather than a row of negations.
 *
 * Two deliberate asymmetries:
 *   - `hasIndoorSeating: true` produces no chip. Nearly everywhere has indoor
 *     seating, so saying it is noise.
 *   - `hasIndoorSeating: false` with a patio produces "Outdoor only", which
 *     replaces the "Patio" chip rather than joining it — in February, in Denver,
 *     that is the fact that matters.
 */
export function placeAttributeChips(attrs: Partial<PlaceAttributes>): AttributeChip[] {
  const chips: AttributeChip[] = [];
  const outdoorOnly = attrs.hasIndoorSeating === false && attrs.hasOutdoorSeating === true;

  if (attrs.goodForWatchingSports) chips.push({ key: "sports", label: "Shows the game" });
  if (attrs.fitsLargeGroups) chips.push({ key: "groups", label: "Fits big groups" });
  if (attrs.isKidFriendly) chips.push({ key: "kids", label: "Kid-friendly" });

  if (outdoorOnly) {
    chips.push({ key: "outdoor-only", label: "Outdoor only" });
  } else if (attrs.hasOutdoorSeating) {
    chips.push({ key: "patio", label: "Patio" });
  }

  if (attrs.isDogFriendly) chips.push({ key: "dogs", label: "Dog-friendly" });

  // Three-state, not two. An alcohol-free bar is not a place where "drinking is
  // optional" — drinking is ABSENT. Saying the former is exactly wrong, and
  // PlaceCard's SoberFriendlyBadge already gets this right by gating the
  // "optional" variant behind !isAlcoholFree. Match it, and match its copy.
  if (attrs.isAlcoholFree) {
    chips.push({ key: "sober", label: "Alcohol-free" });
  } else if (attrs.isDrinkingOptional) {
    chips.push({ key: "sober", label: "Great without drinking" });
  } else if (attrs.hasMocktailMenu) {
    // Only worth its own chip when the sober chip did not already imply it —
    // otherwise a mocktail bar gets two chips saying the same thing.
    chips.push({ key: "mocktails", label: "Mocktails" });
  }

  return chips;
}
