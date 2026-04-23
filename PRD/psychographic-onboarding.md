# PRD 4: Psychographic Onboarding

**Owner:** Quest
**Status:** Ready for implementation — supersedes the earlier 6-question draft
**Priority:** Ships before PRD 5 (Matching Engine). The matching engine has no fuel without this.
**Prior context:**
- PRD 1 (`data-refresh-and-reliability.md`) — shipped.
- PRD 2 (`regional-expansion.md`) — Regional Expansion.
- PRD 3 (`hidden-gems-engine.md`) — Hidden Gems curation pipeline.
**Companion doc:** `signal-map.md` — the contract between onboarding data and the ranking engine. Claude Code should read both documents together.

---

## Context

Pulse's existing onboarding captures category Love/Like/Dislike ratings — a blunt instrument that produces weak signal. This PRD replaces it with a 5-question psychographic flow that yields cleaner, more directly rankable data.

The flow was iterated through several drafts. The final design reflects three decisions worth naming explicitly:

1. **5 questions, not 6 or 7.** Research suggested 5–7 is optimal; 5 is at the low end but each question earns its slot and nothing is synthetic padding. A cut planning-horizon question can be reintroduced post-onboarding later if behavioral data proves insufficient.
2. **No abstract personality scoring.** Earlier drafts computed `opennessScore`, `extraversionScore`, `noveltyScore` as derived floats. Final design drops these — every question maps directly to content tags, category multipliers, or hard filters. One less layer of interpretation means less signal decay.
3. **Q3 uses forced tradeoff pairs, one rewritten for inclusivity.** The original "guided group hike vs. hidden trail" pair broke for non-hikers; it's been replaced with "well-marked trail with a view vs. scrambling up somewhere most people skip" — adrenaline-framed but accessible to anyone who's ever walked outside.

---

## Goals

1. Replace the existing category-based onboarding with the 5-question flow
2. Persist structured data to a new `UserProfile` Prisma model
3. Deliver a personalized post-onboarding welcome screen keyed to `contextSegment`
4. Gate feed access on onboarding completion for new users; don't force existing users to re-onboard
5. Produce a profile immediately consumable by PRD 5's ranking engine (see `signal-map.md`)

## Non-goals

- LLM processing of the Q5 free-text field (stored as raw text; processed in a later PRD)
- Notification/email logic (Q4-planning-horizon was cut; infer behaviorally later)
- A "re-onboarding" or profile-editing UI
- The matching engine itself (PRD 5)
- Abstract personality score computation (`opennessScore`, etc. — explicitly removed from earlier draft)

---

## The final 5-question flow

| # | Question | Format | Output |
|---|---|---|---|
| Q1 | "What best describes you right now?" | Single-select, 4 options | `contextSegment` enum |
| Q2 | "When you find something cool to do... what usually happens?" | Single-select, 4 options | `socialStyle` enum |
| Q3 | "Pick the one that calls to you" | 4 forced tradeoff pairs | `vibePreferences` JSON |
| Q4 | "Let's talk money" | Single-select, 3 options | `budgetTier` enum |
| Q5 | "What have you been wanting to do more of?" | Multi-select chips + optional free text | `aspirationCategories` array + `aspirationText` string |

Followed by a **Welcome screen** with per-segment copy and 2–3 hand-curated recommendations.

---

## Work is phased. After each phase, report back and wait for approval.

---

## PHASE 0 — SCHEMA & MIGRATION

### 0.1 Prisma schema

```prisma
model UserProfile {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Q1: Context
  contextSegment    ContextSegment

  // Q2: Social style
  socialStyle       SocialStyle

  // Q3: Vibe tradeoffs (JSON array: [{pair: 1, selected: "A"}, ...])
  vibePreferences   Json

  // Q4: Budget
  budgetTier        BudgetTier

  // Q5: Aspiration
  aspirationCategories String[]   // array of chip labels user selected
  aspirationText       String?    // optional free text, raw, LLM-processed in later PRD

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum ContextSegment {
  NEW_TO_CITY        // "I'm new to Denver"
  IN_A_RUT           // "I'm in a rut"
  LOCAL_EXPLORER     // "Show me what I'm missing"
  VISITING           // "I'm visiting"
}

enum SocialStyle {
  SOCIAL_CONNECTOR   // "I grab someone and go"
  PASSIVE_SAVER      // "I save it for later"
  SOLO_EXPLORER      // "I just go"
  DIRECT_SHARER      // "I send it to my person"
}

enum BudgetTier {
  FREE_FOCUSED       // "Keep it free (or close to it)"
  MODERATE           // "I'll spend a little"
  TREAT_YOURSELF     // "Treat yourself"
}
```

