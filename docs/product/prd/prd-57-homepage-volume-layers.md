# PRD-57 — Homepage volume layers

- PRD ID: `PRD-57`
- Canonical file: `docs/product/prd/prd-57-homepage-volume-layers.md`
- Filename rule: use lowercase kebab-case and zero-pad `1` through `9` as `prd-01-...` through `prd-09-...`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective

Expand the public homepage beneath the existing Top 5 Signals layer so the surface expresses the breadth of the governed nine-source public manifest without weakening the editorial sharpness of the top-ranked signal presentation.

## User Problem

The current public homepage exposes only the Top 5 Signals layer plus client-side category tabs that re-filter the same underlying selection. That makes the product feel sparse even when the public manifest is healthy, and it hides the breadth of the available reporting before a reader can absorb the editorial thesis. The result is a surface that looks under-populated at the exact moment when it should demonstrate structured understanding.

## Scope

This feature adds two new Experience-layer modules around Top 5 Signals: a Developing Now module and a By Category module. Both modules must consume the existing ranked briefing output and the existing `homepageClassification` / fallback taxonomy path without modifying ingestion, source governance, ranking, or classification rules. Top 5 Signals remains capped at five and keeps its current rendering path. Category tab controls render near the top of the homepage without a visible section heading, but category Article rows load progressively only after a reader clicks Tech, Finance, or Politics. The first homepage render must not include category Article rows in the initial HTML.

Developing Now selects from the ranked briefing output after excluding any event already surfaced in Top 5 Signals. Candidates are ordered by a composite of normalized freshness and a source-diversity bonus so the module favors recent developments from sources not already represented in the top layer. The module returns up to ten items, degrades honestly to fewer when supply is thin, and suppresses semantic near-duplicates so it does not restate the same story family with weaker phrasing.

By Category renders three subsections in the fixed order Tech, Finance, Politics. Each subsection selects up to three fresh events whose `classification.primaryCategory` matches the category key, while excluding anything already used in Top 5 Signals or Developing Now. Subsections do not borrow from one another. Politics preserves the existing honest empty-state rule rather than backfilling with Tech or Finance coverage.

## Non-Goals

This feature does not introduce story clusters, multi-article grouping, personalization, manifest edits, source activation changes, ranking changes, or taxonomy redesign. It also does not change the Top 5 Signals cap and rendering path. Category Article rows must come from persisted cron output, not a live homepage RSS fetch.

## Implementation Shape / System Impact

The implementation lives in the homepage view-model and rendering layers. `src/lib/homepage-model.ts` gains pure selection helpers for Developing Now and category previews, plus a wrapper that adds these selections to the homepage view model. The homepage component renders the new modules beneath the existing Top 5 Signals experience and reuses the existing lighter category card treatment rather than introducing new design primitives.

Follow-up remediation adds a persisted Article list for the category tab Surface Placements. The clicked category endpoint reads the latest two PRD-60 cron-backed `pipeline_article_candidates` runs, groups Articles through the existing homepage taxonomy, excludes likely paywalled sources, excludes URL/title duplicates from the current top 5-7 Signal Cards, and returns up to 12 date/source/title rows as direct links to the original Articles. Homepage SSR does not call the category Article loader and does not fetch RSS feeds during render.

The key editorial choice is to reject a simple “positions 6–15” module. That approach is structurally redundant with Top 5 Signals because it only extends the same ranking story with weaker items. Source-diverse freshness is a distinct job: it answers what is newly building from sources not already represented above, which broadens awareness without diluting the understanding-first role of Top 5.

Hostname-derived source keys are acceptable for this release because briefing items do not carry a stable source identifier. Diversity scoring will therefore treat multiple Reuters feeds under the same hostname as one editorial source when the URL pattern resolves that way. Future manifest additions must verify that the URL pattern either resolves distinctly or that any collision is editorially acceptable.

## Dependencies / Risks

This feature depends on the current governed contracts from PRD-17, PRD-36, PRD-46, and PRD-54 remaining unchanged. The main implementation risk is over-surfacing semantically repetitive stories beneath the Top 5 layer, so the new selection logic must preserve the existing semantic-dedup behavior already used elsewhere in the homepage model. A secondary risk is thin category supply, especially in Politics; the design must degrade to honest empty states instead of manufacturing filler.

## Acceptance Criteria

When public source supply is healthy, the homepage prioritizes the Top 5 Signals in the initial render and leaves category news behind explicit reader intent. Developing Now must exclude Top 5 IDs, favor fresher items, prefer sources not already represented in Top 5, and return no semantic near-duplicates of already surfaced stories when that layer is rendered. By Category must render Tech, Finance, and Politics controls in that order above the Signal Card list, omit the previous visible "Browse by category" heading, leave tab content unmounted before click, request only the clicked category on first open, show compact loading/empty/retry states, and render up to 12 non-paywalled Articles from the latest two cron runs. Article rows must include date, source, title, original-source link, and must not duplicate current top 5-7 Signal Card source URLs or titles. The existing Top 5 Signals path, public manifest, ranking logic, and Politics empty-state invariant must remain intact.

## Evidence and Confidence

- Repo evidence used: `src/lib/homepage-model.ts`, `src/components/landing/homepage.tsx`, `src/components/home/CategoryTabStrip.tsx`, `src/lib/homepage-category-articles.ts`, `src/app/api/home/category-articles/route.ts`, `src/lib/homepage-taxonomy.ts`, `docs/product/prd/prd-17-homepage-intelligence-surface.md`, `docs/product/prd/prd-36-signal-display-cap.md`, `docs/product/prd/prd-46-home-category-tabs.md`, `docs/product/prd/prd-54-public-source-manifest.md`, `docs/engineering/bug-fixes/phase1/post-cluster-surfacing-quality.md`, `docs/engineering/bug-fixes/phase1/homepage-semantic-dedup-and-explanations.md`
- Confidence: Medium-high. The surface and invariants are well defined, and the implementation is scoped to additive view-model and UI work.

## Closeout Checklist

- Scope completed:
- Tests run:
- Local validation complete:
- Preview validation complete, if applicable:
- Production sanity check complete, only after preview is good:
- PRD summary stored in repo:
- Bug-fix report stored in repo, if applicable:
- `docs/product/feature-system.csv` updated if PRD/feature metadata changed:
- GitHub documentation closeout completed in the canonical lane:
- Google Sheet / Google Work Log not treated as canonical or updated for routine closeout:
