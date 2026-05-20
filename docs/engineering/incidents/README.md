# Incidents

This folder records meaningful **process, governance, release, or workflow failures** — distinct from product or system defects (which go in `docs/engineering/bug-fixes/`).

## When to file an incident record

- A release process broke and the system needs a new operating rule.
- A governance gate failed silently (e.g., a doc lane was missed across multiple PRs before detection).
- A workflow drift was discovered (e.g., parallel sources of truth diverged).
- An agent classification error caused scope creep that had to be unwound.

## When NOT to file an incident record

- Product defects, runtime errors, or data bugs → `docs/engineering/bug-fixes/`.
- One-off failures that don't change how the repo is operated → PR body.
- Routine validation failures → PR body.

## Template

Use `docs/engineering/templates/incident-template.md`.

## Naming

`YYYY-MM-DD-short-kebab-slug.md`. The date is the date the incident was identified, not necessarily when it occurred.

## PRD index requirement

If an incident touches a feature that has a canonical PRD, the incident record sets `Related PRD: PRD-XX` and the same PR must update the referenced PRD's "Related operational history" index. This is documented in the templates introduced in PR 2 of the docs overhaul. CI enforcement is added in PR 4 of the docs overhaul (see `scripts/governance_common.py` `validate_prd_index_consistency()` once that PR has merged).
