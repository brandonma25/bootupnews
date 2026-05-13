# Bootupnews.com Canonical Domain

- Date: 2026-05-14
- Branch: `chore/bootupnews-com-canonical-domain`
- Change type: domain and deployment configuration remediation

## Problem

Repo-controlled production URL defaults still treated `https://bootupnews.vercel.app` as the canonical public origin. That made metadata, sitemap, robots output, documentation, and release examples point at the default Vercel deployment host instead of the production apex domain.

## Resolution

- Set the repo-controlled canonical public origin to `https://bootupnews.com`.
- Updated public URL examples, metadata expectations, sitemap/robots URL tests, and current production verification docs to use the apex domain.
- Added exact-host production redirects for `bootupnews.vercel.app` and `www.bootupnews.com` to `https://bootupnews.com` while leaving localhost and Vercel preview deployment hosts untouched.
- Renamed the npm package identity to `bootupnews` while preserving the locked user-facing `Boot Up` brand.

## Follow-Up

- Vercel production env variables that store public app URLs should be set to `https://bootupnews.com`.
- Third-party OAuth, analytics, replay, and source-map dashboards should allow `https://bootupnews.com` and `https://www.bootupnews.com` before removing the legacy default Vercel host.
