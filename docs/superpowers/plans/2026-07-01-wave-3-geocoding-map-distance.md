# Event Geocoding + Map/Distance Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Populate the never-set `Event.lat/lng` by geocoding distinct venue names so the events map lights up, venue-match gains a geo path, and the dead distance filter/sort activate — all reusing the existing `GOOGLE_PLACES_API_KEY` with a durable negative-caching store.

**Architecture:** A new cache-first `lib/geocode.ts` wraps the Google Geocoding API (graceful-fallback fetch mirroring `lib/guides/walk-time.ts`) and dedups by `normalizeVenueName`, persisting results in a new no-expiry `GeocodeCache` model. `geocodeEvents` runs inside `runAllScrapers` (before the cron's venue-match) and via a backfill script; venue-match gains a precision-gated `resolvePlaceIdWithGeo`; and the browse pipeline reads a `lat/lng` origin from the URL to filter/sort by haversine distance (Denver-center fallback on geolocation denial).

**Tech Stack:** Next.js 14.2.10 App Router, Prisma 5.22 + Postgres (Neon), vitest, TypeScript.

## Global Constraints
- TDD: write the failing test first; `tsc --noEmit` + `npm test` + `next build` must stay green.
- Prisma migrations are ADDITIVE + applied to prod MANUALLY via `prisma migrate deploy` (Vercel build only runs `prisma generate && next build`; the consolidated baseline breaks migrate dev's shadow DB — hand-write migration SQL like `prisma/migrations/20260630230000_add_beli_rating`).
- Hobby plan: daily crons only — no new cron slots; fold geocoding into the existing `scrape-and-revalidate` cron (it runs inside `runAllScrapers`).
- No new recurring paid services. Precision-first for any matching (a wrong link is worse than none).
- Reuse the existing `GOOGLE_PLACES_API_KEY` — no new env var. **Owner action (before deploy):** enable the **Geocoding API** library on that key's Google Cloud project and confirm the key is in Vercel prod. Until then the API returns `REQUEST_DENIED`, which must NOT be negative-cached (so it self-heals once enabled).
- Precision gates: never geo-link when the geocode is `APPROXIMATE` or `partial_match` (both are folded into a single `locationType === "APPROXIMATE"` signal); name-match stays primary and is never overridden by geo; geo tie-break radius ~0.5 mi, geo-only match radius ~80 m with a single-nearest requirement.
- Failed geocodes are negative-cached (`status="failed"`) with **no expiry** so un-geocodable names are never retried; the `cleanup-cache` cron operates only on `GooglePlacesCache` and must not touch `GeocodeCache`.
- Work on branch `feature/overhaul-wave-3`. Every commit message ends with the standard `Co-Authored-By: … / Claude-Session: …` trailer (omitted from the commands below for brevity).
- Adding `lat`/`lng` to the browse URL changes the route's search-param cache key; the `/browse/[category]` and `/browse/[category]/map` routes are already dynamic (they read `searchParams`) and forward every param into `filtersFromParams`, so no page edits are required — verify re-render manually.

---

### Task 1: `GeocodeCache` model + migration

**Files:**
- Modify: `prisma/schema.prisma` (add model near `GooglePlacesCache`)
- Create: `prisma/migrations/20260701000000_add_geocode_cache/migration.sql`

**Interfaces:**
- Produces (Prisma model): `GeocodeCache { id, normalizedName @unique, lat Float?, lng Float?, formattedAddress String?, locationType String?, status String, createdAt }`

Steps:
- [ ] Create/checkout the feature branch: `git checkout -b feature/overhaul-wave-3` (or `git checkout feature/overhaul-wave-3` if it exists).
- [ ] Add the model to `prisma/schema.prisma` immediately after the closing brace of `model GooglePlacesCache { … }`:
  ```prisma
  // Wave 3 — durable geocode cache keyed by normalizeVenueName(venueName).
  // No expiry (venue coords are stable) and NEGATIVE caching (status="failed")
  // so un-geocodable names are never retried. The cleanup-cache cron must NOT
  // touch this table — it only prunes GooglePlacesCache by expiresAt.
  model GeocodeCache {
    id               String   @id @default(cuid())
    normalizedName   String   @unique // normalizeVenueName(event.venueName)
    lat              Float?
    lng              Float?
    formattedAddress String?
    locationType     String? // ROOFTOP|RANGE_INTERPOLATED|GEOMETRIC_CENTER|APPROXIMATE (partial_match downgraded to APPROXIMATE)
    status           String // "ok" | "failed"
    createdAt        DateTime @default(now())
  }
  ```
- [ ] Hand-write the migration SQL (do NOT run `prisma migrate dev` — the consolidated baseline breaks its shadow DB). Create `prisma/migrations/20260701000000_add_geocode_cache/migration.sql`:
  ```sql
  -- Wave 3 — GeocodeCache: durable, no-expiry cache for venue-name geocodes.
  --
  -- Additive + safe: brand-new table, no data migration. Apply to prod with
  -- `prisma migrate deploy` (does not use a shadow database, so it's unaffected
  -- by the consolidated-baseline shadow-DB issue).

  CREATE TABLE "GeocodeCache" (
      "id" TEXT NOT NULL,
      "normalizedName" TEXT NOT NULL,
      "lat" DOUBLE PRECISION,
      "lng" DOUBLE PRECISION,
      "formattedAddress" TEXT,
      "locationType" TEXT,
      "status" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "GeocodeCache_pkey" PRIMARY KEY ("id")
  );

  CREATE UNIQUE INDEX "GeocodeCache_normalizedName_key" ON "GeocodeCache"("normalizedName");
  ```
- [ ] Regenerate the Prisma client so `prisma.geocodeCache` exists on the type: `npx prisma generate`.
- [ ] Confirm the cleanup cron does not reference the new table: `rg -n "geocodeCache|GeocodeCache" app/api/cron/cleanup-cache` — expect **no** matches (it only touches `googlePlacesCache`).
- [ ] Type-check: `npx tsc --noEmit` (expect PASS — no consumers yet, client regenerated).
- [ ] Commit: `git add prisma/schema.prisma prisma/migrations/20260701000000_add_geocode_cache && git commit -m "Wave 3: add GeocodeCache model + migration (no-expiry, negative-caching)"`

---

### Task 2: `lib/geocode.ts` — `geocodeVenue` (cache-first, mocked-fetch tests)

**Files:**
- Create: `lib/geocode.ts`
- Create test: `lib/__tests__/geocode.test.ts`

**Interfaces:**
- Consumes: `normalizeVenueName` from `@/lib/scrapers/venue-match`; `process.env.GOOGLE_PLACES_API_KEY`; global `fetch` + `AbortSignal.timeout`; `db.geocodeCache.{findUnique,upsert}`.
- Produces:
  ```ts
  export interface GeocodeInput { venueName: string | null | undefined; address?: string | null; neighborhood?: string | null; townName?: string | null; }
  export interface GeocodeResult { lat: number; lng: number; formattedAddress: string | null; locationType: string | null; partialMatch: boolean; }
  export async function geocodeVenue(input: GeocodeInput, db: Pick<PrismaClient, "geocodeCache">, opts?: { timeoutMs?: number }): Promise<GeocodeResult | null>
  ```

Steps:
- [ ] Write the failing test at `lib/__tests__/geocode.test.ts`:
  ```ts
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
  ```
- [ ] Run it expecting FAIL (module doesn't exist yet): `npx vitest run lib/__tests__/geocode.test.ts`
- [ ] Implement `lib/geocode.ts`:
  ```ts
  /**
   * Wave 3 — geocode distinct venue names to populate Event.lat/lng.
   *
   * Cache-first + negative-caching (GeocodeCache, no expiry) + in-run dedup by
   * normalizeVenueName. Reuses GOOGLE_PLACES_API_KEY (the Geocoding API is a
   * separate Google Cloud library the owner enables on that key's project).
   * Mirrors the graceful-fallback fetch pattern in lib/guides/walk-time.ts.
   */
  import type { PrismaClient } from "@prisma/client";
  import { normalizeVenueName } from "@/lib/scrapers/venue-match";

  export interface GeocodeInput {
    venueName: string | null | undefined;
    address?: string | null;
    neighborhood?: string | null;
    townName?: string | null;
  }

  export interface GeocodeResult {
    lat: number;
    lng: number;
    formattedAddress: string | null;
    locationType: string | null; // ROOFTOP | RANGE_INTERPOLATED | GEOMETRIC_CENTER | APPROXIMATE
    partialMatch: boolean;
  }

  // SW|NE corners of the Denver metro, to bias the geocoder toward local hits.
  const DENVER_BOUNDS = "39.5,-105.3|39.95,-104.6";

  export async function geocodeVenue(
    input: GeocodeInput,
    db: Pick<PrismaClient, "geocodeCache">,
    opts: { timeoutMs?: number } = {},
  ): Promise<GeocodeResult | null> {
    const key = normalizeVenueName(input.venueName);
    if (!key) return null;

    const cached = await db.geocodeCache.findUnique({ where: { normalizedName: key } });
    if (cached) {
      if (cached.status !== "ok" || cached.lat == null || cached.lng == null) return null;
      return {
        lat: cached.lat,
        lng: cached.lng,
        formattedAddress: cached.formattedAddress,
        locationType: cached.locationType,
        partialMatch: cached.locationType === "APPROXIMATE",
      };
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return null; // don't cache — retry once the key is configured

    const q = input.address
      ? `${input.venueName}, ${input.address}`
      : `${input.venueName}, ${input.neighborhood || input.townName || ""}, CO`;
    const params = new URLSearchParams({
      address: q,
      key: apiKey,
      region: "us",
      components: "country:US|administrative_area:CO",
      bounds: DENVER_BOUNDS,
    });

    let data: any;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
        { signal: AbortSignal.timeout(opts.timeoutMs ?? 5000) },
      );
      if (!res.ok) return null;
      data = await res.json();
    } catch (err) {
      console.warn("[geocode] request failed, skipping:", err);
      return null;
    }

    // Config/transient statuses must NOT be negative-cached (they self-heal).
    if (data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT" || data.status === "UNKNOWN_ERROR") {
      console.warn(`[geocode] transient status ${data.status} for "${q}": ${data.error_message || ""}`);
      return null;
    }

    const r = data.results?.[0];
    if (data.status !== "OK" || !r) {
      // Genuinely un-geocodable — negative-cache so we never retry it.
      await db.geocodeCache.upsert({
        where: { normalizedName: key },
        create: { normalizedName: key, status: "failed", lat: null, lng: null, formattedAddress: null, locationType: null },
        update: {},
      });
      return null;
    }

    const partialMatch = r.partial_match === true;
    // Fold partial_match into the single locationType confidence signal.
    const locationType: string | null = partialMatch ? "APPROXIMATE" : (r.geometry?.location_type ?? null);
    const lat = r.geometry.location.lat as number;
    const lng = r.geometry.location.lng as number;

    await db.geocodeCache.upsert({
      where: { normalizedName: key },
      create: { normalizedName: key, status: "ok", lat, lng, formattedAddress: r.formatted_address ?? null, locationType },
      update: {},
    });

    return { lat, lng, formattedAddress: r.formatted_address ?? null, locationType, partialMatch };
  }
  ```
- [ ] Run the test expecting PASS: `npx vitest run lib/__tests__/geocode.test.ts`
- [ ] Type-check: `npx tsc --noEmit`
- [ ] Commit: `git add lib/geocode.ts lib/__tests__/geocode.test.ts && git commit -m "Wave 3: geocodeVenue — cache-first Geocoding API wrapper with negative caching"`

---

### Task 3: `geocodeEvents` batch (name-dedup, time-budgeted)

**Files:**
- Modify: `lib/geocode.ts` (append `geocodeEvents`)

**Interfaces:**
- Consumes: `geocodeVenue` (Task 2); `db.event.{findMany,updateMany}`.
- Produces:
  ```ts
  export interface GeocodeEventsResult { scanned: number; distinctNames: number; geocoded: number; failed: number; }
  export async function geocodeEvents(db: PrismaClient, eventIds?: string[], opts?: { limit?: number; timeBudgetMs?: number; timeoutMs?: number }): Promise<GeocodeEventsResult>
  ```

Steps:
- [ ] Append to `lib/geocode.ts` (below `geocodeVenue`):
  ```ts
  export interface GeocodeEventsResult {
    scanned: number;
    distinctNames: number;
    geocoded: number;
    failed: number;
  }

  /**
   * Batch-geocode events missing coordinates. Dedups by distinct normalized
   * venue name (one geocodeVenue call per name — which itself caches), then
   * writes lat/lng to every event sharing that name. Best-effort + time-budgeted
   * so it never breaks the scrape. `eventIds` scopes to a fresh batch; omit it to
   * sweep all upcoming un-geocoded events (backfill).
   */
  export async function geocodeEvents(
    db: PrismaClient,
    eventIds?: string[],
    opts: { limit?: number; timeBudgetMs?: number; timeoutMs?: number } = {},
  ): Promise<GeocodeEventsResult> {
    const start = Date.now();
    const budget = opts.timeBudgetMs ?? 60_000;

    const events = await db.event.findMany({
      where: {
        isArchived: false,
        lat: null,
        ...(eventIds ? { id: { in: eventIds } } : { startTime: { gte: new Date() } }),
      },
      select: { id: true, venueName: true, address: true, neighborhood: true, townName: true },
      ...(opts.limit ? { take: opts.limit } : {}),
    });

    // Group event ids by distinct normalized venue name.
    const byName = new Map<string, { input: GeocodeInput; ids: string[] }>();
    for (const ev of events) {
      const key = normalizeVenueName(ev.venueName);
      if (!key) continue;
      const bucket = byName.get(key);
      if (bucket) bucket.ids.push(ev.id);
      else byName.set(key, { input: ev, ids: [ev.id] });
    }

    let geocoded = 0;
    let failed = 0;
    for (const { input, ids } of byName.values()) {
      if (Date.now() - start > budget) break; // time budget — leave the rest for next run
      const res = await geocodeVenue(input, db, { timeoutMs: opts.timeoutMs });
      if (!res) {
        failed += 1;
        continue;
      }
      await db.event.updateMany({ where: { id: { in: ids } }, data: { lat: res.lat, lng: res.lng } });
      geocoded += ids.length;
    }

    return { scanned: events.length, distinctNames: byName.size, geocoded, failed };
  }
  ```
- [ ] Type-check (no DB test harness — the name-dedup + write path is verified by `tsc`, the Task 12 build, and the Task 7 integration backfill): `npx tsc --noEmit`
- [ ] Re-run the existing geocode unit tests to confirm no regression: `npx vitest run lib/__tests__/geocode.test.ts`
- [ ] Commit: `git add lib/geocode.ts && git commit -m "Wave 3: geocodeEvents — batch geocode by distinct venue name, time-budgeted"`

---

### Task 4: `resolvePlaceIdWithGeo` pure matcher (venue-match)

**Files:**
- Modify: `lib/scrapers/venue-match.ts` (add types + `resolvePlaceIdWithGeo`; keep existing `resolvePlaceId`)
- Modify test: `lib/scrapers/__tests__/venue-match.test.ts` (append a `describe`)

**Interfaces:**
- Consumes: existing `normalizeVenueName`, `VenueCandidate`, `EventVenue`; `haversineDistance` from `@/lib/geo`.
- Produces:
  ```ts
  export interface EventWithGeo extends EventVenue { lat?: number | null; lng?: number | null; }
  export interface VenueCandidateGeo extends VenueCandidate { lat?: number | null; lng?: number | null; }
  export function resolvePlaceIdWithGeo(event: EventWithGeo, index: Map<string, VenueCandidate[]>, placesWithCoords: VenueCandidateGeo[], opts?: { geoConfident?: boolean }): string | null
  ```

Steps:
- [ ] Append the failing test to `lib/scrapers/__tests__/venue-match.test.ts` (add the new symbols to the existing import at top: `resolvePlaceIdWithGeo`, `type VenueCandidateGeo`), then a new block:
  ```ts
  describe("resolvePlaceIdWithGeo", () => {
    // p_a and p_b share the name "Larimer Lounge" (ambiguous by name).
    const GEO_PLACES: VenueCandidateGeo[] = [
      { id: "p_a", name: "Larimer Lounge", neighborhood: "RiNo", townName: "Denver", lat: 39.7607, lng: -104.9819 },
      { id: "p_b", name: "Larimer Lounge", neighborhood: "LoDo", townName: "Denver", lat: 39.7530, lng: -105.0000 },
      { id: "p_solo", name: "Meow Wolf", neighborhood: "Sun Valley", townName: "Denver", lat: 39.7549, lng: -105.0210 },
    ];
    const index = buildPlaceIndex(GEO_PLACES);

    it("keeps a single name-match regardless of coords (name precedence)", () => {
      expect(resolvePlaceIdWithGeo({ venueName: "Meow Wolf", lat: 39.0, lng: -104.0 }, index, GEO_PLACES)).toBe("p_solo");
    });

    it("breaks same-name ambiguity by nearest place within ~0.5mi", () => {
      // Event coords right on top of p_a, far from p_b.
      expect(resolvePlaceIdWithGeo({ venueName: "Larimer Lounge", lat: 39.7607, lng: -104.9819 }, index, GEO_PLACES)).toBe("p_a");
    });

    it("still prefers neighborhood/town disambiguation over geo", () => {
      expect(resolvePlaceIdWithGeo({ venueName: "Larimer Lounge", neighborhood: "LoDo", lat: 39.7607, lng: -104.9819 }, index, GEO_PLACES)).toBe("p_b");
    });

    it("geo-matches a NO-name-match event to a single place within ~80m", () => {
      // ~55m north of p_solo, no name match.
      expect(resolvePlaceIdWithGeo({ venueName: "Unlisted Popup", lat: 39.7554, lng: -105.0210 }, index, GEO_PLACES)).toBe("p_solo");
    });

    it("rejects a geo-only match when the nearest place is beyond 80m", () => {
      expect(resolvePlaceIdWithGeo({ venueName: "Unlisted Popup", lat: 39.7600, lng: -105.0300 }, index, GEO_PLACES)).toBeNull();
    });

    it("rejects on APPROXIMATE geocode (geoConfident=false) — no geo tie-break or geo-only match", () => {
      // Ambiguous name + on-top-of-p_a coords, but low-confidence geocode ⇒ null.
      expect(resolvePlaceIdWithGeo({ venueName: "Larimer Lounge", lat: 39.7607, lng: -104.9819 }, index, GEO_PLACES, { geoConfident: false })).toBeNull();
      // And a no-name-match popup near p_solo also stays unlinked.
      expect(resolvePlaceIdWithGeo({ venueName: "Unlisted Popup", lat: 39.7554, lng: -105.0210 }, index, GEO_PLACES, { geoConfident: false })).toBeNull();
    });

    it("rejects a same-name tie-break when no candidate is within 0.5mi", () => {
      expect(resolvePlaceIdWithGeo({ venueName: "Larimer Lounge", lat: 39.9000, lng: -104.9000 }, index, GEO_PLACES)).toBeNull();
    });
  });
  ```
- [ ] Run expecting FAIL: `npx vitest run lib/scrapers/__tests__/venue-match.test.ts`
- [ ] Add the import near the top of `lib/scrapers/venue-match.ts` (after the existing `import type { PrismaClient }` line):
  ```ts
  import { haversineDistance } from "@/lib/geo";
  ```
- [ ] Add the types + matcher (place after the existing `resolvePlaceId` function, before `livePlaceIdSet`):
  ```ts
  export interface EventWithGeo extends EventVenue {
    lat?: number | null;
    lng?: number | null;
  }

  export interface VenueCandidateGeo extends VenueCandidate {
    lat?: number | null;
    lng?: number | null;
  }

  const GEO_TIEBREAK_MILES = 0.5; // ambiguous same-name resolution radius
  const GEO_MATCH_MILES = 80 / 1609.344; // ~0.0497mi tight radius for name-less geo-linking

  /** Nearest place (by id) among `ids`, within `maxMiles`, requiring a unique closest. */
  function nearestWithin(
    ids: Set<string>,
    coords: Map<string, { lat: number; lng: number }>,
    origin: { lat: number; lng: number },
    maxMiles: number,
  ): string | null {
    const ranked = [...ids]
      .map((id) => {
        const c = coords.get(id);
        return c ? { id, d: haversineDistance(origin, c) } : null;
      })
      .filter((x): x is { id: string; d: number } => x !== null && x.d <= maxMiles)
      .sort((a, b) => a.d - b.d);
    if (ranked.length === 0) return null;
    if (ranked.length > 1 && ranked[0].d === ranked[1].d) return null; // exact tie — don't guess
    return ranked[0].id;
  }

  /**
   * Precision-first resolution with an optional geo path. Name-match is primary
   * and is NEVER overridden by geo. Adds: (a) nearest-within-0.5mi tie-break for
   * same-name ambiguity, and (b) a single-nearest-within-80m link for events with
   * NO name match. The geo path is gated by `geoConfident` (false for APPROXIMATE
   * / partial_match geocodes) AND requires event coords.
   */
  export function resolvePlaceIdWithGeo(
    event: EventWithGeo,
    index: Map<string, VenueCandidate[]>,
    placesWithCoords: VenueCandidateGeo[],
    opts: { geoConfident?: boolean } = {},
  ): string | null {
    const useGeo =
      opts.geoConfident !== false &&
      typeof event.lat === "number" &&
      typeof event.lng === "number";
    const origin = useGeo ? { lat: event.lat as number, lng: event.lng as number } : null;

    const coords = new Map<string, { lat: number; lng: number }>();
    for (const p of placesWithCoords) {
      if (typeof p.lat === "number" && typeof p.lng === "number") coords.set(p.id, { lat: p.lat, lng: p.lng });
    }

    const key = normalizeVenueName(event.venueName);
    if (key) {
      const matches = index.get(key);
      if (matches && matches.length === 1) return matches[0].id; // name precedence
      if (matches && matches.length > 1) {
        // Neighborhood/town disambiguation first (same rule as resolvePlaceId).
        const evNbhd = normalizeVenueName(event.neighborhood);
        const evTown = normalizeVenueName(event.townName);
        if (evNbhd || evTown) {
          const disambiguated = matches.filter(
            (p) =>
              (evNbhd && normalizeVenueName(p.neighborhood) === evNbhd) ||
              (evTown && normalizeVenueName(p.townName) === evTown),
          );
          if (disambiguated.length === 1) return disambiguated[0].id;
        }
        // Then geo tie-break among the same-name candidates.
        if (origin) {
          const ids = new Set(matches.map((m) => m.id));
          const near = nearestWithin(ids, coords, origin, GEO_TIEBREAK_MILES);
          if (near) return near;
        }
        return null;
      }
    }

    // No name match — geo-only path: exactly one place within a tight radius.
    if (origin) {
      const allIds = new Set(coords.keys());
      return nearestWithin(allIds, coords, origin, GEO_MATCH_MILES);
    }
    return null;
  }
  ```
- [ ] Run expecting PASS: `npx vitest run lib/scrapers/__tests__/venue-match.test.ts`
- [ ] Type-check: `npx tsc --noEmit`
- [ ] Commit: `git add lib/scrapers/venue-match.ts lib/scrapers/__tests__/venue-match.test.ts && git commit -m "Wave 3: resolvePlaceIdWithGeo — precision-gated geo path for venue-match"`

---

### Task 5: Thread coords + geocode confidence through `backfillEventPlaces`

**Files:**
- Modify: `lib/scrapers/venue-match.ts` (`backfillEventPlaces` body, lines ~131-168)

**Interfaces:**
- Consumes: `db.place.findMany` (now also selects `lat/lng`), `db.event.findMany` (now also selects `lat/lng`), `db.geocodeCache.findMany`, `resolvePlaceIdWithGeo` (Task 4).
- Produces: unchanged `BackfillResult { scanned, matched, updated }`.

Steps:
- [ ] Replace the body of `backfillEventPlaces` in `lib/scrapers/venue-match.ts` with:
  ```ts
  export async function backfillEventPlaces(
    db: PrismaClient,
    opts: { includeLinked?: boolean; limit?: number } = {},
  ): Promise<BackfillResult> {
    const places = await db.place.findMany({
      select: { id: true, name: true, neighborhood: true, townName: true, lat: true, lng: true },
    });
    const index = buildPlaceIndex(places);
    const placesWithCoords: VenueCandidateGeo[] = places.map((p) => ({
      id: p.id,
      name: p.name,
      neighborhood: p.neighborhood,
      townName: p.townName,
      lat: p.lat,
      lng: p.lng,
    }));

    const events = await db.event.findMany({
      where: {
        isArchived: false,
        startTime: { gte: new Date() }, // only upcoming powers "Upcoming Events"
        ...(opts.includeLinked ? {} : { placeId: null }),
      },
      select: {
        id: true,
        venueName: true,
        neighborhood: true,
        townName: true,
        placeId: true,
        lat: true,
        lng: true,
      },
      ...(opts.limit ? { take: opts.limit } : {}),
    });

    // Link-confidence per venue name from the geocode cache. APPROXIMATE /
    // partial_match geocodes (downgraded to "APPROXIMATE" at write time) are NOT
    // confident enough to drive a geo-link — precision over recall.
    const geoRows = await db.geocodeCache.findMany({
      where: { status: "ok" },
      select: { normalizedName: true, locationType: true },
    });
    const confident = new Set<string>();
    for (const g of geoRows) {
      if (g.locationType && g.locationType !== "APPROXIMATE") confident.add(g.normalizedName);
    }

    let matched = 0;
    let updated = 0;
    for (const ev of events) {
      const geoConfident = confident.has(normalizeVenueName(ev.venueName));
      const placeId = resolvePlaceIdWithGeo(ev, index, placesWithCoords, { geoConfident });
      if (!placeId) continue;
      matched += 1;
      if (ev.placeId !== placeId) {
        await db.event.update({ where: { id: ev.id }, data: { placeId } });
        updated += 1;
      }
    }
    return { scanned: events.length, matched, updated };
  }
  ```
- [ ] Confirm the existing venue-match tests still pass (they exercise `resolvePlaceId`, unchanged): `npx vitest run lib/scrapers/__tests__/venue-match.test.ts`
- [ ] Type-check (DB shape verified by `tsc`; runtime behavior verified in Task 7 integration + Task 12 build): `npx tsc --noEmit`
- [ ] Commit: `git add lib/scrapers/venue-match.ts && git commit -m "Wave 3: thread event/place coords + geocode confidence into backfillEventPlaces"`

---

### Task 6: Wire `geocodeEvents` into the scrape pipeline + cron ordering

**Files:**
- Modify: `lib/scrapers/index.ts` (import + hook after the insert loop, ~line 320)
- Modify: `app/api/cron/scrape-and-revalidate/route.ts` (clarifying ordering comment, ~line 50)

**Interfaces:**
- Consumes: `geocodeEvents` from `@/lib/geocode`; the `newEventIds: string[]` array already built in `runAllScrapers`.
- Produces: no change to `runAllScrapers`'s return shape (geocode is best-effort side effect + a console log).

Steps:
- [ ] Add the import to `lib/scrapers/index.ts` (after the `import { enrichEvent } from "@/lib/enrich-event";` line):
  ```ts
  import { geocodeEvents } from "@/lib/geocode";
  ```
- [ ] Insert the geocode hook in `runAllScrapers` immediately after the insert `for (const event of deduplicated) { … }` loop closes and **before** the `// Inline enrichment for newly inserted events` comment block:
  ```ts
    // Wave 3 — geocode the newly-inserted events' venue names so Event.lat/lng
    // exists for the map + the venue-match geo path. Cache-first + time-budgeted,
    // and best-effort: a geocode failure must never break the scrape. Runs before
    // the cron's backfillEventPlaces (called after runAllScrapers returns), so
    // coords are present when venue-match runs.
    if (newEventIds.length > 0) {
      try {
        const geo = await geocodeEvents(prisma, newEventIds, { timeBudgetMs: 45_000 });
        console.log(
          `[runAllScrapers] geocoded ${geo.geocoded}/${geo.scanned} new events ` +
            `(${geo.distinctNames} distinct venues, ${geo.failed} failed)`,
        );
      } catch (err) {
        console.error("[runAllScrapers] geocode failed:", err);
      }
    }
  ```
- [ ] In `app/api/cron/scrape-and-revalidate/route.ts`, extend the comment directly above the `let venueMatch` line (currently lines ~50-52) to record the ordering guarantee:
  ```ts
      // Wave 2 — link freshly-scraped events to their venue Place so the
      // place-detail "Upcoming Events" block + "Live tonight" badge populate.
      // Best-effort: a match failure must not fail the scrape.
      // Wave 3 — runAllScrapers already geocoded the new events (Event.lat/lng),
      // so this venue-match pass can use the geo path. No new cron slot.
  ```
- [ ] Type-check: `npx tsc --noEmit`
- [ ] Run the full scraper/venue-match unit suite to confirm nothing broke: `npx vitest run lib/scrapers`
- [ ] Commit: `git add lib/scrapers/index.ts app/api/cron/scrape-and-revalidate/route.ts && git commit -m "Wave 3: geocode new events inside runAllScrapers before cron venue-match"`

---

### Task 7: Backfill script + npm script + `.env.example` note

**Files:**
- Create: `scripts/backfill-event-geocodes.ts` (clone of `scripts/backfill-event-places.ts`)
- Modify: `package.json` (`scripts` block, after `events:backfill-places` at line 20)
- Modify: `.env.example` (comment near `GOOGLE_PLACES_API_KEY`, line 9)

**Interfaces:**
- Consumes: `geocodeEvents` (Task 3), standalone `new PrismaClient()`.
- Produces: `npm run events:backfill-geocodes` populating `Event.lat/lng` + `GeocodeCache` for the ~40-venue backlog.

Steps:
- [ ] Create `scripts/backfill-event-geocodes.ts`:
  ```ts
  /**
   * Backfill Event.lat/lng by geocoding distinct scraped venue names (Wave 3).
   * This is what lights up the events map and enables the venue-match geo path;
   * the scraper pipeline never set coordinates, so the whole scraped corpus is
   * coordinate-less.
   *
   * Cache-first + negative-caching + one API call per distinct venue name — see
   * lib/geocode.ts. Idempotent + re-runnable; only touches events without coords.
   *
   * Owner action: the Geocoding API must be enabled on GOOGLE_PLACES_API_KEY's
   * Google Cloud project (a separate library from Places) or every call returns
   * REQUEST_DENIED (not cached, so a re-run after enabling succeeds).
   *
   * Usage: npm run events:backfill-geocodes
   */

  import { PrismaClient } from "@prisma/client";
  import { geocodeEvents } from "../lib/geocode";

  const prisma = new PrismaClient();

  async function main() {
    console.log("\nGeocoding upcoming events by distinct venue name...\n");
    // No timeBudget cap here (unlike the cron) — the backlog is small (~40 names)
    // and this runs off the serverless clock.
    const result = await geocodeEvents(prisma, undefined, { timeBudgetMs: 10 * 60 * 1000 });
    console.log("--- Results ---");
    console.log(`  Scanned (upcoming events w/o coords): ${result.scanned}`);
    console.log(`  Distinct venue names geocoded:        ${result.distinctNames}`);
    console.log(`  Events given coordinates:             ${result.geocoded}`);
    console.log(`  Names that failed to geocode:         ${result.failed}`);
  }

  main()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error("Geocode backfill failed:", err);
      prisma.$disconnect();
      process.exitCode = 1;
    });
  ```
- [ ] Add the npm script to `package.json` immediately after the `"events:backfill-places": …` line:
  ```json
      "events:backfill-geocodes": "npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' scripts/backfill-event-geocodes.ts",
  ```
- [ ] Add a comment above the `GOOGLE_PLACES_API_KEY=` line in `.env.example` (no new var — reuse the key):
  ```
  # Also used for the Geocoding API (event lat/lng). Enable the "Geocoding API"
  # library on this key's Google Cloud project (separate from Places).
  GOOGLE_PLACES_API_KEY="your-google-places-api-key"
  ```
- [ ] Verify the script compiles + `ts-node` resolves the relative import: `npx tsc --noEmit` then `npx ts-node --compiler-options '{"module":"CommonJS"}' -e "import('./scripts/backfill-event-geocodes').then(()=>{}).catch(()=>{})"` — expect no compile error (a runtime DB-connection error is fine here; we only need it to type-load).
- [ ] **Integration step (manual, requires a seeded DB + the Geocoding API enabled):** run `npm run events:backfill-geocodes` against a database seeded with a few scraped events, then confirm coords + cache rows landed:
  - `npx prisma studio` (or a quick query) — verify some `Event.lat/lng` are now non-null and `GeocodeCache` has `status="ok"` rows keyed by normalized names. Re-run the command and confirm the second run reports `geocoded: 0` (idempotent, served from cache).
- [ ] Commit: `git add scripts/backfill-event-geocodes.ts package.json .env.example && git commit -m "Wave 3: events:backfill-geocodes script + npm task + .env note"`

---

### Task 8: Reconcile browse sort values + parse `lat`/`lng` origin

**Files:**
- Modify: `lib/browse/filters.ts` (interface + `filtersFromParams` + `filtersToParams`)
- Create test: `lib/browse/__tests__/filters.test.ts`

**Interfaces:**
- Produces: `BrowseFilters` gains `lat: number | null; lng: number | null`; `sort` canonicalized to `"top" | "soonest" | "price" | "distance"` (default `"top"`, matching `FilterSheet`/`BrowseSummaryRow`).

Steps:
- [ ] Write the failing test at `lib/browse/__tests__/filters.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { filtersFromParams, filtersToParams } from "@/lib/browse/filters";

  describe("browse filters — sort reconciliation + origin", () => {
    it("defaults sort to 'top' and round-trips without emitting it", () => {
      const f = filtersFromParams(new URLSearchParams(""));
      expect(f.sort).toBe("top");
      expect(filtersToParams(f).has("sort")).toBe(false);
    });

    it("keeps a non-default sort through the round trip", () => {
      const f = filtersFromParams(new URLSearchParams("sort=distance"));
      expect(f.sort).toBe("distance");
      expect(filtersToParams(f).get("sort")).toBe("distance");
    });

    it("parses numeric lat/lng and drops non-finite values", () => {
      const f = filtersFromParams(new URLSearchParams("lat=39.739&lng=-104.99"));
      expect(f.lat).toBeCloseTo(39.739);
      expect(f.lng).toBeCloseTo(-104.99);
      const bad = filtersFromParams(new URLSearchParams("lat=abc"));
      expect(bad.lat).toBeNull();
    });

    it("round-trips lat/lng and the distance radius", () => {
      const f = filtersFromParams(new URLSearchParams("lat=39.739&lng=-104.99&distance=3"));
      const p = filtersToParams(f);
      expect(p.get("lat")).toBe("39.739");
      expect(p.get("lng")).toBe("-104.99");
      expect(p.get("distance")).toBe("3");
    });
  });
  ```
- [ ] Run expecting FAIL: `npx vitest run lib/browse/__tests__/filters.test.ts`
- [ ] Replace `lib/browse/filters.ts` with the reconciled version:
  ```ts
  export interface BrowseFilters {
    categories: string[];
    price: string | null;       // "any" | "free" | "under-25" | "under-50" | "50-plus"
    distance: string | null;    // radius in miles as a string ("1"|"3"|"5"), or null
    vibes: string[];
    timeOfDay: string[];        // "morning" | "afternoon" | "evening" | "late-night"
    when: string | null;        // "today" | "this-weekend" | "next-7" | custom range
    sort: string;               // "top" | "soonest" | "price" | "distance"
    day: string | null;         // "all" | "fri" | "sat" | "sun"
    lat: number | null;         // geolocation origin (rounded ~3dp), or null
    lng: number | null;
  }

  function toFinite(v: string | null): number | null {
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  export function filtersFromParams(params: URLSearchParams): BrowseFilters {
    return {
      categories: params.get("categories")?.split(",").filter(Boolean) ?? [],
      price: params.get("price") || null,
      distance: params.get("distance") || null,
      vibes: params.get("vibes")?.split(",").filter(Boolean) ?? [],
      timeOfDay: params.get("time")?.split(",").filter(Boolean) ?? [],
      when: params.get("when") || null,
      sort: params.get("sort") || "top",
      day: params.get("day") || null,
      lat: toFinite(params.get("lat")),
      lng: toFinite(params.get("lng")),
    };
  }

  export function filtersToParams(filters: BrowseFilters): URLSearchParams {
    const p = new URLSearchParams();
    if (filters.categories.length) p.set("categories", filters.categories.join(","));
    if (filters.price) p.set("price", filters.price);
    if (filters.distance) p.set("distance", filters.distance);
    if (filters.vibes.length) p.set("vibes", filters.vibes.join(","));
    if (filters.timeOfDay.length) p.set("time", filters.timeOfDay.join(","));
    if (filters.when) p.set("when", filters.when);
    if (filters.sort !== "top") p.set("sort", filters.sort);
    if (filters.day) p.set("day", filters.day);
    if (filters.lat != null) p.set("lat", String(filters.lat));
    if (filters.lng != null) p.set("lng", String(filters.lng));
    return p;
  }

  export function activeFilterCount(filters: BrowseFilters): number {
    let count = 0;
    if (filters.categories.length) count++;
    if (filters.price && filters.price !== "any") count++;
    if (filters.distance && filters.distance !== "any") count++;
    if (filters.vibes.length) count++;
    if (filters.timeOfDay.length) count++;
    if (filters.when) count++;
    return count;
  }
  ```
- [ ] Run expecting PASS: `npx vitest run lib/browse/__tests__/filters.test.ts`
- [ ] Type-check (this widens `BrowseFilters` — `fetchBrowse` still compiles because the new fields are additive; the price-sort branch is fixed in Task 10): `npx tsc --noEmit`
- [ ] Commit: `git add lib/browse/filters.ts lib/browse/__tests__/filters.test.ts && git commit -m "Wave 3: reconcile browse sort values + parse lat/lng origin from URL"`

---

### Task 9: Pure distance filter/sort (`lib/browse/distance.ts`)

**Files:**
- Modify: `lib/geo.ts` (add `DENVER_CENTER` for a client-safe fallback source)
- Create: `lib/browse/distance.ts`
- Create test: `lib/browse/__tests__/distance.test.ts`

**Interfaces:**
- Consumes: `haversineDistance`, `LatLng` from `@/lib/geo`.
- Produces:
  ```ts
  export function filterAndSortByDistance<T extends { lat: number | null; lng: number | null }>(items: T[], origin: LatLng, radiusMiles: number | null, sortByDistance: boolean): T[]
  export const DENVER_CENTER: LatLng // added to lib/geo.ts
  ```

Steps:
- [ ] Add `DENVER_CENTER` to `lib/geo.ts` (below `DEFAULT_RADIUS_MILES`, so the pure geo module is the client-safe source of truth — `lib/google-places.ts` keeps its own server-side copy unchanged):
  ```ts
  // Denver city center — the geolocation-denied fallback origin for browse distance.
  export const DENVER_CENTER: LatLng = { lat: 39.7392, lng: -104.9903 };
  ```
- [ ] Write the failing test at `lib/browse/__tests__/distance.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { filterAndSortByDistance } from "@/lib/browse/distance";

  const ORIGIN = { lat: 39.7392, lng: -104.9903 };
  type Item = { id: string; lat: number | null; lng: number | null };
  const ITEMS: Item[] = [
    { id: "near", lat: 39.7407, lng: -104.9902 }, // ~0.1 mi
    { id: "mid", lat: 39.7592, lng: -104.9903 },  // ~1.4 mi
    { id: "far", lat: 39.9000, lng: -104.9903 },  // ~11 mi
    { id: "nocoord", lat: null, lng: null },
  ];

  describe("filterAndSortByDistance", () => {
    it("drops items outside the radius and coordless items", () => {
      const out = filterAndSortByDistance(ITEMS, ORIGIN, 3, false).map((i) => i.id);
      expect(out).toContain("near");
      expect(out).toContain("mid");
      expect(out).not.toContain("far");
      expect(out).not.toContain("nocoord");
    });

    it("sorts ascending by distance, sinking coordless items to the end", () => {
      const out = filterAndSortByDistance(ITEMS, ORIGIN, null, true).map((i) => i.id);
      expect(out.slice(0, 3)).toEqual(["near", "mid", "far"]);
      expect(out[3]).toBe("nocoord");
    });

    it("returns items unchanged when no radius and no distance sort", () => {
      expect(filterAndSortByDistance(ITEMS, ORIGIN, null, false)).toEqual(ITEMS);
    });
  });
  ```
- [ ] Run expecting FAIL: `npx vitest run lib/browse/__tests__/distance.test.ts`
- [ ] Implement `lib/browse/distance.ts`:
  ```ts
  import { haversineDistance, type LatLng } from "@/lib/geo";

  /**
   * Pure distance filter + sort for browse items. When `radiusMiles` is set,
   * items outside the radius (and coordless items) are dropped. When
   * `sortByDistance` is set, results are sorted ascending by haversine distance,
   * with coordless items sinking to the end. Generic over any item carrying
   * nullable lat/lng so it stays decoupled from BrowseItem (no import cycle).
   */
  export function filterAndSortByDistance<T extends { lat: number | null; lng: number | null }>(
    items: T[],
    origin: LatLng,
    radiusMiles: number | null,
    sortByDistance: boolean,
  ): T[] {
    const dist = (it: T): number =>
      it.lat == null || it.lng == null
        ? Number.POSITIVE_INFINITY
        : haversineDistance(origin, { lat: it.lat, lng: it.lng });

    let out = items;
    if (radiusMiles != null) {
      out = out.filter((it) => dist(it) <= radiusMiles);
    }
    if (sortByDistance) {
      out = [...out].sort((a, b) => dist(a) - dist(b));
    }
    return out;
  }
  ```
- [ ] Run expecting PASS: `npx vitest run lib/browse/__tests__/distance.test.ts`
- [ ] Type-check: `npx tsc --noEmit`
- [ ] Commit: `git add lib/geo.ts lib/browse/distance.ts lib/browse/__tests__/distance.test.ts && git commit -m "Wave 3: pure filterAndSortByDistance + DENVER_CENTER in lib/geo"`

---

### Task 10: Activate distance filter/sort in `fetchBrowse`

**Files:**
- Modify: `lib/browse/fetch-browse.ts` (imports + events branch ~lines 30-113 + places branch ~lines 115-157)

**Interfaces:**
- Consumes: `boundingBox` from `@/lib/geo`; `filterAndSortByDistance` from `./distance`; `filters.{lat,lng,distance,sort}` (Task 8).
- Produces: `fetchBrowse` result now respects a distance radius (bbox pre-filter + haversine post-filter) and `sort==="distance"` (haversine ascending), with the price-sort branch reading the canonical `"price"` value.

Steps:
- [ ] Add imports at the top of `lib/browse/fetch-browse.ts` (after the existing `import { addDaysDenver, … }` line):
  ```ts
  import { boundingBox } from "@/lib/geo";
  import { filterAndSortByDistance } from "./distance";
  ```
- [ ] At the start of `fetchBrowse` (right after `const now = new Date();`), derive the origin + radius once:
  ```ts
    const origin =
      filters.lat != null && filters.lng != null ? { lat: filters.lat, lng: filters.lng } : null;
    const radiusMiles =
      filters.distance && Number.isFinite(Number(filters.distance)) ? Number(filters.distance) : null;
    const distanceActive = !!origin && radiusMiles != null;
    const sortByDistance = filters.sort === "distance" && !!origin;
  ```
- [ ] In the events branch, add the bounding-box pre-filter to the `and` array (place it right after the `if (filters.vibes.length) { … }` block, before `const where: any = { AND: and };`):
  ```ts
      if (distanceActive) {
        const bb = boundingBox(origin!, radiusMiles!);
        // Event may carry its own coords OR inherit its place's — accept either.
        and.push({
          OR: [
            { lat: { gte: bb.minLat, lte: bb.maxLat }, lng: { gte: bb.minLng, lte: bb.maxLng } },
            { place: { lat: { gte: bb.minLat, lte: bb.maxLat }, lng: { gte: bb.minLng, lte: bb.maxLng } } },
          ],
        });
      }
  ```
- [ ] Replace the events-branch tail (the current `let orderBy` through `return { items, total: items.length };`, lines ~73-112) with:
  ```ts
      let orderBy: any = { startTime: "asc" };
      // Canonical sort value is "price" (Task 8); tolerate the legacy "price-low".
      // Distance sort can't be expressed in SQL — post-sort by haversine instead.
      if ((filters.sort === "price" || filters.sort === "price-low") && !sortByDistance) {
        orderBy = { priceRange: "asc" };
      }

      // Over-fetch when we post-filter in memory (time-of-day or distance) so the
      // final slice(0,50) isn't starved.
      const timeFiltered = filters.timeOfDay.length > 0;
      const overFetch = timeFiltered || distanceActive || sortByDistance;
      const events = await prisma.event.findMany({
        where,
        select: {
          id: true, title: true, imageUrl: true, category: true, neighborhood: true,
          venueName: true, startTime: true, priceRange: true, tags: true, lat: true, lng: true,
          place: { select: { lat: true, lng: true } },
        },
        orderBy,
        take: overFetch ? 200 : 50,
      });

      const windowed = timeFiltered
        ? events.filter((e) => matchesTimeOfDay(denverHour(e.startTime), filters.timeOfDay))
        : events;

      let items: BrowseItem[] = windowed.map((e) => ({
        id: e.id,
        kind: "event" as const,
        title: e.title,
        imageUrl: e.imageUrl,
        category: e.category,
        neighborhood: e.neighborhood,
        subtitle: e.venueName,
        meta: e.startTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
        lat: e.lat ?? e.place?.lat ?? null,
        lng: e.lng ?? e.place?.lng ?? null,
        startTime: e.startTime.toISOString(),
        priceRange: e.priceRange,
        tags: e.tags,
      }));

      if (origin && (distanceActive || sortByDistance)) {
        items = filterAndSortByDistance(items, origin, distanceActive ? radiusMiles : null, sortByDistance);
      }
      items = items.slice(0, 50);

      return { items, total: items.length };
  ```
- [ ] In the places branch, add the bbox pre-filter after the `if (filters.vibes.length) where.vibeTags = { hasSome: filters.vibes };` line (before `const places = await prisma.place.findMany(`):
  ```ts
      if (distanceActive) {
        const bb = boundingBox(origin!, radiusMiles!);
        where.lat = { gte: bb.minLat, lte: bb.maxLat };
        where.lng = { gte: bb.minLng, lte: bb.maxLng };
      }
  ```
- [ ] In the places branch, bump the fetch cap and apply the post-filter. Change `take: 50,` to `take: distanceActive || sortByDistance ? 200 : 50,`, then replace `return { items, total: items.length };` (places branch only) with:
  ```ts
      const ranked = origin && (distanceActive || sortByDistance)
        ? filterAndSortByDistance(items, origin, distanceActive ? radiusMiles : null, sortByDistance).slice(0, 50)
        : items;
      return { items: ranked, total: ranked.length };
  ```
- [ ] Type-check (DB-integration path — behavior verified by the Task 9 pure test for the filter/sort math and the Task 12 build + manual check): `npx tsc --noEmit`
- [ ] Re-run the browse unit suite to confirm no regression: `npx vitest run lib/browse`
- [ ] Commit: `git add lib/browse/fetch-browse.ts && git commit -m "Wave 3: activate distance bbox pre-filter + haversine sort in fetchBrowse"`

---

### Task 11: Distance UI + geolocation (FilterSheet, BrowseSummaryRow, shared origin helper)

**Files:**
- Create: `components/browse/geo-origin.ts` (client geolocation helper w/ Denver fallback)
- Modify: `components/browse/FilterSheet.tsx` (Distance section + async apply w/ geolocation; sort/distance state)
- Modify: `components/browse/BrowseSummaryRow.tsx` (geolocation when selecting distance sort)

**Interfaces:**
- Consumes: `RADIUS_OPTIONS`, `DENVER_CENTER` from `@/lib/geo`; `navigator.geolocation`.
- Produces: `requestOrigin(): Promise<{ lat: number; lng: number }>`; URL gains `lat`/`lng`(+`distance`) when a radius or distance-sort is chosen.

Steps:
- [ ] Create `components/browse/geo-origin.ts`:
  ```ts
  import { DENVER_CENTER } from "@/lib/geo";

  export interface Origin {
    lat: number;
    lng: number;
  }

  const round3 = (n: number) => Math.round(n * 1000) / 1000;

  /**
   * Ask the browser for the user's location; fall back to Denver center on
   * denial / timeout / unsupported (owner-approved UX). Rounds to 3 decimals
   * (~110m) so the value is a stable browse-route search-param cache key.
   */
  export function requestOrigin(): Promise<Origin> {
    const fallback: Origin = { lat: round3(DENVER_CENTER.lat), lng: round3(DENVER_CENTER.lng) };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return Promise.resolve(fallback);
    }
    return new Promise<Origin>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: round3(pos.coords.latitude), lng: round3(pos.coords.longitude) }),
        () => resolve(fallback),
        { timeout: 8000, maximumAge: 300_000 },
      );
    });
  }
  ```
- [ ] In `components/browse/FilterSheet.tsx`, add imports (after the `import { VIBE_TAGS } …` line):
  ```ts
  import { RADIUS_OPTIONS } from "@/lib/geo";
  import { requestOrigin } from "./geo-origin";
  ```
- [ ] Add a `DISTANCE_OPTIONS` constant next to the other option arrays (after `SORT_OPTIONS`):
  ```ts
  const DISTANCE_OPTIONS = [
    { label: "Any distance", value: "" },
    ...RADIUS_OPTIONS.map((r) => ({ label: r.label, value: String(r.value) })),
  ] as const;
  ```
- [ ] Add distance state next to the other `useState` hooks (after the `sort` state on line ~71):
  ```ts
    const [distance, setDistance] = useState(searchParams?.get("distance") ?? "");
  ```
- [ ] Replace `handleApply` with an async version that resolves an origin when a radius or the distance sort is active:
  ```ts
    const handleApply = useCallback(async () => {
      const params = new URLSearchParams();
      const day = searchParams?.get("day");
      if (day) params.set("day", day);

      if (categories.size > 0) params.set("categories", [...categories].join(","));
      if (price) params.set("price", price);
      if (vibes.size > 0) params.set("vibes", [...vibes].join(","));
      if (times.size > 0) params.set("time", [...times].join(","));
      if (when) params.set("when", when);
      if (sort && sort !== "top") params.set("sort", sort);
      if (distance) params.set("distance", distance);

      // A radius or the distance sort needs an origin — ask geolocation, fall
      // back to Denver center, and write rounded lat/lng so the server re-renders.
      if (distance || sort === "distance") {
        const o = await requestOrigin();
        params.set("lat", String(o.lat));
        params.set("lng", String(o.lng));
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      onClose();
    }, [categories, price, vibes, times, when, sort, distance, searchParams, router, pathname, onClose]);
  ```
- [ ] In `handleClear`, add `setDistance("");` alongside the other resets.
- [ ] Add a Distance section in the scrollable content — insert it directly after the Price `</section>` (before the Vibe section):
  ```tsx
          {/* Distance */}
          <section className="mb-6">
            <h3 className="mb-3 text-body font-semibold text-ink">Distance</h3>
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS.map((opt) => {
                const active = distance === opt.value;
                return (
                  <button
                    key={opt.value || "any"}
                    onClick={() => setDistance(opt.value)}
                    className={`rounded-pill px-3 py-1.5 text-body transition-colors ${
                      active
                        ? "bg-brand-gradient-strong text-white shadow-pill"
                        : "border border-mute-divider bg-surface text-ink"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>
  ```
- [ ] In `components/browse/BrowseSummaryRow.tsx`, add the import (after the existing `next/navigation` import):
  ```ts
  import { requestOrigin } from "./geo-origin";
  ```
- [ ] Replace the `<select onChange={…}>` handler so selecting `distance` grabs an origin:
  ```tsx
        <select
          value={currentSort}
          onChange={async (e) => {
            const val = e.target.value;
            const params = new URLSearchParams(searchParams?.toString() ?? "");
            if (val === "top") params.delete("sort");
            else params.set("sort", val);
            if (val === "distance") {
              const o = await requestOrigin();
              params.set("lat", String(o.lat));
              params.set("lng", String(o.lng));
            }
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
          }}
          className="rounded-pill border border-mute-divider bg-surface px-3 py-1 text-body text-ink"
        >
  ```
- [ ] Confirm the browse routes already forward `lat`/`lng` (no page edits needed): `rg -n "urlParams.set|urlParams.append|filtersFromParams" "app/(site)/browse/[category]/page.tsx" "app/(site)/browse/[category]/map/page.tsx"` — both must show the generic `for (const [key, val] of Object.entries(sp))` forwarding into `filtersFromParams`.
- [ ] Type-check + lint the changed components: `npx tsc --noEmit`
- [ ] Commit: `git add components/browse/geo-origin.ts components/browse/FilterSheet.tsx components/browse/BrowseSummaryRow.tsx && git commit -m "Wave 3: Distance radius UI + geolocation (Denver fallback) in browse filters"`

---

### Task 12: Full verification + manual map/geolocation checks

**Files:** none (verification only)

Steps:
- [ ] Full unit suite green: `npm test`
- [ ] Type-check clean: `npx tsc --noEmit`
- [ ] Production build clean (confirms the DB-integration edits in `fetch-browse.ts`, `venue-match.ts`, `index.ts`, and the client components compile + bundle; `lib/geo.ts` `DENVER_CENTER` is safe in the client bundle): `npm run build`
- [ ] Confirm `MapView` needs no change — it renders whatever coords the items carry: `rg -n "lat|lng|marker" components/map/MapView.tsx` (verify it reads item `lat`/`lng`; no edits).
- [ ] **Manual — map markers:** with the DB backfilled (Task 7) and dev server running (`npm run dev`), open `/browse/today/map` and confirm event markers now render (previously 0/346 events had coords).
- [ ] **Manual — radius filter:** open the FilterSheet, pick "3 mi", Apply → the URL gains `distance=3&lat=…&lng=…` and the list/map narrow; allow the geolocation prompt.
- [ ] **Manual — distance sort:** from `BrowseSummaryRow`, choose "Distance" → URL gains `sort=distance&lat=…&lng=…` and the list reorders nearest-first.
- [ ] **Manual — denial fallback:** deny the geolocation prompt (or block it in devtools) → the URL falls back to Denver center (`lat=39.739&lng=-104.99`) and results still filter/sort from there.
- [ ] **Manual — venue-match geo path:** after the backfill, spot-check that `placeId` coverage rose above the name-only 6 without false links (query events whose `placeId` was newly set and confirm the linked place is the correct venue).
- [ ] Adversarial diff review of the whole branch (as in Wave 2): `git diff main...feature/overhaul-wave-3` — confirm no `APPROXIMATE`/`partial_match` geocode drives a geo-link, no negative-caching of `REQUEST_DENIED`, and the `cleanup-cache` cron still ignores `GeocodeCache`.
- [ ] (No commit — verification task. Owner runbook before deploy: enable the Geocoding API on the key's project + confirm it's in Vercel prod → apply the `GeocodeCache` migration with `prisma migrate deploy` → `vercel --prod` → run `npm run events:backfill-geocodes` once.)