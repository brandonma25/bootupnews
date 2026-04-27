# Scheduled Fetch Pause / Quality Gate Scope Remediation

Date: 2026-04-27
Change type: Remediation / alignment
Source of truth: Product Position, PRD-35, PRD-53, Action 2 quality-gate remediation, user clarification that the scheduled fetch pause is intentional.

## Summary

Commit `aded79bc0e574a730d02a5455be1196bf7d206d7` was reviewed to separate the intentionally paused scheduled fetch from the editorial why-it-matters quality gate. The commit did not change `vercel.json`, the `/api/cron/fetch-news` route, the cron runner, or ingestion pipeline files. It did revert PR #119 quality-gate enforcement across editorial approval, individual publish, bulk publish, public read filtering, and validation tests.

This remediation restores the why-it-matters quality gate without re-enabling or modifying the scheduled 6 PM Taiwan fetch/new-source ingestion path.

## Behavior

- Approval revalidates human-edited why-it-matters copy and keeps invalid rows in `needs_review` with `requires_human_rewrite` validation details.
- Individual publish and bulk Top 5 publish revalidate the exact text that would become public copy before publication.
- Public readers suppress rows explicitly marked `requires_human_rewrite`.
- Editorial UI keeps publish affordances blocked when a row requires rewrite and surfaces the stored failure details.
- The validator now catches malformed generated endings such as dangling comparison phrases ending in `rather than.` and title/subject mangling such as `Chinas matters`, `Can gives`, and `How is not`.

## Scope Boundaries

- Does not re-enable the scheduled 6 PM Taiwan fetch.
- Does not modify cron route, ingestion, ranking, clustering, or template generation logic.
- Does not modify Action 1 homepage ranking behavior.
- Does not introduce LLM or external API calls.
- Does not remove `newsweb2026@gmail.com` from production admin access.
- Does not create a new canonical PRD.

## Follow-Up

Historical published rows that predate quality-gate enforcement still need explicit cleanup or rewrite before launch readiness can be claimed.
