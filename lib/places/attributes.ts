/**
 * The attribute chips on place detail.
 *
 * Wave 6B. Note that isDogFriendly / isDrinkingOptional / hasMocktailMenu were
 * already on the Place model and rendered NOWHERE — the detail page drew vibe
 * chips and nothing else. They are surfaced here alongside the five new
 * situational booleans, since they answer the same kind of question.
 */

export interface PlaceAttributes {
  goodForWatchingSports: boolean;
  isKidFriendly: boolean;
  hasOutdoorSeating: boolean;
  hasIndoorSeating: boolean;
  fitsLargeGroups: boolean;
  isDogFriendly: boolean;
  isDrinkingOptional: boolean;
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
  if (attrs.isDrinkingOptional) chips.push({ key: "sober", label: "Drinking optional" });
  if (attrs.hasMocktailMenu) chips.push({ key: "mocktails", label: "Mocktails" });

  return chips;
}
