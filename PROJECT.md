# PROJECT: Daily Intelligence Aggregator

---

## 1. SYSTEM OVERVIEW

**Purpose:**  
A web application that aggregates news from multiple sources and delivers concise, high-signal summaries to users, reducing time spent across newsletters, RSS feeds, and social platforms.

**Core Features (MVP Scope):**
- RSS ingestion from multiple sources
- AI-generated summaries of articles/topics
- Topic/category-based browsing
- Clean feed UI for consumption
- Source-level filtering (future)

**Tech Stack:**
- Frontend: Next.js (App Router)
- Backend: Supabase (Auth, Database)
- AI: OpenAI API (summarization)
- Styling: (TBD — likely Tailwind or CSS modules)

---

## 2. CURRENT STATE

### 🟢 Working
- Basic project scaffold set up
- Frontend structure using Next.js App Router
- Initial deployment via Vercel (assumed)

### 🔴 Broken
- Potential SSR instability (previous issue related to auth/session handling)
- Feed quality and ranking logic not yet defined or stable

### 🟡 In Progress
- RSS ingestion pipeline
- AI summarization flow
- Core UI/UX structure for feed

---

## 3. TASK QUEUE

### High Priority
- [ ] Stabilize SSR behavior (auth/session handling)
- [ ] Implement reliable RSS ingestion pipeline
- [ ] Build AI summarization pipeline (input → output consistency)

### Medium Priority
- [ ] Design feed ranking logic (recency vs relevance vs source quality)
- [ ] Improve UI layout and eliminate spacing/layout bugs
- [ ] Handle edge cases (empty feeds, failed API calls)

### Low Priority
- [ ] Personalization layer
- [ ] Analytics / tracking
- [ ] Performance optimization

---

## 4. FILE MAP (FOR AI CONTEXT)

- `src/app/` → routing, pages, layouts (core product screens)
- `src/components/` → reusable UI components (cards, headers, etc.)
- `src/lib/` → business logic, API calls, utilities
- `supabase/` → backend configuration and database

---

## 5. KNOWN ISSUES / RISKS

- SSR may fail under certain auth/session conditions
- Feed ranking logic is undefined → risk of low-quality output
- API latency and timeout risks for large RSS feeds
- AI summaries may be inconsistent without proper prompt structure

---

## 6. AI UPDATE RULES (CRITICAL — MUST FOLLOW)

When updating this file:

1. Write like an engineer handing off work to another engineer.
2. DO NOT write vague summaries (e.g., "fixed bugs", "improved code").
3. Each change log entry MUST include:
   - Problem addressed
   - Root cause or reason (if known)
   - Exact change made
   - Files modified
   - Remaining risks or next steps
4. ALWAYS include which AI agent performed the work:
   (Codex / Claude / Cursor / ChatGPT / etc.)
5. ALWAYS include a timestamp in this format:
   [YYYY-MM-DD HH:MM]
6. ONLY append to the CHANGE LOG section.
7. DO NOT delete or overwrite previous entries.
8. DO NOT modify other sections unless explicitly instructed.

---

## 7. CHANGE LOG

### [2026-04-11 00:00] — INITIAL SETUP

**Agent:**
- Human (Project Initialization)

**Problem addressed:**
- No centralized system for tracking project state and AI collaboration

**Root cause:**
- Multi-AI workflow without shared memory leads to context loss and inconsistent outputs

**Change made:**
- Created `PROJECT.md` to serve as single source of truth for:
  - system state
  - task tracking
  - engineering handoffs
  - AI coordination

**Files modified:**
- `PROJECT.md` (created)

**Remaining risks / next steps:**
- Ensure all AI agents consistently read and update this file
- Begin logging all future changes using defined structure

### [2026-04-16 00:04] — PRD 5 Daily Habit Loop

**Agent:**
- Codex

**Problem addressed:**
- The dashboard feed had no continuity across sessions, no deterministic notion of what changed since a user’s last pass, and no reliable completion moment once a session was finished.

**Root cause:**
- Event rows are regenerated during clustering, so the previous implementation had no stable per-event identity for retention logic.
- Existing read state lived on `briefing_items`, but the live dashboard renders generated event clusters directly and did not consume persistent read/view state.

