# CI Fast Path and Emergency Bypass Protocol

## Purpose
- Keep protected `main` checks reliable while avoiding unnecessary heavy CI for narrowly approved upload-only changes.
- Define the admin-only emergency bypass pattern for cases where protected-branch governance itself blocks an urgent production repair.

## Scope
- Applies to pull requests targeting `main`.
- This is governance and CI remediation, not a product feature workflow.
- This protocol does not weaken normal branch protection or replace required CI design fixes.

## Upload-Aware Required Check Fast Path
- The PR Gate workflow must still run for every pull request.
- Do not use workflow-level `paths`, `paths-ignore`, branch filters, or commit-message skip annotations for required checks.
- The workflow classifies the actual PR diff inside the workflow, then uses job-level conditions for heavy jobs.
- Skipped heavy jobs are acceptable only after the classifier has selected the upload-only path; a skipped workflow is not acceptable because required checks can remain pending.

### Approved Upload-Only Allowlist
- Path prefix: `public/uploads/`
- File statuses: added or modified only.
- Extensions: `.avif`, `.gif`, `.ico`, `.jpeg`, `.jpg`, `.png`, `.webp`
- Maximum file size: 10 MiB per file.

### Explicitly Not Upload-Only
- Any path outside `public/uploads/`.
- Deletions, renames, copies, type changes, conflicts, or malformed diff entries.
- SVG, HTML, CSS, JavaScript, TypeScript, JSON, YAML, lockfiles, configuration, scripts, source code, workflows, docs, Supabase files, or governance files.
- Any uncertain or unparseable diff.

### Required Logging
The classifier must emit exactly one of these decisions:
- `Upload-only change set detected; running lightweight validation path`
- `Non-upload changes detected; running full CI`
- `Ambiguous or unapproved changes detected; running full CI`

### Lightweight Validation
For upload-only changes, the workflow verifies the changed file list, allowlisted paths and extensions, file existence, and file size. It does not claim lint, test, build, Playwright, auth, SSR, preview, or production coverage.

## Normal Merge Path
- Protected `main` requires the normal PR checks and human approval.
- Product, engineering, remediation, and governance work must follow the full merge path unless it is classified as approved upload-only by the workflow.
- A bypass must not be used to avoid fixing broken CI, missing docs, missing tests, or branch freshness problems.

## Emergency Bypass Criteria
An emergency bypass may be considered only when all of the following are true:
- There is an urgent production-impacting issue or release-blocking governance failure.
- Normal branch protection is preventing a time-sensitive repair.
- The change has been reviewed by an authorized human approver.
- The bypass action is narrower and safer than waiting for the normal checks to recover.
- A follow-up remediation plan exists before the bypass is executed.

## Authorized Actors
- Authorization: repository owner, release owner, or another explicitly delegated maintainer.
- Execution: only actors configured as bypass actors in GitHub rulesets or branch protection for `main`.
- Routine contributors and automation should not have emergency bypass authority by default.

## Approval Requirements
- Record the rationale in the PR, incident note, or release coordination thread.
- Identify the authorizing person and the executing person.
- State which required check or protection is being bypassed and why normal recovery is not viable in time.
- Confirm no secrets, credentials, sensitive logs, or unsafe operational details are included.

## Execution Steps In GitHub
- Open repository settings for branch protection or rulesets protecting `main`.
- Confirm normal required checks remain configured.
- Confirm bypass actors are narrowly scoped to the approved admin or maintainer actors.
- Use the GitHub UI bypass affordance only for the approved emergency PR or merge action.
- Do not remove required checks, broaden actor permissions, or turn the bypass into a standing developer workflow.

## Audit And Logging Expectations
- Leave the PR history intact.
- Record the reason, authorizer, executor, impacted checks, and follow-up owner.
- Preserve GitHub audit log visibility by using named actors, not shared credentials.
- Add or update an incident, bug-fix, testing, or change-record document when the bypass reflects a meaningful operational failure.

## Post-Incident Remediation Checklist
- Restore or confirm normal protections immediately after the emergency action.
- Run the full local and PR validation path as soon as technically possible.
- Repair the underlying CI, ruleset, or branch-protection issue.
- Document what happened, why bypass was justified, and what prevents recurrence.
- Do not mark the work complete until follow-up validation and documentation are closed.
