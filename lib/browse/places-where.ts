import type { Prisma, Category } from "@prisma/client";
import {
  localFavoritesWhere,
  groupFriendlyPlacesWhere,
  workFriendlyPlacesWhere,
  dateNightPlacesWhere,
} from "@/lib/home/places-section-filters";
import { vibeTagQueryValues } from "@/lib/constants/vibe-tags";
import type { BrowseConfig } from "./browse-configs";
import type { BrowseFilters } from "./filters";

/**
 * The Place `where` for a browse page.
 *
 * Extracted and rebuilt in Wave 6B. The old inline version merged every clause
 * onto ONE object — `Object.assign(where, helper())` followed by plain
 * assignments — so later keys silently destroyed earlier ones:
 *
 *   - `where.category = { in: filters.categories }` wiped the category gate that
 *     localFavoritesWhere()/groupFriendlyPlacesWhere() had just set;
 *   - `where.vibeTags = { hasSome: filters.vibes }` overwrote the config's own
 *     vibeTag default, so picking any vibe silently discarded the page's premise;
 *   - the `filter: "new"` OR and a helper's OR could not coexist at all.
 *
 * Everything is an AND member now, which is what the events branch already does.
 */

/**
 * Columns the data-driven `placeFlag` default may query.
 *
 * This list IS the allowlist — placeFlag interpolates a column name, and this is
 * the only thing between a config typo and an arbitrary column predicate.
 *
 * It is deliberately only the INDEXED situational booleans. hasOutdoorSeating and
 * hasIndoorSeating exist on the model but carry no index, so they are not
 * browsable; add an index first if that changes.
 */
export const PLACE_FLAG_COLUMNS = [
  "goodForWatchingSports",
  "isKidFriendly",
  "fitsLargeGroups",
] as const;

export type PlaceFlagColumn = typeof PLACE_FLAG_COLUMNS[number];

function isPlaceFlagColumn(s: string): s is PlaceFlagColumn {
  return (PLACE_FLAG_COLUMNS as readonly string[]).includes(s);
}

/**
 * Named `flag` defaults that resolve to a hand-tuned predicate rather than a bare
 * boolean column. `groupFriendly` and `dateNight` were both already imported into
 * fetch-browse.ts and never called — /browse/groups asked for a vibeTag
 * ("group-friendly") that nothing in the corpus writes, and so returned nothing.
 */
const HELPER_FLAGS: Record<string, () => Prisma.PlaceWhereInput> = {
  isLocalFavorite: localFavoritesWhere,
  goodForWorking: workFriendlyPlacesWhere,
  groupFriendly: groupFriendlyPlacesWhere,
  dateNight: dateNightPlacesWhere,
};

const NEW_PLACE_WINDOW_MS = 45 * 24 * 60 * 60 * 1000;

export function buildPlacesWhere(
  config: BrowseConfig,
  filters: BrowseFilters,
  now: Date,
): Prisma.PlaceWhereInput {
  const and: Prisma.PlaceWhereInput[] = [{ openingStatus: "OPEN" }];

  if (config.defaults.filter === "new") {
    and.push({
      OR: [
        { isNew: true },
        { openedDate: { gte: new Date(now.getTime() - NEW_PLACE_WINDOW_MS) } },
      ],
    });
  }

  const helper = config.defaults.flag ? HELPER_FLAGS[config.defaults.flag] : undefined;
  if (helper) and.push(helper());

  if (config.defaults.placeFlag) {
    const column = config.defaults.placeFlag;
    if (!isPlaceFlagColumn(column)) {
      throw new Error(
        `Unsupported placeFlag "${column}". Allowed: ${PLACE_FLAG_COLUMNS.join(", ")}`,
      );
    }
    and.push({ [column]: true });
  }

  if (config.defaults.vibeTag) {
    and.push({ vibeTags: { hasSome: vibeTagQueryValues([config.defaults.vibeTag]) } });
  }

  if (filters.categories.length) {
    and.push({ category: { in: filters.categories as Category[] } });
  }

  if (filters.vibes.length) {
    and.push({ vibeTags: { hasSome: vibeTagQueryValues(filters.vibes) } });
  }

  return { AND: and };
}
