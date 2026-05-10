# Editorial Rewrite Packet - Core/Context Drafts - 2026-04-29

## Executive Summary

- Effective change type: remediation / editorial validation.
- Canonical PRD required: no.
- Source of truth: PR #145 admin review report and the seven existing non-live `2026-04-29` Core/Context draft rows in `signal_posts`.
- Object level: Surface Placement plus Card copy review. `signal_posts` is legacy/runtime placement naming, not canonical Signal identity.
- Result: the seven draft rows remain query-accessible, non-live, unpublished, and reviewable. WITM metadata remains visible, including `unsupported_structural_claim` on the rejected SF Fed Core row.
- Editorial result: six rows are salvageable through copyedit or rewrite. The SF Fed `Economic Letter Countdown` row should be replaced as a Core row and held as training evidence.
- Clean slate status: a proposed 5 Core + 2 Context manual slate is available as an editor-approval packet only. It is not approved for publish and should not be written back until a human editor approves the replacement and revised copy.

Readiness label:

```text
ready_for_editor_approval_of_rewrite_packet
```

## Source Of Truth

- Primary: PR #145 admin review report:
  `https://github.com/brandonma25/daily-intelligence-aggregator/pull/145`
- PR #145 merge commit: `958ad2ca26b3bbd7f3d5af7eff6a1d05b519a2e5`
- Secondary:
  - Existing seven non-live `2026-04-29` Core/Context draft rows in `signal_posts`.
  - PR #144 WITM metadata targeted repair validation.
  - PR #143 WITM metadata persistence remediation.
  - Post-PR139 dry-run artifact:
    `/Users/bm/dev/worktrees/daily-intelligence-aggregator-post-pr139-context-witm-post-deploy-validation/.pipeline-runs/controlled-pipeline-dry_run-post-pr139-context-witm-remediation-dryrun-20260429T0546Z-2026-04-29T05-47-11-859Z.json`
  - Product Position: Boot Up is a curated seven-story briefing: Top 5 Core plus Next 2 Context, with explicit structural why-it-matters reasoning.

## Why No Canonical PRD Is Required

This is remediation / editorial validation against the existing Boot Up product standard and controlled admin-review workflow. It does not add a feature, source, ranking rule, schema migration, public UI behavior, publish behavior, URL/domain/env setting, or admin capability. The artifact is an engineering/editorial packet for existing non-live draft rows.

## PR #145 Status

- PR #145 was docs-only admin-review evidence.
- PR #145 status: merged.
- Merge commit: `958ad2ca26b3bbd7f3d5af7eff6a1d05b519a2e5`.
- Final checks were green:
  - `feature-system-csv-validation`
  - `release-governance-gate`
  - `pr-lint`
  - `pr-unit-tests`
  - `pr-build`
  - `pr-e2e-chromium`
  - `pr-e2e-webkit`
  - `pr-summary`
  - Vercel
- The remote PR #145 branch remained present because it is attached to a local worktree.

## Production And Public Baseline

- Production deployment status: READY.
- Deployment URL: `https://bootup-8f9iazuke-brandonma25s-projects.vercel.app`
- Deployment ID: `dpl_3qNVyAnzTo9Eerx7zBF68YxB41WR`
- Production alias checked: `https://bootupnews.vercel.app`
- `/` returned HTTP `200`.
- `/signals` returned HTTP `200`.
- Public live briefing date remained `2026-04-26` by live-row readback from the prior validation state.
- The following draft titles were absent from the public homepage and `/signals` responses:
  - `Scoop: White House workshops plan to bring back Anthropic`
  - `Economic Letter Countdown: Most Read Topics from 2025`
  - `Democrats Need a Critical Minerals Policy Beyond Anti-Trumpism`
  - `A Closer Look at Emerging Market Resilience During Recent Shocks`
  - `The R*-Labor Share Nexus`
  - `Trumps Shady Wind Deals Arent Over Yet`
  - `Monetary Policy in a Slow (to No) Growth Labor Market`

## Existing Seven-Row State

Read-only inspection confirmed the seven existing draft rows remain query-accessible. The controlled artifact defines ranks 1-5 as Core and ranks 6-7 as Context.

