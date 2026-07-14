// We drop the TICKETED PRO GAME at ingest — fans already know when their team
// plays, and that surface is tickets-for-sale rather than "go try this".
//
// Wave 6B narrowed this. The old rule dropped ANY event naming a Denver pro team,
// which meant we deleted every watch party — the exact content "where can I watch
// the game" wants. We were destroying it and then wondering why we had none.
//
// The rule now: drop only when the team is named in the TITLE and paired with
// either a matchup ("Nuggets vs Lakers", "Broncos at Chiefs") or a pro venue
// (Ball Arena, Coors Field) — and never when it reads as a watch party.
//
// WHY THE DESCRIPTION IS NOT READ AT ALL. It was, in the first cut of this, and
// the review proved that decision backwards in both directions:
//
//   - As a DROP signal it deletes watch parties. A watch-party blurb says
//     "Catch the Broncos vs. Chiefs on 30 TVs" — naming the matchup is what such
//     a blurb DOES — so reading a matchup from the description deleted precisely
//     the events this wave exists to save.
//   - As a VETO signal it rescues real games. Arena boilerplate says "Game day is
//     here!" and "Visit the Sandlot Brewery inside the ballpark" (that brewery is
//     literally inside Coors Field), so a genuine "Rockies vs Padres" survived.
//
// Both scrapers that supply most of our volume (do303, westword) hard-code
// description: "" anyway. Title + venue is the honest signal.
//
// Accepted trade: a bare "Rockies Opening Day" from a source that omits the venue
// survives. Deleting every watch party to catch that was the worse trade.

export const PRO_SPORTS_TEAMS: string[] = [
  // NBA
  "Nuggets",
  "Nuggs",
  // NHL
  "Avalanche",
  "Avs",
  // NFL
  "Broncos",
  // MLB
  "Rockies",
  // MLS
  "Rapids",
  // NLL
  "Mammoth",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TEAMS_ALT = PRO_SPORTS_TEAMS.map(escape).join("|");

const TEAM_RX = new RegExp(`\\b(${TEAMS_ALT})\\b`, "i");

// Ticketed venues for the teams above. Note the apostrophe class: the corpus
// contains the typographic U+2019 form ("Dick’s"), which a bare ' missed.
const PRO_VENUE_RX =
  /\b(ball\s+arena|coors\s+field|empower\s+field|mile\s+high\s+stadium|dick['’]?s\s+sporting\s+goods\s+park)\b/i;

// "Nuggets vs Lakers", "Avalanche versus Stars".
const VS_RX = /\b(vs\.?|versus)\b/i;

// "Broncos at Chiefs". The team must sit IMMEDIATELY before the "at", and the
// word after must not be an article — otherwise "Broncos Trivia Night at Illegal
// Pete's" reads as a matchup. That anchoring is necessary but NOT sufficient:
// see the venue guard at the call site, which is what stops "Broncos at Blake
// Street Tavern" (a bar, i.e. a watch party) being read as a game.
const AT_MATCHUP_RX = new RegExp(
  `\\b(${TEAMS_ALT})\\s+(?:at|@)\\s*(?!the\\b|a\\b|an\\b)\\w`,
  "i",
);

// The whole point of Wave 6B. Beats every drop signal.
// "watch the game" is not enough on its own — real listings say "Watch the Avs",
// "Catch the Broncos" — so the watch-VERB + team form is matched explicitly.
const WATCH_PARTY_RX = new RegExp(
  `\\b(watch\\s+part(?:y|ies)|viewing\\s+part(?:y|ies)|watch\\s+night|game\\s*day|game\\s+watch|big\\s+screen` +
    `|(?:watch|catch|cheer\\s+on)\\s+(?:the\\s+)?(?:game|${TEAMS_ALT}))\\b`,
  "i",
);

// Titles that contain a team token but are clearly not a pro-sports event.
// The negative lookahead on `trail` is load-bearing: without it the guard
// rescued "Nuggets vs Portland Trail Blazers" — an actual NBA game, four home
// listings a season, the only opponent in the four leagues that collides with a
// guard token.
const FALSE_POSITIVE_GUARDS: RegExp[] = [
  /\b(brewing|brewery|taproom|coffee|cafe|distillery)\b/i, // "Avalanche Brewing"
  /\b(hot\s+springs|hik(?:e|ing))\b|\btrail\b(?!\s*blazers)/i, // "Mammoth Hot Springs"
  /\b(5k|10k|half[- ]marathon|marathon\s+(run|fun))\b/i, // "Rapids Run 5K"
];

/**
 * True when this is the ticketed pro game itself, which we drop at ingest.
 * False for watch parties, bar promos, and everything else about the team.
 *
 * Reads title and venue only — never the description. See the header.
 */
export function isTicketedProGame(title: string, venueName?: string): boolean {
  // The team must be named in the TITLE. Real game listings always do
  // ("Denver Nuggets vs. Los Angeles Lakers"); requiring it stops us deleting
  // "Zach Bryan" at a venue whose blurb mentions whose home it is.
  if (!TEAM_RX.test(title)) return false;

  const text = `${title} ${venueName ?? ""}`;

  for (const guard of FALSE_POSITIVE_GUARDS) {
    if (guard.test(text)) return false;
  }

  if (WATCH_PARTY_RX.test(text)) return false;

  // A team-at-X matchup is only credible when X could be an opponent. If we know
  // the venue and it is NOT a pro venue, "Broncos at Blake Street Tavern" is a
  // bar showing the game, not a game.
  const isMatchupByAt =
    AT_MATCHUP_RX.test(title) && (!venueName || PRO_VENUE_RX.test(venueName));

  return VS_RX.test(title) || isMatchupByAt || PRO_VENUE_RX.test(text);
}
