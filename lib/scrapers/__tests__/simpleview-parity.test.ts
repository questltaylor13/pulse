import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

vi.mock("@/lib/scrapers/fetch-utils", () => ({ fetchPage: vi.fn() }));

import { fetchPage } from "@/lib/scrapers/fetch-utils";
import { makeSimpleviewScraper, SIMPLEVIEW_FEEDS } from "@/lib/scrapers/regional/simpleview";
import { scrapeVisitEstesPark } from "@/lib/scrapers/regional/visit-estes-park";
import { scrapeVisitGolden } from "@/lib/scrapers/regional/visit-golden";
import { scrapeVisitSteamboatChamber } from "@/lib/scrapers/regional/visit-steamboat-chamber";

const FIX = path.resolve(__dirname, "../../../tests/fixtures/scrapers");
const xml = readFileSync(path.join(FIX, "simpleview-golden.xml"), "utf8");

const PAIRS = [
  ["visit-estes-park", scrapeVisitEstesPark],
  ["visit-golden", scrapeVisitGolden],
  ["visit-steamboat-chamber", scrapeVisitSteamboatChamber],
] as const;

describe("Simpleview factory parity with the original scrapers", () => {
  beforeEach(() => {
    (fetchPage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(xml);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  for (const [source, oldFn] of PAIRS) {
    it(`${source}: factory output equals the original over the same feed`, async () => {
      const config = SIMPLEVIEW_FEEDS.find((f) => f.source === source);
      if (!config) throw new Error(`No SIMPLEVIEW_FEEDS config for source "${source}"`);
      const oldResult = await oldFn();
      const newResult = await makeSimpleviewScraper(config)();
      // Guard against a silent-empty regression (e.g. bad fixture path): the
      // parity assertions would pass vacuously if both sides returned [].
      expect(oldResult.events.length).toBeGreaterThan(0);
      expect(newResult.source).toBe(oldResult.source);
      expect(newResult.errors).toEqual(oldResult.errors);
      expect(newResult.events).toEqual(oldResult.events);
    });
  }
});
