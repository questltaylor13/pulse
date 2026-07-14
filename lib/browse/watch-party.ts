import type { Prisma } from "@prisma/client";
import { activeEventsWhere } from "@/lib/queries/events";

/**
 * "Where can I watch the game" has TWO answers, and the design says so
 * explicitly (spec D6): a bar that always shows it (a PLACE), and a party on
 * Thursday (an EVENT). Wave 6B stopped deleting the second at ingest — but
 * un-deleting content and then giving it nowhere to live is not a feature.
 *
 * This is where the second answer lands. /browse/watch-the-game prepends the
 * week's actual watch parties above the always-has-screens bars.
 *
 * Phrase matching rather than a column: there is no isWatchParty flag, and adding
 * one would mean another LLM pass over every event. These phrases are the same
 * ones lib/scrapers/exclusions.ts uses to decide NOT to delete the event, so the
 * two stay honest with each other by construction.
 */
export const WATCH_PARTY_PHRASES = [
  "watch party",
  "viewing party",
  "watch the game",
  "game day",
  "game watch",
] as const;

const WINDOW_DAYS = 7;

export function watchPartyEventsWhere(now: Date): Prisma.EventWhereInput {
  const horizon = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  return {
    AND: [
      activeEventsWhere(now),
      { startTime: { lte: horizon } },
      {
        OR: WATCH_PARTY_PHRASES.flatMap((phrase) => [
          { title: { contains: phrase, mode: "insensitive" as const } },
          { description: { contains: phrase, mode: "insensitive" as const } },
        ]),
      },
    ],
  };
}
