# PRD-XX — <Feature Name>

- **PRD ID:** `PRD-XX`
- **Canonical file:** `docs/product/prd/prd-XX-<feature-name>.md`
- **Status:** Draft | Approved | Shipped | Amended | Superseded by PRD-XX
- **Phase:** Phase 1 | Phase 2 | Phase 3
- **PRD type:** Predictive (written before implementation) | Reconstructive (written after implementation)
- **Created:** YYYY-MM-DD
- **Last updated:** YYYY-MM-DD
- **Related decisions:** D-## (durable decisions this depends on or creates)
- **Related PRDs:** PRD-## (parent), PRD-## (dependency)
- **Feature system row:** update `docs/product/feature-system.csv` with `prd_id` and `prd_file`

> **Note on PRD type:** Predictive PRDs are written before implementation; their value is prioritization discipline. Reconstructive PRDs are written after implementation to backfill durable record; their value is portfolio legibility. Both are legitimate — but they should be honest about which they are. Confidence calibration in Section 11 differs between them.

---

## 1. Problem (in user language)

<!--
Write from the user's perspective, not the feature's perspective.
Wrong: "The system needs a signal ranking layer."
Right: "Users opening the homepage don't know which of the five stories is the most structurally important. They treat all five as equal weight, so the editorial judgment we applied doesn't translate into comprehension."
One paragraph. No feature language.
-->

## 2. Why now / why this

<!--
Why does this need to ship in this phase? What breaks or stays broken if it's deferred?
Force yourself to complete: "If we don't build this in Phase X, then ___."
If you can't complete that convincingly, the prioritization is soft.
-->

## 3. Options considered and why rejected

<!--
The most revealing section for a reviewer. Include at minimum: the chosen path, one real alternative, and "do nothing."
Evidence that prioritization was deliberate.
-->

| Option | Description | Why rejected |
|---|---|---|
| **Chosen: [name]** | | — |
| Alternative: [name] | | |
| Do nothing | | |

## 4. Scope

<!-- What is explicitly in scope. Specific enough that a reviewer could verify completion. -->

- 

## 5. What I'm NOT building

<!--
The most important scope discipline section. An interviewer will look here first.
Each item must explain WHY it's excluded.
Vague exclusions without reasoning are not useful.
-->

- **[Feature]** — excluded because [deferred to Phase X | out of thesis | dependency not ready | premature optimization]

## 6. Implementation shape / system impact

**Object level modified:** Article | Story Cluster | Signal | Card | Surface Placement | Infrastructure

<!--
How this connects to the existing system. Tables, routes, components, services affected.
If you don't know yet, say "TBD pending technical investigation."
-->

## 7. Failure modes I'm accepting

<!--
Risks consciously shipped with. Not a wish list for later — an honest accounting.
-->

- **[Risk]** — accepted because [reason]. Mitigated by [mitigation if any]. Revisit at [phase/trigger].

## 8. Success — and what it doesn't look like

**Success looks like:**
- 

**Success does NOT mean:**
- 

## 9. Dependencies and sequencing rationale

- Requires: [PRD-XX shipped | D-## decision made | env var available]
- Blocks: [PRD-XX cannot start until this ships]
- Sequencing rationale: 

## 10. Acceptance criteria

- [ ] 
- [ ] 

## 11. Evidence and confidence

- **Repo evidence used:** (PRs, issues, dry-run results, user feedback)
- **Confidence level:** Low | Medium | High
- **PRD type note:** If reconstructive — what was the gap between actual implementation and this written record? Be honest.

---

## Closeout checklist

- [ ] Scope completed as specified
- [ ] Terminology check: Article, Story Cluster, Signal, Card, Surface Placement used per `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`
- [ ] Object level explicitly stated in Section 6
- [ ] `docs/product/feature-system.csv` updated: status = Built, decision = keep, last_updated = date
- [ ] Tests run and passing
- [ ] Local validation complete
- [ ] Preview validation complete (if applicable)
- [ ] Production sanity check complete (only after preview passes)
- [ ] Bug-fix record created if a defect was discovered during implementation, with index line added below
- [ ] No Google Sheet or Work Log treated as canonical

---

## Related operational history

> **Auto-maintained pointer index.** Updated by the PR that creates each related artifact.
> The artifacts themselves live in their canonical lanes (`bug-fixes/`, `incidents/`, `CHANGELOG.md`).
> CI enforces structural consistency: `scripts/governance_common.py` `validate_prd_index_consistency()`.

<!--
WRITING GOOD INDEX ENTRIES — read this before adding a line

A good entry tells a future reader what happened without forcing them to open the linked record.
Name the symptom AND the root cause class. Use the same slug as the linked file for traceability.

GOOD:
- 2026-05-15 — notion-env-var-trailing-newline: Notion writes silently dropped due to unsanitized env values → docs/engineering/bug-fixes/notion-env-var-trailing-newline-2026-05-15.md (PR #239)

WEAK (passes CI but produces no signal — do not write these):
- 2026-05-15 — fix: bug fixed (PR #239)
- 2026-05-15 — bug-fix update (PR #239)

Each bug-fix and incident template includes a "PRD index entry" section that pre-computes the line for you.
Copy that line verbatim — do not paraphrase it down to less signal.
-->

### Amendments (this PRD's content was updated)
<!-- Only fill in when Section 4 (Scope), Section 6 (Implementation shape), or other spec-defining sections are amended after Approved status. Renumbering and typo fixes do not need entries here. -->

- YYYY-MM-DD — [section name]: [one-line reason for amendment] (PR #XXX)

### Bug fixes touching this feature

- YYYY-MM-DD — [slug]: [symptom + root cause class] → `docs/engineering/bug-fixes/<slug>.md` (PR #XXX)

### Incidents touching this feature

- YYYY-MM-DD — [slug]: [process/governance/workflow failure class] → `docs/engineering/incidents/<slug>.md` (PR #XXX)

### Multi-PR initiatives building on this PRD

- YYYY-MM-DD — [initiative name]: see CHANGELOG.md entry (PRs #XXX–#YYY)

---

## Post-ship reflection

> **Append this section after the feature ships. Do not fill in before shipping.**
> This is the gap between junior and senior PM documentation. Also the highest-value portfolio artifact in the entire PRD.

**Date shipped:** YYYY-MM-DD
**PR(s):** #XXX

**What I expected:**
(What behavior, metric, or outcome did you predict when writing this PRD?)

**What actually happened:**
(Observed in production, user testing, or pipeline runs. Be specific and honest. If it matched your prediction, say so and explain why that's reassuring or suspicious.)

**What I'd do differently:**
(One or two concrete changes. "Nothing" is almost never the right answer.)

**Interview story potential:** Yes / No
**One-line hook:** (If yes: the tension, tradeoff, or unexpected learning that makes this a story)
