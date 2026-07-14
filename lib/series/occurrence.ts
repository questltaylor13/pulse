/**
 * Wave 6A — occurrence identity. PURE: no Prisma, no flags, no I/O.
 *
 * Deliberately separate from ingest.ts. The seed scripts and the admin route want
 * only this identity math, and if it lived beside `attachSeries` they would each
 * drag `@/lib/prisma` and the flag module in behind it — which is also why
 * ingest.ts cannot take the `server-only` marker its layer deserves.
 *
 * Two bugs are closed here, and they are easy to conflate:
 *
 * 1. NULL externalId defeated the unique index. Postgres treats NULLs as DISTINCT
 *    in a unique index, so `(externalId, source)` could not stop duplicate NULL
 *    rows — every permalink-less red-rocks event was re-created on every nightly
 *    run and the database was powerless to notice. So: no NULLs. The invariant is
 *    then enforced by a constraint rather than by code someone has to remember.
 *
 * 2. startTime was payload, not identity. That let Westword's series-URL row mutate
 *    its startTime forward every night, dragging a three-week-old rating onto this
 *    week's edition and then suppressing the event from that user's feed forever.
 *
 * The occurrence is a (thing, DAY) pair — never a (thing, INSTANT) pair. Sources
 * wobble the reported time; keying on the exact timestamp would mint a fresh
 * duplicate every night, which is bug 1 wearing a hat.
 */

import { createHash } from "crypto";
import { denverDateKey } from "@/lib/time/denver";
import { deriveSeriesKey } from "./key";

/**
 * Content-addressed id. The same sha256-truncated-to-16 expression was written by
 * hand in eight scrapers; the truncation length is a collision-risk parameter and
 * having it in eight places meant keeping it in sync by hand.
 */
export function stableId(material: string): string {
  return createHash("sha256").update(material).digest("hex").slice(0, 16);
}

/** The Denver calendar day of an instant, as the UTC-midnight Date `@db.Date` round-trips. */
export function occurrenceDateOf(startTime: Date): Date {
  return new Date(`${denverDateKey(startTime)}T00:00:00.000Z`);
}

interface IdentityInput {
  source: string;
  externalId?: string | null;
  title: string;
  venueName: string;
  startTime: Date;
}

/**
 * The occurrence's stable id, guaranteed non-empty.
 *
 * A source's own id is kept — even Westword's series-stable one, because
 * occurrenceDate supplies the per-night dimension. A source that supplies nothing
 * gets one synthesized from its series identity, which is stable across scrapes in
 * a way a row's cuid never was.
 */
export function resolveExternalId(event: IdentityInput, seriesKey?: string): string {
  if (event.externalId) return event.externalId;
  const key = seriesKey ?? deriveSeriesKey(event.title, event.venueName);
  return `syn_${stableId(`${event.source}|${key}`)}`;
}

export interface OccurrenceIdentity {
  source: string;
  externalId: string;
  occurrenceDate: Date;
}

/**
 * The full occurrence key, as ONE value.
 *
 * Returned as a unit on purpose. Every `upsert` must spread this into BOTH its
 * `where` and its `create` — computing them separately is how four call sites ended
 * up keying on occurrenceDate while inserting NULL into it, which silently
 * reopened the duplicate-row bug the unique index was added to close.
 */
export function occurrenceIdentity(
  event: IdentityInput,
  seriesKey?: string
): OccurrenceIdentity {
  return {
    source: event.source,
    externalId: resolveExternalId(event, seriesKey),
    occurrenceDate: occurrenceDateOf(event.startTime),
  };
}
