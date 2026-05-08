# Post-PR137 WITM Slate Readiness Diagnostic

## Executive Summary

Change type: remediation / diagnostic.

Canonical PRD required: no. This report diagnoses a controlled post-deploy `dry_run` artifact after PR #137 and does not introduce a new product capability, source expansion, ranking change, WITM threshold change, schema change, public behavior change, cron action, `draft_only` run, publish action, or production write.

Source of truth:

- Dry-run artifact: `.pipeline-runs/controlled-pipeline-dry_run-batch2b-finance-source-governance-dryrun-20260429T0439Z-2026-04-29T04-40-02-819Z.json`
- Dry-run ID: `batch2b-finance-source-governance-dryrun-20260429T0439Z`
- Briefing date: `2026-04-29`
- Merge commit under review: `04c970d5f6c5558dfe52c25e1268507f7516abab`

Execution context:

- Branch: `codex/post-pr137-witm-slate-readiness-diagnostic`
- Worktree: `/Users/bm/dev/worktrees/daily-intelligence-aggregator-post-pr137-witm-slate-readiness-diagnostic`
- Starting commit: `04c970d5f6c5558dfe52c25e1268507f7516abab`
- The artifact did not expose a dedicated fallback/template-path field. Template-path diagnosis below is inferred from the emitted WITM text, `validationDetails`, `eventType`, `calibratedReasonLabels`, `contentAccessibility`, `accessibleTextLength`, and the deterministic WITM generation code paths.

Batch 2B cleared the source-supply blocker for this representative date. The dry run selected 5 Core and 2 Context rows, all 5 Core rows used `full_text_available` evidence, and `candidate_pool_insufficient=false`. The remaining blocker is WITM/editorial quality, especially Context and Finance WITM generation.

Primary recommendation: `block_draft_only_until_context_witm_fixed`.

Secondary constraint: do not allow broad Finance rows into `draft_only` unless WITM failure metadata is visible and the next non-write validation shows Core and Context WITM quality is stable.

## Baseline Metrics

| Metric | Result |
| --- | --- |
| Mode | `dry_run` |
| Persistence | `insertedCount: 0` |
| Active/public sources | 39 |
| Contributing sources | 38 |
| Raw candidates | 223 |
| Filtered candidates | 115 passed / 66 suppressed / 42 rejected |
| Story clusters | 89 |
| Selected distribution | 5 Core / 2 Context / 13 Depth |
| Candidate pool insufficient | false |
| Selected WITM | 10 passed / 10 requires_human_rewrite |
| Core WITM | 3 passed / 2 requires_human_rewrite |
| Context WITM | 0 passed / 2 requires_human_rewrite |
| Depth WITM | 7 passed / 6 requires_human_rewrite |
| Raw accessibility mix | 59 full_text_available / 158 partial_text_available / 6 paywall_limited |
| Selected accessibility mix | 12 full_text_available / 8 partial_text_available |
| Category mix | Finance 37 / Tech 33 / Politics 19 |
| Selected category mix | Finance 12 / Tech 4 / Politics 4 |
| Finance selected rows | 12 |
| Finance WITM | 4 passed / 8 requires_human_rewrite |
| Finance functional coverage | 20 active / 19 contributing / 5 core-capable / 6 context-capable / 1 failed |
| Known fetch failure | Reuters Business `rss_retry_exhausted` |

## Selected Rows Extracted

### Core

