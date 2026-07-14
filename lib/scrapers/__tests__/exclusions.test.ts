import { describe, it, expect } from "vitest";
import { isTicketedProGame, PRO_SPORTS_TEAMS } from "@/lib/scrapers/exclusions";

// Wave 6B: the rule changed from "any mention of a pro team" to "the ticketed
// game itself". A game is dropped only when a team token is paired with EITHER
// a matchup ("vs"/"at") OR a pro venue — and never when it reads as a watch
// party. See the inverted cases below.

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
    expect(isTicketedProGame("Rockies Opening Day", "", "Coors Field")).toBe(true);
    expect(isTicketedProGame("Rapids Home Opener", "", "Dick's Sporting Goods Park")).toBe(true);
    expect(isTicketedProGame("Nuggets Season Opener", "", "Ball Arena")).toBe(true);
    expect(isTicketedProGame("Broncos Fan Fest", "", "Empower Field at Mile High")).toBe(true);
  });

  it("is case-insensitive and matches nicknames", () => {
    expect(isTicketedProGame("avalanche vs stars")).toBe(true);
    expect(isTicketedProGame("go avs vs vegas")).toBe(true);
  });

  it("matches when the team + matchup appear only in the description", () => {
    expect(
      isTicketedProGame("Tonight at the Arena", "Nuggets vs Suns, doors at 6."),
    ).toBe(true);
  });
});

describe("isTicketedProGame — watch parties SURVIVE (inverted in Wave 6B)", () => {
  // These two assertions were previously `.toBe(true)` — i.e. we deleted them.
  // That was the bug: a watch party is the single most useful piece of content
  // for "where can I watch the game", and we were dropping it at ingest.
  it("keeps a watch party that names a team", () => {
    expect(isTicketedProGame("Nuggs Watch Party")).toBe(false);
  });

  it("keeps a watch party whose team lives in the description", () => {
    expect(
      isTicketedProGame(
        "Game Watch Party",
        "Join us for the Avalanche playoff game on the big screen.",
      ),
    ).toBe(false);
  });

  it("keeps watch-party phrasings at a bar", () => {
    expect(isTicketedProGame("Broncos Viewing Party", "", "Blake Street Tavern")).toBe(false);
    expect(isTicketedProGame("Watch the game: Rockies", "", "Improper City")).toBe(false);
    expect(isTicketedProGame("Avs Game Day at the Taproom", "", "Ratio Beerworks")).toBe(false);
  });

  it("keeps the watch party even when the venue string looks pro", () => {
    // The watch-party guard must BEAT the venue signal, not merely tie with it.
    expect(isTicketedProGame("Nuggets Watch Party", "", "Ball Arena")).toBe(false);
  });

  it("keeps a watch party phrased as a matchup", () => {
    // Matchup AND watch party. Watch party wins.
    expect(isTicketedProGame("Nuggets vs Lakers Watch Party", "", "Blake Street Tavern")).toBe(false);
  });
});

describe("isTicketedProGame — a bare team mention is no longer enough", () => {
  it("keeps a team-adjacent event with no matchup and no pro venue", () => {
    // Previously dropped. Without a matchup or a pro venue this is a bar promo,
    // a jersey giveaway, a charity night — discovery content, not a ticket sale.
    expect(isTicketedProGame("Go Avs!")).toBe(false);
    expect(isTicketedProGame("Broncos Trivia Night", "", "Illegal Pete's")).toBe(false);
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
    // A brewery event that happens to list a stadium address must not be dropped.
    expect(isTicketedProGame("Avalanche Brewing Tap Takeover", "", "Coors Field")).toBe(false);
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
    const adversarial = `vs `.repeat(2500); // 10000 chars of "vs "
    const start = performance.now();
    isTicketedProGame(adversarial);
    expect(performance.now() - start).toBeLessThan(50);
  });

  it("PRO_SPORTS_TEAMS list is the documented teams", () => {
    // Defensive test against accidental empty-list shipping.
    expect(PRO_SPORTS_TEAMS.length).toBeGreaterThanOrEqual(6);
    expect(PRO_SPORTS_TEAMS).toContain("Mammoth");
    expect(PRO_SPORTS_TEAMS).toContain("Nuggets");
  });
});
