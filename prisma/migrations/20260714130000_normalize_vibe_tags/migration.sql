-- Wave 6B — fold the Place.vibeTags corpus onto the ONE canonical vocabulary.
--
-- The corpus holds Title-case ("Cozy", "Lively") because that is what
-- scripts/enrich-places.ts emitted. Everything that READS vibeTags — the chip
-- allowlist, FilterSheet, the browse `vibes` query — speaks kebab-case. So the
-- chips rendered empty and the browse vibe filter matched zero rows.
--
-- Lowercase + hyphenate, and de-duplicate the result (a row can hold both
-- spellings if enrichment ran across the change).
--
-- ORDER IS LOAD-BEARING, which the first cut of this migration got wrong.
--
-- It used `ARRAY(SELECT DISTINCT lower(...))`. Postgres gives DISTINCT no
-- ordering guarantee (it hash-aggregates), and every card renders
-- `vibeTags.slice(0, 2)` — the FIRST TWO tags. So the naive form silently changed
-- WHICH vibes 268 of the 334 multi-tag places display, not merely their case.
-- The LLM emits tags most-salient-first; that ordering is information.
--
-- WITH ORDINALITY + GROUP BY + ORDER BY min(ord) de-duplicates while preserving
-- first-appearance order, and makes the migration value-idempotent rather than
-- merely content-idempotent (a re-run cannot reshuffle).
--
-- Ordering vs the code deploy: the new query helpers match BOTH vocabularies
-- (lib/home/places-section-filters.ts), so this is correct either side of the
-- deploy. Note the OLD deployed code is Title-case-only, so migrating first
-- briefly costs the date-night/groups home rails their vibeTags OR-arm — the
-- companionTags and occasionTags arms still match, so the rails do not empty.
-- Deploying first avoids even that.

UPDATE "Place"
SET "vibeTags" = ARRAY(
  SELECT lower(replace(replace(tag, ' ', '-'), '_', '-'))
  FROM unnest("vibeTags") WITH ORDINALITY AS u(tag, ord)
  WHERE tag IS NOT NULL AND tag <> ''
  GROUP BY 1
  ORDER BY min(ord)
)
WHERE cardinality("vibeTags") > 0;
