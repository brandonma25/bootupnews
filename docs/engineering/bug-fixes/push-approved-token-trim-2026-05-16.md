# Bug Fix: push-approved 401 from untrimmed token query param

**Date:** 2026-05-16
**PR:** #240
**Severity:** Blocking (editorial push flow non-functional)
**PRD:** PRD-64 (Editorial Automation Pipeline)

## Symptom

`/api/editorial/push-approved?token=<secret>` returned 401 on every request
even when the correct secret was supplied.

## Root Cause

`EDITORIAL_PUSH_SECRET` from the environment was trimmed with `.trim()`, but
the `token` value read from `req.nextUrl.searchParams.get("token")` was not.
A trailing whitespace or newline difference between the two strings caused the
strict equality check to fail.

## Fix

Added `.trim()` to the incoming query param:

```typescript
const provided = url.searchParams.get("token")?.trim();
const expected = process.env.EDITORIAL_PUSH_SECRET?.trim();
if (!expected || provided !== expected) { ... }
```

## Pattern

Same class of issue as the Notion env-var trailing-newline bug fixed in PR #239.
Any secret comparison that reads from both an env var and an external source
(query param, header, request body) must trim both sides.
