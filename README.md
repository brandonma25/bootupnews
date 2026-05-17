# Bootup News

Live app: [https://bootupnews.com](https://bootupnews.com)

Bootup News is a curated daily intelligence briefing for people who want to understand what matters without scanning a large news surface. It is designed around a simple product bet: a useful briefing should reduce the number of things a reader has to inspect while increasing the quality of the judgment behind each item.

Bootup News is not a generic news feed. It does not optimize for volume, recency alone, or endless scrolling. The product narrows each edition to a small set of importance-ranked developments, explains why each one matters, and keeps publication separate from generation so quality can be reviewed before anything reaches readers.

## Product thesis

Most news products make readers do the ranking work themselves. Bootup News treats ranking, context, and editorial judgment as the product. The core unit is a Signal: an interpreted development derived from source evidence, evaluated for structural importance, and rendered as a concise briefing card.

The public briefing is intentionally constrained: Top 5 Core Signals for the most important developments, followed by Next 2 Context Signals for useful secondary context. This format makes the product opinionated. It asks, "What should a serious reader understand today?" instead of "What happened most recently?"

## How it works

1. Source inputs are collected from RSS, source catalogs, and approved ingestion paths.
2. Articles are normalized into a consistent internal shape.
3. Related Articles are grouped into Story Clusters.
4. Story Cluster evidence is evaluated into ranked Signals.
5. Each Signal receives explicit "why it matters" reasoning and supporting context.
6. Candidate Signals are held for controlled generation and editorial review.
7. Approved Signals are published into the Top 5 Core and Next 2 Context briefing surfaces.

## What I built

- A Next.js briefing experience with public Signal cards, category surfaces, and historical briefing routes.
- A source and ingestion layer that can normalize external inputs into product-ready Article evidence.
- Ranking and selection logic oriented around importance, source quality, accessibility, and briefing fit.
- A controlled publication model that separates draft generation from reader-facing output.
- Editorial review tooling for inspecting, revising, and approving Signal candidates before publication.
- Quality gates around "why it matters" copy, source accessibility, schema readiness, and release validation.
- Repo governance for PRD mapping, branch isolation, release gates, and documentation traceability.

## Key product decisions

- Briefing over feed: Bootup News deliberately favors a short, ranked edition over a broad stream of links.
- Structural importance over recency: a development earns placement because it changes the shape of a topic, market, institution, or decision space.
- Quality before publication: generated candidates are not automatically public; editorial review remains the Phase 1 backbone.
- Explanation as product surface: each Signal must include clear reasoning for why it matters, not only a summary.
- Governance as leverage: because this was a solo build, branch rules, release gates, and documentation discipline were treated as part of the system.

## AI-agent governance / process artifact

This was a solo, AI-agent-assisted build. I used AI agents for implementation support, debugging, code review, documentation drafting, and release-check execution, while keeping product direction, scope decisions, and final judgment human-owned.

The repo includes explicit operating rules for branch ownership, release gates, documentation routing, terminology control, and validation order. That process matters because the project moved quickly across ingestion, ranking, editorial review, and public presentation without treating generated code as automatically trustworthy.

The reusable change-classification prompt template is available at [docs/engineering/templates/llm-prompt-template-change-classification.md](docs/engineering/templates/llm-prompt-template-change-classification.md).

For the durable product and engineering trade-offs behind the build, see [DECISIONS.md](DECISIONS.md).

For an implementation-history map, see [docs/portfolio/PR_CLUSTERS.md](docs/portfolio/PR_CLUSTERS.md).

## Operating the pipeline

The ingestion pipeline is triggered externally by [cron-job.org](https://cron-job.org), runs in Vercel serverless functions, and writes editorial candidates to Notion for review. Three docs cover the day-to-day:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — pipeline diagram and external triggering diagram (Mermaid).
- [docs/CRON_SETUP.md](docs/CRON_SETUP.md) — cron-job.org account setup, the sync script (`npm run cron:sync`), email alerts, rollback procedure.
- [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) — where to look when something breaks; Source Health vs Pipeline Health.

Notion database schemas (operator creates these manually):

- [docs/notion-pipeline-log-schema.md](docs/notion-pipeline-log-schema.md) — one row per ingestion run / health check.
- [docs/notion-source-health-schema.md](docs/notion-source-health-schema.md) — per-source-per-day RSS fetch outcomes; feeds the circuit breaker.

PRD-65 environment variables (set in Vercel production):

- `CRON_SECRET` — shared with cron-job.org's `x-cron-secret` header; mismatched → endpoint returns 401.
- `ALLOW_VERCEL_CRON_FALLBACK` — rollback escape hatch; leave unset/`false` in normal operation.
- `NOTION_PIPELINE_LOG_DB_ID` — Pipeline Log database ID; unset = best-effort no-op, cron still runs.
- `NOTION_SOURCE_HEALTH_LOG_DB_ID` — Source Health Log database ID; unset = circuit breaker permissively falls through, cron still runs.

The full reliability initiative is documented in [PRD-65](docs/product/prd/prd-65-pipeline-reliability-external-cron-migration.md). The change history of this migration is in [CHANGELOG.md](CHANGELOG.md).

## Current state

Bootup News is an active MVP, not a mature commercial product. The core briefing model, public presentation layer, controlled publication flow, editorial-review backbone, and portfolio-facing documentation layer are in place. Ongoing documentation maintenance should keep README.md, DECISIONS.md, and docs/portfolio/PR_CLUSTERS.md current through event-triggered freshness checks rather than routine per-PR narrative updates.
