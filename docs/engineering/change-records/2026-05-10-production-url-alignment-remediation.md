# Production URL Alignment Remediation

Date: 2026-05-10

Change type: remediation

Canonical PRD required: no

## Source of Truth

User-declared production URL migration from the legacy Vercel production host
and invalid interim host to:

- Canonical production origin: `bootupnews.vercel.app`
- Canonical full production URL: `https://bootupnews.vercel.app`

## Scope

This remediation updates repo-controlled production URL references only. It does
not change routing, auth logic, deployment architecture, editorial workflow,
content model, cron behavior, or public publishing behavior.

## Implementation Notes

- Repo-controlled full production URLs now use `https://bootupnews.vercel.app`.
- Host-only production references now use `bootupnews.vercel.app`.
- Public metadata uses the centralized app-origin helper in `src/lib/env.ts` for
  homepage canonical metadata, Open Graph URL, Twitter URL, `robots.txt` sitemap
  reference, and `sitemap.xml` homepage URL.
- External Vercel, auth-provider, monitoring, analytics, Search Console, and
  social preview settings remain outside repo scope.
