# PRD 3 Phase 7 — End-to-End Verification

**Date prepared:** 2026-04-20
**Status:** Template, ready to fill after first live orchestrator run

## 1. Pre-flight

- [ ] `OPENAI_API_KEY` set in Vercel (Production + Preview + Development)
- [ ] `GOOGLE_PLACES_API_KEY` set (already in use by Places pipeline)
- [ ] `CRON_SECRET` set
- [ ] `DISCOVERIES_OPENAI_MODEL` optional override (defaults `gpt-5.4-mini`)
- [ ] Latest deploy is green on pulse-three-eta.vercel.app
- [ ] Migrations applied: `20260420130000_phase0_discovery_schema`,
      `20260420140000_phase1_llm_research_run`,
      `20260420150000_phase6_discovery_run`
- [ ] Editorial seed run: `npm run discoveries:seed` (13 records)

## 2. Smoke runs (cheap, in order)

```
npm run discoveries:niche          # pure fetch/parse, ~20s, no cost
npm run discoveries:research       # 6 OpenAI calls w/ web_search, ~3–6 min
npm run discoveries:reddit -- --max=2   # ~24 OpenAI calls + Reddit fetches
```

Record:
- [ ] niche: ____ candidates, ____ errors
- [ ] research: ____ candidates, ____ errors
- [ ] reddit: ____ candidates, ____ errors

## 3. Full orchestrator run (via endpoint)

```
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://pulse-three-eta.vercel.app/api/discoveries/refresh
```

Or wait for the Sunday 3am UTC cron. Record:
- [ ] `totalUpserted`: ____
- [ ] `totalUpdated`: ____
- [ ] Duration: ____ min
- [ ] Any per-pipeline FAILED status?

## 4. Final counts report

Query these directly (psql / Prisma Studio) **after the full run settles**:

```sql
-- Total ACTIVE Discoveries (target after first run: 30+ incl. 13 seeds)
SELECT COUNT(*) FROM "Discovery" WHERE status = 'ACTIVE';

-- Subtype breakdown
SELECT subtype, COUNT(*) FROM "Discovery"
WHERE status = 'ACTIVE' GROUP BY subtype;

-- Source breakdown
SELECT "sourceType", COUNT(*) FROM "Discovery"
WHERE status = 'ACTIVE' GROUP BY "sourceType";

-- Region breakdown
SELECT region, COUNT(*) FROM "Discovery"
WHERE status = 'ACTIVE' GROUP BY region;

-- Unverified queue
SELECT COUNT(*) FROM "Discovery" WHERE status = 'UNVERIFIED';
-- Flag if > 20

-- Rejected as dated events (lifetime)
SELECT SUM("rejectedAsEventCount") FROM "DiscoveryRun";
-- Flag if > 30% of raw (indicates Event-vs-Gem rule needs tightening)
```

Fill in:
- [ ] Active Discoveries total: ____
- [ ] HIDDEN_GEM / NICHE_ACTIVITY / SEASONAL_TIP: ____ / ____ / ____
- [ ] EDITORIAL / LLM_RESEARCH / REDDIT / NICHE_SITE: ____ / ____ / ____ / ____
- [ ] DENVER_METRO / FRONT_RANGE / MOUNTAIN_GATEWAY / MOUNTAIN_DEST: ____ / ____ / ____ / ____
- [ ] UNVERIFIED queue: ____ (> 20 triggers prompt/verification tuning)
- [ ] Rejected-as-event ratio: ____% (> 30% triggers rule tightening)

## 5. Quality spot-check

Review first 20 auto-generated Discoveries (skip editorial seeds):

```sql
SELECT id, title, description, subtype, category, region, "qualityScore"
FROM "Discovery"
WHERE "sourceType" != 'EDITORIAL' AND status = 'ACTIVE'
ORDER BY "createdAt" DESC
LIMIT 20;
```

For each, answer:
- [ ] Feels specific and local (not generic): ____/20
- [ ] Pulse voice lands: ____/20
- [ ] Any hallucinations that slipped past verification: ____/20
- [ ] Any that are really dated events in disguise: ____/20

Decision gate: if > 3 of 20 feel off, tune prompts in
`lib/discoveries/pipelines/llm-research.ts` (system prompt) and/or
`lib/discoveries/enrichment.ts` (enrichment prompt) before wider rollout.

## 6. Visual verification

Screenshots:
- [ ] `/discoveries` top-of-feed (Near Me scope, All subtype)
- [ ] `/discoveries/[id]` detail page
- [ ] `/admin/scrapers` dashboard after first cron run populates tables
- [ ] `/admin/discoveries/review` with sample UNVERIFIED candidates (may be 0)

## 7. Post-verification actions

- [ ] If selectors in `niche-sites.config.ts` returned 0 for a site, either
      tune the selectors or flip `enabled: false` for that entry
- [ ] If LLM pipeline prompts need tuning, edit `RESEARCH_QUERIES` or
      `DISCOVERY_SYSTEM_PROMPT` directly in `llm-research.ts`
- [ ] If quality scores trend too low (< 7 average), soften enrichment prompt
- [ ] Commit the tuning changes with message linking to this audit report