**Intentionally removed from earlier draft:** `planningStyle` enum, `sparkResponse` field (renamed to `aspirationText`), and all derived score fields (`opennessScore`, `extraversionScore`, `noveltyScore`). The ranking engine does not need these — see `signal-map.md`.

### 0.2 User model update

```prisma
model User {
  // ... existing fields
  profile              UserProfile?
  onboardingComplete   Boolean @default(false)
}
```

### 0.3 Migration

`npx prisma migrate dev --name add_user_profile_v2`

Existing users get `onboardingComplete = false`. They are NOT force-redirected; see Phase 2.

### 0.4 Directory structure

```
app/onboarding-v2/
  layout.tsx                    # Shared layout with progress dots
  page.tsx                      # Q1 (default entry)
  social/page.tsx               # Q2
  vibe/page.tsx                 # Q3
  budget/page.tsx               # Q4
  aspiration/page.tsx           # Q5
  welcome/page.tsx              # Post-onboarding personalized screen

lib/onboarding/
  copy.ts                       # All strings centralized
  types.ts                      # Shared types
  chip-mapping.ts               # Maps Q5 chip labels to Category enum values (see signal-map.md)
```

---

## PHASE 1 — SCREEN IMPLEMENTATION

Five question screens + welcome. Build in order.

### General UI requirements

