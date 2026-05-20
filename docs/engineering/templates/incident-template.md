# <Title> — Incident Record

- **Date identified:** YYYY-MM-DD
- **Date occurred:** YYYY-MM-DD (may be earlier — incidents are often discovered after the fact)
- **PR(s) involved:** (the PRs that caused or revealed the incident, and the PR that resolved it)
- **Category:** Process | Governance | Release | Workflow
- **Severity:** Low (caught early, no production impact) | Medium (caused rework or delay) | High (caused public-facing impact or required emergency response)
- **Related PRD:** PRD-XX (use comma-separated list for multi-PRD: `PRD-37, PRD-53`. Use `None` for system-wide incidents with no specific feature owner.)

---

## What happened

<!--
Observable facts. Sequence of events. No interpretation yet.
"On 2026-04-30, three preflight failures in PR #155–#157 attempted to bypass an unresolved migration-history mismatch. The migrations were applied with --include-applied-migrations flag, which would have rewritten production migration history."
-->

## Why it happened

<!--
Systemic cause, not surface cause. What about the operating model allowed this to happen?
Weak: "The agent didn't realize the migrations were already applied."
Strong: "The remediation framing for preflight failures defaulted to forcing the next state rather than pausing for diagnosis. The agent's prompt template biased toward action; no STOP gate forced re-classification of unexpected drift as 'investigate before bypassing.'"
-->

## What the operating rule change is

<!--
What rule, protocol, template, or governance artifact changes as a result of this incident.
Be specific. "We will be more careful" is not an operating rule change.
-->

## Validation that the rule change works

<!--
How will future-BM know this rule actually prevents recurrence?
A test that runs in CI? A prompt template change agents must follow? A protocol section that gets audited?

If you can't answer this, the rule change is decorative.
-->

## Related artifacts

- **Operating rule artifacts updated:** (AGENTS.md, protocol files, templates)
- **Related decisions:** D-##
- **Related bug-fix records:** (if the incident also produced a code-level bug that needed fixing)

<!-- The canonical PRD reference for this incident is the **Related PRD:** field in the top metadata block. Do not duplicate it here. -->

---

## PRD index entry

> **Required if `Related PRD` is set above.** Copy the line below verbatim into each referenced PRD's "Incidents touching this feature" section in the same PR.
> If `Related PRD: None`, skip this section.

```
- YYYY-MM-DD — <this-record-slug>: <one-line derived from Why it happened> → docs/engineering/incidents/<this-record-filename> (PR #XXX)
```

**Derivation rule:** The bracketed values are derived from this record's fields above:
- `YYYY-MM-DD` = this record's Date identified field
- `<this-record-slug>` = this record's filename without `.md` extension
- `<one-line>` = compressed version of the Why it happened section (under ~120 chars)
- `<this-record-filename>` = the actual filename of this file
- `PR #XXX` = the PR number that resolved the incident

**Checklist before merge:**
- [ ] If Related PRD is set, the index line above has been added to each referenced PRD in this same PR.
- [ ] Multi-PRD case: every PRD listed in `Related PRD` has the index entry.
- [ ] If Related PRD is `None`, this is noted as a system-wide incident in the PR body.

**CI enforcement:** `scripts/governance_common.py` `validate_prd_index_consistency()` will fail the gate if `Related PRD` is set and the referenced PRD files were not modified in this PR.
