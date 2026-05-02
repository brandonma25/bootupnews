# Public Schema Preflight Fallback - Bug-Fix Record

## Summary

- Problem addressed: public production pages exposed internal `signal_posts` schema-preflight failures while PRD-53 production schema alignment remained blocked.
- Root cause: public read helpers reused the full admin/editorial PRD-53 `signal_posts` schema preflight, so missing admin/final-slate columns blocked public rendering of already-published live rows.
- Effective change type: hotfix / remediation, not net-new feature work.

## Source Of Truth

- Product position: Boot Up is a curated daily intelligence briefing, not a feed.
- Public product target: Top 5 Core Signals plus Next 2 Context Signals with no false freshness.
- PRD-53: `docs/product/prd/prd-53-signals-admin-editorial-layer.md`
- PRD-53 diagnostics from PR #158 through PR #161, which record unresolved migration-history drift and missing PRD-53 production schema.

## Fix

- Split public-read schema safety from admin/publish schema readiness.
- Public read paths now check only the fields needed to render reviewed live published rows.
- Public read paths no longer require PRD-53 admin/final-slate columns:
  - `final_slate_rank`
  - `final_slate_tier`
  - `editorial_decision`
  - `decision_note`
  - `rejected_reason`
  - `held_reason`
  - `replacement_of_row_id`
  - `reviewed_by`
  - `reviewed_at`
- Admin/editorial workflows still require the full PRD-53 schema and still surface the detailed schema blocker.
- `/signals` now has a public-safe temporary-unavailable state for public read failures and no longer shows a misleading `0 signals` badge for schema failure.
- Homepage empty/error fallback sanitizes internal schema details before rendering public copy.

## Public Visibility Rules Preserved

Public rows still require:

- `is_live = true`
- `editorial_status = 'published'`
- `published_at IS NOT NULL`
- public-safe `published_why_it_matters`
- WITM validation not marked `requires_human_rewrite`

When optional PRD-53 placement fields are available, public helpers may use them for final-slate ordering and blocking decisions. When those optional fields are missing, public helpers fall back to legacy rank ordering so existing live published rows can still render safely.

## What Did Not Change

- No production migration.
- No migration-history repair.
- No production row mutation.
- No direct SQL mutation.
- No `draft_only`.
- No publish.
- No cron.
- No source, ranking, or WITM threshold change.
- No MVP measurement.
- No Phase 2 architecture.
- No personalization.
- No masking of admin/operator schema blockers.

## Validation

- `git diff --check` - passed.
- `npm run lint` - passed.
- `npm run test -- src/lib/signals-editorial.test.ts src/lib/data.test.ts src/app/signals/page.test.tsx src/app/page.test.tsx src/lib/homepage-editorial-overrides.test.ts` - passed: 5 files, 72 tests.
- `npm run test` - passed: 73 files, 575 tests.
- `npm run build` - passed.
- `python3 scripts/validate-feature-system-csv.py` - passed with pre-existing PRD slug warnings for PRD-32, PRD-37, and PRD-38.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/hotfix-public-schema-preflight-fallback --pr-title "Hotfix public schema preflight fallback"` - passed.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/hotfix-public-schema-preflight-fallback --pr-title "Hotfix public schema preflight fallback"` - passed.
- Local dev server on `http://localhost:3000` - verified with Codex computer browser inspection:
  - `/` rendered public-safe briefing-prepared copy and did not expose internal schema details.
  - `/signals` rendered `Briefing pending` and a public-safe temporary-unavailable state.
- `PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e:chromium` - passed: 33 tests.
- `PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e:webkit` - first run had one transient WebKit locator miss, immediate rerun passed: 33 tests.

## Production Note

This hotfix does not resolve production schema alignment. The next operational task remains stable read-only catalog access and database-owner review before any migration repair or apply step.

Readiness label for this hotfix:

```text
ready_for_hotfix_public_schema_preflight_fallback_review
```
