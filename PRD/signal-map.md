# Signal Map: Onboarding → Ranking

**Purpose:** This document is the contract between PRD 4 (Onboarding) and PRD 5 (Matching Engine). It defines what the onboarding produces, how each field gets used in the ranking formula, and the exact data shape the ranking engine can expect.

**Lives in the repo at:** `docs/signal-map.md`
**Referenced by:** PRD 4, PRD 5, any future personalization work.

**Do not change this document lightly.** Changes here require updating both PRD 4 (onboarding schema) and PRD 5 (ranking formula) in lockstep.

---

## The UserProfile contract

After a user completes onboarding, the `UserProfile` row contains exactly these fields relevant to ranking:

```typescript
interface UserProfile {
  contextSegment: "NEW_TO_CITY" | "IN_A_RUT" | "LOCAL_EXPLORER" | "VISITING"
  socialStyle: "SOCIAL_CONNECTOR" | "PASSIVE_SAVER" | "SOLO_EXPLORER" | "DIRECT_SHARER"
  vibePreferences: Array<{ pair: 1 | 2 | 3 | 4, selected: "A" | "B" }>
  budgetTier: "FREE_FOCUSED" | "MODERATE" | "TREAT_YOURSELF"
  aspirationCategories: string[]   // chip labels from Q5, see chip mapping below
  aspirationText: string | null    // raw text, processed in later PRD — ignore for MVP ranking
}
```

**Missing profile handling:** Users without a `UserProfile` (legacy users not yet force-migrated) get a **neutral ranking profile**: no multipliers, no filters, pure quality-score ranking with a serendipity slot. Don't crash, don't block the feed.

---

## Per-question signal breakdown

### Q1 `contextSegment` → strategy preset (not a multiplier)

This is not a per-item score adjustment. It's a **global ranking preset** that changes which multipliers apply and how aggressively.

| Segment | Strategy preset | Effect |
|---|---|---|
| `NEW_TO_CITY` | "Essentials" | Boost items with `quality_score ≥ 8` and high `mentionedByN` from Hidden Gems. Soft penalty on obscure items until engagement data builds. Target: breadth > depth. |
| `IN_A_RUT` | "Novelty" | Boost items that are categorically *unlike* any items the user has engaged with. Over-index on Hidden Gems (PRD 3) at 2x normal rate. Serendipity slot widens from 10-15% to 20%. |
| `LOCAL_EXPLORER` | "Deep cuts" | Downweight items tagged `touristy` or `mainstream`. Heavy boost on Hidden Gems + regional content (PRD 2). |
| `VISITING` | "Curated short list" | Hard filter: only surface items with `startsAt` within a presumed 5-day window (use `createdAt` on profile + 5 days as default). Strong bias toward `quality_score ≥ 8`. Minimize niche content requiring local context. |

**Implementation note:** Strategy preset is applied as a **wrapper function** around the base ranking formula, not inside it. Treat it as "which ranker do I use" rather than "which number do I add."

### Q2 `socialStyle` → content-tag boost (additive)

Simple tag-overlap between user preference and item tags.

| Style | Item-tag boost |
|---|---|
| `SOCIAL_CONNECTOR` | +0.15 on items tagged `group-friendly`, `shared`, `party`, `festival` |
| `SOLO_EXPLORER` | +0.15 on items tagged `solo-friendly`, `quiet`, `contemplative`; -0.10 on items tagged `group-required` |
| `DIRECT_SHARER` | +0.15 on items tagged `date-worthy`, `couple-friendly`, `shareable`, `romantic` |
| `PASSIVE_SAVER` | **No ranking effect.** This signal drives notification strategy (nudge timing, day-of reminders) and passive-saver-specific UX features, not feed ranking. |

**Tag inventory required:** Item tagging system must support these tags. Tags come from the existing AI enrichment pipeline (PRD 1 enrichment) — verify the tag vocabulary includes the above before PRD 5 ships. If missing, update the enrichment prompt to produce them.

### Q3 `vibePreferences` → multi-dimensional tag boosts

Each pair selection boosts a specific set of item tags. These are all **additive** (not multiplicative) to keep the math legible.

| Pair | A selection → boost tags | B selection → boost tags |
|---|---|---|
| 1 (Rooftop vs. dive) | `polished`, `upscale`, `scenic`, `cocktail` | `authentic`, `unpretentious`, `dive`, `local-favorite` |
| 2 (Trail vs. scrambling) | `accessible`, `established`, `scenic`, `moderate-effort` | `adventurous`, `off-the-beaten-path`, `high-effort`, `secluded` |
| 3 (Jazz vs. electronic) | `traditional`, `acoustic`, `mellow`, `live-music` | `electronic`, `late-night`, `high-energy`, `underground` |
| 4 (Farmers market vs. food trucks) | `morning`, `calm`, `local-producer`, `daytime` | `late-night`, `high-energy`, `street-food`, `urban-buzz` |

Each pair contributes **+0.08 per matching item tag** in the final score. Max contribution from Q3 = 0.32 per item (if item has all 4 pair-selection-matching tags).

