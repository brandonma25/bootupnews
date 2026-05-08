# Controlled Core/Context Draft Cap 7 Remediation

## Effective Change Type

Remediation / alignment.

## Source Of Truth

- Limited Core/Context `draft_only` precondition failure discovered before write-mode execution.
- Post-PR139 production `dry_run` validation for `2026-04-29`.
- Boot Up product target: Top 5 Core Signals plus Next 2 Context Signals, not a feed.

## Canonical PRD

Canonical PRD required: no.

This change aligns the controlled runner with the already-approved product target and prior remediation evidence. It does not add a new public feature, source expansion, schema change, ranking change, WITM threshold change, public UI behavior, cron behavior, or publish path.

## Blocker

The existing controlled `draft_only` path could include Context rows only when `PIPELINE_DRAFT_TIER_ALLOWLIST=core,context` was set. That allowlist required `PIPELINE_DRAFT_MAX_ROWS`, but max rows were hard-capped at `1..3`. The product-target limited write test requires exactly 7 Core/Context rows: 5 Core and 2 Context.

No `draft_only` command was run when this blocker was found. No production rows were inserted.

## Cap Exception Scope

`PIPELINE_DRAFT_MAX_ROWS=7` is allowed only when all of these are true:

- `PIPELINE_RUN_MODE=draft_only`
- `PIPELINE_DRAFT_TIER_ALLOWLIST=core,context`
- the allowlist resolves exactly to Core and Context tiers

The normal controlled cap remains `1..3`. Values `4`, `5`, `6`, and values above `7` remain invalid. `PIPELINE_DRAFT_MAX_ROWS=7` without the exact Core/Context `draft_only` allowlist remains invalid.

Depth rows remain excluded because the allowlist parser accepts only Core and Context tiers, and the runner filters selected rows by that allowlist before persistence.

## Broad Draft-Only Non-Authorization

This remediation does not authorize broad/full-slate `draft_only`. It does not permit Depth rows, publish actions, cron execution, source-list changes, URL/domain/environment changes, or any public surface mutation.

Persisted draft rows continue to be forced by the existing persistence path to:

- `editorial_status=needs_review`
- `is_live=false`
- `published_at=null`

WITM validation status and failure metadata remain persisted for review-required rows.

## Files Changed

- `src/lib/pipeline/controlled-execution.ts`
- `src/lib/pipeline/controlled-execution.test.ts`
- `src/lib/pipeline/controlled-runner.test.ts`
- `src/lib/signals-editorial.test.ts`
- `docs/engineering/testing/controlled-core-context-draft-cap-7-remediation.md`

## Tests Added

- Product-target cap allowed only for Core/Context `draft_only`.
- Product-target cap rejected without allowlist, with Core-only, with Context-only, with Depth, and in non-`draft_only` modes.
- Max rows `4`, `5`, `6`, and `8` remain rejected.
- Controlled runner excludes Depth rows and caps write-eligible Core/Context rows at 7.
- Replay mode follows the same safe cap behavior.
- Draft persistence still forces review-only, non-live, unpublished rows and preserves WITM failure metadata.

## Validation

Non-write validation passed:

```bash
git diff --check
```

Result: passed.

```bash
npm run lint
```

Result: passed.

```bash
npm run test -- src/lib/pipeline/controlled-execution.test.ts src/lib/pipeline/controlled-runner.test.ts src/lib/signals-editorial.test.ts
```

Result: 3 files / 68 tests passed.

```bash
npm run test
```

Result: 72 files / 526 tests passed. Existing Node localstorage warnings were observed.

```bash
npm run build
```

Result: passed. Existing Next.js workspace-root and module-type warnings were observed.

```bash
python3 scripts/validate-feature-system-csv.py
```

Result: passed with existing PRD slug warnings.

```bash
python3 scripts/release-governance-gate.py
```

Result: passed. Local classification: `material-feature-change`; governance tier: `documented`.

## Dry-Run Simulation

No safe `dry_run` simulation with `PIPELINE_DRAFT_MAX_ROWS=7` was run because this remediation intentionally allows the 7-row cap only for `draft_only` mode. That preserves the controlled write-path guarantee and avoids broadening the exception into non-write modes.

## No-Write Confirmation

- No `draft_only` was run.
- No production writes occurred.
- No `signal_posts` rows were inserted.
- No `pipeline_article_candidates` rows were inserted.
- No publish action occurred.
- No cron path was run.
- No source-governance or source-list files changed.
- No URL/domain/environment migration work occurred.
- No Vercel settings changed.

## Recommended Next Gate

After this remediation is reviewed, merged, and deployed, retry the limited Core/Context-only `draft_only` validation with the product-target cap:

- Core + Context only
- max rows 7
- Depth excluded
- all rows `needs_review`
- all rows `is_live=false`
- all rows `published_at=null`
- WITM failure metadata visible
- no publish
- no cron
- no public surface mutation