| Slot | Tier | Row ID | Title | Source | Stored status | Live | Published | WITM status | WITM failures |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Core | `c402254d-d34b-45a2-a8d7-3ef56c4febd8` | Scoop: White House workshops plan to bring back Anthropic | Axios | `needs_review` | `false` | `null` | `passed` | `[]` |
| 2 | Core | `e52bdbe4-cbf9-42ce-bb0e-e57c5011ba39` | Economic Letter Countdown: Most Read Topics from 2025 | SF Fed Research and Insights | `needs_review` | `false` | `null` | `requires_human_rewrite` | `unsupported_structural_claim` |
| 3 | Core | `25f9fa0a-d2c0-445f-9f3f-4c47b2c452eb` | Democrats Need a Critical Minerals Policy Beyond Anti-Trumpism | Heatmap | `needs_review` | `false` | `null` | `passed` | `[]` |
| 4 | Core | `d54873ce-b024-4487-b12f-ab76c5dcc888` | A Closer Look at Emerging Market Resilience During Recent Shocks | Liberty Street Economics | `needs_review` | `false` | `null` | `passed` | `[]` |
| 5 | Core | `d3e7afa2-bfe4-4232-8669-ae75b7a6380b` | The R*-Labor Share Nexus | Liberty Street Economics | `needs_review` | `false` | `null` | `passed` | `[]` |
| 6 | Context | `ee0a7572-caa0-4256-aa32-3b16056b7263` | Trumps Shady Wind Deals Arent Over Yet | Heatmap | `needs_review` | `false` | `null` | `passed` | `[]` |
| 7 | Context | `ff606539-f435-424f-bdd6-cb6f3833467d` | Monetary Policy in a Slow (to No) Growth Labor Market | SF Fed Research and Insights | `needs_review` | `false` | `null` | `passed` | `[]` |

All seven rows remain:

- Core/Context only by controlled artifact selection.
- `editorial_status=needs_review`.
- `is_live=false`.
- `published_at=null`.
- Not public.

No Depth row from the run appears in the `2026-04-29` review set.

## WITM Metadata Visibility

The flagged Core row remains visibly review-required:

- Row ID: `e52bdbe4-cbf9-42ce-bb0e-e57c5011ba39`
- Title: `Economic Letter Countdown: Most Read Topics from 2025`
- `why_it_matters_validation_status=requires_human_rewrite`
- `why_it_matters_validation_failures=["unsupported_structural_claim"]`
- Detail: `unsupported_structural_claim: Core WITM is attached to a retrospective or meta-story that needs selection review before publication.`

The other six rows remain marked `passed` with empty failure metadata.

## Per-Row Editorial Rewrite Recommendations

### 1. Core - Scoop: White House workshops plan to bring back Anthropic

- Source: Axios.
- Source role: secondary authoritative.
- Evidence/accessibility: full-text available; accessible text length `3986`.
- Current issue: the stored WITM uses a cyber-enforcement mechanism that is not supported by the artifact title/source framing.
- Recommended action: `heavy_rewrite`.
- Publish-candidate status: `publish_candidate_after_heavy_rewrite`.
- Revised title: `White House plans workshops to bring Anthropic back into federal AI planning`.
- Revised card-level WITM:

```text
This matters because renewed White House engagement with Anthropic would show how federal AI procurement and defense-facing model access are being shaped by vendor trust, national-security priorities, and the government's push to set AI rules through procurement rather than regulation alone.
```

- Evidence note: Axios describes White House workshops involving Anthropic, the Pentagon, and AI executive-order/government context.
- Risk note: avoid implying cybersecurity enforcement unless the editor confirms that mechanism from the source text. Political and procurement framing should stay factual.

### 2. Core - Economic Letter Countdown: Most Read Topics from 2025

- Source: SF Fed Research and Insights.
- Source role: primary institutional.
- Evidence/accessibility: full-text available; accessible text length `8129`.
- Current issue: retrospective/meta roundup selected as Core and correctly flagged as `unsupported_structural_claim`.
- Recommended action: `replace_selection` plus `hold_as_training_example`.
- Publish-candidate status: `not_publish_candidate`.
- Rejected Core row decision: do not publish as Core; hold as training evidence for retrospective/meta-story selection risk.
- Safer non-publish training note:

```text
This is useful as a map of which economic questions drew institutional attention in 2025, but it is not a fresh Core signal without a current data or policy hook.
```

- Risk note: false-freshness and unsupported structural claim risk are both high for a public daily Core slot.

