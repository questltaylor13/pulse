# PRD 5 Phase 7 — End-to-End Verification

**Date prepared:** 2026-04-23
**Status:** Template, ready to fill after all 6 Phase 5 PRs merge.

## 1. Merge order

All six branches are stacked on Phase 0 and green on build/typecheck.
Merge in order to keep Vercel deploys meaningful:

- [ ] `prd5-phase0-useritemstatus-extensions`
- [ ] `prd5-phase1-in-feed-feedback`
- [ ] `prd5-phase2-profile-strip-swiper`
- [ ] `prd5-phase3-detail-feedback`
- [ ] `prd5-phase4-your-denver`
- [ ] `prd5-phase5-signal-map` (docs only)
- [ ] `prd5-phase6-feedback-observability`
- [ ] `prd5-phase7-verification-docs` (this file + PULSE_STATUS)

All four Phase 0-6 migrations have already been applied to Neon prod via
`prisma migrate deploy`. Merges are additive from a DB perspective.

## 2. Pre-flight

- [ ] Vercel deploy for the final merged commit shows "Ready"
- [ ] `prisma migrate status` clean on prod DB
- [ ] Session works: sign in as a test account
- [ ] Home feed renders without regression when signed out (anon viewer)

## 3. Full-flow smoke test (test account, signed in)

### §1 in-feed feedback
- [ ] Home feed renders; every compact card has ⋯ button top-left
- [ ] Tapping ⋯ opens the ActionSheet from the bottom
- [ ] Tap "Interested" → sheet closes, teal pill appears on card
- [ ] Reload home — pill still there
- [ ] On a different card: tap "Not for me" → 400ms fade-out, card gone
- [ ] Reload home — PASS'd card doesn't return
- [ ] On a third card: tap "I've been there" → purple pill (brief), then
      card removed from home on next refresh
- [ ] Action sheet Share row opens native share (mobile) or clipboard copy
      (desktop)

### §2 profile strip + swiper
- [ ] Strip renders between scope toggle and "Today" section
- [ ] Progress ring shows correct percentage
- [ ] ✕ dismiss → strip disappears, reload → still hidden within 48h
- [ ] Tap Continue → URL becomes `?swiper=1`, overlay opens
- [ ] Swiper: 12 items, fresh roll each launch
- [ ] Progress shows "1 of 12" → "12 of 12"
- [ ] "Done for now" visible from item 3+
- [ ] Completion screen renders tallies and "See my feed" closes overlay
- [ ] Verify UserItemStatus rows in DB have `source = PROFILE_SWIPER`

### §3 detail pages
- [ ] `/events/[id]` renders DetailFeedback widget top-right
- [ ] Give feedback → pill appears
- [ ] `/places/[id]` same check
- [ ] `/discoveries/[id]` widget renders beside the "← Hidden Gems" nav
- [ ] Change status via detail sheet — DB row updates

### §4 Your Denver
- [ ] `/your-denver` renders (if logged in) with zero state OR grid
- [ ] Tap a filter chip — URL updates to `?kind=event|place|discovery`
- [ ] Tap a card → opens detail page of that item
- [ ] Empty state "Start adding" routes to `/?swiper=1`

### §5/§6 docs + admin
- [ ] `PRD/signal-map.md` has the "Behavioral signals" section with the
      updated ranking formula and v1.1 changelog
- [ ] `/admin/feedback` renders (logged in as admin)
- [ ] Numbers match quick sanity: `SELECT COUNT(*) FROM "UserItemStatus"`
- [ ] Top WANT + Top PASS populated if any rows exist

## 4. DB sanity

```sql
-- Polymorphic integrity
SELECT COUNT(*) FROM "UserItemStatus"
WHERE (
  ("itemId" IS NOT NULL)::int
    + ("eventId" IS NOT NULL)::int
    + ("placeId" IS NOT NULL)::int
    + ("discoveryId" IS NOT NULL)::int
) <> 1;
-- MUST be 0. CHECK constraint enforces this at write time.

-- Source distribution
SELECT source, status, COUNT(*)
FROM "UserItemStatus"
GROUP BY source, status
ORDER BY source, status;

-- Legacy rows preserved
SELECT COUNT(*) FROM "UserItemStatus" WHERE source = 'LEGACY';
-- Expected: 438 at time of Phase 0 + any subsequent LEGACY writes

-- Profile strip dismissal signal
SELECT COUNT(*) FILTER (WHERE "profileStripDismissedAt" IS NOT NULL)
FROM "User";
```

## 5. Edge cases

- [ ] Anon viewer: feed renders, no pills, no filtering, no strip, no
      swiper. Tap ⋯ on a card → sign-in modal (existing SaveButton
      SoftAuth pattern — tempted to reuse, currently the sheet would 401
      on POST; **flag for fix if behavior is bad.**)
- [ ] Item hard-deleted while user has feedback → row's FK goes NULL,
      snapshot persists, Your Denver still renders the card without a
      detail-page link.
- [ ] Two devices submit conflicting status for same item → last write
      wins. Acceptable.
- [ ] Offline feedback queuing — NOT shipped in PRD 5. Deferred per
      PRD §7.3 to its own sub-phase once analytics are in place.

## 6. Post-verification tuning

If quality spot-check surfaces issues:
- **Pill appears on cards user wouldn't expect** → verify `getFeedbackMaps`
  batch-scopes to `userId` (it does; defensive)
- **Strip dismissed but reappears immediately** → check
  `profileStripDismissedAt` getting stamped by
  `/api/feedback/dismiss-strip`
- **Swiper returns < 12 items** → `GET /api/feedback/swiper-items` debug
  block reports per-bucket availability; likely under-populated DB buckets

## 7. Call-site analytics wiring (follow-up PR)

Once a vendor is chosen (PostHog / Mixpanel / etc.), a single-file
update to `lib/feedback/analytics.ts track()` wires every event. Then
instrument call sites:
- `CardMoreMenu.tsx` — action_sheet_opened on open; action_sheet_dismissed_no_action on close without selection
- `useFeedback.upsert` — feedback_given after successful POST
- `useFeedback.remove` — feedback_undone
- `ProfileCompletionStrip` — profile_strip_shown on mount, profile_strip_dismissed on ✕
- `TasteSwiper` — swiper_started on mount, swiper_completed on summary, swiper_abandoned on early close
- `YourDenverPage` — your_denver_viewed on SSR render (log server-side via `track()` body — note: current stub is `window`-gated; adjust if needed)

Estimated: 30 min wire-up once vendor picked.