| Rank | Title | Category | Source | Role | Access | URL | Cluster | Score | WITM |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |
| 1 | Scoop: White House workshops plan to bring back Anthropic | Politics | Axios | secondary_authoritative | full_text_available | `https://www.axios.com/2026/04/29/trump-anthropic-pentagon-ai-executive-order-gov` | `8ae30259ab28` | 73.03 | passed |
| 2 | Economic Letter Countdown: Most Read Topics from 2025 | Finance | SF Fed Research and Insights | primary_institutional | full_text_available | `https://www.frbsf.org/research-and-insights/blog/sf-fed-blog/2025/12/19/economic-letter-countdown-most-read-topics-2025/` | `8e1ddc02534a` | 68.52 | requires_human_rewrite: `template_placeholder_language` |
| 3 | Democrats Need a Critical Minerals Policy Beyond Anti-Trumpism | Finance | Heatmap | secondary_authoritative | full_text_available | `https://heatmap.news/ideas/democrats-critical-minerals` | `2b307dc31a47` | 68.05 | passed |
| 4 | A Closer Look at Emerging Market Resilience During Recent Shocks | Finance | Liberty Street Economics | primary_institutional | full_text_available | `https://libertystreeteconomics.newyorkfed.org/2026/04/a-closer-look-at-emerging-market-resilience-during-recent-shocks/` | `da1b55b48d28` | 66.56 | passed |
| 5 | The R*-Labor Share Nexus | Finance | Liberty Street Economics | primary_institutional | full_text_available | `https://libertystreeteconomics.newyorkfed.org/2026/04/the-r-labor-share-nexus/` | `2d04794464d9` | 65.94 | requires_human_rewrite: `incomplete_sentence`, `template_placeholder_language` |

### Context

| Rank | Title | Category | Source | Role | Access | URL | Cluster | Score | WITM |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |
| 6 | Trumps Shady Wind Deals Arent Over Yet | Finance | Heatmap | secondary_authoritative | full_text_available | `https://heatmap.news/energy/trump-offshore-wind-deals` | `d38bb41c7189` | 63.22 | requires_human_rewrite: `incomplete_sentence` |
| 7 | Monetary Policy in a Slow (to No) Growth Labor Market | Finance | SF Fed Research and Insights | primary_institutional | full_text_available | `https://www.frbsf.org/research-and-insights/blog/sf-fed-blog/2026/04/03/monetary-policy-in-a-slow-to-no-growth-labor-market/` | `cb06b8e8f73c` | 56.16 | requires_human_rewrite: `template_placeholder_language` |

### Depth

| Rank | Title | Category | Source | Access | Score | WITM |
| --- | --- | --- | --- | --- | ---: | --- |
| 8 | WATCH LIVE: Fed Chair Powell holds briefing on interest rate decision as his term nears end | Finance | PBS NewsHour | partial_text_available | 67.94 | requires_human_rewrite: `template_placeholder_language` |
| 9 | James Comey indicted over social media post Trumps DOJ says crossed a line | Tech | PBS NewsHour | partial_text_available | 67.10 | passed |
| 10 | DHS shutdown: Congressional dysfunction imperils pay for TSA, Secret Service | Politics | CNBC Politics | partial_text_available | 65.71 | requires_human_rewrite: `template_placeholder_language` |
| 11 | Axios Finish Line: Make AI remember you | Tech | Axios | full_text_available | 63.98 | passed |
| 12 | Mexico arrests cartel leader amid widening gang crackdown | Politics | Semafor | partial_text_available | 58.95 | passed |
| 13 | Senate Republicans reject attempt to end Trumps blockade of Cuba | Politics | PBS NewsHour | partial_text_available | 58.42 | passed |
| 14 | Trumps pick to lead the Fed says hed like to see regime change in its policies | Finance | NPR Economy | partial_text_available | 56.78 | requires_human_rewrite: `template_placeholder_language` |
| 15 | How the UAEs departure from OPEC could impact oil markets | Finance | PBS NewsHour | partial_text_available | 56.47 | requires_human_rewrite: `template_placeholder_language` |
| 16 | "A Punch in the Gut": After Years of Waiting, Many Opioid Victims Will Be Shut Out of Purdue Settlement | Tech | ProPublica | full_text_available | 55.48 | passed |
| 17 | Why This Gas Crisis Isnt Hitting Like 1979 | Finance | Heatmap | full_text_available | 55.46 | passed |
| 18 | Rules coming back | Tech | Politico Congress | partial_text_available | 55.28 | requires_human_rewrite: `incomplete_sentence` |
| 19 | Indias long work year | Finance | FRED Blog | full_text_available | 55.22 | requires_human_rewrite: `incomplete_sentence` |
| 20 | What Millions of Homeowners Insurance Contracts Reveal About Risk Sharing | Finance | Liberty Street Economics | full_text_available | 55.21 | passed |

## Core/Context Readiness Table

