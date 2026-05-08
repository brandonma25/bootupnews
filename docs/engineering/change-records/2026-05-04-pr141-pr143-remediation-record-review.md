# PR141 / PR143 Remediation Record Review

## Summary

This follow-up closes the PR #191 audit gap for PR #141 and PR #143. Both PRs were meaningful remediation work with runtime or persistence behavior changes, so both now have concise canonical bug-fix records under `docs/engineering/bug-fixes/`.

Google Sheet and Google Work Log records were not used as canonical inputs.

## PRs Reviewed

| PR | Existing documentation path | Bug-fix record created? | Canonical path | Rationale |
| --- | --- | --- | --- | --- |
| #141, `chore(validation): align controlled draft cap with Core/Context slate` | `docs/engineering/testing/controlled-core-context-draft-cap-7-remediation.md` | yes | `docs/engineering/bug-fixes/controlled-core-context-draft-cap-7-remediation.md` | The PR remediated a real controlled-runner precondition blocker by changing `draft_only` cap behavior for the approved Core/Context slate. The testing record remains the detailed validation note, but the root cause/fix/PR metadata now belongs in the canonical bug-fix lane. |
| #143, `chore(remediation): preserve WITM metadata in draft persistence` | `docs/engineering/testing/witm-metadata-draft-persistence-remediation.md` | yes | `docs/engineering/bug-fixes/witm-metadata-draft-persistence-remediation.md` | The PR fixed metadata loss in replay and draft persistence that could make a rewrite-required non-live draft row appear passed. The detailed testing record remains valid, but this remediation requires a canonical bug-fix record. |

## Evidence Reviewed

- GitHub PR #141 metadata, body, changed files, head SHA, and merge SHA.
- GitHub PR #143 metadata, body, changed files, head SHA, and merge SHA.
- Existing testing/remediation records under `docs/engineering/testing/`.
- Merge diffs for PR #141 and PR #143.
- PR #191 audit and branch cleanup reconciliation records.

## Outcome

- Created `docs/engineering/bug-fixes/controlled-core-context-draft-cap-7-remediation.md`.
- Created `docs/engineering/bug-fixes/witm-metadata-draft-persistence-remediation.md`.
- Kept the existing testing records as detailed validation evidence.
- Updated the PR #191 audit follow-up language to mark this gap closed.
- Updated branch cleanup reconciliation paths for PR #141 and PR #143 to point at the new canonical bug-fix records.

## Explicit Non-Actions

- No Google tracker updates.
- No Google Work Log updates.
- No tracker-sync fallback files.
- No runtime code changes.
- No workflow or script changes.
- No production validation.
- No branch deletion.

## Remaining Follow-Up

- None for PR #141 or PR #143 remediation-record routing.
