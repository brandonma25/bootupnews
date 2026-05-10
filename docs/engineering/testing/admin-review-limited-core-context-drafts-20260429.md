# Admin Review - Limited Core/Context Drafts - 2026-04-29

## Executive Summary

- Effective change type: remediation / controlled validation.
- Canonical PRD required: no.
- Source of truth: PR #144 WITM metadata targeted repair validation and the existing seven non-live `2026-04-29` Core/Context draft rows in `signal_posts`.
- Object level: Surface Placement plus Card copy review. `signal_posts` remains legacy/runtime placement naming, not canonical Signal identity.
- Result: the seven draft rows are query-accessible in the admin review state, WITM metadata is visible, and public surfaces remain unchanged.
- Editorial result: proceed to editorial rewrite of review-required rows before any publish test.

Readiness label:

```text
proceed_to_editorial_rewrite_of_review_required_rows
```

## Source Of Truth

- PR #144: `docs(validation): record WITM metadata repair validation`
- PR #144 merge commit: `e648a1c5c65c6ec4b333d35a8e22014ea9613eb8`
- PR #143: WITM metadata persistence remediation
- PR #142: limited Core/Context draft-only validation
- Existing seven non-live `2026-04-29` Core/Context draft rows in `signal_posts`
- Post-PR139 dry-run artifact:
  `/Users/bm/dev/worktrees/daily-intelligence-aggregator-post-pr139-context-witm-post-deploy-validation/.pipeline-runs/controlled-pipeline-dry_run-post-pr139-context-witm-remediation-dryrun-20260429T0546Z-2026-04-29T05-47-11-859Z.json`

## Why No Canonical PRD Is Required

This is remediation / controlled validation under the existing Boot Up product standard and signal-card workflow. It validates admin review readiness for already-inserted non-live drafts. It does not add a feature, source, schema migration, ranking threshold, WITM threshold, public UI behavior, URL/domain/env setting, or publish behavior.

## PR #144 Status

- PR #144 was docs-only.
- Final checks were green before merge:
  - `feature-system-csv-validation`
  - `release-governance-gate`
  - `pr-lint`
  - `pr-unit-tests`
  - `pr-build`
  - `pr-e2e-chromium`
  - `pr-e2e-webkit`
  - `pr-summary`
  - Vercel
- PR #144 merged at `e648a1c5c65c6ec4b333d35a8e22014ea9613eb8`.
- The PR branch remained present because it is attached to a local worktree.

## Production And Public Baseline

- Production deployment status: READY.
- Deployment URL: `https://bootup-jcwesbvxp-brandonma25s-projects.vercel.app`
- Deployment ID: `dpl_7uz2kZftfvWrERV4jRBkfp5ybKMX`
- Production alias checked: `https://bootupnews.vercel.app`
- `/` returned HTTP `200`.
- `/signals` returned HTTP `200`.
- `/dashboard/signals/editorial-review` returned HTTP `200` when unauthenticated, but did not render private draft rows.
- Public live briefing date remained `2026-04-26`.
- None of the checked `2026-04-29` draft titles appeared in the public homepage or `/signals` responses:
  - `Economic Letter Countdown`
  - `Scoop: White House workshops`
  - `Trumps Shady Wind Deals`
  - `Monetary Policy in a Slow`

## Existing Seven-Row Table

| Rank | Tier | Row ID | Title | Source | Category | Status | Live | Published | WITM status | WITM failures |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Core | `c402254d-d34b-45a2-a8d7-3ef56c4febd8` | Scoop: White House workshops plan to bring back Anthropic | Axios | Politics | `needs_review` | `false` | `null` | `passed` | `[]` |
| 2 | Core | `e52bdbe4-cbf9-42ce-bb0e-e57c5011ba39` | Economic Letter Countdown: Most Read Topics from 2025 | SF Fed Research and Insights | Finance | `needs_review` | `false` | `null` | `requires_human_rewrite` | `unsupported_structural_claim` |
| 3 | Core | `25f9fa0a-d2c0-445f-9f3f-4c47b2c452eb` | Democrats Need a Critical Minerals Policy Beyond Anti-Trumpism | Heatmap | Finance | `needs_review` | `false` | `null` | `passed` | `[]` |
| 4 | Core | `d54873ce-b024-4487-b12f-ab76c5dcc888` | A Closer Look at Emerging Market Resilience During Recent Shocks | Liberty Street Economics | Finance | `needs_review` | `false` | `null` | `passed` | `[]` |
| 5 | Core | `d3e7afa2-bfe4-4232-8669-ae75b7a6380b` | The R*-Labor Share Nexus | Liberty Street Economics | Finance | `needs_review` | `false` | `null` | `passed` | `[]` |
| 6 | Context | `ee0a7572-caa0-4256-aa32-3b16056b7263` | Trumps Shady Wind Deals Arent Over Yet | Heatmap | Finance | `needs_review` | `false` | `null` | `passed` | `[]` |
| 7 | Context | `ff606539-f435-424f-bdd6-cb6f3833467d` | Monetary Policy in a Slow (to No) Growth Labor Market | SF Fed Research and Insights | Finance | `needs_review` | `false` | `null` | `passed` | `[]` |

