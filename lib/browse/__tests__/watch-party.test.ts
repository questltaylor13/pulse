import { describe, it, expect } from "vitest";
import { watchPartyEventsWhere, WATCH_PARTY_PHRASES } from "@/lib/browse/watch-party";

describe("watchPartyEventsWhere", () => {
  const now = new Date("2026-07-14T12:00:00Z");

  it("matches the phrasings real listings use, case-insensitively", () => {
    const where = watchPartyEventsWhere(now);
    const json = JSON.stringify(where);
    for (const phrase of WATCH_PARTY_PHRASES) {
      expect(json).toContain(phrase);
    }
    expect(json).toContain("insensitive");
  });

  it("searches the title AND the description", () => {
    // do303 and westword hard-code description:"" so the title carries most of
    // the signal, but visit-denver ships real editorial copy.
    const where = watchPartyEventsWhere(now);
    const json = JSON.stringify(where);
    expect(json).toContain("title");
    expect(json).toContain("description");
  });

  it("is bounded to the coming week — a watch party is a tonight question", () => {
    const where = watchPartyEventsWhere(now);
    const json = JSON.stringify(where);
    expect(json).toContain("startTime");
    // 7 days out, not the whole catalogue.
    expect(json).toContain("2026-07-21");
  });
});
