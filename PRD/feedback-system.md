# PRD 5: Feedback System

**Owner:** Quest
**Status:** Ready for implementation (ships after PRD 4 onboarding is live)
**Priority:** Primary ongoing-signal source for the future ranking engine (PRD 6)
**Prior context:**
- PRD 1 (`data-refresh-and-reliability.md`) — shipped. Introduced `UserItemStatus` (WANT / DONE / PASS).
- PRD 2 (`regional-expansion.md`) — Regional Expansion.
- PRD 3 (`hidden-gems-engine.md`) — Hidden Gems pipeline.
- PRD 4 (`psychographic-onboarding.md`) — 5-question onboarding.
**Companion doc:** `signal-map.md` — gets updated as part of this PRD to include behavioral signals alongside stated preferences.
**Upstream dependency for:** PRD 6 (Matching Engine).

---

## Context

PRD 4 captures user preferences *stated* at onboarding. But research on recommender systems is unambiguous: **behavioral signal is 5–10x more predictive than self-report.** Users are bad at predicting what they'll actually engage with. Someone who says "more artsy things" might never tap an art event; someone who swears they don't drink might save every cocktail bar.

The feedback system closes this gap by capturing what users actually do at item level — what catches their interest, what they reject, what they've already done.

**Architectural decision:** the existing `UserItemStatus` model from PRD 1 already carries this exact semantic (`WANT` / `DONE` / `PASS`) for Events and Places through the `Item` polymorphic bridge. Rather than introduce a parallel `UserItemFeedback` table, this PRD **extends `UserItemStatus` to cover Discoveries as well**, adds the missing feedback-source dimension, and denormalizes title/category/town so deletion of an underlying item doesn't orphan the user's history.

Semantic mapping across the whole PRD:

| UI copy | `ItemStatus` value |
|---|---|
| "Interested" | `WANT` |
| "Not for me" | `PASS` |
| "I've been there" | `DONE` |

Three surfaces all write to `UserItemStatus`:

1. **In-feed card feedback** — three-dot menu on every card in the main feed
2. **Profile completion swiper** — opt-in "finish your profile" flow launched from a persistent strip in the feed
3. **Detail page feedback** — same action sheet pattern when viewing a full event/place/hidden gem

The product-level design decision embedded in this PRD is that **all three surfaces are optional and dismissible.** No user is forced into feedback. Mandatory post-onboarding calibration creates friction; the carrot of a visibly incomplete profile and an always-available three-dot menu creates a steady trickle of signal from engaged users, which is the signal that actually matters.

Two additional design decisions worth naming up front:

- **"Not for me" (`PASS`) feedback is private-by-design.** "Interested" can surface as social proof later (aggregate counts on cards). "Not for me" stays invisible forever. This asymmetry lowers the barrier to honest negative feedback, which is structurally more valuable for ranking than positive feedback.
- **"I've been there" (`DONE`) is a hard filter, not a soft signal.** If a user marks something as done, it never appears in their feed again. It also feeds the "Your Denver" history view — an accidental, delightful byproduct of the feedback mechanic.

---

## Goals

1. Extend `UserItemStatus` as the single source of truth for behavioral signal (covering Events, Places, **and Discoveries**)
2. Ship in-feed card feedback (three-dot menu + action sheet) as Phase 1 — this is where most feedback will come from over time
3. Ship the profile completion strip and taste-calibration swiper as Phase 2
4. Add feedback to detail pages as Phase 3
5. Build the "Your Denver" history view surfacing already-done items (Phase 4 — lightweight, leverages `UserItemStatus WHERE status = DONE`)
6. Update `signal-map.md` to define how behavioral signals integrate with stated preferences
7. End state: feedback data accumulates continuously, visibly persists in UI, and is structured for the ranking engine to consume in PRD 6

## Non-goals

