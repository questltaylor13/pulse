import { describe, it, expect } from "vitest";
import { isProSportsEvent, PRO_SPORTS_TEAMS } from "@/lib/scrapers/exclusions";

describe("isProSportsEvent — positive cases", () => {
  it("matches the lacrosse case from the diagnostic", () => {
    expect(isProSportsEvent("First Round: TBD vs Colorado Mammoth")).toBe(true);
  });

  it("matches NHL/NBA/NFL/MLB/MLS/NLL teams", () => {
    expect(isProSportsEvent("Avalanche vs Stars")).toBe(true);
    expect(isProSportsEvent("Nuggets vs Lakers")).toBe(true);
    expect(isProSportsEvent("Broncos vs Chiefs")).toBe(true);
    expect(isProSportsEvent("Rockies Opening Day")).toBe(true);
    expect(isProSportsEvent("Rapids Home Opener")).toBe(true);
  });

  it("is case-insensitive and matches nicknames", () => {
    expect(isProSportsEvent("avalanche vs stars")).toBe(true);
    expect(isProSportsEvent("Go Avs!")).toBe(true);
    expect(isProSportsEvent("Nuggs Watch Party")).toBe(true);
  });

  it("matches when the team name appears only in the description", () => {
    expect(
      isProSportsEvent(
        "Game Watch Party",
        "Join us for the Avalanche playoff game on the big screen.",
      ),
    ).toBe(true);
  });
});

describe("isProSportsEvent — false-positive guards", () => {
  it("does not match Mammoth Hot Springs and similar place names", () => {
    expect(isProSportsEvent("Mammoth Hot Springs Photography Talk")).toBe(false);
    expect(isProSportsEvent("Hike to Mammoth Trail")).toBe(false);
  });

  it("does not match brewery / cafe / coffee names sharing a token", () => {
    expect(isProSportsEvent("Avalanche Brewing 5-Year Anniversary")).toBe(false);
    expect(isProSportsEvent("Mammoth Coffee Cupping")).toBe(false);
    expect(isProSportsEvent("Broncos Distillery Tour")).toBe(false);
  });

  it("does not match participatory races", () => {
    expect(isProSportsEvent("Rapids Run 5K")).toBe(false);
    expect(isProSportsEvent("Avalanche Half-Marathon")).toBe(false);
  });

  it("returns false when no team token is present", () => {
    expect(isProSportsEvent("Phoebe Bridgers at Mission Ballroom")).toBe(false);
    expect(isProSportsEvent("Cinco de Mayo Festival")).toBe(false);
    expect(isProSportsEvent("Yoga in the Park")).toBe(false);
  });
});

describe("isProSportsEvent — perf / shape", () => {
  it("handles 10KB adversarial input under 50ms", () => {
    const adversarial = `vs `.repeat(2500); // 10000 chars of "vs "
    const start = performance.now();
    isProSportsEvent(adversarial);
    expect(performance.now() - start).toBeLessThan(50);
  });

  it("PRO_SPORTS_TEAMS list is the documented teams", () => {
    // Defensive test against accidental empty-list shipping.
    expect(PRO_SPORTS_TEAMS.length).toBeGreaterThanOrEqual(6);
    expect(PRO_SPORTS_TEAMS).toContain("Mammoth");
    expect(PRO_SPORTS_TEAMS).toContain("Nuggets");
  });
});
