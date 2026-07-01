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
