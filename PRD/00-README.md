# Pulse Home Redesign — PRD Package

**Author:** Quest
**Status:** Ready for implementation
**Overall goal:** Replace the current landing-page + feed architecture with a content-forward, mobile-first home experience modeled on the Airbnb browse-and-scroll pattern. Three top-level tabs: **Events**, **Places**, **Guides**. Search bar front-and-center. Horizontal scrolling sections with editorial framing. Clean minimal design that lets imagery carry the visual weight.

---

## The vision in one paragraph

The current Pulse homepage is a traditional SaaS landing page — hero, "how it works," feature grid. It's a brochure that talks about the product. The new Pulse goes straight to content: the moment you land, you see Denver. Today's events. Weekend picks. New restaurants. Creator-curated plans. No sign-up wall, no onboarding required to see value. Sign-up becomes a soft prompt triggered by intent (saving an event, following a creator) rather than a gate. This mirrors how Airbnb works — whether you're new or returning, you land on the same value-forward layout, and content gets more personalized over time.

---

## Phase structure

Each phase is a standalone PRD designed to be shipped and tested before moving to the next. Claude Code should implement one phase at a time, end-to-end, before starting the next.

| Phase | File | What ships | Why this order |
|---|---|---|---|
| 1 | `01-foundation-and-events-tab.md` | New three-tab architecture (Events/Places/Guides), sticky search, Events tab with category icon rail, fix for stale events + broken links + stale "New in Denver" + mobile nav gaps | Everything else depends on this foundation. Also clears all known bugs so the redesign launches clean. |
| 2 | `02-places-tab.md` | Places tab with neighborhood browsing hero section, category rail, intent-based sections ("Where locals go," "Date spots," "Good for groups"), vibe tags | Places is the most self-contained new tab. Builds on Phase 1 tab infrastructure. |
| 3 | `03-guides-tab-and-seed-content.md` | Guides tab with occasion pill rail, featured editor's pick hero, creator spotlight strip, duration-based sections. Includes seeding 8–12 starter guides to populate the tab. | Guides are Pulse's differentiator. Needs seed content to demo, which is why it comes after Places. |
| 4 | `04-see-all-and-detail-views.md` | Tappable "See all" views for each section (day-grouped list with filter chips), single event/place/guide detail pages, map view for Events | Detail views are an iteration on the surfaces built in Phases 1–3. Keeps Phase 1 scope tight. |

---

## Design principles (apply to every phase)

Claude Code should hold these as constraints, not suggestions:

1. **Mobile-first.** Design and test on a 375px-wide viewport before desktop. Desktop is a scaled-up version of mobile, not a separate design.
2. **Content-forward.** Hero sections, how-it-works blocks, and feature grids are removed. The homepage IS the content.
3. **Minimal chrome.** White background, lots of breathing room, color used sparingly for accents (coral `#E85D3A` for interactive elements, teal for positive signals, category-specific hues for tags). No gradients on outer containers. No drop shadows except functional focus rings.
4. **Horizontal-scroll rows by default.** Every section on the home feed uses a `display: flex; overflow-x: auto; scroll-snap-type: x mandatory` pattern with consistent card sizing. Use scroll-snap so cards snap into place on release.
5. **Cards are visual first, text second.** Large image (150–220px tall), one or two lines of metadata, nothing more. No match percentages. No ratings on the card face. Badges (Editor's Pick, Trending, Free, Just opened) earn placement only when they add signal.
6. **Sticky top chrome.** Header, search bar, tabs, and any category rail stick to the top on scroll. Bottom nav (Home, Saved, Profile) sticks to the bottom.
7. **No emoji in UI.** Use SVG icons (already referenced in the mockups). Stroke-based line icons at 22–26px for rails, 14–16px for inline elements.
8. **Typography:** Body 14–15px, titles 17–20px, weights 400 and 500 only. No bold 700/800. Sentence case throughout (not Title Case).
9. **The match percentage stays in the backend.** Continue scoring events/places for recommendation quality but never display the score on cards. Netflix-style silent ranking.

---

## Reference mockups

The mockups produced in the design session (RiNo Saturday hero, Cherry Creek Farmers Market weekend card, Thick Skin comedy, Rosetta Hall "just opened" tag, etc.) are the source of truth for visual style. Each phase PRD references the specific mockup it maps to.

Card style baseline:
- Corner radius: 14px for cards, 20px for pill-shaped badges, 28px for the search bar
- Card border: `1px solid #f0f0f0`
- Card image height: 150px (standard) or 180px (wide/featured)
- Save button: 30px circle, `rgba(255,255,255,0.85)` background, positioned top-right on the image
- Badge position: top-left on image, `rgba(255,255,255,0.92)` background, 11px font

---

## Working process recommendation

For each phase, follow this Claude Code workflow (the pattern Quest already uses):

1. Claude Code reads the phase PRD in full
2. Claude Code produces an **implementation plan** — file list, component list, data model changes, open questions — and waits for Quest's approval
3. Quest reviews, answers questions, approves
4. Claude Code implements the phase, using `PULSE_STATUS.md` to track progress across sessions
5. Quest reviews in the deployed preview, logs any issues
6. Fixes go in, phase is marked shipped in `PULSE_STATUS.md`, next phase begins

Do not skip step 2. The plan is what catches architectural mistakes before they become code.

---

## What is explicitly NOT in scope for this redesign

To keep scope tight:

- Community features (profiles, groups, voting on events). These exist in the current codebase and should be left alone for now; return to them in a later phase.
- The existing 8-step onboarding. A separate PRD for the 6-question psychographic onboarding already exists; those two efforts interlock but are sequenced separately.
- Badges, weekly wrap-ups, curator dashboards. Keep them functional; don't redesign them.
- Premium tier / monetization surfaces. Out of scope here.
- Native iOS/Android apps. This is a responsive web redesign that behaves like a mobile app.
- AI-powered natural language search. The search bar in this redesign supports autocomplete against categories; full conversational search is a future phase.

---

## Success criteria for the overall redesign

Quest should be able to say "yes" to these after all four phases ship:

1. Someone who's never seen Pulse lands on the home page and understands the product in under 5 seconds.
2. A first-time mobile visitor can browse Denver content without signing up.
3. There are zero stale events (anything past start date/time) visible anywhere in the feed.
4. Every card click-through leads somewhere — no broken links, no white screens.
5. Jensen (or Haleigh, or Maggie) can be sent a guide link from their phone and have the guide render beautifully as a shareable artifact.
6. The app feels editorial, not algorithmic. Someone should think "whoever made this has taste," not "this is a database with pictures."

---

## How to read these PRDs

Each phase PRD is structured as:
- **TL;DR** — one-paragraph summary
- **What we're building** — the surfaces and components
- **Data model changes** — schema/Prisma edits if any
- **Bug fixes folded into this phase** (Phase 1 only)
- **UI specs** — component-by-component detail
- **Acceptance criteria** — what "done" means
- **Open questions** — decisions for Quest to make before coding starts
