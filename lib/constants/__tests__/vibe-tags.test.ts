import { describe, it, expect } from "vitest";
import {
  VIBE_TAGS,
  ENRICHMENT_VIBE_VOCABULARY,
  normalizeVibeTag,
  filterValidVibeTags,
  isValidVibeTag,
  vibeTagLabel,
  vibeTagLabels,
} from "@/lib/constants/vibe-tags";

// Wave 6B: kebab-case is the ONE canonical vibe vocabulary. Before this, the
// allowlist was kebab while enrichment wrote Title-case, so every LLM-enriched
// place rendered zero vibe chips AND the browse vibe filter matched zero rows.

describe("normalizeVibeTag", () => {
  it("lowercases Title-case tags from the legacy corpus", () => {
    expect(normalizeVibeTag("Cozy")).toBe("cozy");
    expect(normalizeVibeTag("Lively")).toBe("lively");
    expect(normalizeVibeTag("Sophisticated")).toBe("sophisticated");
  });

  it("hyphenates whitespace and underscores", () => {
    expect(normalizeVibeTag("High Energy")).toBe("high-energy");
    expect(normalizeVibeTag("scenic_view")).toBe("scenic-view");
    expect(normalizeVibeTag("  Late   Night  ")).toBe("late-night");
  });

  it("resolves semantic renames that case-folding alone cannot", () => {
    // The bug the spec's proposed fix (normalizeTagToken) could not have caught:
    // "Groups" lowercases to "groups", which is NOT "group-friendly".
    expect(normalizeVibeTag("Groups")).toBe("group-friendly");
    expect(normalizeVibeTag("Date Night")).toBe("date-spot");
    expect(normalizeVibeTag("Family")).toBe("family-friendly");
    expect(normalizeVibeTag("Solo")).toBe("solo-friendly");
    expect(normalizeVibeTag("Patio")).toBe("big-patio");
  });

  it("is idempotent — a canonical tag normalizes to itself", () => {
    for (const tag of VIBE_TAGS) {
      expect(normalizeVibeTag(tag)).toBe(tag);
    }
  });
});

describe("filterValidVibeTags", () => {
  it("keeps the whole enrichment vocabulary (the regression that broke chips)", () => {
    // Every one of these was silently dropped before Wave 6B. Only 5 of the 20
    // survived case-folding; the other 15 were absent from the allowlist.
    const kept = filterValidVibeTags([...ENRICHMENT_VIBE_VOCABULARY]);
    expect(kept).toHaveLength(ENRICHMENT_VIBE_VOCABULARY.length);
  });

  it("normalizes Title-case input rather than discarding it", () => {
    expect(filterValidVibeTags(["Cozy", "Lively", "Trendy"])).toEqual([
      "cozy",
      "lively",
      "trendy",
    ]);
  });

  it("drops tokens outside the vocabulary", () => {
    expect(filterValidVibeTags(["Cozy", "Blorptastic", ""])).toEqual(["cozy"]);
  });

  it("de-duplicates after normalization", () => {
    // A corpus row mid-migration can hold both spellings.
    expect(filterValidVibeTags(["Cozy", "cozy", "COZY"])).toEqual(["cozy"]);
  });

  it("returns an empty array for empty input", () => {
    expect(filterValidVibeTags([])).toEqual([]);
  });
});

describe("vibeTagLabel — kebab is for storage, never for users", () => {
  it("titles a single-word tag", () => {
    expect(vibeTagLabel("cozy")).toBe("Cozy");
    expect(vibeTagLabel("lively")).toBe("Lively");
  });

  it("un-hyphenates a compound tag rather than showing the raw token", () => {
    // Without this, place detail renders "date-spot" and "shareable-plates".
    expect(vibeTagLabel("high-energy")).toBe("High Energy");
    expect(vibeTagLabel("date-spot")).toBe("Date Spot");
    expect(vibeTagLabel("shareable-plates")).toBe("Shareable Plates");
  });

  it("labels a legacy Title-case value identically — the migration is invisible", () => {
    // The corpus is mid-migration. A card must look the same either side of it.
    expect(vibeTagLabel("Cozy")).toBe("Cozy");
    expect(vibeTagLabel("cozy")).toBe("Cozy");
  });

  it("vibeTagLabels validates and labels in one step", () => {
    expect(vibeTagLabels(["Cozy", "lively", "Blorptastic"])).toEqual(["Cozy", "Lively"]);
  });
});

describe("the vocabulary itself", () => {
  it("is entirely kebab-case — no Title-case survivors", () => {
    for (const tag of VIBE_TAGS) {
      expect(tag).toBe(tag.toLowerCase());
      expect(tag).not.toMatch(/[\s_]/);
    }
  });

  it("every enrichment tag is a valid canonical tag", () => {
    // This is the invariant that keeps the two halves from drifting apart again:
    // whatever the LLM is told it may emit MUST be renderable and queryable.
    for (const tag of ENRICHMENT_VIBE_VOCABULARY) {
      expect(isValidVibeTag(tag)).toBe(true);
    }
  });
});
