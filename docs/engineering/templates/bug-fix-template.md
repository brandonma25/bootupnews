# <Title> — Bug-Fix Record

- **Date:** YYYY-MM-DD
- **PR:** [#XXX](url)
- **Branch:** 
- **Head SHA:** 
- **Merge SHA:** 
- **Related PRD:** PRD-XX (use comma-separated list for multi-PRD: `PRD-37, PRD-53`. Use `None` for feature-independent fixes such as infrastructure, observability, or CI tooling.)
- **Object level:** Article | Story Cluster | Signal | Card | Surface Placement | Infrastructure | None

---

## Symptom

<!--
Observable behavior only. What a user or operator would see.
"notionRowsWritten was always 0 despite candidateCount > 0."
Not: "The Notion integration was broken."
-->

## Root cause

<!--
One level deeper than the symptom. Not what broke — WHY it was able to break.
Ask: what assumption failed? what invariant was missing? what boundary wasn't enforced?

Weak: "The env var was malformed."
Strong: "NOTION_EDITORIAL_QUEUE_DB_ID had a trailing newline in Vercel. The value was passed to the Notion REST API without sanitization. The per-row error was caught and logged but did not surface in the top-level run result, so the failure was invisible to operators."

The first tells you what to fix now. The second tells you what class of bug to prevent systemically.
-->

## Blast radius

**Affected:**
- 

**Not affected:**
<!-- Prevents over-scoping the fix and documents what was safe to leave alone. -->
- 

## Fix

<!--
Exact change. Files modified. One sentence per change.
-->

- `file.ts` — [what changed and why]

## Prevention

<!--
Required. "None" is only acceptable if the root cause is genuinely non-recurring (one-time infra event, external API change, etc.) — explain why.

Three sub-fields:
1. Code-level invariant
2. Test added
3. Process change

At least one is required. All three is ideal.
-->

- **Code invariant:** 
- **Test added:** 
- **Process change:** 

## Validation

- **Automated checks:** (lint, unit tests, build, Playwright — list which passed)
- **Human checks:** (what a human must verify, e.g., "Confirm rows appear in Notion queue after next cron run")

## Remaining risks / follow-up

<!--
Distinguish between:
(a) risk that exists now, independent of future work
(b) risk that becomes a blocker when a specific future phase ships
-->

- 

---

## PRD index entry

> **Required if `Related PRD` is set above.** Copy the line below verbatim into each referenced PRD's "Bug fixes touching this feature" section in the same PR. Multi-PRD case: same line goes in every referenced PRD.
> If `Related PRD: None`, skip this section.

```
- YYYY-MM-DD — <this-record-slug>: <symptom one-liner derived from Symptom field> → docs/engineering/bug-fixes/<this-record-filename> (PR #XXX)
```

**Derivation rule:** The bracketed values are derived from this record's fields above:
- `YYYY-MM-DD` = this record's Date field
- `<this-record-slug>` = this record's filename without `.md` extension
- `<symptom one-liner>` = compressed version of the Symptom section (under ~120 chars)
- `<this-record-filename>` = the actual filename of this file
- `PR #XXX` = the PR number from the PR field above

**Checklist before merge:**
- [ ] If Related PRD is set, the index line above has been added to each referenced PRD in this same PR.
- [ ] Multi-PRD case: every PRD listed in `Related PRD` has the index entry.
- [ ] If Related PRD is `None`, this is noted as a feature-independent fix in the PR body (infrastructure, observability, etc.).

**CI enforcement:** `scripts/governance_common.py` `validate_prd_index_consistency()` will fail the gate if `Related PRD` is set and the referenced PRD files were not modified in this PR.
