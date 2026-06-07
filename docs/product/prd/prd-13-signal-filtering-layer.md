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

- 2026-06-04 — Selection-side evergreen/explainer filter (Track 2 P7, PR [#301](https://github.com/brandonma25/bootupnews/pull/301)). Track 2 P4 ([#296](https://github.com/brandonma25/bootupnews/pull/296)) stops an evergreen from *recurring* across days (cross-date dedup); it does not stop the *debut* — a fresh "what is X" / "most read of 2025" explainer still wins its slot on first appearance. P7 adds a deterministic filter that runs at selection time, before scoring, so evergreens never reach the ranker. This is a new layer of the same "deterministic filtering before clustering and ranking" objective this PRD owns.
  - **New `src/lib/editorial-staging/evergreen-filter.ts` module** — `applyEvergreenFilter(candidates, {config, briefingDate})` + `resolveEvergreenFilterConfig(env)`. Three signals, all **config-driven** (env var `EVERGREEN_FILTER_CONFIG_JSON`, with audited built-in defaults; no hardcoded patterns in the hot path):
    1. **Title regex denylist** (hard reject): "what is X", "how X works", "explained/explainer", "year/decade in review", "most read/popular", "countdown", "the ultimate/complete guide", "everything you need to know", "top N of all time".
    2. **Per-source denylist** (hard reject): operator-maintained feed-reputation list, empty by default.
    3. **URL date-path drift** (soft penalty, not a hard reject): when the URL embeds a `YYYY/MM/DD` older than the briefing date by more than `urlDatePathMaxAgeDays` (default 14), subtract `urlDatePathPenalty` (default 30) from `baseScore` so a wire-republished retrospective rarely beats fresh news but can still pass if nothing newer exists.
  - **Wired as Step D.5 in `runEditorialStaging`** (`src/lib/editorial-staging/runner.ts`) between cross-date dedup (Step D) and `scoreAndSelect` (Step E). The ranker only ever sees survivors.
  - **Observability:** `EditorialStagingRunSummary` gains `candidatesFilteredEvergreen` (hard rejects) and `candidatesPenalizedEvergreen` (soft penalties), mirroring P4's `candidatesFilteredCrossDateDedup` counter pattern; both are logged at "Editorial staging: evergreen filter applied".
  - **Tests:** `src/lib/editorial-staging/evergreen-filter.test.ts` carries a labelled 2026-06-01..06-03 fixture (5 PASS hard-news items + 3 HOLD evergreens) as a regression contract, plus per-signal unit tests (title regex hit/miss, source denylist case-insensitivity, URL date extraction, in-window/future dates, env-var fallback + partial override + invalid JSON + bad-regex tolerance).

- 2026-06-07 — Evergreen re-staging moved onto the `signal_posts` write path (Track 2, PR <!--PR_PLACEHOLDER-->). **Diagnosis:** the recurring evergreens were quantified in `signal_posts` (e.g. 21 daily copies of one SF Fed "Economic Letter Countdown" across 21 briefing dates), but that table is written by the RSS briefing-selection path (`generateDailyBriefing` → `selectPublicBriefingItems` → `persistSignalPostsForBriefing`), which had **neither P4 nor P7** — those two only gate the downstream Notion editorial queue (`editorial-staging/runner.ts` + `notion-writer.ts`), never `signal_posts`. The same-day URL check in `persistSignalPostCandidates` deduped only `WHERE briefing_date = today`, so cross-date recurrence was never caught; and `applyEvergreenFilter` (P7) was only ever called from the staging runner. Both layers were therefore moved onto the `signal_posts` write path — and because editorial-staging *reads* `signal_posts`, a clean `signal_posts` makes the Notion queue clean downstream too (one fix, both surfaces).
  - **Single source of truth (no fork):** `evergreen-filter.ts` relocated `src/lib/editorial-staging/` → `src/lib/editorial/` and is now imported by BOTH the briefing-selection path (`data.ts`) and `editorial-staging/runner.ts` (the existing Notion-path P7 stays as a defense-in-depth backstop). A new generic `classifyEvergreen({title, source, url}, config)` core (precedence: feed → source → title) is the shared classifier; `applyEvergreenFilter` now delegates to it.
  - **Layer 1 — cross-date URL recurrence** (new `src/lib/editorial/cross-date-url-dedup.ts`, wired into `persistSignalPostCandidates` right after the same-day check): skip a candidate whose NORMALIZED `source_url` already appeared in `signal_posts` on a prior `briefing_date` older than a grace window. `CROSS_DATE_GRACE_DAYS = 2`, `CROSS_DATE_LOOKBACK_DAYS = 30`; the recurrence window is `[briefingDate-30, briefingDate-(GRACE+1)]`. The grace lets a genuine developing story run up to GRACE+1 (=3) consecutive days — verified NECESSARY because real developing stories REUSE the identical URL across consecutive days (`heatmap.news/am/china-uk-nuclear` on 06-02 AND 06-03; the "Local Police" hotspot on 05-30/05-31/06-01). Dedup is on the exact normalized URL only (`utm_*`/`fbclid`/`ref` tracking params stripped defensively) — NEVER by title or topic, so a different article (= different URL) is never suppressed. Every skip is logged with `reason: "cross_date_recurrence"`, the matched prior date, and the window. (The original spec's `d <= briefingDate-GRACE` formula was off-by-one against its own Local-Police 3-day example; the example is the binding criterion, hence `-(GRACE+1)`.)
  - **Layer 2 — evergreen recognition** (shared classifier, applied in `generateDailyBriefing` BEFORE the Top-N selection cap so a dropped evergreen frees its slot for a real story — filtering inside persist downstream cannot backfill, it only sees the already-capped slate). Gated by a new `filterEvergreens` option passed `true` ONLY by the cron RSS stage (`fetch-news.ts`), so only the `signal_posts` write path is affected (live dashboard/controlled-runner preview behaviour unchanged). **PRIMARY signal** is the new `evergreenProneFeedUrlPatterns` (case-insensitive URL substring) seeded with the three feeds that produced all eight quantified evergreens — `frbsf.org/research-and-insights/blog/sf-fed-blog`, `fredblog.stlouisfed.org`, `libertystreeteconomics.newyorkfed.org` — the only signal that catches title-clean offenders like "The AI Investing Landscape". Two **closed title gaps**: `^how (are|is|do|does|did|to|the)` (catches "How are benchmark borrowing costs measured?") and `^why (exclude|do|does|is|are)` (catches "Why exclude food and energy from inflation measures?"). Per-field env fallback means an existing `EVERGREEN_FILTER_CONFIG_JSON` title override does NOT drop the feed signal. Every exclusion is logged with the firing signal (`feed`/`source`/`title`).
  - **Tests (REAL production data, not synthetic):** `src/lib/editorial/cross-date-url-dedup.test.ts` + `evergreen-real-data.test.ts` assert the exact acceptance matrix against verbatim URLs/dates — the 3 developing 2-day stories AND "Local Police" on all 3 days AND both distinct Climate Tech URLs STAY selected; all 8 Fed-blog evergreens are excluded (feed signal on debut, Layer 1 on re-staging). The relocated `evergreen-filter.test.ts` (36 cases) stays green after the refactor.
  - **Out of scope (noted for follow-up):** the historical-pile cleanup (sweep/purge track), and the Notion-path `findCrossDateMatch`-by-Headline + `status != "raw"` quirk — left in place because a clean `signal_posts` makes it moot.