All seven rows are query-accessible through the database-backed review queue state. All seven remain Core/Context only, non-live, unpublished, and `needs_review`. No Depth row exists in the `2026-04-29` draft set.

## Admin Review Visibility Result

Authenticated admin UI access was not available in this validation pass, so full private UI rendering was not verified. The unauthenticated admin route returned HTTP `200`, but did not render private row content and was not treated as proof of admin-row rendering.

Database-backed admin review state confirms:

- The seven draft rows exist and are query-accessible.
- Rows are marked `needs_review`.
- Six rows are distinguishable as WITM `passed`.
- The flagged Core row is distinguishable as `requires_human_rewrite`.
- `unsupported_structural_claim` is visible in the flagged row's failure metadata.
- No row is public.
- No row is live.
- No row has `published_at` set.
- No Depth row appears from this run.
- Publish remains a separate action and was not triggered.

## WITM Metadata Visibility

The flagged Core row now has:

- `why_it_matters_validation_status=requires_human_rewrite`
- `why_it_matters_validation_failures=["unsupported_structural_claim"]`
- `why_it_matters_validation_details=["unsupported_structural_claim: Core WITM is attached to a retrospective or meta-story that needs selection review before publication."]`

The other six rows have `why_it_matters_validation_status=passed` and empty failure metadata.

## Per-Row Editorial Assessment

### 1. Core - Scoop: White House workshops plan to bring back Anthropic

- Source: Axios.
- Evidence/accessibility: full-text accessible in the controlled artifact; secondary authoritative.
- Structural importance: potentially useful as an AI procurement, defense, and federal AI policy signal.
- Issue: the stored WITM says the story tests cyber enforcement against state-linked or criminal activity, which does not follow clearly from the title or source framing.
- Editorial action: `heavy_rewrite`.
- Publish readiness: not publish-ready as written; candidate after rewrite.
- Future controlled manual publish candidate set: include only after WITM mechanism is corrected.

Suggested WITM rewrite:

```text
This matters because renewed White House engagement with Anthropic would signal how federal AI procurement and defense-facing model access are being shaped by policy choices, vendor trust, and national-security competition.
```

### 2. Core - Economic Letter Countdown: Most Read Topics from 2025

- Source: SF Fed Research and Insights.
- Evidence/accessibility: full-text accessible; primary institutional.
- Structural importance: weak for a daily Core slot because it is a retrospective/meta roundup rather than a current macro development.
- Issue: correctly flagged with `unsupported_structural_claim`; it needs selection review before publication.
- Editorial action: `replace_selection`.
- Publish readiness: not publish-ready.
- Future controlled manual publish candidate set: exclude unless manually reframed as a lower-tier context/training example.
- Flagged Core row decision: replace or reject. Hold as an editorial training example for meta-story false Core selection.

If an editor intentionally keeps it as a training/example row, a safer WITM would be:

```text
This is more useful as a read on what economic questions drew institutional attention than as a fresh Core signal; it points editors toward inflation, labor, and growth themes but should not anchor the daily slate without a current policy or data hook.
```

### 3. Core - Democrats Need a Critical Minerals Policy Beyond Anti-Trumpism

- Source: Heatmap.
- Evidence/accessibility: full-text accessible; secondary authoritative.
- Structural importance: strong enough for Core consideration because critical minerals policy links industrial strategy, clean-energy deployment, supply chains, and political positioning.
- Issue: current WITM is directionally useful but over-compresses the mechanism into AI growth, grid capacity, and permitting.
- Editorial action: `light_rewrite`.
- Publish readiness: publish candidate after copyedit/rewrite.
- Future controlled manual publish candidate set: include after rewrite.

Suggested WITM rewrite:

```text
This matters because critical minerals policy is becoming a test of whether Democrats can offer an industrial strategy that secures supply chains, accelerates clean-energy buildout, and competes with China without simply reacting to Trump-era framing.
```

### 4. Core - A Closer Look at Emerging Market Resilience During Recent Shocks

- Source: Liberty Street Economics.
- Evidence/accessibility: full-text accessible; primary institutional.
- Structural importance: useful Finance/Core candidate because emerging-market resilience affects capital flows, sovereign risk, and global macro transmission.
- Issue: current WITM incorrectly describes public institutions maintaining basic services under staffing or funding pressure, which is mismatched to the story.
- Editorial action: `heavy_rewrite`.
- Publish readiness: candidate after substantive WITM rewrite.
- Future controlled manual publish candidate set: include after rewrite.

