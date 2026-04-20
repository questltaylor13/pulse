/**
 * Discovery deduplication (PRD 3 Phase 4 §4.6).
 *
 * Before inserting any new Discovery, fuzzy-match against existing rows:
 *   - Same subtype
 *   - Normalized-title distance <= threshold (Levenshtein over a lowercased,
 *     alphanumeric-only representation)
 *   - If both candidate and existing have coordinates, require proximity
 *     <= 100m via haversine
 *
 * Match → caller should update the existing record (boost sourceUpvotes,
 * increment mentionedByN, refresh updatedAt) rather than insert.
 */

import { prisma } from "@/lib/prisma";
import type {
  Discovery,
  DiscoverySubtype,
} from "@prisma/client";

export interface DedupQuery {
  subtype: DiscoverySubtype;
  title: string;
  latitude: number | null;
  longitude: number | null;
  townName: string | null;
}

const TITLE_DISTANCE_THRESHOLD = 3; // Normalized titles within 3 edits
const PROXIMITY_METERS = 100;

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) *
      Math.cos(toRad(bLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Find an existing Discovery that this candidate should merge into.
 * Returns null if no match. Scoped to same subtype + (same town OR close
 * geo) to keep the candidate set small.
 */
export async function findExistingMatch(query: DedupQuery): Promise<Discovery | null> {
  const where: {
    subtype: DiscoverySubtype;
    townName?: string;
  } = { subtype: query.subtype };
  if (query.townName) where.townName = query.townName;

  const candidates = await prisma.discovery.findMany({
    where,
    take: 200,
    orderBy: { updatedAt: "desc" },
  });

  const normalizedNew = normalizeTitle(query.title);
  for (const existing of candidates) {
    const normalizedOld = normalizeTitle(existing.title);
    const dist = levenshtein(normalizedNew, normalizedOld);
    if (dist > TITLE_DISTANCE_THRESHOLD) continue;

    // Geo gate: if both have coordinates, require proximity
    if (
      query.latitude !== null &&
      query.longitude !== null &&
      existing.latitude !== null &&
      existing.longitude !== null
    ) {
      const meters = haversineMeters(
        query.latitude,
        query.longitude,
        existing.latitude,
        existing.longitude
      );
      if (meters > PROXIMITY_METERS) continue;
    }
    return existing;
  }
  return null;
}
