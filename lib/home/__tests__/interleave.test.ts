import { describe, it, expect } from "vitest";
import { interleave } from "@/lib/home/interleave";

describe("interleave", () => {
  it("alternates elements from both arrays", () => {
    expect(interleave([1, 2, 3], ["a", "b", "c"])).toEqual([1, "a", 2, "b", 3, "c"]);
  });

  it("appends the remainder when arrays differ in length", () => {
    expect(interleave([1, 2, 3, 4], ["a"])).toEqual([1, "a", 2, 3, 4]);
    expect(interleave([1], ["a", "b", "c"])).toEqual([1, "a", "b", "c"]);
  });

  it("does not starve the shorter side under truncation", () => {
    const events = Array.from({ length: 20 }, (_, i) => `e${i}`);
    const places = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const merged = interleave(events, places).slice(0, 15);
    // With the old concat-then-slice, zero places survived; now ~half do.
    expect(merged.filter((x) => x.startsWith("p")).length).toBeGreaterThan(0);
  });

  it("handles empty arrays", () => {
    expect(interleave([], ["a", "b"])).toEqual(["a", "b"]);
    expect(interleave([1, 2], [])).toEqual([1, 2]);
    expect(interleave([], [])).toEqual([]);
  });
});