### 3. Core - Democrats Need a Critical Minerals Policy Beyond Anti-Trumpism

- Source: Heatmap.
- Source role: secondary authoritative.
- Evidence/accessibility: full-text available; accessible text length `12355`.
- Current issue: current WITM is directionally useful but over-compresses the mechanism into AI growth, grid capacity, and permitting.
- Recommended action: `light_rewrite`.
- Publish-candidate status: `publish_candidate_after_copyedit`.
- Revised title: `Democrats need a critical-minerals policy beyond anti-Trumpism`.
- Revised card-level WITM:

```text
This matters because critical minerals policy is becoming a test of whether Democrats can offer an industrial strategy that secures supply chains, speeds clean-energy buildout, and competes with China without only reacting to Trump-era policy.
```

- Evidence note: Heatmap provides full-text evidence connecting critical minerals to industrial strategy, energy transition, supply chains, and political positioning.
- Risk note: political framing risk; keep the explanation on policy mechanism rather than partisan judgment.

### 4. Core - A Closer Look at Emerging Market Resilience During Recent Shocks

- Source: Liberty Street Economics.
- Source role: primary institutional.
- Evidence/accessibility: full-text available; accessible text length `13534`.
- Current issue: stored WITM discusses public institutions maintaining basic services, which is mismatched to the emerging-market macro topic.
- Recommended action: `heavy_rewrite`.
- Publish-candidate status: `publish_candidate_after_heavy_rewrite`.
- Revised title: `Emerging markets are showing more resilience to recent global shocks`.
- Revised card-level WITM:

```text
This matters because emerging-market resilience changes how investors and policymakers assess vulnerability to dollar strength, capital outflows, and external shocks, which can alter risk pricing across sovereign debt, currencies, and global growth expectations.
```

- Evidence note: Liberty Street provides primary institutional analysis of emerging-market resilience during shocks.
- Risk note: technical macro framing; avoid overstating that resilience is universal across all emerging markets.

### 5. Core - The R*-Labor Share Nexus

- Source: Liberty Street Economics.
- Source role: primary institutional.
- Evidence/accessibility: full-text available; accessible text length `31843`.
- Current issue: mechanism is useful but needs plainer Card copy for a non-specialist executive audience.
- Recommended action: `light_rewrite`.
- Publish-candidate status: `publish_candidate_after_copyedit`.
- Revised title: `How labor's share of income can change the Fed's neutral-rate estimate`.
- Revised card-level WITM:

```text
This matters because changes in labor's share of income can affect estimates of the neutral interest rate, shaping whether the Federal Reserve sees current policy as restrictive, neutral, or too loose.
```

- Evidence note: Liberty Street directly supports the labor-share and neutral-rate mechanism.
- Risk note: jargon risk around `R*`; title and Card copy should define the mechanism without assuming specialist knowledge.

### 6. Context - Trumps Shady Wind Deals Arent Over Yet

- Source: Heatmap.
- Source role: secondary authoritative.
- Evidence/accessibility: full-text available; accessible text length `7932`.
- Current issue: title tone is legally and editorially sensitive; WITM should be tightened around permitting, ownership, and capital allocation.
- Recommended action: `light_rewrite`.
- Publish-candidate status: `publish_candidate_after_copyedit`.
- Revised title: `Trump-era offshore wind deals still shape project ownership and permitting risk`.
- Revised card-level WITM:

```text
This matters because political dealmaking around offshore wind can change project ownership, investor confidence, and permitting risk at a moment when clean-energy capital is already sensitive to policy uncertainty.
```

- Evidence note: Heatmap provides full-text context on offshore wind deals, permitting, and ownership/capital implications.
- Risk note: title/tone and legal sensitivity; avoid pejorative wording unless it is directly quoted and editorially approved.

### 7. Context - Monetary Policy in a Slow (to No) Growth Labor Market

- Source: SF Fed Research and Insights.
- Source role: primary institutional.
- Evidence/accessibility: full-text available; accessible text length `8429`.
- Current issue: current WITM is structurally clear but should be made more concrete for general readers.
- Recommended action: `light_rewrite`.
- Publish-candidate status: `publish_candidate_after_copyedit`.
- Revised title: `What a no-growth labor market means for monetary policy`.
- Revised card-level WITM:

