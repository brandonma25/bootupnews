# Editor Decision Packet - Core/Context Drafts - 2026-04-29

## Executive Summary

- Effective change type: remediation / editorial validation.
- Canonical PRD required: no.
- Source of truth: PR #146 editorial rewrite packet, PR #145 admin review report, and the seven existing non-live `2026-04-29` Core/Context draft rows.
- Object level: Surface Placement plus Card copy review. `signal_posts` remains legacy/runtime placement naming, not canonical Signal identity.
- Purpose: prepare a human editor decision form for the rewrite/replacement packet. This document does not approve, reject, replace, update, or publish any row.
- Current readiness label: `ready_for_human_editor_decisions`.

## Source Of Truth

- PR #146 editorial rewrite packet:
  `docs/engineering/testing/editorial-rewrite-packet-core-context-drafts-20260429.md`
- PR #145 admin review report:
  `docs/engineering/testing/admin-review-limited-core-context-drafts-20260429.md`
- Existing seven non-live `2026-04-29` Core/Context draft rows.
- Product Position: Boot Up is a curated Top 5 Core plus Next 2 Context briefing with explicit structural why-it-matters reasoning.

## Why No Canonical PRD Is Required

This is remediation / editorial validation. It prepares human editorial decisions for existing non-live draft rows and does not add a feature, source, source-governance change, ranking threshold, WITM threshold, schema migration, public UI behavior, URL/domain/env change, Vercel setting, or publish capability.

## Editor Decision Instructions

For each row, choose one editor decision:

- `approve`
- `request edits`
- `reject`
- `replace`
- `hold`

For publish-readiness after editor decision, choose one:

- `eligible_for_controlled_draft_row_update`
- `needs_more_editorial_revision`
- `reject_or_hold`

This decision packet is not a database instruction. If the editor approves a final slate, the next gate is a separate controlled draft-row update plan for existing non-live rows only.

## Existing Core/Context Draft Rows

| Slot | Current title | Source | Current tier | Current WITM status | PR #146 recommendation | Proposed final title | Proposed final WITM copy | Editor decision | Notes | Publish-readiness after editor decision |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Scoop: White House workshops plan to bring back Anthropic | Axios | Core | `passed` | heavy rewrite | White House plans workshops to bring Anthropic back into federal AI planning | This matters because renewed White House engagement with Anthropic would show how federal AI procurement and defense-facing model access are being shaped by vendor trust, national-security priorities, and the government's push to set AI rules through procurement rather than regulation alone. | `approve` / `request edits` / `reject` / `replace` / `hold` | Verify the source supports federal procurement, defense-facing model access, and procurement-led AI rules. Avoid unsupported cybersecurity-enforcement framing. | `eligible_for_controlled_draft_row_update` if approved; otherwise `needs_more_editorial_revision` or `reject_or_hold` |
| 2 | Economic Letter Countdown: Most Read Topics from 2025 | SF Fed Research and Insights | Core | `requires_human_rewrite`; `unsupported_structural_claim` | replace and hold as training evidence | N/A - recommended replacement | N/A - do not publish as Core. Training note only: This is useful as a map of which economic questions drew institutional attention in 2025, but it is not a fresh Core signal without a current data or policy hook. | `replace` / `reject` / `hold` | Recommended decision: replace as Core and hold as training evidence for retrospective/meta-story selection risk. | `reject_or_hold` |
| 3 | Democrats Need a Critical Minerals Policy Beyond Anti-Trumpism | Heatmap | Core | `passed` | light rewrite | Democrats need a critical-minerals policy beyond anti-Trumpism | This matters because critical minerals policy is becoming a test of whether Democrats can offer an industrial strategy that secures supply chains, speeds clean-energy buildout, and competes with China without only reacting to Trump-era policy. | `approve` / `request edits` / `reject` / `replace` / `hold` | Keep the mechanism on industrial strategy, supply chains, clean-energy buildout, and China competition. Avoid partisan overstatement. | `eligible_for_controlled_draft_row_update` if approved; otherwise `needs_more_editorial_revision` or `reject_or_hold` |
| 4 | A Closer Look at Emerging Market Resilience During Recent Shocks | Liberty Street Economics | Core | `passed` | heavy rewrite | Emerging markets are showing more resilience to recent global shocks | This matters because emerging-market resilience changes how investors and policymakers assess vulnerability to dollar strength, capital outflows, and external shocks, which can alter risk pricing across sovereign debt, currencies, and global growth expectations. | `approve` / `request edits` / `reject` / `replace` / `hold` | Verify the source supports resilience framing. Avoid implying resilience is universal across all emerging markets. | `eligible_for_controlled_draft_row_update` if approved; otherwise `needs_more_editorial_revision` or `reject_or_hold` |
| 5 | The R*-Labor Share Nexus | Liberty Street Economics | Core | `passed` | light rewrite | How labor's share of income can change the Fed's neutral-rate estimate | This matters because changes in labor's share of income can affect estimates of the neutral interest rate, shaping whether the Federal Reserve sees current policy as restrictive, neutral, or too loose. | `approve` / `request edits` / `reject` / `replace` / `hold` | Title should translate `R*` for a general executive reader. Keep the neutral-rate mechanism clear. | `eligible_for_controlled_draft_row_update` if approved; otherwise `needs_more_editorial_revision` or `reject_or_hold` |
| 6 | Trumps Shady Wind Deals Arent Over Yet | Heatmap | Context | `passed` | light rewrite plus title/tone cleanup | Trump-era offshore wind deals still shape project ownership and permitting risk | This matters because political dealmaking around offshore wind can change project ownership, investor confidence, and permitting risk at a moment when clean-energy capital is already sensitive to policy uncertainty. | `approve` / `request edits` / `reject` / `replace` / `hold` | Title/tone cleanup is required. Avoid pejorative wording unless explicitly approved. | `eligible_for_controlled_draft_row_update` if approved; otherwise `needs_more_editorial_revision` or `reject_or_hold` |
| 7 | Monetary Policy in a Slow (to No) Growth Labor Market | SF Fed Research and Insights | Context | `passed` | light rewrite | What a no-growth labor market means for monetary policy | This matters because a labor market with little or no growth changes the Fed's tradeoff between inflation control and employment risk, which can shift expectations for how long rates stay restrictive. | `approve` / `request edits` / `reject` / `replace` / `hold` | Preserve uncertainty around the rate path. This is Context because it frames a policy tradeoff rather than a standalone Core event. | `eligible_for_controlled_draft_row_update` if approved; otherwise `needs_more_editorial_revision` or `reject_or_hold` |