| Rank | Tier | Category | Title | Source | Accessibility | WITM Status | Failure Reason | Is Finance? | Batch 2B Source? | Evidence Quality | Editorial Action Needed | Draft-only Suitability |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Core | Politics | Scoop: White House workshops plan to bring back Anthropic | Axios | full_text_available | passed | None | No | No | Strong feed evidence; 3,986 accessible chars | Light rewrite recommended because the event type frames the story as cyber enforcement when the structural story is government AI adoption/procurement | suitable_after_light_rewrite |
| 2 | Core | Finance | Economic Letter Countdown: Most Read Topics from 2025 | SF Fed Research and Insights | full_text_available | requires_human_rewrite | `individual decision-making` placeholder | Yes | Yes | Strong feed evidence; 8,129 accessible chars | Selection review and heavy rewrite. The evidence is accessible, but the story is a retrospective/meta roundup, not clearly a same-day Core signal | unsuitable_due_to_story_selection |
| 3 | Core | Finance | Democrats Need a Critical Minerals Policy Beyond Anti-Trumpism | Heatmap | full_text_available | passed | None | Yes | No | Strong feed evidence; 12,355 accessible chars | Light editorial polish only | suitable_after_light_rewrite |
| 4 | Core | Finance | A Closer Look at Emerging Market Resilience During Recent Shocks | Liberty Street Economics | full_text_available | passed | None | Yes | Yes | Strong feed evidence; 13,534 accessible chars | Light rewrite to connect emerging-market resilience to capital flows, policy credibility, or risk pricing instead of generic government-capacity copy | suitable_after_light_rewrite |
| 5 | Core | Finance | The R*-Labor Share Nexus | Liberty Street Economics | full_text_available | requires_human_rewrite | Short evidence sentence and `individual decision-making` placeholder | Yes | Yes | Very strong feed evidence; 31,843 accessible chars | Heavy rewrite. The story is structurally relevant, but the generated WITM does not explain why labor share and neutral-rate assumptions matter | suitable_after_heavy_rewrite |
| 6 | Context | Finance | Trumps Shady Wind Deals Arent Over Yet | Heatmap | full_text_available | requires_human_rewrite | Truncated ending: `in policy risk and defense posture` | Yes | No | Strong feed evidence; 7,932 accessible chars | Rewrite to connect offshore wind deal terms to energy investment, permitting, and policy-risk pricing | suitable_after_heavy_rewrite |
| 7 | Context | Finance | Monetary Policy in a Slow (to No) Growth Labor Market | SF Fed Research and Insights | full_text_available | requires_human_rewrite | `individual decision-making` placeholder | Yes | Yes | Strong feed evidence; 8,429 accessible chars | Rewrite to explain labor-market cooling as a constraint on Fed reaction-function assumptions | suitable_after_heavy_rewrite |

### Core/Context WITM Evidence Fields

| Rank | Tier | Event type | Article/source count | Extraction | Accessibility length | Calibrated labels |
| --- | --- | --- | --- | --- | ---: | --- |
| 1 | Core | `cybersecurity_enforcement` | 1 article / 1 source | `rss_content_encoded` | 3,986 | `cybersecurity_enforcement_signal` |
| 2 | Core | `macro_data_release` | 1 article / 1 source | `rss_content_encoded` | 8,129 | `macro_data_release`, `central_bank_policy_signal`, `market_commentary_source_thin` |
| 3 | Core | `ai_infrastructure_policy` | 1 article / 1 source | `rss_content_encoded` | 12,355 | `ai_infrastructure_policy`, `market_commentary_source_thin` |
| 4 | Core | `government_capacity` | 1 article / 1 source | `rss_content_encoded` | 13,534 | `institutional_capacity_signal`, `central_bank_policy_signal` |
| 5 | Core | `macro_data_release` | 1 article / 1 source | `rss_content_encoded` | 31,843 | `macro_data_release`, `central_bank_policy_signal`, `ai_infrastructure_policy` |
| 6 | Context | `mna_funding` | 1 article / 1 source | `rss_content_encoded` | 7,932 | `market_commentary_source_thin` |
| 7 | Context | `macro_data_release` | 1 article / 1 source | `rss_content_encoded` | 8,429 | `macro_data_release`, `central_bank_policy_signal`, `market_commentary_source_thin` |

