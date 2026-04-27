# Why-It-Matters Pre-Publish Quality Gate Remediation

Date: 2026-04-27
Change type: Remediation / alignment
Source of truth: Product Position, PRD-35, PRD-53, prior why-it-matters quality-gate remediation

## Summary

The existing deterministic why-it-matters validator already flags broken template output when daily signal-post candidates are inserted into `public.signal_posts`. This remediation extends enforcement to the editorial state transition: human-edited card copy must pass the same deterministic quality gate before it can be approved or published.

No new canonical PRD is required. This work aligns the existing PRD-35 quality floor and PRD-53 editorial approval flow.

## Behavior

- Draft persistence records the latest validation result for edited why-it-matters copy.
- Approval revalidates the human-edited copy and keeps failed rows in `needs_review` with explicit failure details.
- Top 5 publishing revalidates the exact text that would become `published_why_it_matters` before deactivating the old live set.
- Individual publishing revalidates the exact approved text before writing public copy.
- Public readers ignore rows explicitly marked `requires_human_rewrite`.
- Editorial UI blocks publish affordances when a row requires human rewrite and shows the stored validation details.

## Scope Boundaries

- Does not modify homepage ranking or Action 1 scoring behavior.
- Does not introduce LLM or external API calls.
- Does not modify template generation, clustering, or ranking pipelines.
- Does not treat `signal_posts` as canonical Signal identity; it remains a Surface Placement/Card-copy read model.
- Does not create a new canonical PRD.

## Production Schema Verification

Verified against the linked production Supabase project on 2026-04-27:

- `why_it_matters_validation_status`: `text`, `not null`, default `'passed'::text`
- `why_it_matters_validation_failures`: `text[]`, `not null`, default `'{}'::text[]`
- `why_it_matters_validation_details`: `text[]`, `not null`, default `'{}'::text[]`
- `why_it_matters_validated_at`: `timestamptz`, nullable
- Check constraint: `signal_posts_why_it_matters_validation_status_check`

Existing production rows currently all store `why_it_matters_validation_status = 'passed'`.

## Existing Bad Published Data

This remediation does not rewrite already-published historical rows. A production inspection found published April 26 rows whose stored `published_why_it_matters` copy fails the current deterministic validator while still being marked `passed` from migration defaults.

Launch follow-up: run a one-time editorial cleanup, rewrite, and republish affected April 26 rows, or regenerate the affected signal rows through the corrected editorial pipeline.
