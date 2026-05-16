# Bug Fix: source_url NOT NULL + CHECK constraint conflict

**Date:** 2026-05-16
**PR:** fix/source-url-nullable
**Severity:** Blocking (every push-approved insert for rows with no Source URL failed)
**PRD:** PRD-64 (Editorial Automation Pipeline)

## Symptom

`POST /api/editorial/push-approved` — any Notion row without a Source URL produced:

```
signal_posts insert failed: new row for relation "signal_posts" violates
check constraint "signal_posts_public_source_url_check"
```

## Root Cause

`signal_posts.source_url` had two conflicting constraints:

1. `NOT NULL DEFAULT ''` — no nulls, default to empty string
2. `CHECK (btrim(source_url) <> '' AND source_url ~* '^https?://')` — rejects empty strings and non-URL values

The default value `''` itself fails the CHECK, and the `|| ""` fallback added in PR #243 (to satisfy NOT NULL) also fails it. There was no valid way to represent "no URL" without a real `https://...` value.

## Fix

```sql
ALTER TABLE signal_posts ALTER COLUMN source_url DROP NOT NULL;
```

With NOT NULL removed, `NULL` is the correct representation for "no URL". The CHECK constraint evaluates to UNKNOWN for NULL (which passes), so format enforcement still applies for any non-null value.

Code updated: `source_url: sourceUrl || null` (reverted the `|| ""` fallback from PR #243).

## Pattern

Any column with both `NOT NULL` and a CHECK that rejects the empty string must either:
- Allow NULL for the "absent" case, or
- Have a meaningful non-empty default that satisfies the CHECK.

The `is_nullable = 'NO'` + `DEFAULT ''` + CHECK combination is a schema anti-pattern. Use NULL for absent optional fields.