**Change made:**
- Added a lightweight habit-loop continuity layer based on stable event keys and change fingerprints derived from clustered article signals.
- Introduced `user_event_state` persistence in the Supabase schema for `last_viewed_at`, last seen fingerprint, and prior importance score.
- Updated live dashboard briefing construction to classify each event as `new`, `changed`, `escalated`, or `unchanged`, and to derive read state from the persisted event-state snapshot.
- Added dashboard UI for “Since your last pass” metrics, event badges, and an end-of-feed “You’re caught up” closure panel.
- Updated read actions so marking one event or the whole dashboard as read writes to the new event-state store instead of depending on ephemeral event ids.
- Added unit tests covering continuity-key stability, fingerprint change detection, display-state classification, and session summary counts.

**Files modified:**
- `src/lib/types.ts`
- `src/lib/habit-loop.ts`
- `src/lib/habit-loop.test.ts`
- `src/lib/data.ts`
- `src/app/actions.ts`
- `src/app/dashboard/page.tsx`
- `src/components/story-card.tsx`
- `supabase/schema.sql`
- `PROJECT.md`

**Remaining risks / next steps:**
- The new `user_event_state` table must exist in the target Supabase database before live persistence will activate; the code degrades safely if the table is missing, but continuity will not persist server-side until the schema is applied.
- Repository-wide `npm run lint` still reports pre-existing React hook lint errors in `src/components/app-shell.tsx` and `src/components/settings-preferences.tsx`, which are unrelated to this PRD work.
- Public/demo mode still lacks a localStorage-backed continuity implementation; live/authenticated mode is the completed path in this branch.

### [2026-04-16 00:11] — PRD 6 Reading Window Anchor

**Agent:**
- Codex

**Problem addressed:**
- The dashboard showed a raw reading window string, but not as a behavioral anchor. Users could not clearly see daily load, completion progress, or how today compared with yesterday.

**Root cause:**
- Reading time existed only as per-item `estimatedMinutes` and a simple briefing-level string.
- There was no shared metric layer converting PRD 5 read state into a progress-oriented reading window model.

**Change made:**
- Added a shared `reading-window` helper that deterministically computes per-event reading time from content length with a stable fallback, aggregates total/completed/remaining minutes, calculates progress ratio, parses prior reading-window history, and interprets day load as `Light`, `Normal`, or `Heavy` using configurable constants.
- Wired the dashboard data layer to compute reading metrics from existing PRD 5 `read` state and compare the current briefing against the latest prior saved briefing without introducing any new tracking system.
- Updated the dashboard UI so reading time is shown as a top anchor metric with total minutes, delta vs yesterday, day intensity, progress text, and a progress bar, while leaving PRD 5 completion messaging unchanged.
- Extended the refresh card to echo progress in the compact reading-window module.
- Added unit tests for deterministic time calculation, progress aggregation, delta formatting, parsing, and intensity thresholds.

**Files modified:**
- `src/lib/types.ts`
- `src/lib/reading-window.ts`
- `src/lib/reading-window.test.ts`
- `src/lib/data.ts`
- `src/app/dashboard/page.tsx`
- `src/components/dashboard/manual-refresh-trigger.tsx`
- `PROJECT.md`

**Remaining risks / next steps:**
- Public/demo mode compares against sample history only; live accuracy for day-over-day comparison still depends on users having at least one prior saved briefing.
- Repository-wide `npm run lint` still includes unrelated pre-existing React hook lint errors outside this PRD scope.

### [2026-04-16 14:14] — Repo Hygiene Sanity Check

**Agent:**
- Codex

**Problem addressed:**
- Public-facing repository docs and test fixtures exposed more deployment-specific detail than necessary, and the repo referenced a non-existent `.env.example` despite relying on it for setup.

**Root cause:**
- Prior auth debugging and deployment verification notes preserved concrete Vercel and Supabase identifiers in tracked markdown and test files.
- Environment-file ignore rules were broad, but there was no explicit exception for a tracked example env file with placeholders only.

**Change made:**
- Rewrote the public setup and OAuth sections in `README.md` to remove local absolute paths, concrete deployment URLs, and project-specific Supabase identifiers while keeping the setup flow usable.
- Added a tracked `.env.example` with placeholders only and updated `.gitignore` to keep real env files ignored while allowing the example file to be committed.
- Redacted deployment-specific identifiers from the live verification note and replaced project-specific OAuth URLs in the auth modal test with example domains.
- Performed a repo-wide search for likely secrets, tracked env files, key material, real user emails, and infra-specific references, then documented the findings in the repo hygiene records.