```text
This matters because a labor market with little or no growth changes the Fed's tradeoff between inflation control and employment risk, which can shift expectations for how long rates stay restrictive.
```

- Evidence note: SF Fed provides primary institutional analysis linking labor-market growth, slack, and monetary policy.
- Risk note: preserve uncertainty; the piece frames policy tradeoffs, not a guaranteed rate path.

## Replacement Candidate Analysis

Replacement candidates were limited to existing dry-run artifacts and candidate pools. No sources were added and no ingestion was run.

### Primary recommended replacement

**What Millions of Homeowners Insurance Contracts Reveal About Risk Sharing - Liberty Street Economics**

- Existing artifact location: proposed Depth row rank `20`.
- Source role: primary institutional.
- Accessibility: full-text available; accessible text length `9944`.
- Event type: `central_bank_policy` in the artifact, though editorially it is better framed as household-risk and insurance-market structure.
- WITM status in artifact: `passed`.
- Structural importance score: `42.72`.
- Final score: `55.21`.
- Core suitability: credible replacement only with editor approval. It is stronger than the retrospective SF Fed row because it has current full-text institutional evidence and a clear risk-transfer mechanism, but it was originally selected as Depth and would add a third Liberty Street item.
- Slate diversity: weakens source diversity but improves structural freshness and publication safety versus the rejected SF Fed meta row.
- Rewrite burden: heavy rewrite.
- Publication risk: technical finance framing and source concentration.
- Recommended replacement WITM:

```text
This matters because homeowners insurance contracts show how climate and disaster risk is being split among households, insurers, lenders, and public backstops, which can affect household balance sheets, mortgage risk, and regional housing markets.
```

### Backup replacement 1

**The Trump Administration Aims to Penalize Disabled Adults Who Live With Their Families - ProPublica**

- Existing artifact location: excluded candidate rank `37`.
- Source role: primary authoritative.
- Accessibility: full-text available; accessible text length `14225`.
- Event type: government capacity.
- WITM status in artifact: `requires_human_rewrite` with `incomplete_sentence`.
- Core suitability: possible if the editor wants a public-policy and safety-net Core signal instead of another Finance row. Requires careful legal/policy review and heavy rewrite.
- Slate diversity: improves source/category diversity.
- Rewrite burden: heavy rewrite.
- Publication risk: policy sensitivity and potential overclaiming.
- Candidate WITM:

```text
This matters because changes to disability-benefit eligibility can shift financial risk onto families and test how safety-net rules treat shared living arrangements during a broader push to constrain public spending.
```

### Backup replacement 2

**The Download: DeepSeeks latest AI breakthrough, and the race to build world models - MIT Technology Review**

- Existing artifact location: excluded candidate rank `19`.
- Source role: secondary authoritative.
- Accessibility: full-text available; accessible text length `9488`.
- Event type: institutional governance.
- WITM status in artifact: `passed`.
- Core suitability: plausible technology replacement only if the editor wants more AI coverage and accepts overlap with the Axios/Anthropic item.
- Slate diversity: worsens AI concentration if kept alongside Axios/Anthropic.
- Rewrite burden: moderate to heavy.
- Publication risk: duplicate-topic risk and possible stale/explainer framing.
- Candidate WITM:

```text
This matters because DeepSeek's model progress can pressure larger AI labs to compete on cost, inference efficiency, and model capability, changing how companies and governments evaluate the economics of advanced AI deployment.
```

## Proposed Clean 5 Core + 2 Context Manual Slate

This slate is a report-only proposal. It should not be written back to production until an editor explicitly approves the revised copy and replacement decision.

