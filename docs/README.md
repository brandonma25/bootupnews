# Documentation Read Order

This repo has multiple top-level documentation surfaces, each with a specific job. Read in this order:

## Start here

| File | Job | Read time |
|---|---|---|
| **`README.md`** (root) | Product thesis, what was built, how the pipeline operates | 5 min |
| **`DECISIONS.md`** (root) | Durable product and engineering trade-offs (D01–D##) — why the system is shaped this way | 10 min |
| **`AGENTS.md`** (root) | Operating rules for AI coding agents and contributors | 8 min |
| **`CHANGELOG.md`** (root) | Multi-PR initiatives and release milestones | 3 min |
| **`docs/portfolio/PR_CLUSTERS.md`** | Interpretive map of the implementation history by product/engineering story | 10 min |

After those five, you have a complete picture of the product, the reasoning, and the build trajectory.

## Deep-dives

| Topic | Files |
|---|---|
| Pipeline operations | `docs/engineering/ARCHITECTURE.md`, `docs/engineering/CRON_SETUP.md`, `docs/engineering/OBSERVABILITY.md` |
| Product specs | `docs/product/prd/` (one canonical PRD per feature) |
| Product control plane | `docs/product/feature-system.csv`, `docs/product/documentation-rules.md` |
| Operating standards | `docs/engineering/protocols/` |
| Templates | `docs/engineering/templates/` |
| Bug history | `docs/engineering/bug-fixes/` (also indexed at the bottom of each related PRD) |
| Architectural decisions (long-form) | `docs/adr/` |
| Process / governance incidents | `docs/engineering/incidents/` (also indexed at the bottom of each related PRD) |
| Source and architecture audits | `docs/audits/` |
| Terminology authority | `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md` |
| Notion database schemas | `docs/engineering/reports/notion-*-schema.md` |

## Relationships between top-level docs

- **README.md** is the public surface. Portfolio reviewers, prospective users, and external readers should be able to understand the product from this file alone.
- **DECISIONS.md** records the *why* behind durable design choices (D-series). Each entry has a short context, accepted trade-off, and evidence pointers. Long-form versions live in `docs/adr/`.
- **AGENTS.md** is the operating manual for anyone (human or AI) making changes. It references DECISIONS but does not duplicate them.
- **CHANGELOG.md** records multi-PR initiatives (e.g., PRD-65 spanned 6 PRs). Per-PR changes live in PR bodies, not here.
- **PR_CLUSTERS.md** is the portfolio-facing interpretation of the raw PR history, grouped by product/engineering story.

## The PRD operational-history index

Each canonical PRD in `docs/product/prd/` has a "Related operational history" section near the bottom. That section indexes:
- Amendments to the PRD itself (when the spec changed)
- Bug fixes that touched the feature
- Incidents that touched the feature
- Multi-PR initiatives building on the feature

The index entries are pointers. The full records live in their canonical lanes. This means a reader opening any PRD can see the full operational footprint of the feature without searching across folders. CI enforces that when a bug-fix or incident record names a `Related PRD`, the index is updated in the same PR.

## What's NOT here

- Per-PR validation transcripts → PR bodies
- Branch cleanup logs → PR bodies + GitHub metadata
- Routine doc edits → PR bodies
- Google Sheet / Google Work Log → historical reference only, not canonical