**Files modified:**
- `.gitignore`
- `.env.example`
- `README.md`
- `QA-LIVE-TEST-2026-04-15.md`
- `src/components/auth/auth-modal.test.tsx`

### [2026-04-17 11:01] — Consolidation Branch Stabilization Pass

**Agent:**
- Codex

**Problem addressed:**
- The consolidation branch was blocked from merge review by one lint failure in the app shell, stale data-layer tests, and unclear local Playwright execution behavior.

**Root cause:**
- `src/components/app-shell.tsx` restored UI state and closed mobile navigation by setting state inside effects, which tripped the repo's hook lint rules.
- `src/lib/data.test.ts` still asserted older fallback retry behavior and relied on legacy `__testing__` helpers that are no longer exported after the consolidation merges.
- Playwright was configured to use an already-running local dev server unless `PLAYWRIGHT_MANAGED_WEBSERVER` is set, so ad hoc reruns without a server produced connection-refused failures.

**Change made:**
- Replaced the app-shell sidebar hydration effect with a lazy browser-only state initializer and removed the redundant hydration state.
- Removed the route-change mobile-close effect and relied on the existing mobile navigation close handlers.
- Updated `src/lib/data.test.ts` to match the consolidated fallback fetch behavior and removed obsolete tests tied to legacy helper exports.
- Re-ran the full local validation workflow, including lint, build, unit tests, local dev run, and Playwright smoke coverage across Chromium, Firefox, and WebKit.
- Refreshed the consolidation bug-fix, testing, and PRD summary documents with the stabilized branch status.

**Files modified:**
- `src/components/app-shell.tsx`
- `src/lib/data.test.ts`
- `docs/bug-fixes/repo-consolidation-main-sync.md`
- `docs/testing/repo-consolidation-main-sync.md`
- `docs/prd/repo-consolidation-main-sync.md`
- `PROJECT.md`

**Remaining risks / next steps:**
- Dependency audit output still reports one high-severity vulnerability that was not changed in this pass.
- Final merge-to-main should still respect the repo operating rule around preview confirmation before a release recommendation.
- `docs/bug-fixes/repo-hygiene-sanity-check.md`
- `PROJECT.md`

**Remaining risks / next steps:**
- Ignored local files such as `.env.local` can still hold real credentials on a developer machine; they are not tracked, but their values should still be managed carefully outside Git.
- Existing branch-local code changes outside this hygiene task were preserved and not reviewed for behavioral correctness.

### [2026-04-16 14:33] — Repo History Security Audit

**Agent:**
- Codex

**Problem addressed:**
- The repo needed a higher-confidence review of prior commits to determine whether sensitive material may have been exposed historically, not just in the current working tree.

**Root cause:**
- Earlier setup and QA documentation captured concrete deployment and auth-routing details during active troubleshooting, so a history audit was needed to distinguish secret exposure from non-secret but overly specific infrastructure references.

**Change made:**
- Audited current tracked files and git history for secret-bearing patterns including env variable names, OAuth fields, bearer-token markers, callback URLs, key-file extensions, and project-specific Vercel/Supabase identifiers.
- Confirmed no tracked `.env`, `.pem`, `.key`, `.crt`, or `.p12` files appear in git history other than the placeholder-only `.env.example`.
- Confirmed repeated historical exposure of concrete Vercel deployment URLs, a concrete Supabase project ref/callback URL, and deployment IDs in tracked docs and one auth test, but did not confirm committed secret values such as service-role keys, OpenAI keys, OAuth client secrets, or session tokens.
- Added a dedicated historical security audit record in `docs/bug-fixes/repo-history-security-audit.md`.

**Files modified:**
- `PROJECT.md`
- `docs/bug-fixes/repo-history-security-audit.md`

**Remaining risks / next steps:**
- The audit found historical infrastructure-identifying references in prior commits; if public minimization of those identifiers matters, history rewrite is a separate decision and was not performed here.
- No confirmed committed secret values were found, so provider-side credential rotation is not clearly warranted from git-history evidence alone; if there are off-repo concerns about leaked local env files or copied credentials, rotation should be decided provider-side.

### [2026-04-16 14:41] — Public Audit Doc Sanitization

**Agent:**
- Codex

**Problem addressed:**
- The audit conclusions were sound, but the public audit record still included one unnecessary concrete infrastructure example in current HEAD.

**Root cause:**
- The historical-security audit intentionally documented what had been found, and one project-specific deployment hostname remained in the write-up as an example rather than as a necessary conclusion.

