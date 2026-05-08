# Why-It-Matters Template Quality Remediation

Date: 2026-04-28
Change type: remediation / alignment

## Context

The controlled pipeline dry run for the institutional signal calibration lane showed that the active why-it-matters path is deterministic rather than LLM-driven. Most rewrite-required failures came from deterministic templates in `src/lib/why-it-matters.ts`, while several validator-passed rows were still editorially weak because generic fallback copy such as "not market-moving" and "individual decision-making" could pass the quality gate.

## Scope

This remediation is limited to deterministic why-it-matters generation, fallback behavior, and validator false-negative coverage. It does not change source manifests, source promotion, selection thresholds, public publish behavior, card-level editorial authority, cron settings, or production content.

## Changes

- Replaced broad mechanism/impact template composition for active event types with actor/event/consequence explanations.
- Added event-type-specific deterministic reasoning for legal accountability, government capacity, platform regulation, macro data releases, central bank policy, AI infrastructure policy, cybersecurity enforcement, and institutional governance.
- Added source-accessibility-aware review fallback behavior so metadata-only, failed-fetch, parser-failed, thin partial, abstract-only, and paywall-limited inputs do not produce confident public reasoning.
- Blocked generic "not market-moving", "individual decision-making", source-review, and editorial-review fallback copy from passing the why-it-matters quality gate.
- Added regression coverage for the accepted dry-run failure modes while preserving existing selection and source-accessibility gates.

## Safety

The controlled pipeline remains dry-run only for validation. Draft mode, cron execution, and production data writes remain out of scope.
