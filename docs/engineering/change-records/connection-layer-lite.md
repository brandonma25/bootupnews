# Connection Layer Lite

## What changed

- Added a compact canonical connection layer inside explanation packets.
- Added deterministic-first support for:
  - `what_led_to_this`
  - `what_it_connects_to`
- Kept final assembly app-owned and donor-assisted rather than donor-owned.
- Added a small existing-surface wiring change so story cards can render the new fields when available.

## Donor mapping

- `after_market_agent`
  - active primary support for deterministic connection assembly patterns
- `horizon`
  - optional secondary boundary for future schema-safe connection enrichment

## Why this stayed bounded

- No graph system
- No clustering redesign
- No ranking rewrite
- No broad UI expansion

## Remaining limits

- Connection output is still heuristic and conservative.
- Weak or thin signals deliberately fall back instead of forcing a narrative.
- Horizon remains skipped-by-default in runtime output.
