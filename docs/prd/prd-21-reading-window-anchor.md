# PRD-21 — Reading Window Anchor

- PRD ID: `PRD-21`
- Canonical file: `docs/prd/prd-21-reading-window-anchor.md`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective
- Turn estimated reading time into a daily progress anchor so users can understand scan size, completion progress, and day-over-day load.

## Problem
- A raw reading-window string is too weak to guide behavior. The dashboard needs a consistent metric layer that translates briefing content and read state into usable progress feedback.

## Scope
### Must Do
- Compute deterministic reading time for briefing items.
- Aggregate total, completed, and remaining minutes for the current briefing.
- Compare current load against prior reading-window history when available.
- Render a progress-oriented reading module in the dashboard.

### Must Not Do
- Introduce an unrelated tracking system just to support reading metrics.
- Replace the continuity layer’s read-state ownership.
- Expand into full productivity analytics.

## System Behavior
- The dashboard shows total minutes, progress ratio, remaining minutes, day intensity, and delta versus yesterday.
- Reading metrics are derived from existing briefing content and read state rather than separate manual input.
- Public/demo history falls back safely when prior live data is not available.

## Key Logic
- `src/lib/reading-window.ts` calculates item reading time, aggregate window metrics, delta formatting, and intensity labels.
- `src/lib/data.ts` attaches reading metrics to live dashboard data.
- `src/components/dashboard/personalized-dashboard.tsx` renders the reading-window anchor and progress UI.

## Risks / Limitations
- Day-over-day comparison depends on prior saved briefing history.
- Estimated reading time is heuristic rather than measured behavior.
- Public/demo mode cannot fully mirror live historical comparisons.

## Success Criteria
- Users can see daily reading load and completion progress at a glance.
- Reading metrics stay deterministic for the same briefing content.
- The repo has one canonical PRD for the implemented reading-window system.

## Done When
- One canonical PRD exists for reading-window computation, comparison, and dashboard presentation.
