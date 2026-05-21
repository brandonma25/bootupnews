# PRD-13 — Signal Filtering Layer

## Objective
- Add a deterministic filtering layer between ingestion/normalization and clustering/ranking so low-value stories are less likely to reach briefing surfaces.

## Scope
- Classify article source quality into configurable tiers.
- Score headline quality with transparent heuristics.
- Normalize event types and gate low-value classes.
- Persist machine-readable filter decisions and reasons on articles.
- Reconsider suppressed items with a safe fallback when pass volume is too low.

## Explicit Exclusions
- No per-item LLM review.
- No personalization overhaul.
- No broad UI redesign.
- No ranking-system rewrite.

## Acceptance Criteria
- Each article receives `sourceTier`, `headlineQuality`, `eventType`, `filterDecision`, and `filterReasons`.
- Rejected articles do not proceed into topic matching and event clustering.
- Suppressed items stay out by default but can be promoted when pass volume is thin.
- Tiering and heuristics are centralized and easy to tune.

## Risks
- Over-filtering risk:
  Fallback promotions restore allowed suppressed stories before the product feels empty.
- Under-filtering risk:
  Hard-block and soft-block event classes reject or suppress commentary, filler, and repetitive follow-ups.
- Brittle source classification risk:
  Tier rules are centralized in `src/lib/signal-filtering.ts` for future tuning.
- Non-tier1 false negative risk:
  Strong allowed events from lower-tier sources can be promoted through fallback.
- Regression risk:
  Filtering is integrated once in the pipeline rather than scattered across ranking and UI code.

## Testing Requirements
- Local validation:
  Filter heuristics and fallback coverage in `src/lib/signal-filtering.test.ts`; pipeline regression coverage continues in existing Vitest suites.
- Preview validation when auth, env, or SSR is involved:
  Not specifically required by this change, but dashboard preview smoke-testing is still recommended before merge.
- Production sanity after merge:
  Confirm the briefing remains populated and visibly higher-signal on real feeds.

## Related operational history

- 2026-05-21 — Junk-URL filtering at ingest (Path-A Task 2, PR [#261](https://github.com/brandonma25/bootupnews/pull/261)). The 7 rows deduped by migration `20260521120000` on 2026-05-17 were not articles: Axios webfont assets (`static.axios.com/.../atizatext-bold-webfont.{woff2,ttf,eot,svg}`) parsed out of inline `@font-face` CSS blocks, plus Politico email-tracking redirector URLs (`url4027.email.politico.com/ss/c/u001.<token>/…`) parsed out of newsletter bodies. Fixed at three layers:
  - **New `src/lib/url-filtering.ts` module** — `isLikelyArticleUrl` + `classifyUrlForArticleEligibility` reject asset file extensions (woff/ttf/eot/css/js/png/jpg/svg/pdf/…), tracking hostnames (`email.politico.com`, `*.sailthru.com`, `*.list-manage.com`, …), marketing-subdomain wrappers (`url\d+\.email\.*`, `email.*`, `links.*`, `mail.*`, `e.*`), and non-article paths (`/ss/c/`, `/unsubscribe`, `/preferences`, `/click/`, `/redirect`, …). 38 unit tests in `src/lib/url-filtering.test.ts` cover every rejection reason and edge case.
  - **`src/lib/newsletter-ingestion/parser.ts`** — strips `<style>` blocks and raw `@font-face` / `@media` / `@import` at-rules BEFORE block-splitting so CSS source never becomes story content. `extractFirstUrl` replaced by `extractFirstArticleUrl` which iterates URLs in the block and skips any failing the filter. `isLikelyHeadline` rejects CSS-declaration patterns (`src:`, `url(`, `format(`, `@font-face`).
  - **`src/lib/newsletter-ingestion/storage.ts`** — switched the extraction path to `parseNewsletterStoriesDetailed` which returns `junkRejections`. When present, writes one Source Health Log row per (sender, day) with new outcome `"junk_filtered"` and a per-reason breakdown in Notes. The new `SourceHealthOutcome` value `"junk_filtered"` does NOT increment Success or Fail counts and therefore does NOT trip the circuit breaker — junk-only emails are a parse-content signal, not a fetch-failure signal.
