/**
 * Geo utilities for proximity-based features.
 * Pure math — no external dependencies.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const EARTH_RADIUS_MILES = 3958.8;
const MILES_TO_METERS = 1609.344;

/**
 * Haversine distance between two lat/lng points in miles.
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLng = Math.sin(dLng / 2);

  const h =
    sinHalfDLat * sinHalfDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinHalfDLng * sinHalfDLng;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

/**
 * Compute a bounding box around a center point for SQL pre-filtering.
 * Returns min/max lat/lng that encompass the given radius.
 */
export function boundingBox(center: LatLng, radiusMiles: number): BoundingBox {
  const latDelta = radiusMiles / 69.0; // ~69 miles per degree of latitude
  const lngDelta = radiusMiles / (69.0 * Math.cos((center.lat * Math.PI) / 180));

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

/**
 * Convert miles to meters (for Google Places API radius parameter).
 */
export function milesToMeters(miles: number): number {
  return miles * MILES_TO_METERS;
}

/**
 * Format a distance in miles for display.
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) return "< 0.1 mi";
  return `${miles.toFixed(1)} mi`;
}

export const RADIUS_OPTIONS = [
  { value: 1, label: "1 mi" },
  { value: 3, label: "3 mi" },
  { value: 5, label: "5 mi" },
] as const;

export const DEFAULT_RADIUS_MILES = 3;
