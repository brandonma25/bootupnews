# PRD 12 Specificity Fix Testing

## Automated Coverage
- Subject anchoring in opening clauses.
- Event-type-specific reasoning differences across funding, demand, governance, and macro stories.
- Swap-test resistance between unrelated explanations.
- Honest governance fallback behavior under low-data conditions.
- Batch repetition protection across final rendered outputs.
- Signal-label differentiation for strong, weak, and thin-evidence scenarios.
- Grammar normalization for malformed `because changes` phrasing.
- Defense/DoD routing coverage and non-finance domain protection.
- Generic-token subject fallback coverage for product headlines.

## Local Validation
- Run targeted `vitest` coverage for `why-it-matters`, `event-intelligence`, and `summarizer`.
- Run repo lint, full test suite, build, and local dev server smoke check.

## Human Review Focus
- Confirm the first sentence names the subject or a safe event phrase.
- Confirm governance stories stay in governance language.
- Confirm DoD and other geopolitical stories stay in policy or defense language.
- Confirm no single fallback or `Watch for` pattern dominates the page.
- Confirm signal labels feel proportionate across weak, moderate, and strong stories.
