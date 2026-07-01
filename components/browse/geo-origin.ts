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
