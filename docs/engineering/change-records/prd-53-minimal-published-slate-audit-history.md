# PRD-53 Minimal Published-Slate Audit History

Date: 2026-04-30
Branch: `codex/prd-53-minimal-published-slate-audit-history`
Readiness label: `ready_for_prd_53_minimal_published_slate_audit_history_review`

## Source of truth

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`
- `docs/engineering/change-records/prd-53-editorial-card-controls.md`
- `docs/engineering/change-records/prd-53-seven-row-publish-hardening.md`

## Summary

This change adds the minimal internal audit/history layer for supported PRD-53 final-slate publishes.

The implementation keeps the scope narrow:

- adds `published_slates` as the publish-level audit record
- adds `published_slate_items` as the seven-row item snapshot record
- captures published row IDs and archived previous-live row IDs
- snapshots final rank, final tier, title, Why It Matters, summary, source metadata, editorial decision, replacement relationship, and review metadata for published rows
- blocks supported publish before public writes if audit storage is unavailable or audit creation fails
- shows the latest audit record inside the private Signals editorial admin page
- stores rollback preparation metadata without implementing rollback execution

## Atomicity note

The current Supabase client path does not expose a repository transaction helper for the final-slate publish operation.

This implementation uses the safest existing repo-supported pattern:

1. validate the final slate before writes
2. verify audit tables before writes
3. create the audit record and seven audit items before public visibility changes
4. archive the previous live rows
5. publish exactly the selected seven rows
6. delete the pre-created audit record if later archive/publish writes fail and trigger the existing best-effort row rollback

This prevents silent public publishing without audit when audit creation fails. Full transaction-backed publish batches and executable rollback remain follow-up work.

## Object level

This is Surface Placement plus Card snapshot audit history.

It does not introduce canonical Signal identity, a public archive, Story Cluster persistence, semantic clustering, personalization, or the Phase 2 historical content model.

## Decision-trace limitation

This minimal audit layer snapshots published rows, archived previous-live rows, replacement relationships on published rows, and final decision metadata on published rows.

It does not yet create a full immutable event log for rejected, held, rewrite-requested, promoted, demoted, or removed rows that were outside the final public slate. Full decision-event history remains a follow-up after the supported publish path is proven.

## Non-actions

- No production publish was performed.
- No cron change was made.
- No `dry_run`, `draft_only`, or pipeline write-mode run was performed.
- No production database rows were mutated.
- No source governance, source list, ranking threshold, or WITM threshold changed.
- No public history/archive surface was implemented.
- No full historical snapshot/schema layer was implemented.
- No Phase 2 architecture or personalization work was started.