## Replacement Candidate Section

### Primary Replacement Candidate

| Candidate | Source | Current artifact position | Current WITM status | PR #146 recommendation | Proposed final title | Proposed final WITM copy | Editor decision | Notes | Publish-readiness after editor decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| What Millions of Homeowners Insurance Contracts Reveal About Risk Sharing | Liberty Street Economics | Depth row rank `20` | `passed` | promote as replacement Core only with explicit editor approval | What homeowners insurance contracts reveal about risk sharing | This matters because homeowners insurance contracts show how climate and disaster risk is being split among households, insurers, lenders, and public backstops, which can affect household balance sheets, mortgage risk, and regional housing markets. | `approve` / `request edits` / `reject` / `hold` | This was originally Depth and increases Liberty Street concentration. It has full-text institutional evidence and a clear risk-transfer mechanism, but source concentration must be consciously accepted. | `eligible_for_controlled_draft_row_update` if approved; otherwise `needs_more_editorial_revision` or `reject_or_hold` |

### Backup Replacement Candidates

| Candidate | Source | Current artifact position | Current WITM status | PR #146 assessment | Proposed WITM copy | Editor decision | Notes | Publish-readiness after editor decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| The Trump Administration Aims to Penalize Disabled Adults Who Live With Their Families | ProPublica | Excluded candidate rank `37` | `requires_human_rewrite`; `incomplete_sentence` | Backup Core replacement if the editor wants public-policy and safety-net diversity instead of another Finance/Liberty Street row. Requires careful legal/policy review and heavy rewrite. | This matters because changes to disability-benefit eligibility can shift financial risk onto families and test how safety-net rules treat shared living arrangements during a broader push to constrain public spending. | `approve` / `request edits` / `reject` / `hold` | Improves category/source diversity but has policy sensitivity and higher editorial risk. | `eligible_for_controlled_draft_row_update` only if explicitly chosen and approved; otherwise `needs_more_editorial_revision` or `reject_or_hold` |
| The Download: DeepSeeks latest AI breakthrough, and the race to build world models | MIT Technology Review | Excluded candidate rank `19` | `passed` | Backup technology replacement only if the editor wants more AI coverage and accepts overlap with Axios/Anthropic. | This matters because DeepSeek's model progress can pressure larger AI labs to compete on cost, inference efficiency, and model capability, changing how companies and governments evaluate the economics of advanced AI deployment. | `approve` / `request edits` / `reject` / `hold` | Raises duplicate-topic risk with Axios/Anthropic and may need freshness review. | `eligible_for_controlled_draft_row_update` only if explicitly chosen and approved; otherwise `needs_more_editorial_revision` or `reject_or_hold` |

## Explicit Decision Questions

