// We drop the TICKETED PRO GAME at ingest — fans already know when their team
// plays, and that surface is tickets-for-sale rather than "go try this".
//
// Wave 6B narrowed this. The old rule dropped ANY event mentioning a Denver pro
// team, which meant we deleted every watch party — the single most useful piece
// of content for "where can I watch the game", the exact question the situational
// browse surfaces exist to answer. We were destroying the content at ingest and
// then wondering why we had none of it.
//
// The rule now: a team token ALONE is not enough. Drop it only when the team is
// paired with a MATCHUP ("Nuggets vs Lakers", "Broncos at Chiefs") or a PRO VENUE
// (Ball Arena, Coors Field) — and never when it reads as a watch party.
//
// Accepted trade: a bare "Rockies Opening Day" from a source that omits the venue
// now survives. Deleting every watch party to catch those was the worse trade.
//
// To add or remove a team, edit PRO_SPORTS_TEAMS. Word-boundary regex is
// case-insensitive. We match against title + description (Mammoth alone is
// ambiguous — Mammoth Hot Springs, Mammoth Brewing — which is what the
// false-positive guards below are for).

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

// Ticketed venues for the pro teams above. A team name plus one of these is a
// game, whether or not the title bothers to say "vs".
const PRO_VENUE_RX =
  /\b(ball\s+arena|coors\s+field|empower\s+field|mile\s+high\s+stadium|dick'?s\s+sporting\s+goods\s+park)\b/i;

// "Nuggets vs Lakers", "Avalanche versus Stars".
const VS_RX = /\b(vs\.?|versus)\b/i;

// "Broncos at Chiefs" — the team must sit IMMEDIATELY before the "at", and the
// word after it must be a real opponent rather than an article. Without that
// anchoring, the bare preposition in "Broncos Trivia Night at Illegal Pete's"
// would read as a matchup and we would be right back to deleting bar events.
const AT_MATCHUP_RX = new RegExp(
  `\\b(${TEAMS_ALT})\\s+(?:at|@)\\s+(?!the\\b|a\\b|an\\b)\\w`,
  "i",
);

// The whole point of Wave 6B. This beats BOTH the matchup and the venue signal —
// "Nuggets vs Lakers Watch Party" is a watch party, not a game.
const WATCH_PARTY_RX =
  /\b(watch\s+part(?:y|ies)|viewing\s+part(?:y|ies)|watch\s+the\s+game|watch\s+night|game\s*day|game\s+watch|big\s+screen)\b/i;

// Strong anti-false-positive guards: titles/descriptions that contain a
// team-name token but are clearly NOT a pro-sports event. These beat every
// other signal, including the venue.
const FALSE_POSITIVE_GUARDS: RegExp[] = [
  /\b(brewing|brewery|taproom|coffee|cafe|distillery)\b/i, // "Avalanche Brewing", "Mammoth Coffee"
  /\b(hot\s+springs|trail|hike|hiking)\b/i, // "Mammoth Hot Springs"
  /\b(5k|10k|half[- ]marathon|marathon\s+(run|fun))\b/i, // "Cute Rapids Run 5K"
];

/**
 * True when this is the ticketed pro game itself, which we drop at ingest.
 * False for watch parties, bar promos, and everything else about the team —
 * that content is exactly what the situational surfaces want.
 */
export function isTicketedProGame(
  title: string,
  description?: string,
  venueName?: string,
): boolean {
  const text = `${title} ${description ?? ""}`;
  if (!TEAM_RX.test(text)) return false;

  for (const guard of FALSE_POSITIVE_GUARDS) {
    if (guard.test(text)) return false;
  }

  // Venue is searched for the pro-venue signal but deliberately NOT for the
  // matchup signal: "Empower Field at Mile High" contains an "at" that would
  // otherwise read as a matchup for any event held there.
  const withVenue = `${text} ${venueName ?? ""}`;
  if (WATCH_PARTY_RX.test(withVenue)) return false;

  return VS_RX.test(text) || AT_MATCHUP_RX.test(text) || PRO_VENUE_RX.test(withVenue);
}
