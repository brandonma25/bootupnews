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
