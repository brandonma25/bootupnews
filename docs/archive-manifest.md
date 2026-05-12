# Archive Manifest

This manifest records the first public documentation cleanup pass for Boot Up's interviewer-facing repository surface.

The files listed here were removed from the public browse path after private preservation because they were operational records, stale handoff notes, duplicate prompt-packet artifacts, or stray root files. The cleanup separates portfolio-facing documentation from implementation and operations history while preserving evidence outside the public repository.

## Removed in Phase 4B.1

| Path | Reason |
| --- | --- |
| `PROJECT.md` | Stale internal project handoff and worklog with old product framing. |
| `QA-LIVE-TEST-2026-04-15.md` | Historical production QA log that belongs in private operational records, not the public repo surface. |
| `0` | Empty stray root file with no documentation value. |
| `docs/engineering/docs:engineering:templates:LLM Prompt Template for CODEX CLAUDE.md.md` | Duplicate prompt-packet-style artifact superseded by the canonical engineering template. |

## Removed in Phase 4K

These folders contained operational logs, change records, testing diaries, tracker-sync records, controlled-cycle records, branch-cleanup records, launch/readiness artifacts, or other implementation-history material. They were preserved externally before removal, then removed from the public browse path to separate portfolio-facing documentation from operational history.

Durable public context now lives in `README.md`, `DECISIONS.md`, canonical PRDs, stable governance docs, GitHub PR metadata, and the canonical LLM change-classification template.

| Path | File count | Reason |
| --- | ---: | --- |
| `docs/operations/` | 113 | Operational logs, tracker-sync records, controlled-cycle records, branch-cleanup records, and launch/readiness artifacts were removed from the public browse path after preservation. |
| `docs/engineering/change-records/` | 100 | Per-change implementation records were removed from the public browse path after preservation. |
| `docs/engineering/testing/` | 42 | Testing diaries and validation transcripts were removed from the public browse path after preservation. |
