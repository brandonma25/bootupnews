# Bug Fix: push-approved NOT NULL insert failures + NOTION_TOKEN trim gap

**Date:** 2026-05-16
**PR:** fix/editorial-pipeline-gaps
**Severity:** Blocking (every push-approved insert would fail; Notion reads would fail on whitespace tokens)
**PRD:** PRD-64 (Editorial Automation Pipeline)

## Symptoms

1. `POST /api/editorial/push-approved` — every `signal_posts` insert failed with a
   Postgres NOT NULL constraint violation on `source_name` / `source_url`.
2. Notion API calls inside `push-approved` (querying approved rows, marking rows pushed)
   would fail if `NOTION_TOKEN` had a trailing newline — same class of bug fixed in
   PR #239 for `notion-writer.ts`, but missed in the `notionRequest` helper.

## Root Causes

### Bug 1 — NOT NULL columns passed `null`
`signal_posts.source_name` and `signal_posts.source_url` are both `NOT NULL`.
The insert payload wrote:
```typescript
source_name: source || null,   // null when Notion Source field is blank
source_url: sourceUrl || null, // null when Notion Source URL field is blank
```
Postgres rejected the insert with a NOT NULL constraint error on every row where
either field was missing from the Notion record.

### Bug 2 — NOTION_TOKEN not trimmed in `notionRequest`
The `notionRequest` helper that handles all Notion API calls in `push-approved/route.ts`
read the token without `.trim()`:
```typescript
const token = process.env.NOTION_TOKEN;  // trailing newline → 401 from Notion
```
PR #239 added `.trim()` to `notion-writer.ts` but not to this helper.

## Fixes

```typescript
// Bug 1 — empty-string fallback for NOT NULL columns
source_name: source || "",
source_url: sourceUrl || "",

// Bug 2 — trim NOTION_TOKEN at read site
const token = process.env.NOTION_TOKEN?.trim();
```

## Pattern

Any column with `is_nullable = 'NO'` in `signal_posts` must never receive `null`.
Use `|| ""` for text columns and `|| []` for array columns.
Any `process.env.*` read that feeds an external API header should call `.trim()`.
