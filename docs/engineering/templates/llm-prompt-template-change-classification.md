# LLM Prompt Template — Change Classification & Governance

## Purpose

Reusable prompt header/template for Codex or other LLM coding agents so they can reliably distinguish **feature** work from **remediation**, **refactor**, **bug-fix**, and **hotfix** work before making governance decisions.

## Why This Exists

Code changes alone are often ambiguous. A new route, schema migration, or UI surface can either be a **net-new feature** or a **remediation/alignment** to an already approved spec. This template forces explicit classification and source-of-truth references so the LLM does not invent the wrong governance path.

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

### 2) Remediation / Alignment

Use when the work **corrects an implementation**, **aligns shipped code to an already-approved spec**, or **repairs architecture/behavior drift** without adding net-new product scope.

**Requires:**
- Existing source-of-truth reference, such as an existing PRD, artifact set, or approved spec
- Or an engineering remediation brief / implementation note

**Does NOT require:**
- New canonical PRD

### 3) Refactor

Use when the work improves internals, structure, maintainability, or technical design without changing intended product behavior.

**Requires:**
- Engineering note only if useful

**Does NOT require:**
- New canonical PRD

### 4) Bug-fix

Use when the work fixes a scoped defect in existing intended behavior.

**Requires:**
- Bug-fix report / issue / defect reference if available

**Does NOT require:**
- New canonical PRD

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

Copy and place this at the top of any Codex/LLM implementation prompt.

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

## Full Prompt Template

Use this fuller version when the work involves multiple files, governance-sensitive areas, or possible ambiguity between product scope and remediation.

```text
CHANGE TYPE: <feature | remediation | refactor | bug-fix | hotfix>

SOURCE OF TRUTH:
<new PRD OR existing PRD/artifact set OR bug report OR remediation brief>

BUSINESS / GOVERNANCE INTENT:
<why this work exists and what outcome should be protected>

SCOPE:
- <what may be changed>
- <what must remain unchanged>

DO NOT:
- create a new PRD unless CHANGE TYPE = feature
- expand product scope beyond the declared source of truth
- infer governance type from the diff alone

VALIDATION:
- report the final classification
- report files changed
- report whether code, docs, schema, tests, or config changed
- report any governance uncertainty before proceeding
```

## Examples

- Feature: adding a new user-facing archive surface with a new route and product behavior.
- Remediation / Alignment: correcting an existing surface so it matches an approved PRD.
- Refactor: reorganizing internal modules without changing intended behavior.
- Bug-fix: repairing a scoped defect in existing behavior.
- Hotfix: urgent production repair with a narrow incident reference.

## Recommended GitHub Placement

Use this template in issue bodies, pull request planning comments, or implementation prompts before code changes begin.

## Suggested Filename

`docs/engineering/templates/llm-prompt-template-change-classification.md`

## Recommended Next Organizational Step

Keep this canonical template stable and reference it from future governance docs instead of copying internal prompt packets into public-facing documentation.