## Context WITM Failure Analysis

Both Context rows failed WITM. This is the strongest blocker to any product-target `draft_only` run because Boot Up targets Top 5 Core plus Next 2 Context, and the current Context tier has 0/2 passing WITM.

### Rank 6: Trumps Shady Wind Deals Arent Over Yet

- Failure: `incomplete_sentence`.
- Exact detail: ends with truncation pattern `in policy risk and defense posture`.
- Cause: deterministic wording issue plus weak market-label selection. The article evidence is accessible and substantial. The generated claim overuses a generic `mna_funding` consequence and attaches the wrong broad market label, producing an awkward and unsupported phrase.
- Not primarily caused by source scarcity, source authority, or authentication.
- Human repair: yes, without selecting a different story.
- Example diagnostic rewrite: "The offshore-wind deal terms matter because they show how federal policy pressure can change project economics, investor risk, and permitting assumptions for clean-energy infrastructure."
- Eligible for limited `draft_only` after rewrite: yes, but only after Context WITM remediation is validated in a non-write run.

### Rank 7: Monetary Policy in a Slow (to No) Growth Labor Market

- Failure: `template_placeholder_language`.
- Exact detail: contains placeholder phrase `individual decision-making`.
- Cause: deterministic/template WITM generation. The source is institutional, full text, and directly relevant to monetary-policy context. The failure is that `macro_data_release` falls back to a generic market label instead of using labor-market slack, inflation, or rate-policy reaction-function language.
- Not primarily caused by weak evidence or insufficient source authority.
- Human repair: yes, without selecting a different story.
- Example diagnostic rewrite: "The labor-market slowdown matters because it narrows the Fed's room to hold policy tight without increasing employment risk, changing how investors read the next rate decision."
- Eligible for limited `draft_only` after rewrite: yes, but only after Context WITM remediation is validated in a non-write run.

## Core WITM Failure Analysis

Two Core rows failed WITM. One is a strong article with a generation failure; the other is also accessible but has a story-selection concern.

### Rank 2: Economic Letter Countdown: Most Read Topics from 2025

- Failure: `template_placeholder_language`.
- Exact detail: contains placeholder phrase `individual decision-making`.
- Story importance: questionable for Core. It is a retrospective list of most-read SF Fed research topics from 2025, not a clearly new structural development for the `2026-04-29` briefing.
- Evidence strength: strong, because the public feed exposed 8,129 accessible characters.
- Failure mode: combination of WITM generation and story selection. The WITM copy is generic, but the deeper concern is that the row may be over-ranked by institutional source weight and full-text evidence.
- Example diagnostic rewrite if retained below Core: "The SF Fed's most-read topics are useful context because they show which inflation, labor, and growth questions dominated institutional attention, but the item is retrospective and should not carry a Core slot by itself."
- Eligible for limited `draft_only` after rewrite: not as Core; consider Depth or manual review only.

### Rank 5: The R*-Labor Share Nexus

- Failures: `incomplete_sentence`, `template_placeholder_language`.
- Exact details: compact evidence sentence has fewer than 8 words, and the WITM uses `individual decision-making`.
- Story importance: yes, structurally important enough for Core. Neutral-rate and labor-share analysis can affect how policymakers and investors reason about real rates, growth, labor income, and policy stance.
- Evidence strength: very strong, because the public feed exposed 31,843 accessible characters.
- Failure mode: copy-generation problem, not source selection.
- Example diagnostic rewrite: "The labor-share link to R* matters because it changes how policymakers estimate the neutral rate, which can alter the perceived restrictiveness of current policy and the timing of future rate moves."
- Eligible for limited `draft_only` after rewrite: yes, after WITM remediation validates that no placeholder or short evidence sentence is emitted.

## Finance WITM Failure Analysis

Finance supplied 12 of 20 selected rows and produced 4 passing WITM rows against 8 rewrite-required rows. The failures are not evenly distributed by source quality. Full-text institutional Finance rows improved supply, but WITM generation is still using generic macro and evidence templates.

