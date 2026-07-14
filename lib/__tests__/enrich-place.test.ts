import { describe, it, expect } from "vitest";
import {
  parseEnrichment,
  buildSelectionWhere,
  buildUpdateData,
  buildPrompt,
  type EnrichmentInput,
} from "@/lib/enrich-place";

const PLACE: EnrichmentInput = {
  id: "p1",
  name: "Blake Street Tavern",
  category: "BARS",
  address: "2301 Blake St",
  neighborhood: "Ballpark",
  priceLevel: 2,
  googleRating: 4.4,
  googleReviewCount: 3100,
  types: ["bar", "restaurant"],
  website: "https://blakestreettavern.com",
};

const FULL_RESPONSE = JSON.stringify({
  vibeTags: ["Lively", "Casual"],
  companionTags: ["Groups", "Friends"],
  occasionTags: ["Happy Hour"],
  goodForTags: ["Drinks"],
  pulseDescription: "A cavernous sports bar that somehow still feels like a neighborhood joint.",
  goodForWatchingSports: true,
  isKidFriendly: false,
  hasOutdoorSeating: true,
  hasIndoorSeating: true,
  fitsLargeGroups: true,
});

describe("parseEnrichment — tags", () => {
  it("normalizes vibe tags onto the canonical kebab vocabulary", () => {
    // The LLM is asked for kebab, but it is an LLM. Title-case must still land.
    const e = parseEnrichment(FULL_RESPONSE);
    expect(e?.vibeTags).toEqual(["lively", "casual"]);
  });

  it("drops vibe tags outside the vocabulary", () => {
    const e = parseEnrichment(JSON.stringify({ vibeTags: ["Cozy", "Blorptastic"] }));
    expect(e?.vibeTags).toEqual(["cozy"]);
  });

  it("keeps the Title-case vocabularies that were never broken", () => {
    const e = parseEnrichment(FULL_RESPONSE);
    expect(e?.companionTags).toEqual(["Groups", "Friends"]);
    expect(e?.occasionTags).toEqual(["Happy Hour"]);
    expect(e?.goodForTags).toEqual(["Drinks"]);
  });

  it("drops companion/occasion/goodFor tags outside their whitelists", () => {
    const e = parseEnrichment(
      JSON.stringify({ companionTags: ["Groups", "Wizards"], goodForTags: ["Nonsense"] }),
    );
    expect(e?.companionTags).toEqual(["Groups"]);
    expect(e?.goodForTags).toEqual([]);
  });
});

describe("parseEnrichment — the situational booleans", () => {
  it("reads all five", () => {
    const e = parseEnrichment(FULL_RESPONSE);
    expect(e?.goodForWatchingSports).toBe(true);
    expect(e?.isKidFriendly).toBe(false);
    expect(e?.hasOutdoorSeating).toBe(true);
    expect(e?.hasIndoorSeating).toBe(true);
    expect(e?.fitsLargeGroups).toBe(true);
  });

  it("accepts ONLY a real boolean true — never a truthy string", () => {
    // An LLM will happily answer "yes". Coercing that would publish a claim the
    // model never actually made in the requested shape.
    const e = parseEnrichment(
      JSON.stringify({ goodForWatchingSports: "yes", fitsLargeGroups: 1 }),
    );
    expect(e?.goodForWatchingSports).toBe(false);
    expect(e?.fitsLargeGroups).toBe(false);
  });

  it("defaults a missing boolean to false, except hasIndoorSeating", () => {
    const e = parseEnrichment(JSON.stringify({ vibeTags: [] }));
    expect(e?.goodForWatchingSports).toBe(false);
    expect(e?.isKidFriendly).toBe(false);
    expect(e?.hasOutdoorSeating).toBe(false);
    expect(e?.fitsLargeGroups).toBe(false);
    // Most places have indoor seating; the schema default says so too.
    expect(e?.hasIndoorSeating).toBe(true);
  });
});

describe("parseEnrichment — situationalAnswers is the floor that stops a bogus mark", () => {
  it("counts only REAL JSON booleans", () => {
    expect(parseEnrichment(FULL_RESPONSE)?.situationalAnswers).toBe(5);
  });

  it("is 0 when the model answered none of them", () => {
    // The trap: {} parses to a perfectly valid all-false enrichment. Writing
    // situationalEnrichedAt on that retires the place from the weekly cron's
    // null-gate FOREVER, on the strength of an answer we never got. runEnrichment
    // treats 0 as unusable and leaves the place for the next run.
    expect(parseEnrichment("{}")?.situationalAnswers).toBe(0);
  });

  it("is 0 when the model answered in strings — an answer we did not ask for", () => {
    const e = parseEnrichment(
      JSON.stringify({ goodForWatchingSports: "yes", isKidFriendly: "no", fitsLargeGroups: 1 }),
    );
    expect(e?.situationalAnswers).toBe(0);
  });

  it("counts an explicit false — that IS an answer", () => {
    const e = parseEnrichment(JSON.stringify({ goodForWatchingSports: false }));
    expect(e?.situationalAnswers).toBe(1);
  });
});

