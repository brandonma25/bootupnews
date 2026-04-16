# Testing Notes: PRD 12 Why This Matters Grounding Fix

## Automated Coverage
- Anchor extraction validity.
- Event-type mapping coverage.
- Low-confidence fallback behavior.
- Repetition-control behavior across a batch.
- Signal strength calibration.

## Validation Intent
- Swap-test resistance should improve because explanations are more event-type and mechanism specific.
- Low-data events should now produce constrained early-signal language instead of malformed text.
