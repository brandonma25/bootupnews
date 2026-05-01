# Tracker Sync Fallback - MVP Measurement Instrumentation

Date: 2026-05-01
Branch: `codex/mvp-measurement-instrumentation`
Readiness label: `ready_for_final_launch_readiness_qa`

## Manual Tracker Update Payload

| Field | Value |
| --- | --- |
| Record | Product Position - MVP Success Criteria |
| Status | In Review |
| Decision | keep |
| PRD File | Not applicable; instrumentation is remediation/product analytics support for the approved Product Position and PRD-53 controlled publish completion. |
| Latest validation packet | `docs/engineering/change-records/mvp-measurement-instrumentation.md` |
| Notes | Adds privacy-conscious MVP measurement instrumentation for day-7 return, page views, Signal/Card depth engagement proxies, source/details clicks, and future comprehension prompt events. Adds additive `mvp_measurement_events` schema, soft-failing event API, page/interaction instrumentation, summary helper, focused tests, and privacy notes. Does not add a visible comprehension prompt UI because no existing prompt pattern exists; that user-facing prompt remains pending explicit product approval or PRD coverage. No cron, publish, `draft_only`, pipeline write-mode, source/ranking/WITM threshold changes, Phase 2 architecture, or personalization. |
| Next task | Review and merge this PR, apply the additive measurement schema through the authorized schema process, then run final launch-readiness QA. Cron remains last and separately authorized. |

## Source Of Truth

- Product Position - MVP Success Criteria
- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`
- `docs/operations/controlled-cycles/2026-05-01-prd-53-authorized-second-controlled-publish.md`
- `docs/engineering/change-records/mvp-measurement-instrumentation.md`

## Validation

Local validation passed:

- `git diff --check`
- `npm run lint`
- `npm run test`
- `npm run build`
- `python3 scripts/validate-feature-system-csv.py`
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/mvp-measurement-instrumentation --pr-title "MVP measurement instrumentation"`
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/mvp-measurement-instrumentation --pr-title "MVP measurement instrumentation"`
- `PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:chromium`
- `PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:webkit`
