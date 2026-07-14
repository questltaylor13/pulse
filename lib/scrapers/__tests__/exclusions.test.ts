import { describe, it, expect } from "vitest";
import { isTicketedProGame, PRO_SPORTS_TEAMS } from "@/lib/scrapers/exclusions";

// Wave 6B: the rule changed from "any mention of a pro team" to "the ticketed
// game itself". Drop only when the team is in the TITLE and paired with a matchup
// or a pro venue — and never when it reads as a watch party.
//
// The description is deliberately not read. See the header of exclusions.ts.

describe("isTicketedProGame — the ticketed game still dies", () => {
  it("drops a matchup by title alone", () => {
    expect(isTicketedProGame("Nuggets vs Lakers")).toBe(true);
    expect(isTicketedProGame("Broncos at Chiefs")).toBe(true);
    expect(isTicketedProGame("Avalanche vs Stars")).toBe(true);
  });

  it("matches the lacrosse case from the original diagnostic", () => {
    expect(isTicketedProGame("First Round: TBD vs Colorado Mammoth")).toBe(true);
  });

  it("drops a team event at a pro venue even with no 'vs'", () => {
    expect(isTicketedProGame("Rockies Opening Day", "Coors Field")).toBe(true);
    expect(isTicketedProGame("Rapids Home Opener", "Dick's Sporting Goods Park")).toBe(true);
    expect(isTicketedProGame("Nuggets Season Opener", "Ball Arena")).toBe(true);
    expect(isTicketedProGame("Broncos Fan Fest", "Empower Field at Mile High")).toBe(true);
  });

  it("handles the typographic apostrophe in Dick's", () => {
    // The corpus contains U+2019, which a bare ' missed.
    expect(isTicketedProGame("Rapids Season Opener", "Dick’s Sporting Goods Park")).toBe(true);
  });

  it("is case-insensitive and matches nicknames", () => {
    expect(isTicketedProGame("avalanche vs stars")).toBe(true);
    expect(isTicketedProGame("go avs vs vegas")).toBe(true);
  });

  it("drops the Trail Blazers, who are a basketball team and not a hiking trail", () => {
    // The \btrail\b false-positive guard rescued this REAL NBA game — the only
    // opponent in the four leagues that collides with a guard token.
    expect(isTicketedProGame("Denver Nuggets vs. Portland Trail Blazers", "Ball Arena")).toBe(true);
    expect(isTicketedProGame("Portland Trail Blazers at Denver Nuggets", "Ball Arena")).toBe(true);
  });
});

describe("isTicketedProGame — watch parties SURVIVE (the point of Wave 6B)", () => {
  // These first two were previously `.toBe(true)` — i.e. we deleted them.
  it("keeps a watch party that names a team", () => {
    expect(isTicketedProGame("Nuggs Watch Party")).toBe(false);
  });

  it("keeps watch-party phrasings at a bar", () => {
    expect(isTicketedProGame("Broncos Viewing Party", "Blake Street Tavern")).toBe(false);
    expect(isTicketedProGame("Watch the game: Rockies", "Improper City")).toBe(false);
    expect(isTicketedProGame("Avs Game Day at the Taproom", "Ratio Beerworks")).toBe(false);
  });

  it("keeps 'TEAM at <bar>' — the most natural watch-party title there is", () => {
    // The headline bug the review caught: AT_MATCHUP fired on "Broncos at Blake",
    // and the watch-party guard only knew the literal phrase "watch the game".
    // Wave 6B was still deleting the exact content it exists to save.
    expect(isTicketedProGame("Broncos at Blake Street Tavern", "Blake Street Tavern")).toBe(false);
    expect(isTicketedProGame("Nuggets at Illegal Pete's", "Illegal Pete's")).toBe(false);
    expect(isTicketedProGame("Rockies at Number Thirty Eight", "Number Thirty Eight")).toBe(false);
  });

  it("keeps the watch-VERB forms real listings actually use", () => {
    expect(isTicketedProGame("Watch the Broncos at Blake Street Tavern", "Blake Street Tavern")).toBe(false);
    expect(isTicketedProGame("Catch the Avs at Improper City", "Improper City")).toBe(false);
    expect(isTicketedProGame("Cheer on the Nuggets", "Stoney's Bar and Grill")).toBe(false);
  });

  it("keeps the watch party even when the venue string looks pro", () => {
    expect(isTicketedProGame("Nuggets Watch Party", "Ball Arena")).toBe(false);
  });

  it("keeps a watch party phrased as a matchup", () => {
    expect(isTicketedProGame("Nuggets vs Lakers Watch Party", "Blake Street Tavern")).toBe(false);
  });
});