- The ranking engine itself (PRD 6 consumes this data, doesn't ship here)
- Social features: aggregate interest counts on cards, friend activity, etc. (future PRD)
- LLM processing of feedback patterns (future PRD)
- Undoing feedback via toast/snackbar notifications (too heavy; use the history view instead)
- Editing onboarding answers after completion (separate profile-editing PRD)
- Gamification / badges / streaks tied to feedback count (intentionally avoided — would cheapen the mechanic)
- Push notifications triggered by feedback patterns (out of scope; future notification PRD)

---

## Work is phased. After each phase, report back and wait for approval.

---

## PHASE 0 — SCHEMA & FOUNDATIONS

### 0.1 Prisma schema changes

Extend the existing `UserItemStatus` model to (a) support Discoveries via a nullable `discoveryId` FK alongside the existing `itemId`, (b) carry a new `FeedbackSource` dimension, and (c) denormalize the minimum needed metadata for the history view to survive item deletion.

```prisma
enum FeedbackSource {
  FEED_CARD          // three-dot menu from main feed
  PROFILE_SWIPER     // taste calibration flow
  DETAIL_PAGE        // from an event/place/discovery detail view
  LEGACY             // backfilled rows pre-dating Phase 5 (no known source)
}

model UserItemStatus {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Polymorphic: exactly one of itemId or discoveryId is non-null.
  // itemId points to the existing Item bridge (Events + Places).
  // discoveryId points directly at Discovery (no Item mirror).
  itemId      String?
  item        Item?      @relation(fields: [itemId], references: [id], onDelete: SetNull)
  discoveryId String?
  discovery   Discovery? @relation(fields: [discoveryId], references: [id], onDelete: SetNull)

  status ItemStatus     // existing enum: WANT / DONE / PASS
  source FeedbackSource @default(LEGACY)

  // Denormalized snapshot — survives item/discovery deletion so the
  // Your Denver history view + analytics stay intact.
  itemTitleSnapshot    String?
  itemCategorySnapshot String?
  itemTownSnapshot     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // One feedback per user per content instance, regardless of type.
  @@unique([userId, itemId])
  @@unique([userId, discoveryId])
  @@index([userId, status])
  @@index([itemId])
  @@index([discoveryId])
}
```

**Required raw SQL in the migration (Prisma can't express these):**

```sql
-- Exactly one of itemId or discoveryId must be non-null.
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_exactly_one_ref"
  CHECK (
    (("itemId" IS NOT NULL)::int + ("discoveryId" IS NOT NULL)::int) = 1
  );
```

**Backfill executed in the same migration:**
- Every existing row has `itemId` populated (438 rows at write time). Set `source = 'LEGACY'` for all of them — this is what `@default(LEGACY)` does automatically, so the `ALTER TABLE ADD COLUMN ... DEFAULT 'LEGACY' NOT NULL` handles it in a single statement.
- Populate `itemTitleSnapshot` / `itemCategorySnapshot` / `itemTownSnapshot` from the joined `Item` row in the same migration. Rows are ~438 — fast.

**FK change:** the existing `onDelete: Cascade` on `UserItemStatus.itemId` is replaced with `onDelete: SetNull` so that snapshots survive item deletion. This is a data-integrity change worth calling out — if an item is archived/deleted, historical feedback rows keep the user's record but lose their live pointer. `Your Denver` renders from the snapshot in that case.

**Notes on schema choices:**

- **Single table.** We deliberately avoid introducing `UserItemFeedback` as a parallel model. All feedback lives on `UserItemStatus`, giving a single place to query "what has this user reacted to?"
- **Polymorphic via two nullable FKs, not generic `itemType`+`itemId`.** Prisma handles real FK relations better and we keep referential integrity when items get deleted. Discoveries are NOT mirrored into the `Item` table — that table is for Events+Places; Discovery is its own content type.
- **Unique constraints per user-content-pair.** Postgres allows multiple NULL rows in a unique index, so the two `@@unique` constraints work because each row has exactly one non-null FK (enforced by the CHECK above).
- **`source` defaults to `LEGACY`.** That way the backfill is zero-cost for existing rows; new writes must specify the real source.
- **Saved/bookmarked stays separate.** Whatever model currently holds bookmarks is untouched. `UserItemStatus` is specifically for the three feedback types that affect ranking.
- **`UserItemRating` (92 rows) stays separate.** Star ratings are a different axis and not in scope for PRD 5.

### 0.2 Directory structure

```
lib/feedback/
  types.ts                    # Shared types — FeedbackSource, helpers, UI-label-to-ItemStatus map
  api.ts                      # Server-side upsert/delete feedback operations
  hooks.ts                    # Client-side hooks: useFeedback(ref) where ref is {itemId} or {discoveryId}
  profile-completion.ts       # Logic for calculating profile completion %

app/api/feedback/
  route.ts                    # POST upserts, DELETE removes feedback

components/feedback/
  CardMoreMenu.tsx            # Three-dot trigger + action sheet
  ActionSheet.tsx             # The bottom sheet UI
  FeedbackTag.tsx             # "Interested" / "Been there" pill on cards
  ProfileCompletionStrip.tsx  # The feed nudge
  TasteSwiper.tsx             # The full calibration flow
```

### 0.3 Profile completion calculation

Profile completion is a percentage shown on the completion strip. Formula:

```typescript
completion = min(100, round(
  (onboardingComplete ? 40 : 0) +
  min(60, feedbackCount * 3)  // 3% per feedback, capped at 60%
))
```

So a user who finishes onboarding is at 40%. Each feedback given (from any surface) adds 3%, capped at 60% from feedback. **Full profile at 20 feedback items total.**

Why these numbers: they hit 100% at a meaningful-but-achievable threshold (20 feedbacks is strong signal for ranking), don't cap too early (would kill the motivation to keep tapping), and make the first few taps feel rewarding (3% bumps are clearly visible on a progress ring). Tune after real usage data.

### 0.4 API endpoint

```
POST /api/feedback
Body: {
  ref:      { itemId: string } | { discoveryId: string },
  status:   "WANT" | "DONE" | "PASS",
  source:   "FEED_CARD" | "PROFILE_SWIPER" | "DETAIL_PAGE"
}

DELETE /api/feedback
Body: {
  ref: { itemId: string } | { discoveryId: string }
}
```

`POST` upserts by `(userId, itemId)` or `(userId, discoveryId)` depending on which ref is provided. Returns the row plus the updated profile completion %. Server writes `itemTitleSnapshot` etc. from the joined record at write time.

Existing Want/Done/Pass UI callers in `lib/actions/items.ts` continue to work unchanged — they already hit `prisma.userItemStatus.upsert()` with no `source` specified, and the default `LEGACY` keeps behavior identical until those call sites are updated to pass the real source.

---

## PHASE 1 — IN-FEED CARD FEEDBACK

Primary surface. Ships first because it generates the most feedback over time.

### 1.1 Three-dot menu trigger

Every card in the main feed gets a `⋯` button in the top-left corner (opposite the bookmark, which stays top-right). Specs:

- 32x32px circular button
- White 92% opacity background with backdrop blur
- `⋯` glyph, charcoal (#1F1C17)
- Positioned 10px from top-left
- Tap target 44x44 (button styled smaller but hit area full-size)

Same visual treatment across every card type (event / place / discovery). Consistency matters.

### 1.2 Action sheet

Tapping the three-dot opens a bottom sheet with four rows:

| Icon | Label | Subtitle | Maps to |
|---|---|---|---|
| ✓ (teal) | "Interested" | "Show me more like this" | `status = WANT` |
| ✕ (muted) | "Not for me" | "🔒 Private · only affects your feed" | `status = PASS` |
| 🎯 (purple) | "I've been there" | "Add to your Denver history" | `status = DONE` |
| ↗ (amber) | "Share" | "Send to a friend" | — |

Visual treatment details:

- Sheet slides up from bottom with subtle spring animation
- Grip handle (4px × 36px) at top
- Header shows item title + "Help us tune your feed" subtext
- Each row 56px tall with icon badge + label + subtitle + chevron
- "Not for me" subtitle uses a small lock icon and teal color to emphasize privacy
- Cancel button at bottom
- Backdrop is 25% black with tap-to-dismiss

### 1.3 Post-feedback card state

After feedback is given, the card updates visually:

- **Interested (`WANT`)** → small pill below meta line: `✓ Interested` in soft teal. Card stays in feed.
- **Not for me (`PASS`)** → card fades out of feed with a ~400ms animation, does not return on refresh. Animation plays concurrently with the optimistic API call; if the API fails, card fades back in and the action sheet reopens with an inline error.
- **Been there (`DONE`)** → small pill: `✓ Been there` in soft purple, card removed from feed on next refresh but surfaces in Your Denver view.

The "Interested" pill stays on the card persistently. This reinforces the action and acts as low-key social confirmation to the user that their feedback matters.

**Query note:** rendering this pill requires every feed query to lookup `UserItemStatus` for the current user. Add a server-side helper `getUserStatuses(userId, itemRefs[])` that batch-fetches in one query and hands back a `Map`. Call it once per feed SSR pass.

### 1.4 Share action

Tap "Share" opens the native share sheet with:
- A prefilled message: `"Found this on Pulse → [item name]"`
- A link to the item's public Pulse URL (already exists or generate)

Share is not written to `UserItemStatus` — it's a pure utility. Track analytics on it separately.

### 1.5 Undo handling

No toast/snackbar undo. Instead, users can:
- Go to Your Denver (Phase 4) to remove "Been there" entries
- Go to a future "Profile → Feedback history" page to review/edit any feedback

Deliberate choice: toast undo makes the feedback feel heavy and reversible in a way that encourages tap-and-retract behavior. Committing to the action produces cleaner signal.

### 1.6 Performance requirements

- Action sheet opens within 150ms of tap
- Feedback API call fires optimistically (UI updates immediately, rolls back on error)
- Card fade-out animation for Not-for-me / Been-there plays while API call resolves; on API failure, the card fades back in and an inline error appears in the action sheet when next opened (no toast)
- No loading spinners in the feedback UI — it should always feel instant

---

## PHASE 2 — PROFILE COMPLETION + TASTE SWIPER

Ships after Phase 1 is stable. Depends on Phase 1's `ActionSheet` + `CardMoreMenu` components (not on Phase 1's feedback data — the swiper's item selection is diversity-biased, not personalized).

### 2.1 Profile completion strip

Appears in the main feed between the Scope toggle and the Today section. Shown to any user with `completion < 100%`.

Layout (left-to-right):
- **Progress ring** (42x42px) showing current completion percentage, coral ring on cream background
- **Text block** — "Finish your profile" heading + "2 min of taste-training. Your feed gets smarter fast." subtext
- **Primary CTA** — rounded charcoal button, "Continue" label

Dismissible via small `✕` in the corner. Dismissal behavior:
- Stores `profileStripDismissedAt` timestamp on the user
- Strip hidden for 48 hours after dismiss
- After 48 hours, re-appears automatically
- Never permanently dismisses — the nudge always returns until completion = 100%

Exception: once a user hits 80% completion, the strip auto-hides permanently. They've engaged enough; no more nagging.

### 2.2 Taste swiper

Launched from tapping Continue on the profile strip, or from Profile settings.

**Item selection algorithm (server-side, `GET /api/feedback/swiper-items`):**

The swiper shows 12 items. Selection is deliberately engineered for diversity, not relevance:

```
Select 12 items:
  - 2 from each of: Events, Places, Discoveries (6 total per content type pool)
  - Of those 6 per pool: spread across 6 different categories
  - Prefer items with quality_score >= 7
  - Prefer items with no existing UserItemStatus row for this user
  - Prefer items the user has NOT already engaged with (saved, clicked)
  - Include at least 2 regional (non-Denver-metro) items
  - Include at least 1 Hidden Gem
  - Randomize order (don't bias toward any segment)
```

The goal is to maximize signal across the user's taste space, not to show them the stuff they'll probably like. Showing 12 items they're obviously going to mark Interested teaches the algorithm nothing.

**UI pattern:**

- Full-screen overlay, cream background
- Single large card at a time — image, category, title, 1-line description
- Three tap buttons below the card (NOT swipe gestures — discoverability issues):
  - Large teal "Interested" button → `WANT`
  - Medium neutral "Skip" button (logs no feedback, just advances)
  - Large muted "Not for me" button → `PASS`
- Above the card: "I've been there" chip-style button for easy access → `DONE`
- Progress indicator: "5 of 12" at top
- "Done for now" button top-right, always available (visible from item 3 onward per spec intent)

**Progressive disclosure:**
- After 3 items, if user hasn't bailed, continue silently
- After 8 items, show "Keep going or jump to your feed?" prompt with "Keep going" default
- At 12 items, show completion screen

**Completion screen:**
- "Your feed just got smarter" headline
- Summary: "[N] items marked interested · [M] already done · [K] skipped"
- Primary CTA: "See my feed" — navigates to main feed
- Profile completion ring updated visibly

All 12 items count as feedback sources with `source = PROFILE_SWIPER`.

### 2.3 Swiper abandonment handling

If the user quits mid-swiper (closes, backgrounds, etc.):
- Feedback given up to that point IS saved
- User can re-launch the swiper any time from the profile strip
- **Each launch generates a fresh 12-item selection** — we don't persist swiper session state. (Not resumption; re-rolling.)

### 2.4 Retrigger for highly-engaged users

After a user reaches 80% completion and dismisses the strip permanently, they can still access the swiper manually from Profile settings. Useful for power users who want to periodically recalibrate.

---

## PHASE 3 — DETAIL PAGE FEEDBACK

Smaller phase. Adds feedback to event/place/discovery detail pages (the pages users land on after tapping a card).

### 3.1 UI pattern

Same action sheet as in-feed cards, accessed via a `⋯` button in the detail page header (opposite any existing share/save buttons).

No new components — reuse `ActionSheet.tsx` and `CardMoreMenu.tsx` from Phase 1.

### 3.2 Feedback state on detail page

Show the user's current feedback state prominently if any exists:
- Top of detail page, small pill under the item title
- "✓ You're interested" for `WANT` / "✓ You've been here" for `DONE` / nothing for `PASS` (private and the user shouldn't be on a PASS-marked item's detail page anyway since it's filtered out of feeds)

Tapping the pill opens the action sheet with the current status row visually highlighted, making it easy to change. (The sheet is not "pre-selected" in a form sense — all four actions remain tappable; the current one just gets a selected-state background.)

---

## PHASE 4 — YOUR DENVER (history view)

Lightweight. Surfaces the `DONE` data as a user-facing feature, turning a behavioral signal into a delightful byproduct.

### 4.1 Access

**Profile → Your Denver** section. Starts in Profile; **promote to top-level nav after usage data shows ≥10+ entries from a meaningful cohort of users.**

### 4.2 Content

All items the user has marked `status = DONE` (from `UserItemStatus`), displayed as:

- **Grid of cards** (2-column on mobile) — image, title, category, "been since [date]"
- **Counter at top**: "[N] places · [M] events · [K] hidden gems"
- **Simple filters**: All / Events / Places / Hidden Gems
- **Map view toggle** (optional — uses existing Google Places coordinates for Items + Discoveries; low effort because coordinates are already stored)

Rendering falls back to `itemTitleSnapshot` etc. when the underlying Item/Discovery has been deleted (FK is `SetNull`). Cards that have lost their live record render without a detail-page link.

### 4.3 Interaction

Tap a card → opens detail page (same as the original flow). From detail page, user can remove from Been-there via the action sheet ("Remove from Denver history"). That's a `DELETE /api/feedback` on the ref.

### 4.4 Why this matters beyond the feature

Three reasons to build this:

1. **Reversibility without toast spam.** Users can undo a Been-there mistake by going here. Toast undo was the alternative; this is cleaner.
2. **Visible value from feedback.** Users see their Denver history build up over time, which reinforces the feedback loop. Every tap has a visible outcome.
3. **Shareable artifact.** "I've been to 47 places on Pulse" is a thing users might screenshot or share. Free marketing.

### 4.5 Empty state

"Your Denver starts here. Mark things you've already been to — we'll keep track so your feed stays fresh." + a "Start adding" CTA that opens the swiper (Phase 2 dependency).

---

## PHASE 5 — SIGNAL MAP UPDATES

Update `docs/signal-map.md` to incorporate behavioral signal alongside stated preferences.

### 5.1 New section in signal-map.md

Add a section "Behavioral signals" covering:

- `status = WANT` on an item → +0.25 to items sharing ≥2 tags with the WANT'd item
- `status = PASS` on an item → -0.30 to items sharing ≥2 tags (stronger negative than positive)
- `status = DONE` → hard filter (item never appears again in that user's feed)

### 5.2 Behavioral-vs-stated weighting

Critical design decision documented here: **behavioral signal overrides stated preferences when they conflict.**

Example: user selects "Try new restaurants" at onboarding but has marked 5 Italian restaurants PASS. The aspiration boost for restaurants stays, but a similar-Italian-restaurant penalty stacks on top and wins the aggregate.

Formula adjustment in signal-map.md:

```
Old MVP formula:
  rank = base × strategy + social + vibe + aspiration - budget_penalty

New formula with behavioral layer:
  rank = base × strategy + social + vibe + aspiration - budget_penalty
       + want_similarity_boost          (0 to +0.40 total across all WANTs)
       - pass_similarity_penalty        (0 to -0.50 total across all PASSes)
       (DONE items filtered pre-ranking)
```

Tune weights after real data — starting values assume stated preferences matter more early (few feedback items) and behavioral matters more over time (many feedback items). As feedback count grows, effective weight of stated preferences gets compressed.

### 5.3 Cold-start handling

Users with zero `UserItemStatus` rows rely fully on stated preferences (PRD 4). As feedback accumulates, behavioral signal contribution grows. This is automatic — no special logic needed because behavioral boosts are 0 when there's no feedback to compare against.

### 5.4 Legacy-source rows

Rows with `source = LEGACY` (backfilled from the pre-PRD 5 Want/Done/Pass UI) count identically to explicit feedback for ranking. They just can't be attributed to a specific surface in analytics.

---

## PHASE 6 — RELIABILITY & OBSERVABILITY

### 6.1 Analytics events

- `feedback_given` — with `source`, `itemType` (`event` | `place` | `discovery`), `status`
- `feedback_undone` — with same
- `action_sheet_opened` — with `source`
- `action_sheet_dismissed_no_action` — to measure "thought about it but didn't tap anything"
- `profile_strip_shown` — track impressions
- `profile_strip_dismissed` — to measure nudge effectiveness
- `swiper_started` / `swiper_completed` / `swiper_abandoned_at_item_N`
- `your_denver_viewed`

### 6.2 Admin health view

Extend the existing `/admin/scrapers` page (from PRDs 1-3) with a new Feedback section:
- Total `UserItemStatus` rows, broken down by `status` and `source`
- Distribution per `ItemStatus` across all users (WANT / DONE / PASS counts)
- Median feedback count per user
- Swiper completion rate (started vs. completed)
- Top items by `WANT` count (what's landing with users)
- Top items by `PASS` count (content quality flag — if a single item has high PASS, it might be low quality and worth investigating)

Queries on snapshot columns avoid joins at scale; plan for materialized aggregates once total rows pass ~100k.

### 6.3 Data quality flags

Automated daily check:
- **Items with >30% PASS rate among users who saw them** → flag for quality review (might be slop that passed enrichment)
- **Users with >50 PASS and <5 WANT** → flag for onboarding profile mismatch (their onboarding said wrong things; maybe prompt them to redo)
- **Rows with live FK set to NULL but snapshot present** (item or discovery deleted) → these are expected post-`SetNull`; surface count as a soft signal, not an error

---

## PHASE 7 — END-TO-END VERIFICATION

After all phases complete.

### 7.1 Full flow test

Test account, complete onboarding, then:
- Give in-feed feedback across all 3 statuses
- Confirm profile strip updates percentage
- Open swiper from strip, complete 12 items
- Confirm profile ring hits higher percentage
- Navigate to detail pages, give feedback from there
- Open Your Denver, verify `DONE` items appear
- Remove a `DONE` item via detail page, verify it disappears from history

### 7.2 Feed behavior test

- Verify `PASS` items disappear from feed and don't return on refresh
- Verify `DONE` items filter pre-ranking and never appear again
- Verify `WANT` items still appear (they're not filtered, just boosted later when PRD 6 ships)
- Verify new items (no `UserItemStatus` row) still appear normally
- Verify legacy `UserItemStatus` rows (source=LEGACY) still behave correctly end-to-end

### 7.3 Edge cases

- Feedback given while offline → queues locally, syncs on reconnection (promote to its own sub-phase in implementation; IndexedDB + service worker is nontrivial)
- Item or Discovery hard-deleted while user had feedback → row's FK goes NULL, snapshot persists, Your Denver still renders the entry
- User logs out and logs back in → all feedback persists
- Two devices giving feedback simultaneously → last write wins (acceptable for this use case)

### 7.4 Update PULSE_STATUS.md

- Extended `UserItemStatus` schema (polymorphic to support Discoveries, `FeedbackSource` added, snapshots added)
- Three feedback surfaces + how they share one action sheet component
- Profile completion calculation (20 feedbacks = 100%)
- Your Denver view location (Profile section; promotion criterion documented)
- Signal map updates for behavioral signals
- Known: ranking engine (PRD 6) will consume this data but isn't built yet
- Legacy `source = LEGACY` rows are safe to treat as first-class feedback

---

## Ground rules

- No push notifications triggered by feedback behavior in this PRD — future work
- No social features (aggregate counts, friend activity) — future work
- No gamification beyond the profile completion percentage
- **`PASS` stays private permanently** — do not ever add aggregate "N users marked this not-for-me" to cards
- Feedback is cheap by design — no confirmations, no "are you sure" dialogs
- Toast undo is explicitly rejected — reversibility happens via Your Denver / profile history
- Do NOT introduce a parallel `UserItemFeedback` table — this PRD extends the existing `UserItemStatus` model
- **Keep the UI copy as specified** — "Interested" / "Not for me" / "I've been there". Internal enum values stay `WANT` / `PASS` / `DONE`. The mapping lives in `lib/feedback/types.ts`.
- Each phase pauses for Quest's review — do not chain phases
- Ask clarifying questions before starting any phase if anything is ambiguous

---

## Decided design parameters (previously open questions)

1. **Profile completion curve:** 3% per feedback, capped at 60%; 20 feedbacks = full profile (100%). Tune after real data.
2. **`PASS` card removal uses the ~400ms fade animation.** Instant disappearance feels like the app silently ate the input; the fade confirms the action tactilely.
3. **Your Denver stays in Profile.** Promote to top-level nav only after usage data shows a meaningful cohort reaching ≥10+ entries.
4. **Swiper shows a fixed 12 items.** "Done for now" is available from item 3 onward for flex.

---

## Start with Phase 0 (schema + API). Produce the Prisma migration that extends `UserItemStatus` + the `/api/feedback` endpoint. Wait for Quest's approval before building any UI.
