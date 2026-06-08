# AGENTS.md — Codex Operating Rules

**Audience:** AI coding agents (Codex, Claude Code, Cursor) operating in this repo.
**Maintainer:** BM (solo). Only BM updates this file. Agents propose changes in output; they do not self-edit.
**Read order:** This file first. Always. Before any implementation, documentation, or governance work.

For new readers (humans or agents seeing this repo cold), the documentation read order is in `docs/README.md`.

---

## 0. Project Identity

Boot Up (bootupnews.com) is a daily intelligence brief for ambitious 18–26 year olds. The product competes on comprehension density — fewer signals, explained well enough that the user can articulate why each matters. Stack: Next.js, Vercel, Supabase, Node.js pipeline. BM is the only human in the loop.

Key object model: **Article → Story Cluster → Signal → Card → Surface Placement.** Read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md` before any implementation touching these objects. Do not use cluster, signal, story, or card interchangeably.

---

## 1. BEFORE ANY WORK — Required Declarations

Every task, without exception, must begin with these four declarations in your first response:

```
CHANGE TYPE:    <feature | remediation | refactor | bug-fix | hotfix | docs-only>
SOURCE OF TRUTH: <PRD-XX | D-## | issue # | user instruction>
SCOPE CHECK:    <in-scope (PRD-##) | out-of-scope (rejected) | scope amendment (D-##)>
ARTIFACT REQUIRED: <new PRD | bug-fix record | ADR | incident record | none>
```

Full classification rules → `docs/engineering/templates/llm-prompt-template-change-classification.md`.

**Contradiction rule:** If the requested task scope contradicts the declared change type (e.g., task adds net-new capability but is declared as remediation), **stop and flag explicitly before proceeding.** Do not silently widen scope.

---

## 2. Source-of-Truth Hierarchy

When sources conflict, this order governs:

1. `README.md` (root) + Product Position thesis — North Star.
2. `docs/product/prd/PRD-XX.md` — approved per-feature requirements.
3. `DECISIONS.md` + `docs/adr/` — durable architectural and product decisions.
4. `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md` — object-level naming authority.
5. This file (`AGENTS.md`) — agent operating rules.
6. `docs/product/feature-system.csv` — PRD mapping, build order, feature state.
7. `docs/product/documentation-rules.md` — folder routing taxonomy.
8. `docs/engineering/protocols/*.md` — release, testing, governance protocols.
9. GitHub repo state (PRs, merged code) — implementation evidence.

If two sources disagree, **stop and surface the conflict.** Do not silently pick one.

---

## 3. Hard STOP Conditions

Stop immediately and surface to BM before proceeding if:

- Change type classification is genuinely ambiguous.
- Two source-of-truth documents disagree.
- The task implies amending a durable decision (D-series).
- The task touches production data, cron, publish state, or secrets without an explicit cleared gate.
- A branch already owned by another worktree is being requested.
- Required env vars are empty or malformed.
- Migration-history drift or schema mismatch is detected.
- An attempt to use `--force` or `--ignore-other-worktrees` would bypass branch/worktree safety.

**Default:** stop more often than feels comfortable. Over-asking is cheaper than over-acting in this repo.

---

## 4. Folder Map — Where Things Live

```
/                          ← AGENTS.md, DECISIONS.md, CHANGELOG.md, README.md
docs/
├── README.md              ← Documentation read-order for new readers
├── product/
│   ├── prd/               ← prd-01.md, prd-02.md, ... (canonical PRDs only)
│   ├── briefs/            ← Product briefs for meaningful non-PRD feature work
│   ├── feature-system.csv ← PRD → system mapping, build order, status
│   └── documentation-rules.md
├── engineering/
│   ├── templates/         ← ALL reusable templates (canonical single source)
│   ├── protocols/         ← Operating rules, checklists, process standards
│   ├── bug-fixes/         ← One .md per bug (flat, dated)
│   ├── incidents/         ← Process / governance / workflow failures
│   ├── reports/           ← Point-in-time diagnostic reports (incl. notion-*-schema.md)
│   ├── ARCHITECTURE.md, CRON_SETUP.md, OBSERVABILITY.md
│   ├── archive-manifest.md
│   └── BOOTUPNEWS_CANONICAL_TERMINOLOGY.md
├── adr/                   ← Long-form ADRs (cross-referenced from DECISIONS.md)
├── portfolio/             ← PR_CLUSTERS.md, portfolio artifacts
└── audits/                ← Source and architecture audits
```

**Routing rules:**

| Work type | Destination |
|---|---|
| New feature | `docs/product/prd/prd-XX-<name>.md` + `feature-system.csv` row |
| Remediation / refactor / chore | PR body (no separate doc file) |
| Multi-PR initiative | `CHANGELOG.md` entry (root) |
| Bug / hotfix | `docs/engineering/bug-fixes/<slug>.md` + PRD index update |
| Architectural decision | `docs/adr/<###>.md` + D-## entry in `DECISIONS.md` |
| Process / governance / workflow failure | `docs/engineering/incidents/<YYYY-MM-DD>-<slug>.md` + PRD index update |
| Process rule / checklist | `docs/engineering/protocols/` |
| Template | `docs/engineering/templates/` |
| Audit / diagnostic | `docs/engineering/reports/` or PR body |

Do **not** create new records in `docs/bugs/`, `docs/changes/`, or `docs/engineering/change-records/` — all deprecated.

---

## 5. PRD Operational-History Index — Mandatory When Touching a Feature

PRDs are the spec layer. Bug-fix and incident records are the operational-history layer. They connect through a structured index at the bottom of each PRD.

**The rule:**

When a bug-fix or incident record sets `Related PRD: PRD-XX` (or a comma-separated list like `PRD-37, PRD-53`):
1. The full record stays in its canonical folder (`bug-fixes/` or `incidents/`).
2. A single-line index entry (pre-computed by the template) must be added to each referenced PRD's "Related operational history" section.
3. The PRD edit must land in the **same PR** as the bug-fix or incident record.

**CI enforces this.** `scripts/release-governance-gate.py` calls `validate_prd_index_consistency()`. The gate fails if:
- A bug-fix or incident record names a PRD-XX but the referenced PRD file was not modified in the same PR.
- A bug-fix or incident record names a PRD-XX that doesn't have a matching file in `docs/product/prd/`.
- A bug-fix or incident record still contains the literal `PRD-XX` placeholder (template was not filled in).

**The `None` case:** Set `Related PRD: None` for feature-independent fixes (infrastructure, observability, CI tooling, system-wide incidents). The CI gate skips the index check.

**Multi-PRD case:** Bug fixes that span multiple PRDs (e.g., a migration drift bug touching PRD-37, PRD-53, and PRD-42) must update all referenced PRDs in the same PR. The same index entry line goes in each.

**What CI does NOT enforce:** the *quality* of the index entry. An agent can satisfy the structural gate with "fix: bug fixed (PR #239)" — and that satisfies CI but produces no signal. BM's review at merge time is the semantic quality gate. The bug-fix and incident templates pre-compute the line; copy it verbatim, do not paraphrase down to less signal.

---

## 6. Template Routing

All templates live in `docs/engineering/templates/`. See `docs/engineering/templates/README.md` for the directory.

| Work type | Template |
|---|---|
| New feature | `PRD-template.md` |
| Bug fix / hotfix | `bug-fix-template.md` |
| Architectural decision | `ADR-template.md` |
| Process / workflow incident | `incident-template.md` |
| LLM prompt classification header | `llm-prompt-template-change-classification.md` |

If unsure which template applies, default to **bug-fix-template** if work fixes existing intended behavior, **PRD-template** if work adds new capability, and **flag the ambiguity** to BM otherwise.

---

## 7. Branch and Git Discipline

**Workspace identity check — run first on every task:**

```bash
pwd && git branch --show-current && git status --short --branch && git worktree list
```

Report: current folder, branch, worktree list, whether requested branch already exists, whether it is owned by another worktree.

**Branch rules:**
- Always start from updated `main`.
- One branch per feature / fix / docs / chore. No mixed changes.
- No `*-wip`, `*-backup`, or `*-final` branches.
- If a branch is already owned by another worktree, stop — do not `--force`.
- After merge: delete branch locally and remotely.

**Required new-branch flow:**
```bash
git checkout main && git pull
git checkout -b <type>/prd-<number>-<short-name>
```

---

## 8. PRD Governance

- Every feature has exactly one canonical PRD at `docs/product/prd/prd-XX-<name>.md`.
- Before creating a new PRD: check `docs/product/prd/` and `docs/product/feature-system.csv`. The ID may already exist.
- Amend an existing PRD in-place rather than creating a second file for the same PRD-ID.
- New PRDs get the next sequential ID. Register both `prd_id` and `prd_file` in `feature-system.csv` in the same PR.
- Filename rule: lowercase kebab-case, zero-padded through 09: `prd-01-...`, `prd-09-...`, `prd-10-...`.
- Do not create architecture notes or system briefs in `docs/product/prd/` — those go in `docs/engineering/`.

**feature-system.csv status transitions:**
- Active work → `In Progress`
- Awaiting merge → `In Review`
- After merge + acceptance → `Built` / `decision = keep` / update `last_updated`
- No longer active → `Deprecated`
- CSV must be updated in the same PR as the feature work.

---

## 9. Validation Order

Local → Vercel Preview → Production. Never use production as first-pass debugging.

**Required automated checks before any PR:**
```bash
npm install
npm run lint || true
npm run test || true
npm run build
```

For UI, auth, routing, SSR, or data-rendering changes: run Playwright after build.
```bash
npx playwright test --project=chromium
```

Report: exact commands run, pass/fail, remaining preview-required and human-only checks. Do not claim preview or production validation from local results alone.

**Human validation required for:** OAuth/login flows, session persistence, preview environment behavior, env-sensitive changes.

---

## 10. CI Enforcement You Must Satisfy

These CI jobs will block your PR if you skip the governance contract. Plan to satisfy them up front, not after CI failure:

| CI job | What it enforces |
|---|---|
| `feature-system-csv-validation.yml` | CSV schema locked to 12 columns in exact order. Any new column or reorder fails. |
| `release-governance-gate.yml` (doc coverage) | Documentation coverage based on PR classification. Bug-fix work must update `docs/engineering/bug-fixes/`. New feature work must update `docs/product/prd/`. Material work must update at least one truthful doc lane. |
| `release-governance-gate.yml` (PRD index check) | If a bug-fix or incident record has `Related PRD: PRD-XX`, the referenced PRD file must be modified in the same PR. Multi-PRD references (`PRD-37, PRD-53`) require all referenced PRDs to be modified. Skipped when `Related PRD: None`. |
| `pr-governance-audit.py` | Non-blocking classification audit. Posts a summary of detected change type and required artifacts. |
| `preview-gate.yml` | Validates preview deployment before merge. |
| `production-verification.yml` | Post-merge production smoke check. |

Local check (run before pushing):
```bash
python scripts/release-governance-gate.py --base origin/main --head HEAD
```

The script is the source of truth for documentation lane mappings. If you discover the script considers a lane deprecated that the docs treat as canonical (or vice versa), **flag it** — that's a documentation-drift incident.

---

## 11. Documentation Rules

- **Every bug fix or meaningful change** needs a doc artifact (bug-fix record, ADR, or incident record). Thin docs mid-cycle are a documented failure mode.
- **Bug-fix and incident records that name a `Related PRD`** must update that PRD's index in the same PR — CI enforces this.
- Never commit secrets, tokens, API keys, or raw env values — env var names only.
- Google Sheet / Google Work Log are historical reference only. Do not update or treat as canonical.
- Operational evidence (validation transcripts, branch cleanup, closeout notes) lives in PR bodies and GitHub metadata, not in public doc files.
- Public repo docs are for durable product framing, PRDs, decisions, governance rules, and stable templates.
- For multi-PR initiatives (3+ PRs under the same PRD), add an entry to `CHANGELOG.md` at the root. Not per-PR — per-initiative.

---

## 12. Communication Norms

- **No validation.** No "great question," "you're absolutely right," or compliments. BM is in senior PM / engineer mode.
- **Lead with weakness.** When reviewing BM's work or decisions, surface the strongest objection or risk before strengths.
- **One recommendation.** When asked for a recommendation, give one with reasoning. No hedged option lists unless genuinely unresolvable.
- **Concise.** Short declarative sentences. No preambles.
- **Surface, do not patch.** Ops blockers (missing env var, schema drift, migration mismatch) are surfaced as blockers, not worked around.

---

## 13. Known Failure Modes — Recognize and Avoid

These have cost this project real time. Recognize them on sight:

- **Scope creep under remediation framing.** Adding net-new behavior while claiming "alignment to existing spec." Flag and stop.
- **Auto-proceeding past STOP gates.** "Do steps 1–5" does not mean "continue through step 6 when step 5 says stop." Explicit STOP means return output and wait.
- **Bias toward feature classification.** Codex's default framing is often "feature" when the work is actually remediation or bug-fix. Always check before accepting first-pass classification.
- **Template-level fix when architecture is wrong.** If 84% of outputs need rewriting, the fix is architectural, not template-level.
- **Sources-of-truth proliferation.** Multiple records of the same decision in different systems create drift. Reference the canonical one; do not create a new record that shadows it.
- **Documentation thinness mid-cycle.** Mid-sprint PRs with no record are compounding debt. Every meaningful PR gets a doc.
- **Gate-satisfaction without signal.** Especially relevant to the PRD index check: a bug-fix PR can satisfy the structural CI gate with a malformed or empty-signal index line ("fix: bug fixed"). The templates pre-compute the line to copy; copy it verbatim. Reviewer catches semantic quality at merge time.
- **Service-role key recurrence.** Empty env vars have caused the same blocker multiple times. Always preflight env completeness. Surface it; do not attempt to proceed.
- **Documentation drift between docs and CI.** If `governance_common.py` and `documentation-rules.md` disagree on a folder's canonical status, file an incident record. This is exactly the kind of silent failure that compounds.

---

## 14. Diagnosis discipline

When investigating a question that will gate a code change, before giving any recommendation:

1. **Ground every load-bearing claim.** List the claims your recommendation depends on. For each, paste the governing code (the actual predicate/function, not a paraphrase) with file:line — OR mark it `INFERRED — not verified`. A recommendation resting on an inferred claim is a hypothesis, not a finding. Confidence and citations are not evidence; the pasted code is.

2. **State a falsifier.** End every diagnosis with: "This conclusion is WRONG if [specific observable]." If you can't name what would disprove it, you haven't tested it.

3. **Steelman the alternative.** Before recommending, make the strongest case for the opposite choice and read the code that would make it correct. Only then recommend.

---

## 15. Required Output Format

After every completed task, your final message must include:

```
CHANGE TYPE: <as declared>
SOURCE OF TRUTH: <reference>
SCOPE CHECK: <as declared>
ARTIFACT(S) CREATED OR UPDATED:
- <path/to/file>
CI ENFORCEMENT SATISFIED:
- <which CI jobs your PR will pass / what you did to satisfy them>
- PRD index check: <satisfied | N/A — Related PRD: None | N/A — no bug-fix/incident record in this PR>
VALIDATION:
- <tests / checks performed>
PRODUCTION STATUS:
- <no writes | draft-only | published | cron disabled | etc.>
OPEN FLAGS FOR BM:
- <conflicts, ambiguities, risks, or STOP conditions encountered>
```

If any field cannot be filled, write "unknown — flagging" and surface the gap.
