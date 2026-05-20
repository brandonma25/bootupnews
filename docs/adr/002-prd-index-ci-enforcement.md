# ADR 002: PRD Operational-History Index CI Enforcement

## Decision

Enforce PRD operational-history index consistency at CI gate time. When a bug-fix or incident record sets `Related PRD: PRD-XX` (or a comma-separated list of PRD IDs), the referenced PRD file(s) must be modified in the same PR, or the governance gate fails. The check is implemented as `validate_prd_index_consistency()` in `scripts/governance_common.py` and is wired into `scripts/release-governance-gate.py` before classification-based branching so that docs-only bug-fix PRs — the most common case — are not skipped. `Related PRD: None` bypasses the check for feature-independent fixes (infrastructure, observability, CI tooling, system-wide incidents).

## Context

PR-2 of the docs overhaul introduced new templates and an AGENTS.md redesign that documented a structural pattern: every PRD has a "Related operational history" section at the bottom, indexing the bug fixes, incidents, amendments, and multi-PR initiatives that touched the feature. The templates pre-compute the index-entry line and instruct authors to copy it verbatim into each referenced PRD in the same PR.

That pattern needs a structural enforcement layer because semantic quality (BM review at merge time) does not catch missed updates. Agents can satisfy template checklists without actually modifying the referenced PRD, and the resulting drift compounds silently: a PRD's operational history grows incomplete over time, and the connective tissue between spec and downstream history erodes. The CI gate closes the structural gap (was the PRD modified at all?), while reviewer judgment keeps the semantic gate (does the index line convey actual signal?).

This ADR is being written specifically because the governance gate caught a real spec gap during PR-4's own execution: spec v4 instructed adding only `CHANGELOG.md` and `scripts/` changes to PR-4, but the gate correctly classified that diff as `material-feature-change` requiring a documented lane. That failure is the use case this ADR documents: the gate is a backstop for spec-author oversight, not just for agent oversight.

## Options considered

**Option 1: CI gate validation in `release-governance-gate.py` (chosen).** A pre-merge check that fails the gate if a bug-fix or incident record names a `Related PRD` whose file is not also in the PR diff. Advantage: the check fires before merge, so drift cannot accumulate; the failure message is actionable and points at the missing PRD path; the templates already pre-compute the line to copy, so satisfying the gate is mechanical. Disadvantage: introduces friction for typo-fixes to existing bug-fix records (any edit to a bug-fix file triggers re-validation, which fails unless the referenced PRD is also touched); the older `- Related PRD:` format used by pre-overhaul records is silently skipped because the regex matches only the new `- **Related PRD:**` template format.

**Option 2: Reviewer-only enforcement at merge time.** Leave the structural check to BM during PR review; the templates and AGENTS.md already document the rule. Advantage: zero infrastructure, zero false positives, zero friction. Disadvantage: this is precisely the failure mode the index system was designed to eliminate. The whole point of the structured index is that pattern-based connections compound only if the connections are reliably made; relying on human-only enforcement re-introduces the silent-drift problem that motivated the system. Reviewer attention is also the scarcest resource in a solo build.

**Option 3: Post-merge audit script.** Run a periodic sweep (cron or manual) that scans existing bug-fix and incident records, checks each `Related PRD` against the corresponding PRD's index, and reports missing entries. Advantage: no pre-merge friction; catches drift over time including retroactive cases (existing records pre-dating the gate). Disadvantage: defers detection, which means drift can ship and be discovered later, when fixing it requires opening a remediation PR rather than amending the originating PR's diff. Post-merge audits are also weaker portfolio evidence — they prove the system was monitored, not that the system enforced its invariants at the point of change.

## Decision rationale

Option 1 is the right stage-N decision because Phase 1 is closing and Phase 2 is being scheduled, which is the highest doc-drift risk window in the project. Pre-merge enforcement is the appropriate cost for that risk profile: the friction is bounded (touching a bug-fix record costs one additional PRD edit), the failure mode is loud and actionable, and the check is mechanical enough that agents can satisfy it without judgment. Reviewer-only enforcement (Option 2) would compound the exact problem the index system was designed to solve. Post-merge audits (Option 3) are a useful complement but not a replacement, because they detect rather than prevent.

The check is placed in `release-governance-gate.py` before the classification-based early returns. Spec v4 placed it after `find_missing_doc_groups`, but that path is skipped for `docs-only` and `trivial-code-change` classifications — which is exactly the classification of a bug-fix PR that adds one .md file. Moving the check up was a corrective deviation from the spec; the spec's own smoke test (a fake bug-fix with an unmatched PRD reference) only fails as designed under the corrected placement.

## Accepted consequences

- **Friction for typo-fixes to bug-fix records.** Any edit to a file under `docs/engineering/bug-fixes/` that names a `Related PRD` will fail the gate unless the referenced PRD is also modified. For a one-character correction to a record, that is real overhead. The mitigation is that one of the gate failure messages tells the author exactly which PRD path to touch, and the bug-fix template's "PRD index entry" section pre-computes the line to copy. The friction is real and noted.

- **Older records pre-dating the new template format are silently skipped.** The regex matches only `- **Related PRD:**` (the new bullet-asterisks format). Existing records use `- Related PRD:` without asterisks, which the regex does not match — `extract_prd_references` returns `([], False)` and the validator returns no error. That is correct for now (those records pre-date the gate and their PRDs were never indexed), but it means a future bulk retrofit will need to normalize the field format before the gate becomes meaningful for legacy records. Flagged as Open Flag #2 in the docs-overhaul spec.

- **Semantic quality of index entries remains BM's responsibility.** The CI gate enforces structural consistency (was the PRD modified?). It does not enforce that the index line meaningfully describes what happened — an agent can satisfy the structural gate with "fix: bug fixed (PR #239)" and the gate is happy. The bug-fix and incident templates pre-compute the line to copy verbatim; reviewer catches paraphrased-down-to-no-signal entries at merge time. This is consciously a two-gate system (CI + human), not a one-gate system.

## Revisit trigger

This decision should be reopened when:

- The false-positive rate from typo-fix friction becomes painful enough that authors regularly want to bypass the gate, suggesting the cost has outgrown the risk profile.
- The legacy-record silent-skip surfaces a real gap — for example, an audit finds a meaningful operational footprint that was missed because the records used the older field format and the gate was the only thing expected to catch the cross-reference.
- The PRD operational-history index pattern itself is superseded by a different cross-reference mechanism (e.g., a generated index built from frontmatter at render time, which would remove the need for in-PR enforcement).

The default expectation is that the rule holds through Phase 2. Phase 3 — if it changes the surface area significantly — is a natural point to re-evaluate.

---

## Cross-references

- **DECISIONS.md entry:** D13
- **Related PRDs:** None (this is governance infrastructure, not feature work)
- **Related audits/incidents:** PR [#257](https://github.com/brandonma25/bootupnews/pull/257) (the PR that landed this enforcement and surfaced the spec gap that motivated this ADR); `DOCS_OVERHAUL_SPEC_v4.md` sections 5.1–5.5.
