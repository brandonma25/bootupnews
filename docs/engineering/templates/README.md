# Engineering Templates

Reusable templates for governance and documentation work in this repo. Use the one that matches your work type.

## Template directory

| Template | Used for | Output destination |
|---|---|---|
| `PRD-template.md` | New feature PRDs | `docs/product/prd/prd-XX-<name>.md` |
| `bug-fix-template.md` | Bug fixes, hotfixes, regressions | `docs/engineering/bug-fixes/<slug>.md` |
| `ADR-template.md` | Durable architectural decisions | `docs/adr/<###>-<slug>.md` + entry in `DECISIONS.md` |
| `incident-template.md` | Process, governance, release, or workflow failures | `docs/engineering/incidents/<YYYY-MM-DD>-<slug>.md` |
| `llm-prompt-template-change-classification.md` | Prompt header for Codex/LLM agents | Top of any implementation prompt |
| `portfolio-doc-freshness-check.md` | Event-triggered freshness check for README, DECISIONS, PR_CLUSTERS | Manual run as needed |

## PRD operational-history index system

PRDs are the source-of-truth for feature spec. Bug-fix and incident records are downstream operational history. The two are connected through a **structured index** at the bottom of each PRD.

When a bug-fix or incident record names `Related PRD: PRD-XX`:
1. The full bug-fix or incident record stays in its canonical folder.
2. A single-line index entry (pre-computed by the template) gets added to the referenced PRD's "Related operational history" section.
3. Multi-PRD case: the same index entry goes in every referenced PRD.
4. CI enforces that the PRD files were modified in the same PR — `scripts/governance_common.py` `validate_prd_index_consistency()`.

The index entry is a pointer, not a summary. The full record stays in its canonical lane.

## Choosing the right template

| Work type | Template | Why |
|---|---|---|
| Net-new product capability | PRD-template | Requires durable scope artifact |
| Fix existing intended behavior | bug-fix-template | Has root cause, blast radius, prevention; auto-indexes to PRD |
| Decide between architectural alternatives | ADR-template | Captures tradeoff reasoning |
| Process/governance failure | incident-template | Drives operating rule changes; auto-indexes to PRD |
| Refactor with no behavior change | None — PR body only | Doc artifact would be ceremonial |

## When you don't need a template

- Tiny copy edits
- One-line typo fixes
- Routine validation runs
- Branch cleanup

PR body and GitHub metadata are sufficient. Don't create public doc files for ceremonial work.