| Failure group | Rows | Diagnosis |
| --- | --- | --- |
| Generic macro placeholder | SF Fed countdown, Liberty Street R*-labor share, SF Fed labor-market policy | `macro_data_release` and related labels fall back to `individual decision-making`, which is explicitly blocked by the WITM gate and is too weak for Boot Up's structural reasoning layer. |
| Truncated or malformed structural claim | Heatmap wind deals | The source is full text, but the generated consequence ends with a broad market phrase instead of a complete implication. |
| Short evidence sentence appended to otherwise usable WITM | Liberty Street R*-labor share, FRED India work year, Politico non-Finance row | `appendSupportingContext` can add compact evidence sentences under eight words, causing gate failure even when the primary WITM sentence is salvageable. |
| Source-limited review copy | PBS Powell, NPR Fed pick, PBS UAE/OPEC | Partial source text under the accessibility threshold correctly prevents public structural explanation, but Depth still carries these rows as review-needed items. |
| Story-selection concern | SF Fed countdown | Full-text institutional evidence and high structural score are not enough if the story is retrospective/meta rather than current structural intelligence. |

### Batch 2B Finance Source Comparison

| Source | Selected | WITM | Diagnostic |
| --- | ---: | --- | --- |
| Liberty Street Economics | 3 | 2 passed / 1 rewrite | Strongest Batch 2B contributor. Failure is generation-specific, not source-quality-driven. |
| FRED Blog | 1 | 0 passed / 1 rewrite | Full-text evidence is useful, but the selected row was Depth and failed on a short appended evidence sentence. |
| Federal Reserve FEDS Notes | 0 | n/a | Partial-text source contributed candidates but did not enter the selected slate. Not a current WITM burden. |
| SF Fed Research and Insights | 2 | 0 passed / 2 rewrite | Strong evidence, but both selected rows hit generic macro placeholder generation; one also has Core story-selection risk. |
| St. Louis Fed On the Economy | 0 | n/a | Thin partial-text source did not enter selected slate. Not a Core fix and not a current WITM burden. |
| Reuters Business | 0 | n/a | Fetch failed with `rss_retry_exhausted`; not the sole cause of Finance weakness after Batch 2B, but still a source-health risk. |

Finance issue classification: combination of WITM generation, tier calibration, and editorial rewrite burden. Source count is no longer the primary blocker for the tested date. Evidence quality improved materially, but Finance WITM copy still overuses generic macro consequences and sometimes appends validator-hostile evidence snippets.

## Evidence and Accessibility Analysis

- All 5 Core rows used `full_text_available` evidence.
- Both Context rows used `full_text_available` evidence.
- Batch 2B added meaningful Finance evidence: Liberty Street Economics, FRED Blog, and SF Fed Research and Insights contributed full-text candidates; Liberty Street and SF Fed entered the Core/Context slate.
- FEDS Notes and St. Louis Fed remained conservative partial-text contributors and did not create selected WITM failures.
- Thin partial-text Finance rows still entered Depth and correctly triggered source-limited review copy. That behavior is safer than false freshness, but it should not be used to pad the public slate.
- Reuters Business failed, but the dry run still produced 37 Finance candidates and 12 Finance selected rows. The failure did not prevent 5 Core / 2 Context selection, though it remains a source-health issue.

## Draft-only Readiness Recommendation

1. Are all 5 Core rows worth preserving as draft candidates after rewrite? No. Four are plausible after light/heavy rewrite; the SF Fed countdown row should not be preserved as Core without manual story-selection review.
2. Are either of the 2 Context rows worth preserving after rewrite? Yes. Both have full-text evidence and can be repaired without changing stories.
3. Would limited `draft_only` be safe if restricted to WITM-passing Core/Context rows only? Operationally safer, but not product-target sufficient: it would include only 3 Core and 0 Context rows.
4. Would limited `draft_only` be safe if restricted to Core/Context rows with `editorial_status = needs_review`, including rewrite-required rows? Not yet. Context has 0/2 WITM pass and Finance has high rewrite burden, so this would mainly test editorial handling of weak copy rather than representative slate quality.
5. Should Context be blocked until WITM generation is remediated? Yes.
6. Should Finance rows be allowed into limited `draft_only` with failure metadata visible? Only after the next non-write validation shows Context WITM is fixed and Finance rewrite-required rows are intentionally visible as review items. Do not let Finance Depth rows pad the product slate.
7. Exact gate before next write-mode test: run a non-write controlled validation after WITM remediation and require:
   - 5 Core and 2 Context selected.
   - `candidate_pool_insufficient=false`.
   - Core WITM: 5/5 passed or any failures explicitly justified as `needs_review` and not caused by template placeholders, truncation, or source-limited review copy.
   - Context WITM: 2/2 passed.
   - No `individual decision-making`, `source review needed`, truncated market-label phrases, or short evidence sentences in Core/Context.
   - All Core/Context rows have full or substantial accessible evidence.
   - No Batch 2B source-health failure.
   - No production writes, publish actions, cron, or `draft_only` during validation.

