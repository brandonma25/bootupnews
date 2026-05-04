# GitHub Sheets Governance Automation — Retired Compatibility Record

## Purpose
- Preserve historical implementation context for the former GitHub-to-Google-Sheets sync path.
- This document is no longer an active closeout protocol.
- GitHub repo documentation is now canonical for bug-fix history, remediation history, branch-cleanup history, PRD/feature governance metadata, validation records, and release/governance records.
- `docs/product/feature-system.csv` is the repo-side feature/PRD control file.
- Google Sheet / Google Work Log records are historical reference inputs only.
- Codex must not update Google Sheets, claim tracker updates, or create routine tracker-sync fallback files for closeout.

## Historical Source Model
- Workbook: `Features Table`
- Governed feature table tab: `Sheet1`
- Intake / quarantine tab: `Intake Queue`
- These are historical external references, not current source-of-truth systems.
- Do not create new governed Google rows or Intake Queue entries from routine GitHub closeout.

## Schema Enforcement
- The implementation reads both tabs by header name, not by hard-coded column letter alone.
- The implementation still knows the real live header layout so it can validate drift before writing.
- Missing required headers, duplicate header names, or missing header rows are blocking failures.
- Header reordering is tolerated as long as the expected header names still exist exactly once.
- Blank trailing rows are ignored.
- Rows without a valid governed `Record ID` are never treated as writable governed rows.

## Actual Live Schema

### Sheet1
- `A Row ID`
- `B Build Order`
- `C Record ID`
- `D Feature Name`
- `E Layer`
- `F Feature Type`
- `G Parent System`
- `H Priority`
- `I Status`
- `J Decision`
- `K Owner`
- `L Dependency`
- `M Description`
- `N PRD File`
- `O Source`
- `P Last Updated`
- `Q Notes`
- `R Execution Stage`
- `S Critical Path Flag`
- `T Build Readiness`
- `U Record Class`
- `V Priority Score`

### Intake Queue
- `A Captured At`
- `B Source`
- `C Trigger Type`
- `D PR Title`
- `E Branch Name`
- `F PR URL`
- `G Guessed Record ID`
- `H Guessed Feature Name`
- `I Suggested Type`
- `J Suggested Parent System`
- `K Suggested Priority`
- `L Review Status`
- `M Decision`
- `N Notes`
- `O Promoted Record ID`
- `P Reviewed By`
- `Q Reviewed At`

## Column Ownership and Write Rules

### Sheet1
- `Row ID`: human/governance-managed, immutable for automation.
- `Build Order`: human/governance-managed, immutable for automation.
- `Record ID`: immutable governed row key. Automation may read it for exact matching and must never rewrite it.
- `Feature Name`: human/governance-managed, never auto-modify.
- `Layer`: human/governance-managed, never auto-modify.
- `Feature Type`: human/governance-managed, never auto-modify.
- `Parent System`: human/governance-managed, never auto-modify.
- `Priority`: human/governance-managed, never auto-modify.
- `Status`: the only Sheet1 column currently managed by this automation.
- `Decision`: human/governance-managed, never auto-modify.
- `Owner`: human/governance-managed, never auto-modify.
- `Dependency`: human/governance-managed, never auto-modify.
- `Description`: human/governance-managed, never auto-modify.
- `PRD File`: human/governance-managed, never auto-modify in this automation.
- `Source`: human/governance-managed, never auto-modify.
- `Last Updated`: left human-managed in v1 and this hardening pass. Automation does not write it.
- `Notes`: left human-managed in v1 and this hardening pass. Automation does not append or overwrite it in `Sheet1`.
- `Execution Stage`: formula/computed, never write.
- `Critical Path Flag`: formula/computed, never write.
- `Build Readiness`: formula/computed, never write.
- `Record Class`: formula/computed, never write.
- `Priority Score`: formula/computed, never write.

### Intake Queue
- `Captured At`: automation-managed on append.
- `Source`: automation-managed on append.
- `Trigger Type`: automation-managed on append.
- `PR Title`: automation-managed on append.
- `Branch Name`: automation-managed on append.
- `PR URL`: automation-managed on append and used as the primary idempotency key.
- `Guessed Record ID`: automation-managed guess only, never treated as governed truth.
- `Guessed Feature Name`: automation-managed suggestion.
- `Suggested Type`: automation-managed suggestion.
- `Suggested Parent System`: automation-managed suggestion.
- `Suggested Priority`: automation-managed suggestion with default `Medium`.
- `Review Status`: automation-managed initial value `Needs Review`.
- `Decision`: human-managed, never overwritten by merge automation.
- `Notes`: automation-managed on initial append only; retries must not overwrite an existing row.
- `Promoted Record ID`: human-managed or future promotion-workflow-managed only. Current merge automation never fills it.
- `Reviewed By`: human-managed. Current merge automation never fills it.
- `Reviewed At`: human-managed. Current merge automation never fills it.

