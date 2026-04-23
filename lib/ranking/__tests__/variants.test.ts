import { describe, it, expect } from "vitest";
import { assignVariant, getVariantConfig } from "@/lib/ranking/variants";
import { RANKING_CONFIG } from "@/lib/ranking/config";

describe("getVariantConfig", () => {
  it("returns the base config for the control variant", () => {
    const cfg = getVariantConfig("control");
    expect(cfg.weights.baseQuality).toBe(RANKING_CONFIG.weights.baseQuality);
    expect(cfg.serendipity.mixedInInterval).toBe(RANKING_CONFIG.serendipity.mixedInInterval);
  });

  it("falls back to control for unknown variant keys (doesn't throw)", () => {
    const cfg = getVariantConfig("made_up_variant");
    expect(cfg.weights.baseQuality).toBe(RANKING_CONFIG.weights.baseQuality);
  });
});

describe("assignVariant", () => {
  it("returns 'control' when no other variants are defined (V1 behavior)", () => {
    // V1 only has "control" in RANKING_VARIANTS; all users should bucket to it.
    expect(assignVariant("usr_abc")).toBe("control");
    expect(assignVariant("usr_xyz")).toBe("control");
  });

  it("is deterministic for a given userId + salt", () => {
    expect(assignVariant("usr_abc")).toBe(assignVariant("usr_abc"));
    expect(assignVariant("usr_abc", "vX")).toBe(assignVariant("usr_abc", "vX"));
  });
});
