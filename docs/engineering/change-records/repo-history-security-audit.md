# Bug Fix: Repo History Security Audit

## Objective
Review git history, not just the current tree, for evidence of past exposure of secrets or overly specific infrastructure details.

## What Was Checked
- Current tracked files for secret and infra-identifying patterns.
- Git history for:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `sb_publishable_`
  - `eyJ`
  - `Bearer`
  - `Authorization:`
  - `client_secret`
  - `access_token`
  - `refresh_token`
  - `redirect_uri`
  - `vercel.app`
  - `supabase.co`
  - `.env`
  - `.env.local`
  - `.env.production`
  - `.pem`
  - `.key`
  - `.crt`
  - `.p12`
- High-risk path history for:
  - `README.md`
  - `.env.example`
  - `docs/`
  - `QA-LIVE-TEST-2026-04-15.md`
  - `PROJECT.md`
  - `src/components/auth/`
  - `src/app/auth/`
  - `src/lib/supabase/`
  - `supabase/`

## Commands Used
- `rg -n --hidden ...`
- `git ls-files | rg '(^|/)(\.env($|\.)|.*\.(pem|key|crt|p12)$)'`
- `find . -maxdepth 3 \( -name '.env*' -o -name '*.pem' -o -name '*.key' -o -name '*.crt' -o -name '*.p12' \) | sort`
- `git log --all --name-only --pretty=format: | rg '(^|/)(\.env($|\.)|.*\.(pem|key|crt|p12)$)'`
- `git log --all -G '...' -- ...`
- `git log --all -S '...'`
- `git grep -n '...' $(git rev-list --all) -- ...`

## Confirmed Findings
- No committed `.env.local`, `.env.production`, private cert/key files, service-role keys, OpenAI API keys, OAuth client secrets, access tokens, refresh tokens, or JWT/session token payloads were confirmed in git history.
- `.env.example` is the only env-style file found in tracked history, and it contains placeholders only.
- Historical tracked docs and test fixtures did contain project-specific but non-secret identifiers, including:
  - Canonical production and preview deployment URLs
  - Preview deployment URLs
  - A concrete Supabase project ref in callback/config examples
  - A production deployment ID in the QA log

## Severity Assessment
- Confirmed secret exposure: None found.
- Confirmed infra-identifying exposure: Low to medium, depending on how strictly the repo should avoid linking internal deployment topology.

## Confirmed vs Uncertain
- Confirmed:
  - Historical presence of concrete Vercel and Supabase identifiers in tracked docs/tests.
  - Placeholder-only credential examples in README and `.env.example`.
  - No tracked env/key file history beyond `.env.example`.
- Uncertain:
  - Whether any real credentials may have been copied outside Git history into screenshots, chats, provider dashboards, or ignored local files. That is outside what git history can prove.

## Recommended Next Steps
- Credential rotation:
  - Not recommended based on git-history evidence alone, because no committed secret values were confirmed.
  - If there is separate concern that values from ignored local env files were shared elsewhere, rotate provider-side as a precaution.
- History rewrite:
  - Not recommended as an automatic next step for this audit.
  - Consider only if you specifically want to purge the historical Vercel/Supabase identifiers from public commit history for hygiene reasons.
