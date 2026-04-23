# Signals Admin Editorial Layer Change Record

- Date: 2026-04-23
- Branch: `codex/signals-admin-editorial-layer`
- PRD: `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

## Summary

This change adds an in-app admin/editor workflow for the Top 5 Signals editorial layer. It keeps existing Supabase Google authentication in place and adds a minimal `ADMIN_EMAILS` authorization check for private review and server-side mutations.

## System Changes

- Adds `/dashboard/signals/editorial-review` for private editorial review.
- Adds `/signals` for public published Top 5 Signals.
- Adds an Account-page entry point to editorial review for users authorized through `ADMIN_EMAILS`.
- Adds a top-page `Approve All` editorial action that bulk-approves currently loaded eligible posts without bypassing the admin gate.
- Expands the editorial route into an all-posts management surface with status filters while preserving the Review Queue workflow.
- Applies published editorial `Why it matters` copy to matching homepage signal cards so the homepage no longer falls back to generated briefing copy after a published manual edit.
- Makes workflow state coherent for all-post editing: Approved rows can now be published individually, and Top 5 publishing accepts a mix of Approved and already Published rows instead of blocking on previously published records.
- Preserves full published editorial `Why it matters` copy through the homepage model and applies homepage truncation only as a card-level preview with inline expand/collapse controls.
- Improves expanded homepage editorial readability with deterministic paragraph chunking, stronger label hierarchy, roomier line rhythm, and a subtle body grouping treatment while keeping the same source text and controls.
- Adds `public.signal_posts` for AI draft reference text, human edited text, published text, editorial status, and edit/approval/publish metadata.
- Uses server-side service-role persistence only after verifying the logged-in user email against `ADMIN_EMAILS`.
- Public rendering is handled by the server-side `/signals` route, which reads with the service role and renders only sanitized published fields. No direct anonymous table-read policy is added for `signal_posts`.

## Governance Notes

- The branch touches the hotspot `docs/product/feature-system.csv`.
- Open PR #98 also touches the feature registry and owns PRD-52, so this branch uses PRD-53 and should be synced after #98 lands.
- The parallel `SIGNALS_WHY_IT_MATTERS_GENERATOR` task remains out of scope; no LLM prompt-template or generation-only utility files were modified.
