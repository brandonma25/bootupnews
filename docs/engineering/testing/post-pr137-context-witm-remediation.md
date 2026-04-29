# Post-PR137 Context WITM Remediation

## Effective Change Type

Remediation / alignment.

This is not net-new product feature work and does not require a canonical PRD. The change aligns deterministic why-it-matters generation and validation with the existing Boot Up product standard: a curated Top 5 Core + Next 2 Context briefing with explicit structural reasoning.

Classification note: this is not a bug-fix lane. It is controlled remediation/alignment after the post-PR137 diagnostic, with the engineering testing report serving as the supporting governance artifact.

## Source Of Truth

- Primary diagnostic: `docs/engineering/testing/post-pr137-witm-slate-readiness-diagnostic.md`
- Baseline dry-run artifact: `.pipeline-runs/controlled-pipeline-dry_run-batch2b-finance-source-governance-dryrun-20260429T0439Z-2026-04-29T04-40-02-819Z.json`
- Remediation dry-run artifact: `.pipeline-runs/controlled-pipeline-dry_run-context-witm-remediation-dryrun-20260429T0524Z-2026-04-29T05-24-28-797Z.json`
- Briefing date: `2026-04-29`

## Baseline Diagnostic Summary

The post-PR137 dry run fixed source scarcity but left WITM quality as the blocker.

| Metric | Post-PR137 baseline |
| --- | ---: |
| Active/public sources | 39 |
| Raw candidates | 223 |
| Filtered candidates | 115 passed / 66 suppressed / 42 rejected |
| Story clusters | 89 |
| Selected rows | 5 Core / 2 Context / 13 Depth |
| Candidate pool insufficient | false |
| Core WITM | 3 passed / 2 requires_human_rewrite |
| Context WITM | 0 passed / 2 requires_human_rewrite |
| Depth WITM | 7 passed / 6 requires_human_rewrite |
| Total selected WITM | 10 passed / 10 requires_human_rewrite |

The primary failure mode was not source count. It was deterministic WITM copy that used generic macro phrasing, clipped market labels, short evidence snippets, or summary-like structural claims.

## Files Changed

- `src/lib/why-it-matters.ts`
- `src/lib/why-it-matters-quality-gate.ts`
- `src/lib/why-it-matters.test.ts`
- `src/lib/why-it-matters-quality-gate.test.ts`
- `src/lib/pipeline/controlled-execution.ts`
- `src/lib/pipeline/controlled-execution.test.ts`
- `docs/engineering/testing/post-pr137-context-witm-remediation.md`

No source manifest, source catalog, source policy, source defaults, source list, ranking threshold, WITM threshold, schema, URL/domain, or environment files were changed.

## WITM Failure Modes Addressed

1. Context macro fallback copy no longer uses generic "individual decision-making" market labels when the article evidence supports a specific labor-market, rate-policy, inflation, neutral-rate, insurance-risk, or clean-energy mechanism.
2. Context clean-energy/deal copy no longer clips into malformed endings such as "in policy risk and defense posture."
3. Core neutral-rate copy now anchors the structural claim to Federal Reserve policy interpretation instead of generic macro placeholder language.
4. Short standalone evidence snippets are suppressed when they are too thin to support Core/Context structural copy, while multi-source evidence remains available when it is substantial enough to be useful.
5. Core/Context validation now receives source accessibility, accessible text length, eligibility tier, event type, and title context from controlled execution.
6. Core/Context validation now flags summary-only wording, strong claims on insufficient accessible evidence, and retrospective/meta Core rows that require selection review.

## Tests Added Or Updated

Focused coverage was added for:

- Context generic macro placeholder copy failing validation.
- Context copy with a specific structural mechanism passing validation.
- Context summary-only wording failing validation.
- Core clipped/truncated copy failing validation.
- Core unsupported structural claims failing when evidence is thin.
- Full-text evidence supporting stronger structural claims than partial/thin evidence.
- Finance macro placeholder wording failing validation.
- Failure metadata remaining visible for rewrite-required rows.
- Depth-only weak WITM handling not relaxing Core/Context standards.
- Controlled-execution report rows carrying contextual WITM failure metadata.

