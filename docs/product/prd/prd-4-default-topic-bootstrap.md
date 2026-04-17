# PRD-4 — Default Topic Bootstrap

- PRD ID: `PRD-4`
- Canonical file: `docs/product/prd/prd-4-default-topic-bootstrap.md`

## Objective
- Ensure new accounts have enough default topic structure to generate a meaningful briefing immediately after onboarding.

## User Problem
- A new user should not need to hand-configure topics before seeing product value; otherwise the first-run experience becomes empty or fragile.

## Scope
- Default topic seed definitions.
- Bootstrap behavior during auth completion and password onboarding.
- Schema support for default topic persistence.

## Non-Goals
- Manual topic/source management surfaces formalized later in PRD-15.
- OAuth callback hardening and session-routing safeguards covered later in PRD-14.
- Personalized topic/entity preferences.

## Implementation Shape / System Impact
- Onboarding flows seed baseline topics automatically.
- The data model supports a dependable first-run briefing path instead of assuming preexisting topic setup.

## Dependencies / Risks
- Dependencies:
  - Signed-up or signed-in user creation paths.
  - Topic schema and seed definitions.
- Risks:
  - Poor default topic choices can bias early briefing quality.
  - Bootstrap behavior depends on auth flows completing successfully.

## Acceptance Criteria
- New users receive a baseline topic set without manual database setup.
- Post-auth and password onboarding paths can attach the default topic bootstrap.
- The system can generate a live or demo briefing with seeded topic structure.

## Evidence and Confidence
- Repo evidence:
  - Historical PRD content from commit `0c6196f`
  - Current related files: `src/lib/default-topics.ts`, `src/app/actions.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/password/route.ts`, `supabase/schema.sql`
- Confidence: High. The repo history and current code paths make the bootstrap feature identity clear.
