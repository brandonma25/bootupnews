# PRD-24 — GitHub Sheets Governance Automation

## Current Status
- Status: Deprecated as an active source-of-truth workflow on 2026-05-04.
- Implementation status: active workflow, script, and targeted tests decommissioned on 2026-05-04.
- Replacement source of truth: GitHub repo documentation plus `docs/product/feature-system.csv`.
- Google Sheet / Google Work Log records are historical reference inputs only.
- Do not use this PRD to justify routine Google Sheet writes, Intake Queue writes, or tracker-sync fallback creation.

## Objective
- Historical objective: build a GitHub-to-Google-Sheets automation layer that kept governed feature status in sync and quarantined unmapped work for review.
- Current objective: preserve the historical implementation context while making clear that GitHub repo documentation is now canonical.

## User Problem
- Feature status is currently too easy to drift between pull requests, repo docs, and planning. Merged work needs a reliable post-merge status update, while unplanned work needs a safe intake path instead of being silently folded into the governed feature table.

## Historical Scope

### Historical Must Do
- Add a post-merge GitHub Action that updates `Features Table` `Sheet1` to `Merged` only when exactly one governed `Record ID` match exists.
- Add Intake Queue automation for unmapped, missing, duplicate, or ambiguous PR merges.
- Add a guarded production-verification promotion path from `Merged` to `Built`.
- Update permanent repo governance so future Codex sessions preserve `Sheet1` versus `Intake Queue` separation.
- Add automated tests for parsing, unique-match updates, intake capture, duplicate prevention, retry behavior, and Built promotion.

### Historical Must Not Do
- Do not auto-create new governed rows in `Sheet1` from GitHub events.
- Do not mark `Built` directly on merge.
- Do not silently ignore ambiguous or failed writes.
- Do not require secrets to live in repo code or docs.

## Success Criteria
- Historical criteria for the retired external sync path:
- A merged PR targeting `main` updates the matching governed row to `Merged` when the PR maps cleanly to exactly one `Record ID`.
- Unmapped or ambiguous merges append one review row to `Intake Queue` instead of touching `Sheet1`.
- Production verification can promote `Merged` to `Built` only after the verification workflow succeeds.
- Future Codex sessions inherit the governance rules through repo docs and templates.

## Done When
- Historical implementation context remains documented.
- Active governance docs and templates no longer instruct agents to update Google Sheets or create routine tracker-sync fallback files.
- The active workflow, scripts, and targeted tests have been removed from the repo.
- Secret cleanup, if needed, happens outside the repo and is not claimed by this PRD.

## Dependencies / Risks
- Historical dependency: GitHub secrets `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_SHEET_ID`.
- Historical dependency: the target workbook kept `Sheet1` and `Intake Queue` available with the expected schema.
- Current risk: GitHub repository settings may still contain old Google Sheets secrets even though repo workflows no longer use them. Secret cleanup requires repository settings access and is outside repo-file scope.

## Evidence and Confidence
- Repo evidence used:
  - existing release automation workflows and route-probe scripts
  - repo governance hotspot rules for `AGENTS.md` and protocol docs
- Confidence:
  - High confidence in the merge-to-`Merged` flow
  - Medium confidence in automatic `Merged -> Built` timing because it depends on production verification configuration and commit-to-PR association outside local-only testing