## Dry-Run Validation Results

Command shape:

```bash
PIPELINE_RUN_MODE=dry_run \
PIPELINE_TARGET_ENV=production \
PIPELINE_CRON_DISABLED_CONFIRMED=true \
BRIEFING_DATE_OVERRIDE=2026-04-29 \
PIPELINE_TEST_RUN_ID=context-witm-remediation-dryrun-20260429T0524Z \
npm run pipeline:controlled-test
```

Observed result:

| Metric | Remediation dry run |
| --- | ---: |
| Mode | dry_run |
| Active/public sources | 39 |
| Raw candidates | 223 |
| Filtered candidates | 115 passed / 68 suppressed / 40 rejected |
| Story clusters | 89 |
| Selected rows | 5 Core / 2 Context / 13 Depth |
| Candidate pool insufficient | false |
| Context WITM | 2 passed / 0 requires_human_rewrite |
| Core WITM | 4 passed / 1 requires_human_rewrite |
| Depth WITM | 8 passed / 5 requires_human_rewrite |
| Total selected WITM | 14 passed / 6 requires_human_rewrite |
| Inserted signal rows | 0 |

The dry-run output reported: `Dry run completed without Supabase writes.`

## Core / Context Result

The controlled slate still selected 5 Core and 2 Context rows. Both Context rows now passed WITM validation:

| Rank | Tier | Title | Source | Result |
| ---: | --- | --- | --- | --- |
| 6 | Context | Trumps Shady Wind Deals Arent Over Yet | Heatmap | passed |
| 7 | Context | Monetary Policy in a Slow (to No) Growth Labor Market | SF Fed Research and Insights | passed |

Core no longer has placeholder or truncation failures. One Core row remains `requires_human_rewrite` for `unsupported_structural_claim` because it is a retrospective/meta story:

| Rank | Tier | Title | Source | Remaining issue |
| ---: | --- | --- | --- | --- |
| 2 | Core | Economic Letter Countdown: Most Read Topics from 2025 | SF Fed Research and Insights | Selection review required before publication |

This remaining Core issue is intentionally visible. The remediation does not hide a story-selection concern by writing stronger copy.

## Remaining Blockers

- The Context gate is cleared for the controlled dry-run slate.
- The Core placeholder/truncation gate is cleared.
- One Core candidate still requires human review because the selected story is retrospective/meta. That is a selection-quality caveat, not a WITM generation failure.
- Depth rows still include rewrite-required output. Depth is not part of the next draft-only gate and was not optimized in this remediation.
- Reuters Business continued to fail with `rss_retry_exhausted`; this was inherited from the Batch 2B dry run and was not addressed in this WITM remediation.

## Next Recommended Gate Before Draft-Only

Recommended gate: `proceed_to_limited_draft_only_with_rewrite_required_visible`, restricted to Core/Context only, only after PR review confirms the visible remaining Core selection-review caveat is acceptable.

Minimum preconditions:

- 5 Core + 2 Context selected.
- Context WITM is 2/2 passed.
- Core has no placeholder/truncation failures.
- Any remaining Core rewrite requirement is visible in metadata and not caused by malformed fallback copy.
- `candidate_pool_insufficient=false`.
- Dry-run reports zero writes.

Do not run broad `draft_only`. If approved later, any limited write-mode test should keep `editorial_status=needs_review`, `is_live=false`, and no public publish.

## No-Write Confirmation

This remediation used non-write validation only.

- No cron was run.
- No `draft_only` was run.
- No publish action was run.
- No production write-mode was run.
- No `signal_posts` rows were inserted.
- No `pipeline_article_candidates` rows were inserted.
- No production data was mutated.
- No source-governance or source-list changes were made.
- No URL/domain/environment migration work was performed.
- No secrets were used or printed.
