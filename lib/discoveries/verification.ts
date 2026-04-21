/**
 * Location verification for Discovery candidates (PRD 3 Phase 4).
 *
 * For any candidate that has a location_hint or town_hint, we attempt to
 * resolve it to a real Google Places record. No match → status = UNVERIFIED
 * (kept for admin review, not shown in feed). Match → placeId / lat / lng /
 * neighborhood populated and verifiedAt stamped.
 *
 * Non-geographic Discoveries (e.g. "stargazing in winter" with no named
 * location) skip verification entirely and land verified-by-default since
 * there's nothing to validate against a places database.
 */

import { searchPlacesByText, extractNeighborhood } from "@/lib/google-places";
import type { PipelineCandidate } from "@/lib/discoveries/types";

export interface VerificationResult {
  verified: boolean;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  neighborhood?: string | null;
  reason?: string; // Populated on failure
}

export function hasLocationSignal(candidate: PipelineCandidate): boolean {
  return Boolean(
    (candidate.location_hint && candidate.location_hint.trim()) ||
      (candidate.town_hint && candidate.town_hint.trim())
  );
}

function buildQuery(candidate: PipelineCandidate): string {
  const parts: string[] = [];
  if (candidate.location_hint) parts.push(candidate.location_hint.trim());
  if (candidate.title && !parts.length) parts.push(candidate.title);
  if (candidate.town_hint) parts.push(candidate.town_hint.trim());
  if (!parts.some((p) => /colorado|CO\b/i.test(p))) parts.push("Colorado");
  return parts.join(" ");
}

/**
 * Attempts to verify a candidate's location via Google Places.
 * Non-geographic candidates return { verified: true } without a placeId.
 */
export async function verifyLocation(
  candidate: PipelineCandidate
): Promise<VerificationResult> {
  if (!hasLocationSignal(candidate)) {
    return { verified: true, reason: "no-location-hint" };
  }

  const query = buildQuery(candidate);
  try {
    const results = await searchPlacesByText(query);
    if (!results || results.length === 0) {
      return { verified: false, reason: "no-match" };
    }
    const top = results[0];
    return {
      verified: true,
      placeId: top.placeId,
      latitude: top.lat,
      longitude: top.lng,
      neighborhood: extractNeighborhood(top.address) ?? null,
    };
  } catch (err) {
    return {
      verified: false,
      reason: `api-error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
