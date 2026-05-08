# Why-It-Matters Quality Gate Remediation

- Date: 2026-04-26
- Change type: remediation
- Source of truth: Signal Formation Engine Audit (Codex, April 2026), PRD-35, and PRD-53
- Canonical PRD required: no
- Object level: Surface Placement plus Card copy/public read model metadata

## Intent

Align the existing editorial placement pipeline with PRD-35 and PRD-53 by adding a deterministic quality gate for template-generated `whyItMatters` text before a Signal Card placement enters the PRD-53 editorial review queue.

This is remediation, not a net-new feature. It uses engineering documentation instead of creating a new canonical PRD.

This change follows the `signal_posts` operational contract: `signal_posts` is Surface Placement plus Card copy/public read model storage, not canonical Signal identity.

## Template Audit

The deterministic generation path is `src/lib/why-it-matters.ts`.

Template strings are defined in `REASONING_TEMPLATES` for these categories:
- `policy_regulation`
- `corporate`
- `mna_funding`
- `early_stage_funding`
- `large_ipo`
- `data_report`
- `executive_move`
- `product`
- `political`
- `defense_geopolitical`
- `legal_investigation`
- `macro_market_move`
- `non_signal`
- `company_update`

Template fill-slot patterns come from:
- `buildMechanism()`
- `buildImpact()`
- `buildHeadlineDeltaPhrase()`
- `buildLowConfidenceFallback()`

The added blocklist includes the prompt-specified broken phrases plus exact fill-slot fragments found in those functions, including generic sequences for capital availability, market structure, defense posture, rates/demand/risk, governance credibility, strategic direction, valuation, and market expectations.

## Insertion Point

The gate is inserted in `src/lib/signals-editorial.ts` at the signal snapshot persistence boundary:

1. `persistSignalPostsForBriefing()` receives generated briefing items.
2. `buildSignalPostCandidates()` maps each item into an editorial placement/Card candidate.
3. `flagCardForRewrite()` validates the generated `aiWhyItMatters`.
4. `persistSignalPostCandidates()` writes validation status and failure reasons into `signal_posts`.
5. The pipeline continues; validation failures do not throw or halt the run.

This is after why-it-matters output is generated and before the card enters the PRD-53 review queue.

## Scope Boundaries

Implemented:
- Deterministic string validation only.
- Stored validation status and explicit failure details for reviewers.
- Non-blocking queue insertion for failed cards.
- Existing editorial review surface shows the failure reasons.

Not implemented:
- No LLM or external API calls.
- No generation-template edits.
- No ranking pipeline changes.
- No homepage rendering or signal card display changes.
- No new canonical PRD.