**Implementation note:** This is where Q3's "what does it actually measure" crystallizes. It's not measuring openness or extraversion — it's measuring 8 clusters of content taste. Much cleaner than abstract score derivation.

### Q4 `budgetTier` → hard-ish filter (not a score)

Treated as a threshold, not a multiplier. Items outside threshold are filtered pre-ranking (mostly).

| Tier | Filter behavior |
|---|---|
| `FREE_FOCUSED` | Drop items with `price_tier = $$$` entirely. Items with `$$` get -0.25 score penalty (still eligible but deprioritized). Items with `free` or `$` get +0.10 boost. |
| `MODERATE` | Drop items with `price_tier = $$$` only if they score below median. Otherwise neutral across `free`, `$`, `$$`. Mild -0.05 penalty on `$$$`. |
| `TREAT_YOURSELF` | No filter. Slight +0.05 boost on `$$$` items (they're often under-discovered). |

**Implementation note:** "Drop entirely" means never show, full stop. Budget mismatch is the single highest-churn signal in the whole formula — Reddit research explicitly surfaced "every suggestion is a $60 class" as a user complaint. Err on the side of stricter filtering when a user chose `FREE_FOCUSED`.

### Q5 `aspirationCategories` → explicit intent boost

Chips map to Category enum values (or to special triggers). This mapping lives in `lib/onboarding/chip-mapping.ts`:

```typescript
export const CHIP_TO_CATEGORY: Record<string, string[]> = {
  "Try new restaurants": ["RESTAURANT", "FOOD"],
  "More artsy things": ["ART"],
  "Live music": ["LIVE_MUSIC"],
  "Outdoor adventures": ["OUTDOORS"],
  "Date-night spots": ["BARS", "RESTAURANT"],   // + tag filter: date-worthy
  "Classes / learning": ["ACTIVITY_VENUE"],     // + tag filter: class OR workshop
  "Nightlife": ["BARS", "LIVE_MUSIC"],          // + tag filter: late-night
  "Hidden local spots": ["__HIDDEN_GEMS__"]     // special: boosts PRD 3 content
}
```

Ranking effect: **+0.20 per item whose category matches any selected chip's mapped categories.**

Stronger multiplier than Q3 because aspirations are *stated explicit intent*, whereas Q3 is vibe preference. "Hidden local spots" triggers an extra +0.15 boost on any item from the `Discovery` table (PRD 3).

### Q5 `aspirationText` → ignored in MVP ranking

Stored but not used in the initial ranking formula. Reserved for a future PRD that adds LLM extraction (parses text into specific tags, venues, activity types).

**Do not attempt to hack in naive keyword matching on this field in the MVP.** The field is held for future structured extraction; premature use will produce bad signal that masks the real opportunity.

---

## The full MVP ranking formula

```
item_rank_for_user =
  base_quality_score                               // 0.0–1.0 from enrichment pipeline
  × strategy_multiplier[contextSegment]            // Q1 preset adjustment (0.8–1.2)
  + social_tag_boost                                // Q2, range 0.0–0.15
  + vibe_tag_boost                                  // Q3, range 0.0–0.32 (max 4 tag matches × 0.08)
  + aspiration_category_boost                       // Q5 chips, range 0.0–0.40 (2 chips matching × 0.20)
  + recency_boost                                   // items created in last 48h, +0.05
  - budget_penalty                                  // Q4, range 0.0–0.25

Then apply:
  - budget_filter (may drop item from results entirely)
  - strategy-preset-specific filters (VISITING date range, etc.)

Then inject serendipity:
  - 10-15% of feed slots replaced with high-quality items outside profile matching
  - (20% for IN_A_RUT users — they asked for it)
```

**Ranking floor:** minimum score to appear in feed is `0.50`. Items below get filtered before rendering.

**Score normalization:** Because multiple boosts can stack, max possible score is ~1.8 (strategy 1.2 × quality 1.0 + social 0.15 + vibe 0.32 + aspiration 0.40 + recency 0.05). Renormalize to 0–1 at display time for UI consistency; internal ranking uses raw values.

---

## Serendipity slot (non-negotiable design requirement)

The ranking engine must include 10–20% of feed slots as **explicit non-match content** — items that score well on quality but don't match the user's profile.

Why: filter bubbles kill discovery apps. Without serendipity, every user's feed collapses to the same 20 items. The whole point of Pulse is "I didn't know about that." A pure-match engine defeats that.

Implementation: after the scored results come back, before rendering, replace N positions (random within the top 30) with high-quality items from outside the user's matched cluster. Prefer Hidden Gems (PRD 3) for these slots.

---

## What this signal map does NOT cover

- **Behavioral signals** (clicks, saves, attends). These override stated profile preferences over time but aren't in scope until the app has been live long enough to collect real behavior. Future PRD.
- **Location/proximity ranking.** Uses user's GPS vs. item location, separate from profile. Should combine multiplicatively with profile ranking.
- **Time-of-day ranking.** Same — orthogonal to profile, handled separately.
- **Social graph signals.** What friends are saving/attending. Deferred until Pulse has a social graph worth ranking on.
- **Item freshness/staleness beyond the simple recency_boost.** Separate PRD.
- **Cold-item problem** (new items with no engagement data). Enrichment pipeline's `quality_score` is the substitute for engagement until it exists.

---

## Contract guarantees

What PRD 4 guarantees to PRD 5:
- Every new user completing onboarding writes all 5 fields to `UserProfile`
- Chip-to-category mapping lives in `lib/onboarding/chip-mapping.ts` and is stable
- Schema doesn't change without updating this document

What PRD 5 guarantees to PRD 4:
- Missing profiles don't crash the feed
- Every field in `UserProfile` actually influences ranking (no dead fields)
- Ranking stays explainable — a developer should be able to look at a scored feed item and point to exactly which profile fields contributed to its position

---

## Behavioral signals (added by PRD 5 Phase 5)

Behavioral feedback is captured in `UserItemStatus` (extended by PRD 5 to
cover Events, Places, and Discoveries). UI copy maps to the existing
`ItemStatus` enum:

| UI label | `ItemStatus` |
|---|---|
| "Interested" | `WANT` |
| "Not for me" | `PASS` |
| "I've been there" | `DONE` |

### Ranking effects

| Status | Effect on ranking | Magnitude |
|---|---|---|
| `WANT` on item X | Tag-similarity boost on items sharing ≥ 2 tags with X | `+0.25` per similar item, capped `+0.40` total across all WANTs |
| `PASS` on item X | Tag-similarity penalty on items sharing ≥ 2 tags with X | `-0.30` per similar item, capped `-0.50` total across all PASSes |
| `DONE` on item X | Hard filter — X never appears in this user's feed again | n/a |

PASSes bite harder than WANTs boost. Reddit research on discovery apps is
clear that "please stop showing me this" is structurally stronger signal
than "more of this."

### Behavioral-vs-stated weighting

**Behavioral signal overrides stated preferences when they conflict.**

Example: a user selects "Try new restaurants" at onboarding (Q5 aspiration
category boost of `+0.20` per matching item, §aspirationCategories) but
has PASSed five Italian restaurants. The aspiration boost for restaurants
stays in place — but the similar-Italian-restaurant penalty stacks on top
and wins the aggregate for any new Italian place.

No manual reweighting is needed across time. Because behavioral boosts /
penalties are 0 when there's nothing to compare against, stated
preferences naturally dominate early; as feedback accumulates the
behavioral contribution crowds out the stated floor.

### Updated MVP ranking formula

```
rank = base_quality_score
     × strategy_multiplier[contextSegment]          // Q1, 0.8–1.2
     + social_tag_boost                              // Q2, 0–0.15
     + vibe_tag_boost                                // Q3, 0–0.32
     + aspiration_category_boost                     // Q5, 0–0.40
     - budget_penalty                                // Q4, 0–0.25
     + recency_boost                                 // 0 or +0.05
     + want_similarity_boost                         // PRD 5, 0 to +0.40
     - pass_similarity_penalty                       // PRD 5, 0 to -0.50

Then apply:
  - budget_filter                                    // Q4
  - strategy-preset-specific filters                 // Q1
  - DONE filter (PRD 5 — remove items user marked BEEN_THERE)
```

Then inject serendipity slots (10-15%, 20% for `IN_A_RUT`).

### Cold-start handling

Users with zero `UserItemStatus` rows rely fully on stated preferences
(PRD 4). As feedback accumulates, behavioral signal contribution grows.
This is automatic — no special logic needed because behavioral boosts are
0 when there's no feedback to compare against.

### Legacy-source rows

`UserItemStatus` rows with `source = LEGACY` (backfilled from the
pre-PRD-5 Want/Done/Pass UI) count identically to explicit feedback for
ranking. They just can't be attributed to a specific surface
(FEED_CARD / PROFILE_SWIPER / DETAIL_PAGE) in analytics.

---

## Contract guarantees

What PRD 4 guarantees to PRD 5:
- Every new user completing onboarding writes all 5 fields to `UserProfile`
- Chip-to-category mapping lives in `lib/onboarding/chip-mapping.ts` and is stable
- Schema doesn't change without updating this document

What PRD 5 guarantees to PRD 6 (Matching Engine):
- `UserItemStatus` is polymorphic across Event / Place / Discovery / Item,
  with exactly one FK non-null per row (enforced by SQL CHECK)
- `FeedbackSource` is always populated (`LEGACY` default for pre-PRD-5 rows)
- Denormalized snapshot columns survive item deletion for history use cases
- Schema doesn't change without updating this document

What PRD 5 guarantees to PRD 4:
- Missing profiles don't crash the feed
- Every field in `UserProfile` actually influences ranking (no dead fields)
- Ranking stays explainable — a developer should be able to look at a scored feed item and point to exactly which profile fields contributed to its position

---

## Changelog

- **v1.1** — PRD 5 Phase 5 behavioral signal section: WANT boost, PASS
  penalty, DONE filter, behavioral-vs-stated weighting, cold-start
  handling, updated MVP formula.
- **v1.0** — initial draft, matches PRD 4 final 5-question flow
