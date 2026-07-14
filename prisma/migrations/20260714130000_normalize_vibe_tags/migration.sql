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
-- SAFE TO APPLY BEFORE THE CODE DEPLOY. The query helpers in
-- lib/home/places-section-filters.ts match BOTH vocabularies, deliberately and
-- permanently, so there is no ordering hazard here: correct before this
-- migration, correct after it, and correct if it is re-run. It is idempotent —
-- lowercasing an already-lowercase array is a no-op.

UPDATE "Place"
SET "vibeTags" = ARRAY(
  SELECT DISTINCT lower(replace(replace(tag, ' ', '-'), '_', '-'))
  FROM unnest("vibeTags") AS tag
  WHERE tag IS NOT NULL AND tag <> ''
)
WHERE cardinality("vibeTags") > 0;