describe("parseEnrichment — malformed input", () => {
  it("returns null on non-JSON rather than throwing", () => {
    expect(parseEnrichment("I'm sorry, I can't help with that.")).toBeNull();
  });

  it("returns null on a JSON array (not an object)", () => {
    expect(parseEnrichment("[1,2,3]")).toBeNull();
  });

  it("survives every field being absent", () => {
    const e = parseEnrichment("{}");
    expect(e).not.toBeNull();
    expect(e?.vibeTags).toEqual([]);
    expect(e?.pulseDescription).toBeNull();
  });

  it("ignores a non-array where an array is expected", () => {
    const e = parseEnrichment(JSON.stringify({ vibeTags: "cozy" }));
    expect(e?.vibeTags).toEqual([]);
  });
});

describe("buildSelectionWhere", () => {
  it("full mode enriches only places that have never been enriched", () => {
    expect(buildSelectionWhere({ mode: "full" })).toEqual({ pulseDescription: null });
  });

  it("attributes mode selects on the situational marker, NOT on pulseDescription", () => {
    // The whole point: a place with a description we like still needs its
    // booleans derived. Gating on pulseDescription would skip all 460 of them.
    expect(buildSelectionWhere({ mode: "attributes" })).toEqual({
      situationalEnrichedAt: null,
    });
  });

  it("force lifts the idempotence gate", () => {
    expect(buildSelectionWhere({ mode: "full", force: true })).toEqual({});
    expect(buildSelectionWhere({ mode: "attributes", force: true })).toEqual({});
  });

  it("narrows by category when asked", () => {
    expect(buildSelectionWhere({ mode: "attributes", category: "bar" })).toEqual({
      situationalEnrichedAt: null,
      category: "BARS",
    });
  });

  it("throws on an unknown category rather than silently selecting everything", () => {
    expect(() => buildSelectionWhere({ mode: "full", category: "nightclub" })).toThrow(
      /unknown category/i,
    );
  });
});

describe("buildUpdateData", () => {
  const enrichment = parseEnrichment(FULL_RESPONSE)!;
  const now = new Date("2026-07-14T12:00:00Z");

  it("attributes mode writes ONLY the booleans and the marker", () => {
    // Quest's call: the targeted backfill must not regenerate live descriptions.
    // This is the test that enforces it.
    const data = buildUpdateData("attributes", enrichment, now);
    expect(data).toEqual({
      goodForWatchingSports: true,
      isKidFriendly: false,
      hasOutdoorSeating: true,
      hasIndoorSeating: true,
      fitsLargeGroups: true,
      situationalEnrichedAt: now,
    });
    expect(data).not.toHaveProperty("pulseDescription");
    expect(data).not.toHaveProperty("vibeTags");
    expect(data).not.toHaveProperty("companionTags");
  });

  it("full mode writes the tags, the description AND the booleans", () => {
    const data = buildUpdateData("full", enrichment, now);
    expect(data.pulseDescription).toBe(enrichment.pulseDescription);
    expect(data.vibeTags).toEqual(["lively", "casual"]);
    expect(data.goodForWatchingSports).toBe(true);
    expect(data.situationalEnrichedAt).toBe(now);
  });

  it("full mode never writes a null description over an existing one", () => {
    // The LLM omitted the description. Writing null would erase live copy.
    const partial = parseEnrichment(JSON.stringify({ vibeTags: ["Cozy"] }))!;
    const data = buildUpdateData("full", partial, now);
    expect(data).not.toHaveProperty("pulseDescription");
    expect(data.vibeTags).toEqual(["cozy"]);
  });
});

describe("buildPrompt", () => {
  it("asks for the kebab vocabulary, not the old Title-case one", () => {
    const prompt = buildPrompt(PLACE);
    expect(prompt).toContain("cozy");
    expect(prompt).not.toContain("Cozy");
  });

  it("asks for all five situational booleans by name", () => {
    const prompt = buildPrompt(PLACE);
    for (const key of [
      "goodForWatchingSports",
      "isKidFriendly",
      "hasOutdoorSeating",
      "hasIndoorSeating",
      "fitsLargeGroups",
    ]) {
      expect(prompt).toContain(key);
    }
  });

  it("includes the place's identifying facts", () => {
    const prompt = buildPrompt(PLACE);
    expect(prompt).toContain("Blake Street Tavern");
    expect(prompt).toContain("Ballpark");
  });
});
