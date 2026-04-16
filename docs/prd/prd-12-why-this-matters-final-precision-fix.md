# PRD 12 — Why This Matters Final Precision Fix

## Summary

This pass tightens the final PRD 12 output path without rewriting the system. It improves entity resolution, isolates domain templates, separates company-event subtypes, removes repeated clauses, and tightens signal labels for thin single-source coverage.

## What Changed

- Added entity priority ranking so named subjects win over weak tokens like `CEO`, `US`, `Tech`, or `Finance`.
- Split company-style stories into narrower subtypes such as early-stage funding, large IPO, data report, and executive move.
- Kept event-type templates domain-specific so macro, funding, product, governance, and legal logic do not bleed into each other.
- Added sentence cleanup to remove repeated clauses inside one explanation.
- Tightened single-source signal calibration so `Strong` is not assigned by topic alone.

## Scope

- `src/lib/event-intelligence.ts`
- `src/lib/why-it-matters.ts`
- targeted regression tests