describe("isTicketedProGame — a bare team mention is no longer enough", () => {
  it("keeps a team-adjacent event with no matchup and no pro venue", () => {
    expect(isTicketedProGame("Go Avs!")).toBe(false);
    expect(isTicketedProGame("Broncos Trivia Night", "Illegal Pete's")).toBe(false);
    expect(isTicketedProGame("Rockies Rooftop Party", "Viewhouse Ballpark")).toBe(false);
    expect(isTicketedProGame("Avs After Party", "Number Thirty Eight")).toBe(false);
  });
});

describe("isTicketedProGame — the description is not read", () => {
  it("does not let a non-team event at a pro venue be dropped by venue boilerplate", () => {
    // "Ball Arena, home of the Denver Nuggets and Colorado Avalanche" is standard
    // venue copy. Reading it dropped a Zach Bryan concert.
    expect(isTicketedProGame("Zach Bryan: The Quittin Time Tour", "Ball Arena")).toBe(false);
    expect(isTicketedProGame("Monster Jam", "Empower Field at Mile High")).toBe(false);
  });
});

describe("isTicketedProGame — false-positive guards retained", () => {
  it("does not match Mammoth Hot Springs and similar place names", () => {
    expect(isTicketedProGame("Mammoth Hot Springs Photography Talk")).toBe(false);
    expect(isTicketedProGame("Hike to Mammoth Trail")).toBe(false);
  });

  it("does not match brewery / cafe / coffee names sharing a token", () => {
    expect(isTicketedProGame("Avalanche Brewing 5-Year Anniversary")).toBe(false);
    expect(isTicketedProGame("Mammoth Coffee Cupping")).toBe(false);
    expect(isTicketedProGame("Broncos Distillery Tour")).toBe(false);
  });

  it("does not match participatory races", () => {
    expect(isTicketedProGame("Rapids Run 5K")).toBe(false);
    expect(isTicketedProGame("Avalanche Half-Marathon")).toBe(false);
  });

  it("guards beat the venue signal too", () => {
    expect(isTicketedProGame("Avalanche Brewing Tap Takeover", "Coors Field")).toBe(false);
  });

  it("returns false when no team token is present", () => {
    expect(isTicketedProGame("Phoebe Bridgers at Mission Ballroom")).toBe(false);
    expect(isTicketedProGame("Cinco de Mayo Festival")).toBe(false);
    expect(isTicketedProGame("Yoga in the Park")).toBe(false);
  });

  it("does not treat a non-team 'vs' as a game", () => {
    expect(isTicketedProGame("Chef vs Chef Cookoff")).toBe(false);
  });
});

describe("isTicketedProGame — perf / shape", () => {
  it("handles 10KB adversarial input under 50ms", () => {
    const adversarial = `vs `.repeat(2500);
    const start = performance.now();
    isTicketedProGame(adversarial);
    expect(performance.now() - start).toBeLessThan(50);
  });

  it("does not backtrack catastrophically on a team + repeated 'at'", () => {
    const adversarial = "Nuggets " + "at ".repeat(50000);
    const start = performance.now();
    isTicketedProGame(adversarial);
    expect(performance.now() - start).toBeLessThan(50);
  });

  it("PRO_SPORTS_TEAMS list is the documented teams", () => {
    expect(PRO_SPORTS_TEAMS.length).toBeGreaterThanOrEqual(6);
    expect(PRO_SPORTS_TEAMS).toContain("Mammoth");
    expect(PRO_SPORTS_TEAMS).toContain("Nuggets");
  });
});
