# PRD 2 Phase 7 — End-to-End Verification

Date: 2026-04-19

## Counts against prod (Neon `neondb`)

### Future events by region
| Region | Count |
|---|---|
| FRONT_RANGE | 271 |
| DENVER_METRO | 83 |
| MOUNTAIN_GATEWAY | 14 |
| MOUNTAIN_DEST | 11 |
| **Total** | **379** |

### Future events by town (non-null `townName`)
| Town | Count |
|---|---|
| Morrison | 171 |
| Boulder | 56 |
| Colorado Springs | 34 |
| Estes Park | 13 |
| Golden | 10 |
| Telluride | 3 |
| Vail | 3 |
| Steamboat Springs | 2 |
| Aspen | 1 |
| Beaver Creek | 1 |
| Breckenridge | 1 |
| Winter Park | 1 |

### Future events by source
| Source | Count |
|---|---|
| red-rocks | 171 |
| chautauqua | 56 |
| pulse-curated | 41 |
| pikes-peak-center | 34 |
| do303 | 22 |
| visit-estes-park | 13 |
| llm-research-mtn | 12 |
| visit-denver | 11 |
| visit-golden | 10 |
| westword | 8 |
| 303magazine | 1 (legacy; scraper disabled) |

## PRD 2 §7.2 target checks

- ✅ **Total regional events ≥ 150** — actual: 296 (`FRONT_RANGE + MOUNTAIN_GATEWAY + MOUNTAIN_DEST`)
- ⚠️ **Every Tier 1/2 town with ≥ 5 future events** — Boulder (56), Colorado Springs (34), Estes Park (13), Golden (10) pass. **Fort Collins (0)**, **Nederland (0)**, **Idaho Springs (0)**, **Georgetown (0)**, **Winter Park (1)**, **Evergreen (0)** fail — all are sources we deferred to the JS-rendered Puppeteer follow-up.
- ⚠️ **Tier 3 weekend-trip events ≥ 20** — actual: 11 (`MOUNTAIN_DEST`). Below target; reflects that only Steamboat has a structured scraper and the LLM research pass is intentionally selective (12 candidates last run). Weekly LLM cron will accumulate over time.
- ⚠️ **`worthTheDriveScore` populated** — actual: 0. Field was added in Phase 4 but no nightly cron has fired since the schema change. Will populate on the next run (tonight 11:00 UTC) or via manual `/api/admin/scrape-now` after PRD 2 merges.

## PRD 2 §7.3 visual verification

Deferred to Vercel preview once PRs #6–#11 merge. Spot-check targets:
- Events tab shows "Near Denver" / "All" filter chip at top
- Toggling "All" surfaces MOUNTAIN_DEST content; "Near Denver" hides it
- A Red Rocks card reads "Morrison · 30 min · $$$"
- A Steamboat card reads "Weekend trip · Steamboat Springs · 180 min · $$$"
- "Outside the city" section shows mixed day-trip content sorted by worth-the-drive
- "Worth a weekend" section only appears when ≥3 MOUNTAIN_DEST events score ≥ 8

## PRD 2 §7.4 quality spot-check

Top LLM-research sample (from 2026-04-19 run, see PR #7):
- GoPro Mountain Games (Vail, 2026-06-04) — real; https://mountaingames.com/
- Vail Craft Beer Classic (2026-06-12) — real; discovervail.com
- Mountainfilm Telluride (2026-05-21) — real; mountainfilm.org
- Telluride Balloon Festival (2026-06-05) — real; tellurideballoonfest.com
- Steamboat Marathon (2026-06-07) — real; steamboatchamber.com
- Ride for the Pass Aspen (2026-05-16) — real; independencepass.org

All 12 LLM candidates had verifiable source URLs; 0 rejected for missing citations. The prompt's "drop if no source URL" guard is working.

## Action items after merge

1. **Set ANTHROPIC_API_KEY in Vercel** — not needed (using OpenAI). `OPENAI_API_KEY` already set and covers both enrichment and LLM research.
2. **First post-merge nightly cron** (2026-04-19 23:00 UTC) — will populate `ScraperRun` table and `worthTheDriveScore` on new inserts. Check `/admin/scrapers` the next morning.
3. **Weekly LLM research** — first post-merge Tuesday (2026-04-21 08:00 UTC) fires automatically. Budget ~$0.30–$1.50 per run.
4. **Visual verification** — take screenshots of the sections listed in §7.3 and append to this report or a follow-up.
5. **Defer to follow-up PRs**: JS-rendered regional scrapers, sort-weight tune, Simpleview helper refactor, Ticketmaster/Eventbrite keys, ScraperRun alerting.
