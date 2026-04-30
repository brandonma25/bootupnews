# Tracker Sync Fallback - PRD-53 Card-Level Editorial Authority Amendment

## Reason

Direct Google Sheets write/readback is unavailable from this workspace. Use this payload to update the existing governed `Features Table` row manually. Do not create a duplicate governed row.

## Target

- Workbook: `Features Table`
- Sheet: `Sheet1`
- Lookup key: `PRD-53`
- Canonical PRD file: `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

## Branch And Scope

- Date: 2026-04-30
- Branch: `codex/prd-53-card-level-editorial-authority`
- Worktree: `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-card-level-editorial-authority`
- Type: Feature / PRD-53 amendment
- Summary: Documentation-only amendment to the canonical PRD-53 file defining card-level editorial authority for accepting, rejecting, holding, replacing, promoting, demoting, reordering, composing, validating, publishing, and rolling back a reviewed `5 Core + 2 Context` final slate.

## Manual Sheet1 Payload

Update the existing governed PRD-53 row:

| Field | Value |
| --- | --- |
| Layer | Experience |
| Feature Name | Signals admin editorial layer |
| Priority | High |
| Status | In Review |
| Description | Private admin editor workflow for reviewing, editing, approving, composing, validating, and publishing a guarded Core + Context final slate with card-level editorial authority |
| Owner | Codex |
| Dependency | Auth and session routing, Signal Display Cap, Why It Matters Quality |
| Build Order | 53 |
| Decision | build |
| Last Updated | 2026-04-30 |
| prd_id | PRD-53 |
| prd_file | docs/product/prd/prd-53-signals-admin-editorial-layer.md |

## Validation Status

- PRD/design only.
- No code implementation.
- No database mutation.
- No public publish.
- No cron, `draft_only`, or `dry_run` execution.
- No source governance, source expansion, ranking-threshold, WITM-threshold, Vercel, URL, domain, or environment change.

## Verification Needed

After the live row is updated, reread the row and confirm:

- `Status` is normalized as `In Review`.
- `prd_file` exactly matches `docs/product/prd/prd-53-signals-admin-editorial-layer.md`.
- The update applied to the existing PRD-53 row only.
- No duplicate governed row was created.

## Notes

- `docs/product/feature-system.csv` was not edited in this branch because open PR #98 currently touches that hotspot file. The existing repo row already maps `PRD-53` to the canonical PRD-53 file.
- Move to `Merged` only after the PR merges to `main`.
- Move to `Built` only after production verification succeeds.