Suggested WITM rewrite:

```text
This matters because emerging-market resilience changes how investors and policymakers assess vulnerability to dollar strength, capital outflows, and external shocks, which can alter risk pricing across sovereign debt, currencies, and global growth expectations.
```

### 5. Core - The R*-Labor Share Nexus

- Source: Liberty Street Economics.
- Evidence/accessibility: full-text accessible; primary institutional.
- Structural importance: strong Finance/Core candidate because neutral-rate estimates shape how restrictive monetary policy appears.
- Issue: WITM mechanism is specific and useful, but the title and copy need plain-language editing for a general executive audience.
- Editorial action: `light_rewrite`.
- Publish readiness: publish candidate after copyedit.
- Future controlled manual publish candidate set: include.

Suggested WITM rewrite:

```text
This matters because changes in labor's share of income can affect estimates of the neutral interest rate, which in turn shapes whether the Federal Reserve sees current policy as restrictive, neutral, or too loose.
```

### 6. Context - Trumps Shady Wind Deals Arent Over Yet

- Source: Heatmap.
- Evidence/accessibility: full-text accessible; secondary authoritative.
- Structural importance: appropriate Context candidate because it connects political dealmaking, offshore wind investment, permitting, and clean-energy capital allocation.
- Issue: title needs cleanup and the word "shady" creates tone/legal sensitivity; WITM is plausible but should be tightened.
- Editorial action: `light_rewrite`.
- Publish readiness: context candidate after copyedit and tone review.
- Future controlled manual publish candidate set: include after title and WITM copyedit.

Suggested WITM rewrite:

```text
This matters because political dealmaking around offshore wind can change project ownership, investor confidence, and permitting risk at a moment when clean-energy capital is already sensitive to policy uncertainty.
```

### 7. Context - Monetary Policy in a Slow (to No) Growth Labor Market

- Source: SF Fed Research and Insights.
- Evidence/accessibility: full-text accessible; primary institutional.
- Structural importance: appropriate Context candidate because it frames how labor-market slack affects the Fed's rate path.
- Issue: WITM is structurally clear but should be made more concrete for non-specialist readers.
- Editorial action: `light_rewrite`.
- Publish readiness: context candidate after copyedit.
- Future controlled manual publish candidate set: include.

Suggested WITM rewrite:

```text
This matters because a labor market with little or no growth changes the Fed's tradeoff between inflation control and employment risk, which can shift expectations for how long rates stay restrictive.
```

## Editorial Summary

No row should be published as-is without editorial review. The draft set is useful as an admin-review validation set, but not yet a clean public slate.

Publish candidates after editorial work:

- `Democrats Need a Critical Minerals Policy Beyond Anti-Trumpism` - light rewrite.
- `A Closer Look at Emerging Market Resilience During Recent Shocks` - heavy WITM rewrite.
- `The R*-Labor Share Nexus` - light rewrite.
- `Trumps Shady Wind Deals Arent Over Yet` - light rewrite and tone/title cleanup.
- `Monetary Policy in a Slow (to No) Growth Labor Market` - light rewrite.
- `Scoop: White House workshops plan to bring back Anthropic` - heavy WITM rewrite before inclusion.

Not a publish candidate:

- `Economic Letter Countdown: Most Read Topics from 2025` - replace or reject as Core; hold as training evidence for meta-story selection risk.

## Public Surface Verification

- Public homepage returned HTTP `200`.
- Public `/signals` returned HTTP `200`.
- Public live briefing date remained `2026-04-26`.
- Checked draft titles were absent from public homepage and `/signals`.
- No draft row became public.
- No row became live.
- No row received `published_at`.

## Explicit No-Mutation Confirmation

- No rows were inserted.
- No rows were updated.
- No rows were deleted.
- No `draft_only` command was rerun.
- No `dry_run` command was run.
- No cron ran.
- No publish ran.
- No approval, reject, dismiss, or save action was clicked or invoked.
- No live rows were created.
- No existing live rows were modified.
- No Depth rows were touched.
- No `pipeline_article_candidates` rows were inserted or updated.
- No source-governance or source-list files were changed.
- No active/public source counts changed.
- No URL/domain/env migration work occurred.
- No Vercel settings or environment variables were changed.
- No secrets were printed or committed.

## Recommended Next Gate

Proceed to editorial rewrite of review-required and mismatch-prone rows. The next safe gate is a manual editorial pass on the seven existing draft rows, with no publish, followed by a separate controlled manual publish candidate review only if the slate is rewritten into a publishable 5 Core + 2 Context set.

Recommended label:

```text
proceed_to_editorial_rewrite_of_review_required_rows
```

