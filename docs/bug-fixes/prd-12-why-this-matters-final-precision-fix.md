# PRD 12 — Why This Matters Final Precision Fix Bug Notes

## Failures Addressed

- Weak entity resolution fell back to role words or generic geography tokens.
- Housing or macro language could leak into unrelated company events.
- Company-event reasoning collapsed across funding, IPO, product, and data-style cards.
- Repeated clauses could survive inside a single explanation.
- Signal labels could overstate thin single-source stories.

## Fix Notes

- Added stronger subject ranking and stop-word filtering for invalid anchors.
- Added company-event subtype routing from headline keywords.
- Isolated template families by domain and subtype.
- Added text-level de-duplication after generation.
- Tightened single-source `Moderate` eligibility.