## Status Lifecycle
- `Not Built`
- `In Progress`
- `Merged`
- `Built`

### Allowed Automation Transitions
- Merge workflow:
  - `Not Built -> Merged`
  - `In Progress -> Merged`
  - `In Review -> Merged`
- Production verification workflow:
  - `Merged -> Built`

### Forbidden Automation Transitions
- Never set `Built` directly on merge.
- Never downgrade `Built`.
- Never update `Status` when the `Record ID` match is missing or ambiguous.
- Never guess a governed `Sheet1` target row.

## Record ID Parsing Rules
- Supported examples:
  - `PRD-24`
  - `prd-24`
  - `feature/prd-24-backlog-restoration-layer`
  - `fix/prd-24-something`
- Parse from PR title first, then branch name.
- Normalize to uppercase `PRD-XX`.
- If no Record ID is found, do not update `Sheet1`.

## Merge Sync Rules
- Trigger: pull request closed
- Required conditions:
  - PR was merged
  - base branch is `main`
- Required PR metadata:
  - PR title
  - branch name
  - PR URL
  - merge timestamp

### Exact-Match Governed Writes
- Match `Record ID` against `Sheet1` column `C`.
- Update only the `Status` cell resolved from the `Status` header.
- Write only when exactly one governed row matches.
- No fuzzy matching, guessed writes, partial matching, or automatic row creation in `Sheet1`.

## Intake Queue Rules
- Append to `Intake Queue` when any of these are true:
  - no Record ID was parsed
  - parsed Record ID was not found in `Sheet1`
  - duplicate `Sheet1` matches make the target ambiguous
  - merged work appears spontaneous or requires human review
- Required append defaults:
  - `Source` = `GitHub`
  - `Trigger Type` = `PR Merge`
  - `Review Status` = `Needs Review`
  - `Suggested Priority` = `Medium` unless heuristics strongly suggest another value
- Intake appends are idempotent by `PR URL + Source + Trigger Type`.
- Automation must never overwrite prior Intake Queue rows.

## Promotion Rules
- The production verification workflow may promote `Merged` to `Built` only after the route probe succeeds.
- Promotion requires:
  - successful production verification
  - a merged PR associated with the verified `main` commit
  - preference for the PR whose `merge_commit_sha` exactly matches the verified `main` commit
  - a parsed Record ID
  - exactly one governed `Sheet1` match
  - current status of `Merged`
- Promotion does not currently populate Intake Queue columns `O`, `P`, or `Q`.

## Failure Handling
- Google Sheets API failures retry on transient errors and fail loudly after retries are exhausted.
- Missing headers, duplicate headers, missing tabs, or schema drift fail loudly.
- Ambiguous row matches must not produce governed writes.
- Unknown starting `Status` values fail as explicit no-ops rather than being overwritten silently.
- Automation prefers explicit no-op reporting over silent success.

## Rollback and Recovery
1. Treat this automation as retired unless a user explicitly asks for Google-reference reconciliation.
2. If old workflows are still enabled, audit them in a separate decommissioning branch before changing scripts, secrets, or workflow behavior.
3. Do not use this document to justify routine Google Sheet writes.

## Secrets and Configuration
- Required GitHub secrets:
  - `GOOGLE_SERVICE_ACCOUNT_JSON`
  - `GOOGLE_SHEET_ID`
- Required external setup:
  - share the target workbook with the service account email as an editor
  - keep `PRODUCTION_BASE_URL` configured if automatic `Built` promotion is desired
- `PRODUCTION_BASE_URL` is optional for merge-to-`Merged` sync and required only for automatic post-merge production verification routing.
- The workflows fail clearly when required Google Sheets secrets are missing.
- No additional secret is required for v1 or this hardening pass.

## Naming Guidance
- Prefer PR titles and head branches that include the canonical `PRD-XX` identifier when the work maps to governed planning.
- Good examples:
  - `PRD-24 GitHub Sheets governance automation`
  - `feature/prd-24-github-sheets-governance-automation`
  - `fix/prd-24-status-sync-hardening`
- Work that does not map cleanly to a PRD should be documented in the correct GitHub repo lane instead of being routed to Google Intake Queue.