**Change made:**
- Sanitized the remaining concrete infrastructure example in `docs/bug-fixes/repo-history-security-audit.md` so the document now refers to generalized production/preview deployment URLs instead of a specific hostname.
- Re-checked the current audit/hygiene docs to confirm the findings still clearly state that the historical exposure was infrastructure-specific, no committed live secret values were confirmed, and rotation/history rewrite were not recommended by default.

**Files modified:**
- `PROJECT.md`
- `docs/bug-fixes/repo-history-security-audit.md`

**Remaining risks / next steps:**
- The public repo is cleaner, but historical commit content still exists unchanged unless a separate history-rewrite decision is made later.
- Current placeholders and example domains elsewhere in the repo remain intentional and public-safe.

### [2026-04-17 07:05] — Repo Consolidation Main Sync

**Agent:**
- Codex

**Problem addressed:**
- The repo had multiple open or lingering feature branches, a divergent local `main`, and an active dirty worktree, making it unclear which branches were safe to consolidate toward `main`.

**Root cause:**
- Recent product, auth, testing, and docs work had landed across a mix of merged PRs, stale open PRs, and branch-local follow-up fixes.
- The primary repo worktree was not safe for direct branch switching or consolidation because it contained active uncommitted changes.

**Change made:**
- Audited local branches, remote refs, and recent GitHub PRs to classify branches as merge-now, hold, already-in-main, or do-not-merge.
- Created a separate consolidation worktree from `origin/main` on `feature/repo-consolidation-main-sync`.
- Merged `feature/playwright-e2e-foundation`, `chore/add-ci-workflow`, `feature/why-this-matters-final-merge-fix`, and `feature/signal-filtering-layer` into the consolidation branch.
- Intentionally excluded preview-sensitive auth work and stale/superseded branches from the merge set.
- Ran repeated local validation after meaningful merge steps and recorded a concise repo-safe consolidation summary, bug report, and testing report.

**Files modified:**
- `PROJECT.md`
- `docs/prd/repo-consolidation-main-sync.md`
- `docs/bug-fixes/repo-consolidation-main-sync.md`
- `docs/testing/repo-consolidation-main-sync.md`

**Remaining risks / next steps:**
- The consolidation branch is not ready for `main` yet because `npm run lint` and `npm run test` still fail locally.
- Playwright is configured but not executable in this environment due browser-launch sandbox restrictions.
- `feature/auth-preview-host-fix` still requires preview and human validation before it should be considered for merge.
- The original repo worktree still contains active uncommitted feature work that was intentionally left untouched.

### [2026-04-17 22:15] — Release Automation Architecture

**Agent:**
- Codex

**Problem addressed:**
- Release readiness for this repo depended on scattered manual steps, which made local validation, PR validation, preview sanity checks, and release documentation inconsistent and easy to miss.

**Root cause:**
- The repo had baseline CI and Playwright coverage, but it lacked a single release entrypoint, reusable deploy probes, explicit protected-branch check names, a concise human auth/session gate, and reusable release-doc scaffolding.

**Change made:**
- Added a release-automation layer with a scripted local gate, preview and production route probes, PR summary generation, release-doc scaffolding, and clearer GitHub Actions workflows for PR validation, preview verification, and post-merge production verification.
- Added concise release operating documentation and a reusable human auth/session checklist that keeps Google OAuth, callback truth, refresh persistence, sign-out truth, and final auth-sensitive product judgment explicitly human-owned.
- Scaffolded repo-safe PRD, testing, and bug-fix documents for the release-automation branch and updated the README with the new release commands and flow.

**Files modified:**
- `.github/workflows/ci.yml`
- `.github/workflows/preview-gate.yml`
- `.github/workflows/production-verification.yml`
- `package.json`
- `scripts/release/common.mjs`
- `scripts/release/validate-local.mjs`
- `scripts/release/verify-deployment.mjs`
- `scripts/release/generate-release-docs.mjs`
- `scripts/release/generate-pr-summary.mjs`
- `docs/engineering/release-automation-operating-guide.md`
- `docs/testing/human-auth-session-gate.md`
- `docs/testing/templates/release-testing-report-template.md`
- `docs/bug-fixes/templates/release-bug-fix-template.md`
- `docs/prd/templates/release-brief-template.md`
- `docs/testing/release-automation-architecture.md`
- `docs/bug-fixes/release-automation-architecture.md`
- `docs/prd/release-automation-architecture.md`
- `README.md`
- `PROJECT.md`

