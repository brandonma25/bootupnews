# Tracker Sync Fallback — Pipeline Article Candidates

- Date: `2026-04-26`
- Branch: `codex/pipeline-article-candidates`
- Status: `implemented-local`
- Owner: `Codex`
- Canonical PRD: `not required`

## Manual Payload

- Title: `Pipeline article candidate persistence`
- Summary: `Added a Supabase-backed backend capture layer for all normalized article candidates entering the cluster-first pipeline, including run ID, source metadata, canonical URL, keywords/entities, stage reached, cluster assignment, ranking score, surfaced flag, and known drop reason.`
- Source of truth: `Signal Formation Engine Audit (Codex, April 2026)` remediation gap, with `Boot Up Product Position` Phase 2 ranking calibration and delta detection as secondary context.
- Docs:
  - `docs/engineering/change-records/2026-04-26-pipeline-article-candidates.md`
  - `docs/engineering/testing/2026-04-26-pipeline-article-candidates.md`
- Validation:
  - `npm install`
  - `npx vitest run src/lib/pipeline/index.test.ts`
  - `python3 scripts/release-governance-gate.test.py`
  - `python3 scripts/validate-documentation-coverage.py`
  - `python3 scripts/release-governance-gate.py`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- Human preview gate still required:
  - verify preview pipeline execution can write to `public.pipeline_article_candidates` using service-role Supabase configuration
  - confirm no public read access exists for the candidate table
