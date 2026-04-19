# Quality Calibration and Output Sanity

## Summary

This pass calibrates the existing deterministic architecture so the visible top signals better match the product thesis without redesigning the system.

## What Changed

- Added a bounded signal-role classifier:
  - core
  - context
  - watch
- Calibrated the top visible selection so the homepage prefers a stronger core/context mix when enough candidates exist.
- Made explanation packets explicitly carry signal role.
- Tightened visible explanation language so top signals and context signals are called out more clearly.
- Added lightweight eval-style tests for ranking sanity, explanation explicitness, and visible output composition.

## What Did Not Change

- Ranking remains canonical and deterministic.
- Explanation remains deterministic-first.
- Horizon remains optional and non-critical.
- No UI redesign, auth changes, ingestion redesign, or clustering redesign were introduced.

## Limits

- The calibration is still heuristic and threshold-based.
- This is not a full editorial layer.
- Broader multi-domain evaluation can expand later if the current compact harness proves insufficient.
