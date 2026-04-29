# Public Context Signals Visibility Remediation

- Date: 2026-04-30
- Effective change type: remediation / public surface alignment
- Canonical PRD required: no
- Branch: `codex/public-context-signals-visibility-remediation`
- Object level: Surface Placement

## Source Of Truth

- April 29 controlled manual publish verification: `april_29_controlled_manual_publish_verified`
- Product Position: Boot Up is a seven-story daily briefing with Top 5 Core Signals plus Next 2 Context Signals.
- Existing production state after the controlled manual publish: seven `2026-04-29` `signal_posts` rows are `published`, `is_live=true`, and have `published_at` populated.

## Root Cause

The public `/signals` route was still wired to a Top-5-only public reader:

- `getPublishedSignalPosts()` loaded only five live published rows.
- The `/signals` route rendered only when exactly five posts were returned.
- Rank 6 and rank 7 Context rows were already live and published, but they were not included in the public `/signals` Surface Placement.

This was a public-surface alignment issue, not a publishing, source, schema, ranking, WITM-threshold, or pipeline issue.

## Remediation

- Expanded the public published Signal read size from Top 5 to Top 5 Core plus Next 2 Context.
- Kept public reads gated by:
  - `is_live=true`
  - `editorial_status='published'`
  - `published_at IS NOT NULL`
  - rank below the public seven-Signal slate boundary
- Updated `/signals` to render separate sections:
  - Top 5 Core Signals
  - Next 2 Context Signals
- Preserved the homepage Top 5 Core placement while keeping the already-published Context rows available to public ranked data.

## Guardrails

- No database rows were inserted, updated, deleted, approved, rejected, or published by this PR.
- No cron, `draft_only`, `dry_run`, or pipeline write-mode was run.
- No source-governance/source-list files were changed.
- No ranking thresholds or WITM thresholds were changed.
- No schema changes were made.
- No URL/domain/env/Vercel settings were changed.
- No secrets were used or exposed.

## Validation

Passed in this branch:

- `git diff --check`
- `npm run lint`
- `npm run test -- src/lib/signals-editorial.test.ts`
  - 1 file / 35 tests
- `npm run test -- src/app/signals/page.test.tsx src/lib/data.test.ts src/app/page.test.tsx`
  - 3 files / 8 tests
- `npm run test -- src/components/landing/homepage.test.tsx`
  - 1 file / 23 tests
- `npm run build`
- `python3 scripts/release-governance-gate.py --branch-name codex/public-context-signals-visibility-remediation --pr-title "fix(signals): render published Context rows on public signal surface" --diff-mode local`

The release-governance gate classified the change as `bug-fix` and accepted the matching documentation lane.

## Readiness

Expected readiness after local validation and PR creation:

```text
ready_for_context_visibility_pr_review
```