Decision label: `block_draft_only_until_context_witm_fixed`.

## Minimum Remediation Plan

| Remediation | Class | Likely files | PRD required? | Parallel with source work? | Validation required | Safe before limited `draft_only`? |
| --- | --- | --- | --- | --- | --- | --- |
| Replace generic `macro_data_release` market fallback that emits `individual decision-making` with source-grounded macro policy implications. | deterministic template fix / prompt-generation improvement | `src/lib/why-it-matters.ts`, WITM tests | No | Yes | Targeted WITM tests plus dry-run replay/fresh dry_run | Yes |
| Prevent compact evidence sentences under the validator minimum from being appended as standalone sentences. | deterministic template fix | `src/lib/why-it-matters.ts`, `src/lib/why-it-matters-quality-gate.test.ts` or related tests | No | Yes | WITM unit tests and artifact replay/fresh dry_run | Yes |
| Improve Context-specific WITM generation so Context rows explain implication without overclaiming Core importance. | prompt-generation improvement / deterministic template fix | `src/lib/why-it-matters.ts`, selection/WITM tests | No | Yes | Core/Context dry-run validation with 2/2 Context WITM pass | Yes |
| Add diagnostic guard for Core story-selection when the item is retrospective/meta despite full-text institutional evidence. | ranking/selection adjustment | selection eligibility/ranking files, tests | No if remediation only; reassess if changing product semantics | Can run in parallel if scoped | Representative dry_run comparison and selection tests | Maybe, but after WITM template fixes |
| Ensure admin/editorial review displays WITM failure metadata for any future controlled `draft_only` needs_review row. | editorial workflow/display adjustment | admin editorial review files and tests | No if internal remediation; reassess if public behavior changes | Yes | Existing admin workflow tests plus fixture for failed real-like rows | Yes, but not required before WITM non-write gate |
| Preserve this diagnostic as the run report for PR #137 readiness. | documentation-only | `docs/engineering/testing/post-pr137-witm-slate-readiness-diagnostic.md` | No | Yes | Markdown review, lint/build because repo validation requires it | Yes |

## Safe Next Command

No write-mode pipeline command is recommended from this report.

The next safe operational command after a targeted WITM remediation PR is another non-write controlled validation, not `draft_only`. It should use `PIPELINE_RUN_MODE=dry_run` only, with production write guards confirmed disabled and a new test run ID. Do not run it until remediation is implemented and approved.

## Explicit No-write Confirmation

This diagnostic report did not run or authorize:

- cron
- `draft_only`
- publish
- production write-mode
- `signal_posts` inserts
- `pipeline_article_candidates` inserts
- production data mutation
- source list changes
- source-governance changes
- source additions or removals
- URL/domain migration
- Vercel setting changes
- GitHub repository setting changes
- environment-variable changes
- secret use or secret printing

## Open Questions and Manual Review Items

- Should the SF Fed countdown row be demoted or excluded because it is a retrospective meta-story rather than current daily intelligence?
- Should the Axios Anthropic row be reclassified from cyber enforcement language into government AI procurement/adoption language despite passing the current WITM validator?
- Should Context require a stricter semantic WITM pass than Depth before any controlled write-mode test?
- Should source-limited review copy be allowed in Depth artifacts but excluded from any future Core/Context `draft_only` payload?
- Should future diagnostics distinguish validator pass from editorial pass when the validator misses a semantic mismatch?
