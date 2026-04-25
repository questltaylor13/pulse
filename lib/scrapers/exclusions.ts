// Pro sports events have no discovery value for Pulse — fans already know
// when and where their team plays, and the surface is dominated by tickets-
// for-sale rather than "go try this" experiences. We drop them at ingest so
// they never reach dedup, enrichment, or the home feed.
//
// Participatory / rec / community sports stay (the title would say "5K",
// "league", "tournament", "vs another team's name" — none of which match
// the regex below).
//
// To add or remove a team, edit PRO_SPORTS_TEAMS. Word-boundary regex is
// case-insensitive. We match against title + description (Mammoth alone is
// ambiguous — could be Mammoth Hot Springs, Mammoth Brewing, etc. — but
// "Colorado Mammoth" / "vs Mammoth" / "Mammoth game" in either field is
// unambiguous when paired with another sport-context word, which is why
// the regex anchors to the whole team name when one exists).

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

const TEAM_RX = new RegExp(
  `\\b(${PRO_SPORTS_TEAMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i",
);

// Strong anti-false-positive guards: titles/descriptions that contain a
// team-name token but are clearly NOT a pro-sports event.
const FALSE_POSITIVE_GUARDS: RegExp[] = [
  /\b(brewing|brewery|taproom|coffee|cafe|distillery)\b/i, // "Avalanche Brewing", "Mammoth Coffee"
  /\b(hot\s+springs|trail|hike|hiking)\b/i, // "Mammoth Hot Springs"
  /\b(5k|10k|half[- ]marathon|marathon\s+(run|fun))\b/i, // "Cute Rapids Run 5K"
];

export function isProSportsEvent(title: string, description?: string): boolean {
  const text = `${title} ${description ?? ""}`;
  if (!TEAM_RX.test(text)) return false;
  for (const guard of FALSE_POSITIVE_GUARDS) {
    if (guard.test(text)) return false;
  }
  return true;
}
