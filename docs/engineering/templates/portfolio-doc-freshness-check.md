# Portfolio Doc Freshness Check

## Purpose

Use this prompt when Boot Up's public narrative docs may need a small update after a meaningful milestone, release, or batch of merged PRs.

This is not a per-PR chore. Most operational evidence belongs in PR bodies, GitHub metadata, or external/private archives.

## When To Run

- After a meaningful release or milestone.
- After roughly 5-10 merged PRs that changed product behavior, public positioning, or durable engineering decisions.
- Before a portfolio/interview review pass.
- When README.md, DECISIONS.md, or docs/portfolio/PR_CLUSTERS.md appears stale.

## Prompt

```text
Review merged PRs since <date or PR number>. Keep README.md, DECISIONS.md, and docs/portfolio/PR_CLUSTERS.md current only if the public product narrative, durable decisions, or implementation-history clusters changed.

Rules:
- Do not add operational logs.
- Do not duplicate PR bodies.
- Do not rewrite history to look cleaner.
- Update README.md only for public product promise, live behavior, major capability, or current-state changes.
- Update DECISIONS.md only for durable product or engineering decisions, tradeoffs, or reversals.
- Update docs/portfolio/PR_CLUSTERS.md only to map meaningful PRs into existing or new implementation-history clusters.
- If no update is needed, say so and make no edits.

Report:
- PR range reviewed.
- Files changed, if any.
- Why each changed file needed a durable narrative update.
- Any stale operational detail that should stay in PR metadata rather than public docs.
```

## Default Outcome

If the reviewed PRs only contain routine fixes, validation, branch cleanup, CI repair, or operational closeout, the correct result is usually: no portfolio-doc update needed.
