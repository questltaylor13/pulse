import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { geocodeVenue } from "@/lib/geocode";
import type { PrismaClient } from "@prisma/client";

// Minimal in-memory fake of the two geocodeCache methods geocodeVenue uses
// (no real DB — the harness is pure-unit vitest).
function makeFakeDb() {
  const store = new Map<string, any>();
  const db = {
    geocodeCache: {
      findUnique: vi.fn(async ({ where }: any) => store.get(where.normalizedName) ?? null),
      upsert: vi.fn(async ({ where, create }: any) => {
        if (!store.has(where.normalizedName)) store.set(where.normalizedName, { ...create });
        return store.get(where.normalizedName);
      }),
    },
  };
  return { db: db as unknown as Pick<PrismaClient, "geocodeCache">, store };
}

const okResponse = () => ({
  ok: true,
  json: async () => ({
    status: "OK",
    results: [{
      geometry: { location: { lat: 39.75, lng: -104.99 }, location_type: "ROOFTOP" },
      formatted_address: "935 E Colfax Ave, Denver, CO",
      partial_match: false,
    }],
  }),
});

describe("geocodeVenue", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("misses cache, calls the API exactly once, writes an ok row, and dedups same-name calls", async () => {
    const { db, store } = makeFakeDb();
    (fetch as any).mockResolvedValue(okResponse());

    const res = await geocodeVenue({ venueName: "The Ogden Theatre", address: "935 E Colfax Ave" }, db);
    expect(res).toEqual({ lat: 39.75, lng: -104.99, formattedAddress: "935 E Colfax Ave, Denver, CO", locationType: "ROOFTOP", partialMatch: false });
    expect(store.get("ogden theatre")?.status).toBe("ok");
    expect(fetch).toHaveBeenCalledTimes(1);

    // Second call for the same normalized name is served from cache — no new fetch.
    const again = await geocodeVenue({ venueName: "Ogden Theatre" }, db);
    expect(again?.lat).toBe(39.75);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("negative-caches a ZERO_RESULTS response and never retries", async () => {
    const { db, store } = makeFakeDb();
    (fetch as any).mockResolvedValue({ ok: true, json: async () => ({ status: "ZERO_RESULTS", results: [] }) });

    const first = await geocodeVenue({ venueName: "Nowhere Bar" }, db);
    expect(first).toBeNull();
    expect(store.get("nowhere bar")?.status).toBe("failed");

    const second = await geocodeVenue({ venueName: "Nowhere Bar" }, db);
    expect(second).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1); // served from the failed cache row
  });

  it("does NOT cache REQUEST_DENIED (API not enabled yet) so it self-heals", async () => {
    const { db, store } = makeFakeDb();
    (fetch as any).mockResolvedValue({ ok: true, json: async () => ({ status: "REQUEST_DENIED", error_message: "not enabled" }) });

    const res = await geocodeVenue({ venueName: "Ogden Theatre" }, db);
    expect(res).toBeNull();
    expect(store.has("ogden theatre")).toBe(false);
    expect(db.geocodeCache.upsert).not.toHaveBeenCalled();
  });

  it("downgrades a partial_match to APPROXIMATE (single confidence signal)", async () => {
    const { db } = makeFakeDb();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "OK", results: [{ geometry: { location: { lat: 39.7, lng: -105.0 }, location_type: "GEOMETRIC_CENTER" }, formatted_address: "Denver, CO", partial_match: true }] }),
    });
    const res = await geocodeVenue({ venueName: "Some Vague Place" }, db);
    expect(res?.partialMatch).toBe(true);
    expect(res?.locationType).toBe("APPROXIMATE");
  });
});
