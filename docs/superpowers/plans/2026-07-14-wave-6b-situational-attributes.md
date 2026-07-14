# Wave 6B — Situational attributes (Plan)

Branch `feature/overhaul-wave-6b`. Design: `docs/superpowers/specs/2026-07-13-wave-6-event-identity-situations-openings-design.md` (§ Wave 6B).

## Recon corrected the design (2026-07-14)

The spec's stated fix for vibe chips — "normalize at the boundary with the Wave 4 `normalizeTagToken`" — **does not work**. Verified:

- `normalizeTagToken` = `toLowerCase().replace(/[\s_]+/g, "-")`. Of the 20 Title-case vibe tags enrichment writes, only **5** (`Cozy`, `Chill`, `Lively`, `Intimate`, `Romantic`) land in the kebab allowlist. The other 15 (`Trendy`, `Upscale`, `Casual`, `Hip`, `Classic`, `Eclectic`, `Artsy`, `Energetic`, `Relaxed`, `Sophisticated`, `Funky`, `Industrial`, `Rustic`, `Modern`, `Vintage`) lowercase to tokens **absent from `VIBE_TAGS`** and still filter to `[]`.
- The mismatch is **not display-only**. `FilterSheet` renders kebab chips from the allowlist and writes kebab into the URL, which reaches `where.vibeTags = { hasSome: filters.vibes }` against a Title-case corpus. **The entire browse vibe filter matches zero places.** A display-layer fix leaves that silently broken.

**Decision (Quest, 2026-07-14): one canonical vocabulary.** kebab-case becomes the single truth — enrichment writes kebab, a migration converts the existing corpus, and the helpers that query `vibeTags` with Title-case literals are updated. No read-time normalization to forget at the next call site (the repo already carries three coexisting `normalize()` functions — debt flagged at the end of 6A; do not add a fourth).

**Decision (Quest, 2026-07-14): targeted backfill.** The 5 new booleans get an `--attributes-only` enrichment pass that leaves existing `pulseDescription`/tags untouched. The enricher has no per-field force today; a bare `--force` would regenerate every description live in prod.

Three further live bugs recon found, fixed here:
- `dateNightPlacesWhere` is **also** imported-and-never-called in `fetch-browse.ts` (spec only caught `groupFriendlyPlacesWhere`).
- `fetch-browse.ts:156` clobbers the config's `vibeTag` whenever the user picks any vibe.
- `FilterChipRow.tsx:11` writes URL param `vibe` (singular); `filters.ts:25` reads `vibes`. The "Dog friendly" quick chip is dead. `FilterSheet` was fixed for exactly this and `FilterChipRow` was missed.

## Ordering hazard, and how it is neutralised

The vibe data migration and the code deploy cannot be atomic. Between them, old code would query Title-case against kebab data and the home rails (`date-night`, `groups`) would quietly return fewer places.

**Mitigation: the helpers match BOTH vocabularies, permanently.** `hasSome: ["intimate", "Intimate", ...]` is a cheap array literal and makes migration order irrelevant — correct before the migration, correct after, correct if the migration is re-run. No hazard window, so 6B needs no one-sitting deploy discipline (unlike 6A).

## Tasks

Each is red-first, committed only on green tsc + full vitest.

| # | Task | Flag |
|---|------|------|
| 1 | **Exclusion narrowed.** `isTicketedProGame(title, description, venueName)` = TEAM && (VS \|\| PRO_VENUE) && !WATCH_PARTY, retaining the brewery/trail/5K guards. Two existing tests asserting watch parties are dropped get **inverted**, with comments explaining why the old expectation was wrong. Call sites in `lib/scrapers/index.ts` pass `ev.venueName` (already required on `ScrapedEvent`). | **UNFLAGGED** — bug fix, same reasoning as 6A's dedup fix. It only *adds* events. |
| 2 | **Schema.** 5 `Place` booleans + indexes on the 3 that browse queries. Hand-written migration (never `prisma migrate dev` — all env files point at prod). | n/a |
| 3 | **One canonical vibe vocabulary.** Extend `VIBE_TAGS` to cover the enrichment vocabulary in kebab; `normalizeVibeTag()` at the enrichment boundary; SQL migration lowercasing the existing `Place.vibeTags` corpus; `places-section-filters.ts` helpers match both cases. | n/a — correctness fix |
| 4 | **Enrichment.** Extract `scripts/enrich-places.ts` → `lib/enrich-place.ts`; add the 5 booleans to prompt + schema + whitelist + write; weekly cron route + `vercel.json`; `--attributes-only` CLI mode. | n/a |
| 5 | **Browse.** Data-driven `placeFlag` default (column allowlist, not raw interpolation); configs `watch-the-game` / `kid-friendly` / `big-groups`; fix `/browse/groups` to call `groupFriendlyPlacesWhere()`; fix the `AND`-array clobbering; fix `FilterChipRow` `vibe`→`vibes`. | new configs behind `SITUATIONS_V1_ENABLED` |
| 6 | **Place detail.** Attribute chip row surfacing the 5 booleans (plus the existing `isDogFriendly` / `isDrinkingOptional` / `hasMocktailMenu`, which are on the model and rendered nowhere). Requires edits in 3 places: schema, `page.tsx` prop object, `PlaceData` interface. | `SITUATIONS_V1_ENABLED` |

## Accepted risks

- **A ticketed game with no `vs` and a non-pro venue string survives** (e.g. a bare "Rockies Opening Day" from a source that omits the venue). Deliberate: deleting every watch party to catch these was the far worse trade, and it is what we are undoing.
- The 5 booleans are `false` until the enrichment backfill runs, exactly as `goodForWorking` is **0/460** today. The new browse configs are empty until then — hence the flag.