**Remaining risks / next steps:**
- Preview and production workflows still require external GitHub/Vercel configuration to supply the preview URL handoff and canonical production URL.
- The local release gate required escalation in this environment so the dev server could bind to port `3000`; the repo code itself passed once allowed to run normally.
- `npm install` still reports one pre-existing high severity vulnerability that was not changed by this release work.

### [2026-04-17 22:35] — Release Automation Rollout Verification And Enforcement Alignment

**Agent:**
- Codex

**Problem addressed:**
- The release automation implementation existed on the local rollout branch, but `origin/main` had advanced independently with a separate release-machine protocol, and `main` still lacked most of the intended release automation assets.

**Root cause:**
- The original release automation branch never reached remote because the current GitHub credential could not push `.github/workflows/*` changes without `workflow` scope.
- Meanwhile, `origin/main` merged a smaller release-machine protocol branch that added required docs and wrapper entrypoints but not the fuller preview/prod workflows, release automation scripts, or templates.
- The merged branch also surfaced brittle auth-focused tests that timed out under the full parallel Vitest suite until their module isolation was tightened.

**Change made:**
- Verified directly that `origin/main` still lacks the release automation implementation assets and that commit `d016623` is not reachable from `main`.
- Merged `origin/main` into `codex/release-automation-architecture` so the branch now contains both the release-machine protocol and the fuller release automation system.
- Updated `AGENTS.md` to require both `docs/engineering/release-machine.md` and `docs/engineering/release-automation-operating-guide.md` before serious implementation work.
- Rewired `scripts/release-check.sh`, `scripts/preview-check.js`, and `scripts/prod-check.js` to delegate to the stronger release automation entrypoints instead of maintaining weaker parallel logic.
- Stabilized `src/lib/data.auth.test.ts` and `src/components/auth/auth-modal.test.tsx` by resetting modules between tests and raising their timeout budget so the full repo test suite passes reliably after the merge.
- Re-ran lint, test, build, the standardized local release gate, and the preview/prod wrappers against a live local server.

**Files modified:**
- `AGENTS.md`
- `README.md`
- `PROJECT.md`
- `docs/testing/release-automation-architecture.md`
- `docs/bug-fixes/release-automation-architecture.md`
- `docs/prd/release-automation-architecture.md`
- `scripts/release-check.sh`
- `scripts/preview-check.js`
- `scripts/prod-check.js`
- `src/lib/data.auth.test.ts`
- `src/components/auth/auth-modal.test.tsx`

**Remaining risks / next steps:**
- `origin/main` still does not contain the release automation rollout because this branch still cannot be pushed with the current GitHub credential.
- Branch protection, preview URL handoff, and `PRODUCTION_BASE_URL` still require external GitHub/Vercel configuration.
- `npm install` still reports one pre-existing high severity vulnerability unrelated to this rollout work.

### [2026-04-18 00:10] — Release Automation System Internal PRD

**Agent:**
- Codex

**Problem addressed:**
- The rollout branch already had branch-level rollout docs, but the repo still lacked one concise system-level PRD that explains the release automation machine itself as an ongoing internal capability.

**Root cause:**
- Existing docs were oriented around the rollout branch and verification history rather than a stable internal feature brief for the release automation system.

**Change made:**
- Added `docs/prd/release-automation-system.md` as a concise internal PRD covering the objective, problem, why the system is needed, release gates, automated versus human-only scope, GitHub/Vercel dependencies, success criteria, and known limitations.
- Kept the document repo-safe and secret-free, with no tokens, headers, cookies, or private infrastructure material.

**Files modified:**
- `docs/prd/release-automation-system.md`
- `PROJECT.md`

**Remaining risks / next steps:**
- The rollout still depends on pushing and merging `codex/release-automation-architecture` through the protected PR path once local Git authentication can update workflow files.
- External GitHub/Vercel configuration remains necessary even after the PRD exists.

---

## 8. NEXT ACTION (FOCUS)

- Implement stable RSS ingestion pipeline
- Define initial feed ranking logic (even if simple)
- Ensure AI summarization produces consistent, structured outputs

---

## 9. NOTES

- This file is the **shared memory layer** across all AI agents.
- Treat this as the **single source of truth for system state**.
- Notion should be used for product thinking, not system state tracking.
