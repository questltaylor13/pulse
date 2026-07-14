import { describe, it, expect } from "vitest";
import { pickCardReason, renderReason } from "@/lib/ranking/explanation";
import type { ScoreReason } from "@/lib/ranking/types";

function r(factor: string, contribution: number, human_readable: string): ScoreReason {
  return { factor, contribution, human_readable };
}

describe("pickCardReason", () => {
  it("prefers a real taste match over a higher-contribution generic factor", () => {
    const reasons = [
      r("base_quality", 0.9, "A Pulse favorite"),
      r("vibe_match", 0.24, 'Feels like "cozy"'),
    ];
    expect(pickCardReason(reasons)).toBe('Feels like "cozy"');
  });

  it("returns null when there are no positive reasons", () => {
    const reasons = [r("pass_similarity", -0.5, "Similar to things you've passed on")];
    expect(pickCardReason(reasons)).toBeNull();
  });

  it("falls back to the top generic factor when no taste factor is positive", () => {
    const reasons = [
      r("base_quality", 0.8, "A Pulse favorite"),
      r("recency", 0.05, "Just added — fresh this week"),
      r("starts_soon", 0.08, "Happening soon"),
    ];
    expect(pickCardReason(reasons)).toBe("A Pulse favorite");
  });

  it("among taste factors, picks the highest contribution", () => {
    const reasons = [
      r("vibe_match", 0.1, 'Feels like "cozy"'),
      r("want_similarity", 0.3, "Like a bunch of things you're into"),
      r("base_quality", 0.9, "A Pulse favorite"),
    ];
    expect(pickCardReason(reasons)).toBe("Like a bunch of things you're into");
  });
});

describe("Wave 5 social why-lines", () => {
  it("names the follower on a direct hit", () => {
    expect(
      renderReason("followed_loved_direct", 0.2, undefined, "Alex").human_readable,
    ).toBe("Alex loved this");
  });

  it("does not claim 'loved this' for a tag-overlap match", () => {
    // "Alex loved this" about a spot Alex has never been to is a false claim
    // attributed to a real person. The overlap tier must not make it.
    const line = renderReason("followed_loved_similarity", 0.1, undefined, "Alex")
      .human_readable;
    expect(line).toBe("Like spots Alex loves");
    expect(line).not.toContain("loved this");
  });

  it("degrades gracefully when the follower has no display name", () => {
    expect(renderReason("followed_loved_direct", 0.2).human_readable).toBe(
      "Someone you follow loved this",
    );
    expect(renderReason("followed_loved_similarity", 0.1).human_readable).toBe(
      "Popular with people you follow",
    );
  });

  it("beats a generic factor for the card line — it is a taste signal", () => {
    const reasons = [
      r("base_quality", 0.9, "A Pulse favorite"),
      r("followed_loved_direct", 0.2, "Alex loved this"),
    ];
    expect(pickCardReason(reasons)).toBe("Alex loved this");
  });
});
