# PRD-20 — Daily Habit Loop Continuity

- PRD ID: `PRD-20`
- Canonical file: `docs/product/prd/prd-20-daily-habit-loop-continuity.md`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective
- Give the briefing continuity across sessions by tracking what is new, changed, escalated, and already reviewed.

## Problem
- Generated event clusters do not have inherently stable read-state identity, so the dashboard needs a continuity layer to preserve user progress across refreshes and later passes.

## Scope
### Must Do
- Generate stable continuity keys and fingerprints for briefing events.
- Persist user event state for last viewed fingerprints and importance snapshots.
- Classify event display state as new, changed, escalated, or unchanged.
- Support toggle-read and mark-all-read flows against continuity state.

### Must Not Do
- Depend on ephemeral generated event ids for durable read-state tracking.
- Collapse continuity and ranking into the same concern.
- Replace the saved-briefing history system.

## System Behavior
- Each briefing item gets a continuity identity based on stable signals rather than transient cluster ids.
- Read actions update persistent user event state.
- The dashboard can summarize what changed since the user’s last pass and decide when the user is caught up.

## Key Logic
- `src/lib/habit-loop.ts` builds continuity keys, fingerprints, display-state labels, and session summaries.
- `src/app/actions.ts` writes `user_event_state` rows when read-state actions run.
- Dashboard rendering consumes continuity state to show new, changed, escalated, and completion indicators.

## Risks / Limitations
- Continuity persistence depends on the `user_event_state` table existing in the target database.
- Fingerprint changes are heuristic and may occasionally over- or under-classify change.
- Public/demo mode cannot fully replicate authenticated persistence.

## Success Criteria
- Users can see which events are newly surfaced versus updated or escalated.
- Read progress survives beyond a single ephemeral dashboard render in live mode.
- The repo has one canonical PRD for the implemented continuity system.

## Done When
- One canonical PRD exists for event continuity identity, state persistence, and progress classification.