- Warm cream background (#FAF7F2), charcoal text (#1F1C17)
- Muted brick red (#D84B3E) for active progress dot, deep teal (#2B8272) for confirmation accents
- Typography: Instrument Serif for display headers, DM Sans for body
- Progress dots: 5 at top of each screen, active dot expands to a short pill
- Back arrow in top-left on every screen except Q1
- Tap targets minimum 44x44px
- Auto-advance on single-select screens (400ms delay for visual acknowledgment); explicit Continue button on Q3 (4 independent pair selections) and Q5 (multi-select + text)
- Full-screen flow, no header nav during onboarding

### Q1 — Context

**Header:** "Let's get you set up."
**Subtext:** "Takes about 60 seconds. Makes everything better."
**Question:** "What best describes you right now?"

| Emoji | Label | Subtitle | Enum |
|---|---|---|---|
| 🌱 | "I'm new to Denver" | "Still figuring out what's out here" | `NEW_TO_CITY` |
| 🔄 | "I'm in a rut" | "Been here a while, need something new" | `IN_A_RUT` |
| 🔍 | "Show me what I'm missing" | "I know my city — go deeper" | `LOCAL_EXPLORER` |
| ✈️ | "I'm visiting" | "Here for a few days, make them count" | `VISITING` |

### Q2 — Social Style

**Header:** "When you find something cool to do…"
**Question:** "What usually happens?"

| Emoji | Label | Subtitle | Enum |
|---|---|---|---|
| 👥 | "I grab someone and go" | "Always better with people" | `SOCIAL_CONNECTOR` |
| 📌 | "I save it for later" | "…and hope I actually go" | `PASSIVE_SAVER` |
| 🚶 | "I just go" | "Don't need anyone to do cool stuff" | `SOLO_EXPLORER` |
| 📲 | "I send it to my person" | "Partner, bestie — they need to see this" | `DIRECT_SHARER` |

**CRITICAL COPY NOTE:** The subtitle on `PASSIVE_SAVER` — "…and hope I actually go" — is the emotional hook of the entire onboarding. Signals to the user that Pulse understands their exact behavior. **Do not soften, remove, or rewrite this line.** Render it italicized + medium weight. Do NOT color it coral (earlier draft variant) — italic emphasis is the current visual direction.

### Q3 — Vibe Tradeoffs

**Header:** "Pick the one that calls to you."
**Subtext:** "No wrong answers. Gut reactions only."

4 forced tradeoff pairs, displayed as stacked rows of 2 side-by-side cards each. Both cards in each pair visually equal — no default selection.

| Pair | Option A | Option B |
|---|---|---|
| 1 | 🍸 "Rooftop cocktails" | 🎸 "Dive bar with a jukebox" |
| 2 | 🏞️ "A well-marked trail with a view" | 🧗 "Scrambling up somewhere most people skip" |
| 3 | 🎷 "Live jazz on a Friday" | 🎧 "Underground electronic show" |
| 4 | 🌽 "Farmers market morning" | 🌮 "Late-night food truck rally" |

**Critical note on Pair 2:** the earlier "guided group hike" framing was rejected as too narrow — it required the user to either be a hiker or self-exclude from the question. The current framing measures the same underlying axis (safety/structure vs. exploration/adrenaline) but is accessible to anyone who has spent time outside. Claude Code: **do not revert to "guided group hike" even if it appears in older spec snippets.**

**Storage:** JSON array `[{pair: 1, selected: "A"}, {pair: 2, selected: "B"}, ...]` in `vibePreferences`.

**Interaction:** All 4 pairs visible simultaneously. User taps one card from each pair, highlighting it. Once all 4 are selected, a "Continue" button appears at the bottom OR auto-advance with 500ms delay — Claude Code picks whichever feels smoother, flags the choice in the PR.

### Q4 — Budget

**Header:** "Let's talk money."
**Subtext:** "So we only show you stuff that makes sense."

| Emoji | Label | Subtitle | Enum |
|---|---|---|---|
| 🆓 | "Keep it free (or close to it)" | "Best things in life, right?" | `FREE_FOCUSED` |
| 💵 | "I'll spend a little" | "If it's worth it, I'm in" | `MODERATE` |
| ✨ | "Treat yourself" | "I'm here for a good time" | `TREAT_YOURSELF` |

**Context for implementation:** This is the only near-hard filter in the whole flow. Reddit research surfaced the user frustration "every suggestion for meeting people is a $60 class." Users who pick `FREE_FOCUSED` getting $80 climbing gym memberships will churn. Ranking engine treats this as a filter, not a soft signal — see `signal-map.md`.

### Q5 — Aspiration

**Header:** "One more thing."
**Question:** "What have you been wanting to do more of?"
**Subtext:** "No judgment on the list of things you've been meaning to do." *(italic — this is an emotional hook, do not remove)*

**Chip options (multi-select, 8 chips):**

| Chip label | Maps to (see signal-map.md) |
|---|---|
| "Try new restaurants" | `RESTAURANT`, `FOOD` |
| "More artsy things" | `ART` |
| "Live music" | `LIVE_MUSIC` |
| "Outdoor adventures" | `OUTDOORS` |
| "Date-night spots" | `BARS`, `RESTAURANT` (tagged `date-worthy`) |
| "Classes / learning" | `ACTIVITY_VENUE` (tagged `class` or `workshop`) |
| "Nightlife" | `BARS`, `LIVE_MUSIC` (late-night tagged) |
| "Hidden local spots" | Hidden Gems (PRD 3) boost |

**Free-text field:** Below chips. Multi-line, 3 rows visible. Placeholder: *"Or be specific — 'actually go to a pottery class'"*

**Buttons:** "Continue" primary, "Skip" secondary link.

**Storage:**
- Selected chips → `aspirationCategories: string[]` (store the chip labels; the chip-to-Category mapping is maintained in `lib/onboarding/chip-mapping.ts` so ranking engine can reference it)
- Free text → `aspirationText: string?` (null if skipped)

**Note on future work:** `aspirationText` is stored raw. A later PRD adds LLM extraction that parses free text into structured tags (specific venues, activity types, neighborhoods). Not in scope for this PRD.

### Welcome screen

After Q5 submit (continue or skip), user lands on a transition screen before the main feed.

**Structure:**

1. **Pulse wordmark** at top (small, centered)
2. **Personalized welcome copy** keyed to `contextSegment`:
   - `NEW_TO_CITY` → "Welcome to Denver. Here are the things locals wish someone had told them."
   - `IN_A_RUT` → "Time to shake things up. Here's something you probably haven't tried."
   - `LOCAL_EXPLORER` → "You know your city. But we found some things that might surprise you."
   - `VISITING` → "Make every day count. Here's where to start."
3. **2–3 recommendation cards.** For this PRD, these are **hardcoded per-segment pools** (5–8 items per segment, 2–3 randomly shown per user). Real personalized recommendations arrive with PRD 5.
4. **CTA button:** "Let's go →" navigates to main feed

---

## PHASE 2 — ROUTING & GATING

### 2.1 New-user flow
- Post-signup + email verification → redirect to `/onboarding-v2`
- Sequential screens, no skip-ahead, back nav allowed
- On Q5 submit/skip → set `onboardingComplete = true`, persist `UserProfile`, go to welcome screen
- Welcome screen CTA → main feed

### 2.2 Returning-user flow
- `onboardingComplete = true` → straight to feed
- `onboardingComplete = false` → redirect to `/onboarding-v2`

### 2.3 Legacy user migration
Existing users (pre-PRD 4) have `onboardingComplete = false` by default after migration.

**Do NOT force legacy users through the new flow.** If they have a legacy `Preference` record, treat them as onboarded for gating purposes. They'll get a default "unprofiled" experience (see `signal-map.md` for how ranking handles missing profiles).

Add a feature flag `FORCE_V2_ONBOARDING` that Quest can flip to force the migration later. Default: **off**.

### 2.4 Legacy route handling
- Keep `/onboarding` (old flow) functional during transition
- New signups → `/onboarding-v2`
- Stale bookmarks to `/onboarding` → redirect to `/onboarding-v2`
- Delete `/onboarding` route in cleanup PR 2+ weeks post-launch

---

## PHASE 3 — ANALYTICS INSTRUMENTATION

Minimal, intentional.

### 3.1 Events

- `onboarding_started` — user lands on Q1
- `onboarding_question_answered` — per screen, with `question_id` and `answer_value`
- `onboarding_back_pressed` — with `from_question_id`
- `onboarding_completed` — on welcome screen render, with full profile snapshot
- `onboarding_skipped_aspiration_text` — specifically when Q5 free text is skipped (we want to know this skip rate because it's the LLM-signal gate)

### 3.2 Funnel view
Admin endpoint (SQL view is fine, no UI needed):
- Started Q1 → completed Q1 %
- ... for all 5 questions
- Completed Q5 with: chips only / chips + text / everything skipped

### 3.3 Distribution check
Weekly sanity check endpoint:
- Distribution of `contextSegment`, `socialStyle`, `budgetTier`
- Distribution of `aspirationCategories` (which chips get picked most)
- **Flag if any enum value represents >70% of users** (question bias)
- **Flag if any chip picked by <2% of users** (chip not resonating, consider removing)

---

## PHASE 4 — END-TO-END VERIFICATION

### 4.1 Full flow test
New test account → complete end-to-end. Confirm:
- All 5 questions answerable
- Progress dots (5 total) update correctly
- Back nav works across all screens
- Q5 skip paths all work (chips only, chips + text, everything skipped)
- Welcome screen renders correct segment copy
- Feed loads after welcome
- `UserProfile` record persisted with all fields populated

### 4.2 Edge cases
- Mid-flow session abandonment → on next login, restart at Q1 (simpler than per-question resume state)
- Q5 submit with connection loss → graceful error, preserve Q1–Q4 answers
- Desktop + mobile both render cleanly

### 4.3 Legacy user check
- Pre-migration user with old `Preference` data signs in → direct to feed, NOT onboarding
- Toggle `FORCE_V2_ONBOARDING = true` → same user now redirected to `/onboarding-v2`
- Toggle flag off → normal behavior resumes

### 4.4 Visual verification
Screenshots:
- Each of 5 question screens (mobile viewport)
- Welcome screen for each of 4 `contextSegment` variants
- Progress dots at partial completion

### 4.5 Update PULSE_STATUS.md
- `UserProfile` schema (note: no derived score fields; no planningStyle)
- Onboarding routes
- `FORCE_V2_ONBOARDING` feature flag
- Pointer to `signal-map.md` for ranking integration
- Known: legacy users get unprofiled experience until they opt in

---

## Ground rules

- Copy in this PRD is final. Do not rewrite, soften, or "improve." The "…and hope I actually go" line in Q2 and the "No judgment on the list of things you've been meaning to do" line in Q5 are both deliberate emotional hooks.
- The 4 vibe tradeoff pairs are final. **Pair 2 is "well-marked trail vs. scrambling" — DO NOT revert to "guided group hike" even if older spec snippets reference it.**
- Auto-advance pattern non-negotiable for single-select screens.
- Do NOT add derived score fields (`opennessScore`, etc.) — removed deliberately.
- Do NOT add Q4 planning horizon back — cut deliberately; planning signal comes from behavior later.
- Do NOT add AI/LLM processing in this PRD. `aspirationText` is stored raw.
- Do NOT build profile-editing UI. Later PRD.
- Each phase pauses for Quest's review — do not chain phases.

---

## Open questions for Quest

1. **Welcome recommendations source:** hardcoded per-segment pools (recommended) vs. live DB query filtered by segment criteria. Hardcoded recommended for this PRD; PRD 5 replaces with real personalization.

2. **Q3 interaction model on mobile:** explicit "Continue" button after all 4 pairs vs. auto-advance after the 4th pair. Both acceptable — Claude Code decides during implementation, flags in PR.

3. **Chip count on Q5:** currently 8. More chips = more signal per user but slower completion. Comfortable with 8?

---

## Start with Phase 0 (schema + migration). Produce the Prisma changes and migration file, run in staging, wait for Quest's approval before building screens.
