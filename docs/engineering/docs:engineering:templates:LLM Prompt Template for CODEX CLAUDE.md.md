# LLM Prompt Template for Other CODEX / CLAUDE

**Purpose:** Reusable prompt header/template for Codex, Claude, or other LLM coding agents so they can reliably distinguish **feature** work from **remediation**, **refactor**, **bug-fix**, and **hotfix** work before making governance decisions.

**Why this exists:** Code changes alone are often ambiguous. A new route, schema migration, or UI surface can either be a **net-new feature** or a **remediation/alignment** to an already approved spec. This template forces explicit classification and source-of-truth references so the LLM does not invent the wrong governance path.

---

## Core Rule

The LLM must **not infer governance type from code diff alone** when the user has already declared the work type.

Order of precedence:

1. **Explicit declared change type**
2. **Declared source of truth**
3. **Governance rules**
4. **Only then, diff/context-based inference if needed**

---

## Approved Change Types

### 1) Feature
Use when the work introduces a **net-new product capability** or **new user-facing behavior/scope**.

**Requires:**
- Canonical PRD
- Feature-system mapping
- Standard feature governance path

---

### 2) Remediation / Alignment
Use when the work **corrects an implementation**, **aligns shipped code to an already-approved spec**, or **repairs architecture/behavior drift** without adding net-new product scope.

**Requires:**
- Existing source of truth reference (existing PRD, artifact set, approved spec), or
- Engineering remediation brief / implementation note

**Does NOT require:**
- New canonical PRD

---

### 3) Refactor
Use when the work improves internals, structure, maintainability, or technical design without changing intended product behavior.

**Requires:**
- Engineering note only if useful

**Does NOT require:**
- New canonical PRD

---

### 4) Bug-fix
Use when the work fixes a scoped defect in existing intended behavior.

**Requires:**
- Bug-fix report / issue / defect reference if available

**Does NOT require:**
- New canonical PRD

---

### 5) Hotfix
Use when the work is an urgent production defect fix.

**Requires:**
- Incident / hotfix note / issue reference if available

**Does NOT require:**
- New canonical PRD

---

## Decision Table

| Change Type | Net-New Product Capability? | Canonical PRD Required? | Required Reference |
|---|---:|---:|---|
| Feature | Yes | Yes | New PRD |
| Remediation / Alignment | No | No | Existing approved spec/artifact or remediation brief |
| Refactor | No | No | Engineering note if needed |
| Bug-fix | No | No | Bug-fix doc / issue |
| Hotfix | No | No | Incident / hotfix note |

---

## Reusable Prompt Header

Copy and place this at the top of any Codex/Claude/LLM implementation prompt.

```text
CHANGE TYPE: <feature | remediation | refactor | bug-fix | hotfix>

SOURCE OF TRUTH:
<new PRD OR existing PRD/artifact set OR bug report OR remediation brief>

GOVERNANCE RULES:
- If CHANGE TYPE = feature:
  - canonical PRD is required
  - feature-system mapping is required
- If CHANGE TYPE = remediation:
  - do NOT create a new canonical PRD
  - reference the existing approved source of truth
  - use remediation/engineering documentation instead if needed
- If CHANGE TYPE = refactor:
  - do NOT create a new canonical PRD
- If CHANGE TYPE = bug-fix:
  - do NOT create a new canonical PRD
- If CHANGE TYPE = hotfix:
  - do NOT create a new canonical PRD

INSTRUCTION TO LLM:
Do not infer this work as a new feature if the declared CHANGE TYPE says otherwise, unless the declared type is clearly contradicted by the requested scope. If contradiction exists, flag it explicitly before proceeding.
```

---

## Full Prompt Template

```text
You are working in the existing repo and existing current branch unless explicitly told otherwise.

CHANGE TYPE: <feature | remediation | refactor | bug-fix | hotfix>

SOURCE OF TRUTH:
- Primary: <link/path/name of PRD, artifact set, bug report, remediation brief, etc.>
- Secondary: <optional>

BUSINESS / GOVERNANCE INTENT:
- This work should be treated as <declared change type>.
- Do not reclassify it as a net-new feature unless the requested scope clearly introduces new product capability beyond the stated source of truth.
- If you detect a contradiction between the declared change type and the requested implementation, flag it clearly.

GOVERNANCE RULES:
- Feature → canonical PRD required
- Remediation / Alignment → no new canonical PRD; reference existing approved spec/artifacts or remediation brief
- Refactor → no new canonical PRD
- Bug-fix → no new canonical PRD
- Hotfix → no new canonical PRD

DELIVERY CONSTRAINTS:
- Keep scope tight
- Do not widen product scope without explicit approval
- Preserve existing source-of-truth hierarchy
- Keep verified fact separate from inference
- Follow repo documentation conventions where applicable

TASK:
<describe implementation, validation, analysis, or documentation task here>

OUTPUT REQUIREMENTS:
1. State the effective change type you are operating under
2. State the source of truth you are using
3. State whether a canonical PRD is required
4. If not required, state what documentation artifact should be used instead
5. Complete the requested task
```

---

## Example — Feature

```text
CHANGE TYPE: feature

SOURCE OF TRUTH:
New product requirement to add team sharing for briefings

GOVERNANCE RULES:
Feature → canonical PRD required

TASK:
Draft the implementation plan and identify the required PRD artifacts.
```

**Expected result:** LLM should require a new PRD and feature-system mapping.

---

## Example — Remediation

```text
CHANGE TYPE: remediation

SOURCE OF TRUTH:
artifacts0-10 for V1 Daily Intelligence Briefing

GOVERNANCE RULES:
Remediation → do NOT create a new canonical PRD

TASK:
Fix production shell, auth gating, redirect-after-auth, /account, and /briefing/[date] so the app matches the approved V1 artifacts.
```

**Expected result:** LLM should treat this as alignment to an existing approved spec, not as a net-new feature.

---

## Example — Bug-fix

```text
CHANGE TYPE: bug-fix

SOURCE OF TRUTH:
Issue #123 — Forgot Password link missing on login page

TASK:
Restore the Forgot Password link and validate the flow.
```

**Expected result:** No new PRD.

---

## Example — Contradiction Case

```text
CHANGE TYPE: remediation

SOURCE OF TRUTH:
Existing V1 artifacts

TASK:
Add a new collaborative annotation mode for team members across all briefing pages.
```

**Expected result:** LLM should flag that the task appears to introduce a **net-new feature**, and that the declared change type may be wrong.

---

## Recommended GitHub Placement

Best-fit folder in this repo:

`docs/engineering/templates/`

**Why:**
- This is an operational prompt/governance template, not a product PRD
- It is reusable infrastructure for engineering workflow
- It should live near implementation and process documentation, not in `docs/product/prd/`

### Avoid
- `docs/product/prd/` → wrong, because this is not a PRD
- root directory → too noisy and not durable

---

## Suggested Filename

`LLM Prompt Template for Other CODEX CLAUDE.md`

---

## Recommended Next Organizational Step

After storing this template, the next durable improvement is to align:
1. PR template
2. governance docs
3. release-governance automation

around the same explicit field:

```text
CHANGE TYPE: <feature | remediation | refactor | bug-fix | hotfix>
```

Without that shared field, documentation alone will still leave room for ambiguous interpretation.

---
