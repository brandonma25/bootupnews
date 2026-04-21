# PRD-50 — MIT Internal Review Surface

- PRD ID: `PRD-50`
- Canonical file: `docs/product/prd/prd-50-mit-internal-review-surface.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Add a narrow internal page that makes MIT Technology Review probationary runtime review easier without changing source activation, public defaults, donor defaults, or source-policy treatment.

## User Problem

MIT review currently depends on Issue #70 plus logs. Reviewers need a compact page that shows current source-resolution truth, a recent sanitized MIT feed sample, freshness, and conservative quality notes so Issue #70 can become the operating hub for the probationary decision.

## Scope

- Add an internal route at `/internal/mit-review`.
- Require an authenticated session before showing review evidence.
- Show current probationary runtime source IDs and whether MIT is the only probationary runtime source.
- Show a current/recent sanitized MIT feed sample with top titles, snippets, and freshness labels.
- Show conservative signal-quality, noise, and duplicate-pressure notes derived from the current sample.
- Link Issue #70 as the durable multi-day review history.
- Document what the page proves and what it does not prove.

## Non-Goals

- No source activation, deactivation, promotion, removal, or policy decision.
- No changes to MVP public defaults.
- No changes to donor fallback defaults.
- No changes to source-policy boosts.
- No public debug surface, feed URL exposure, registry dump, credential display, user list, or raw log viewer.
- No historical persistence layer in this branch.

## Implementation Shape / System Impact

- `src/lib/internal/mit-review.ts` collects sanitized review evidence by reusing the existing donor registry, probationary runtime feed list, and no-argument runtime source-resolution snapshot.
- `src/app/internal/mit-review/page.tsx` renders the internal noindexed route and withholds evidence from unauthenticated requests.
- The page shows only source IDs, source name, sanitized titles/snippets, freshness, count summaries, and conservative review notes.
- Issue #70 remains the multi-day evidence history; the app route intentionally does not fetch issue comments because no server-side GitHub issue-history reader is configured.

## Dependencies / Risks

- Depends on PRD-42 source governance, donor registry, runtime source observability, and MIT probationary review automation.
- Feed reachability depends on MIT's RSS endpoint, default comparison feeds, and the existing RSS helper's request/cache behavior.
- Auth gating is limited to the current app's Supabase session model; no separate admin role system exists yet.
- Local unauthenticated route validation proves the lock state, while authenticated preview validation remains required for deployed access truth.

## Acceptance Criteria

- `/internal/mit-review` exists and is not linked from public navigation.
- Unauthenticated requests do not receive MIT evidence.
- Authenticated requests can see current probationary runtime source IDs and confirmation when MIT is the only probationary runtime source.
- The page shows a recent MIT sample when reachable and clearly reports current-request limitations.
- The page omits feed URLs, article URLs, cookies, headers, tokens, emails, user IDs, credentials, and registry dumps.
- The page states that it does not prove dashboard contribution, multi-day trend, or source-policy eligibility by itself.
- Issue #70 receives a repo-safe comment with the route/path and purpose.

## Evidence and Confidence

- Repo evidence used:
  - `src/adapters/donors/registry.ts`
  - `src/lib/observability/pipeline-run.ts`
  - `src/lib/pipeline/ingestion/index.ts`
  - `scripts/mit-probationary-review.mjs`
  - `.github/workflows/mit-probationary-review.yml`
  - `docs/engineering/change-records/mit-probationary-review-automation.md`
- Confidence: High for local route gating, sanitized evidence shaping, and source-resolution display. Medium for deployed access truth until Vercel preview validates the authenticated internal route.

## Closeout Checklist

- Scope completed: Yes.
- Tests run: Yes. See `docs/engineering/testing/mit-internal-review-surface.md`.
- Local validation complete: Yes for unauthenticated route gating, route render, noindex metadata, sanitized evidence shaping, build, and unit tests. Authenticated deployed access truth remains a preview requirement.
- Preview validation complete, if applicable: No. Vercel preview validation remains required for authenticated internal-route truth.
- Production sanity check complete, only after preview is good: No.
- PRD summary stored in repo: Yes.
- Bug-fix report stored in repo, if applicable: Not applicable.
- Google Sheets tracker updated and verified: Direct live Sheets update unavailable in this environment.
- If direct Sheets update is unavailable, fallback tracker-sync file created in `docs/operations/tracker-sync/` with exact manual update payload: Yes.
