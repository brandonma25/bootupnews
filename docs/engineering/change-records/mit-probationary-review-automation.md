# MIT Probationary Review Automation

Date: 2026-04-20

Governed feature: `PRD-42` (`docs/product/prd/prd-42-source-governance-and-defaults.md`)

## Purpose

MIT Technology Review is the only probationary runtime source. Before considering removal, promotion, or a second probationary source such as Foreign Affairs, the team needs repeated evidence entries rather than one-off manual checks.

This automation collects a daily, repo-safe MIT review snapshot and posts it to GitHub Issue #70, `MIT probationary runtime review`.

## Implementation

- Script: `scripts/mit-probationary-review.mjs`
- Workflow: `.github/workflows/mit-probationary-review.yml`
- Target issue: `#70`
- Schedule: daily GitHub Actions cron at 13:20 UTC
- Manual trigger: `workflow_dispatch`

The script reuses the existing donor registry and donor adapter files as the source of truth for:

- `PROBATIONARY_RUNTIME_FEED_IDS`
- `DEFAULT_DONOR_FEED_IDS`
- MIT Technology Review's existing donor feed metadata

It does not create a parallel donor integration path and does not change runtime source configuration.

## Posted Evidence

Each issue comment uses the agreed review template and includes:

- UTC date/time
- environment label
- no-argument runtime source-resolution status from existing registry wiring
- probationary and resolved probationary source IDs
- MIT feed reachability
- MIT item count observed
- top MIT item titles
- freshness of top items
- conservative signal-quality judgment
- duplication/noise notes
- contribution usefulness
- `insufficient evidence` as the default decision

## Safety Boundary

The issue comment intentionally omits feed URLs, credentials, cookies, headers, tokens, emails, user IDs, and registry dumps. The workflow validates the generated comment against restricted patterns before posting.

The automation does not:

- activate or deactivate sources
- change MVP defaults
- change donor fallback defaults
- change source-policy boosts
- expose a public endpoint
- make product decisions

## Human Judgment Still Required

The daily comment is evidence, not a decision. A human reviewer must still decide whether MIT should remain probationary, be removed, or whether Foreign Affairs should be evaluated as a future one-source activation candidate.

The script uses conservative rule-based judgment. When automatic editorial assessment is uncertain, it leaves the decision as `insufficient evidence`.

## Manual Trigger

After this workflow is merged to the default branch:

1. Open GitHub Actions.
2. Select `MIT Probationary Runtime Review`.
3. Choose `Run workflow`.
4. Use `dry_run: true` to generate the review payload without posting a comment.
5. Use `dry_run: false` only when an Issue #70 comment should be posted.

## Duplicate Guard

Before posting, the workflow checks recent Issue #70 comments for an automated review entry with today's UTC date. If one exists, it skips posting to avoid obvious same-day retry spam.

## Schedule Activation

GitHub scheduled workflows run only from workflow files present on the repository's default branch. This workflow will not run on a PR branch merely because the file exists there. It becomes scheduled only after the workflow file is merged into `main`, assuming GitHub Actions are enabled for the repository.

To disable or change the schedule later, edit the `cron` entry in `.github/workflows/mit-probationary-review.yml` or disable the workflow in GitHub Actions.
