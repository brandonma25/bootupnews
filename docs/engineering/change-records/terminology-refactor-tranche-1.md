# Terminology Refactor Tranche 1 Change Record

Date: 2026-04-26

Change type: refactor

This change record exists to route the terminology refactor through the repository documentation coverage gate. The detailed refactor log is:

- `docs/engineering/TERMINOLOGY_REFACTOR_TRANCHE_1.md`

Scope:

- Type aliases, compatibility-preserving internal naming, comments, and tests only.
- No canonical PRD was created because this is not a net-new feature.
- No runtime behavior, schema, route, ranking, clustering, homepage, publication, or editorial workflow changes were introduced.

Deferred:

- Canonical Signal/SignalCandidate identity remains a future Phase 2 modeling task.
- `signal_posts` remains Surface Placement plus Card copy/public read model storage.