| Slot | Tier | Title | Source | Status | Final recommended WITM draft | Remaining risk | Editor decision needed |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | Core | White House plans workshops to bring Anthropic back into federal AI planning | Axios | keep_existing_with_heavy_rewrite | This matters because renewed White House engagement with Anthropic would show how federal AI procurement and defense-facing model access are being shaped by vendor trust, national-security priorities, and the government's push to set AI rules through procurement rather than regulation alone. | Procurement and policy sensitivity. | Approve heavy rewrite. |
| 2 | Core | Democrats need a critical-minerals policy beyond anti-Trumpism | Heatmap | keep_existing_with_copyedit | This matters because critical minerals policy is becoming a test of whether Democrats can offer an industrial strategy that secures supply chains, speeds clean-energy buildout, and competes with China without only reacting to Trump-era policy. | Political framing risk. | Approve copyedit. |
| 3 | Core | Emerging markets are showing more resilience to recent global shocks | Liberty Street Economics | keep_existing_with_heavy_rewrite | This matters because emerging-market resilience changes how investors and policymakers assess vulnerability to dollar strength, capital outflows, and external shocks, which can alter risk pricing across sovereign debt, currencies, and global growth expectations. | Avoid universal overclaiming. | Approve heavy rewrite. |
| 4 | Core | How labor's share of income can change the Fed's neutral-rate estimate | Liberty Street Economics | keep_existing_with_copyedit | This matters because changes in labor's share of income can affect estimates of the neutral interest rate, shaping whether the Federal Reserve sees current policy as restrictive, neutral, or too loose. | Jargon risk. | Approve copyedit. |
| 5 | Core | What homeowners insurance contracts reveal about risk sharing | Liberty Street Economics | replace_existing | This matters because homeowners insurance contracts show how climate and disaster risk is being split among households, insurers, lenders, and public backstops, which can affect household balance sheets, mortgage risk, and regional housing markets. | Source concentration and technical framing. | Approve replacement for the rejected SF Fed row, or select a backup. |
| 6 | Context | Trump-era offshore wind deals still shape project ownership and permitting risk | Heatmap | keep_existing_with_copyedit | This matters because political dealmaking around offshore wind can change project ownership, investor confidence, and permitting risk at a moment when clean-energy capital is already sensitive to policy uncertainty. | Title/tone and legal sensitivity. | Approve title cleanup. |
| 7 | Context | What a no-growth labor market means for monetary policy | SF Fed Research and Insights | keep_existing_with_copyedit | This matters because a labor market with little or no growth changes the Fed's tradeoff between inflation control and employment risk, which can shift expectations for how long rates stay restrictive. | Preserve uncertainty around rate path. | Approve copyedit. |

## Rows Not Suitable For Publish

- `Economic Letter Countdown: Most Read Topics from 2025` - reject as Core; hold as training evidence.

No row should be published as currently stored without editorial copy approval. The viable rows need at least copyedit, and two existing Core rows need heavy WITM rewrites.

## Remaining Editor Decisions

1. Approve or reject the primary replacement for the SF Fed Economic Letter row.
2. Decide whether the source concentration from three Liberty Street Core rows is acceptable.
3. Approve the heavy rewrites for Axios/Anthropic and Emerging Market Resilience.
4. Approve tone cleanup for the Heatmap offshore wind Context row.
5. Decide whether any replacement should instead come from ProPublica or MIT Technology Review backups.

## Readiness Decision

Readiness label:

```text
ready_for_editor_approval_of_rewrite_packet
```

Rationale:

- Seven draft rows remain visible/query-accessible.
- Public surface is unchanged.
- WITM metadata remains visible.
- Six existing rows are salvageable through copyedit or rewrite.
- The rejected Core row has a credible primary replacement candidate from existing artifacts, plus backup options and a clear human decision path.
- The slate is not ready for controlled draft-row update or publish until an editor approves the replacement and revised copy.

## Recommended Next Gate

The next safe gate is explicit human editor approval of this rewrite packet. After approval, a separate prompt may authorize a controlled draft-row update plan for existing non-live rows only. Do not publish until a later, separately approved manual publish candidate review passes.

## Public Surface Verification

- Homepage returned HTTP `200`.
- `/signals` returned HTTP `200`.
- Public live briefing remained `2026-04-26`.
- None of the seven `2026-04-29` draft titles appeared publicly.
- Homepage content did not expose draft rows.
- `/signals` content did not expose draft rows.

## Explicit No-Mutation Confirmation

- No rows were inserted.
- No rows were updated.
- No rows were deleted.
- No rows were approved.
- No rows were rejected in the database.
- No `draft_only` command was run.
- No `dry_run` command was run.
- No cron ran.
- No publish ran.
- No live rows were created.
- No existing live rows were modified.
- No Depth rows were touched in production.
- No `pipeline_article_candidates` rows were inserted or updated.
- No source-governance or source-list files were changed.
- No active/public source counts changed.
- No URL/domain/env migration work occurred.
- No Vercel settings or environment variables were changed.
- No secrets were printed or committed.