| Question | Editor answer | Notes |
| --- | --- | --- |
| Should the SF Fed Economic Letter Countdown Core row be rejected/replaced? | `yes` / `no` | PR #146 recommends replacing it and holding it as training evidence. |
| Should the Liberty Street homeowners-insurance/risk-sharing Depth row be promoted as the replacement Core row? | `yes` / `no` | Requires explicit approval because it was originally Depth. |
| Is increased Liberty Street source concentration acceptable for this controlled manual slate? | `yes` / `no` | The proposed slate would include three Liberty Street Core rows. |
| Does the final slate form an approved 5 Core + 2 Context candidate slate? | `yes` / `no` | Requires approving six salvageable rows and one replacement. |
| Is this ready for a separate controlled draft-row update plan? | `yes` / `no` | This does not authorize writes. A separate prompt is required before any draft-row update. |

## Proposed Final 5 Core + 2 Context Slate

This is a proposed slate for editor approval only. It is not a write plan and does not authorize updating existing draft rows.

| Slot | Tier | Proposed title | Source | Proposed status | Proposed final WITM copy | Editor decision needed |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Core | White House plans workshops to bring Anthropic back into federal AI planning | Axios | keep existing row with heavy rewrite | This matters because renewed White House engagement with Anthropic would show how federal AI procurement and defense-facing model access are being shaped by vendor trust, national-security priorities, and the government's push to set AI rules through procurement rather than regulation alone. | Approve or edit heavy rewrite. |
| 2 | Core | Democrats need a critical-minerals policy beyond anti-Trumpism | Heatmap | keep existing row with copyedit | This matters because critical minerals policy is becoming a test of whether Democrats can offer an industrial strategy that secures supply chains, speeds clean-energy buildout, and competes with China without only reacting to Trump-era policy. | Approve or edit copy. |
| 3 | Core | Emerging markets are showing more resilience to recent global shocks | Liberty Street Economics | keep existing row with heavy rewrite | This matters because emerging-market resilience changes how investors and policymakers assess vulnerability to dollar strength, capital outflows, and external shocks, which can alter risk pricing across sovereign debt, currencies, and global growth expectations. | Approve or edit heavy rewrite. |
| 4 | Core | How labor's share of income can change the Fed's neutral-rate estimate | Liberty Street Economics | keep existing row with copyedit | This matters because changes in labor's share of income can affect estimates of the neutral interest rate, shaping whether the Federal Reserve sees current policy as restrictive, neutral, or too loose. | Approve or edit copy. |
| 5 | Core | What homeowners insurance contracts reveal about risk sharing | Liberty Street Economics | replace SF Fed Economic Letter row | This matters because homeowners insurance contracts show how climate and disaster risk is being split among households, insurers, lenders, and public backstops, which can affect household balance sheets, mortgage risk, and regional housing markets. | Explicitly approve replacement and source concentration. |
| 6 | Context | Trump-era offshore wind deals still shape project ownership and permitting risk | Heatmap | keep existing row with title/tone cleanup | This matters because political dealmaking around offshore wind can change project ownership, investor confidence, and permitting risk at a moment when clean-energy capital is already sensitive to policy uncertainty. | Approve or edit tone cleanup. |
| 7 | Context | What a no-growth labor market means for monetary policy | SF Fed Research and Insights | keep existing row with copyedit | This matters because a labor market with little or no growth changes the Fed's tradeoff between inflation control and employment risk, which can shift expectations for how long rates stay restrictive. | Approve or edit copy. |

## Remaining Caveats

- No row should be treated as publish-ready as currently stored.
- The SF Fed Economic Letter row should not proceed as Core unless the editor overrides PR #146's recommendation.
- The Liberty Street homeowners-insurance replacement is plausible but requires explicit approval because it was originally Depth and increases Liberty Street concentration.
- The Axios/Anthropic and Emerging Market Resilience rows require substantive WITM correction before any controlled draft-row update.
- The Heatmap wind Context row requires title/tone cleanup before any controlled draft-row update.
- A clean 5 Core plus 2 Context slate exists only if the editor approves the proposed replacement and accepts the remaining source-concentration caveat.

## Readiness Label

```text
ready_for_human_editor_decisions
```

This packet is ready for a human editor to mark decisions. It is not yet ready for a controlled draft-row update because the editor decisions are still blank.

## Explicit No-Operation Confirmation

- No database rows were inserted.
- No database rows were updated.
- No database rows were deleted.
- No `signal_posts` rows were inserted, updated, deleted, approved, rejected, or published.
- No `pipeline_article_candidates` rows were inserted or updated.
- No `dry_run` command was run.
- No `draft_only` command was run.
- No cron ran.
- No publish action ran.
- No live rows were created or modified.
- No Depth rows were touched in production.
- No sources were added or removed.
- No source-governance or source-list files were changed.
- No ranking or WITM thresholds were changed.
- No URL/domain/env migration work occurred.
- No Vercel settings or environment variables were changed.
- No secrets were printed or committed.
- No canonical PRD was created.
