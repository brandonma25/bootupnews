# Live Site Verification Log — April 15, 2026

Production URL: redacted for public repo hygiene

## Deployment checks

- Local `main` HEAD: `0f8f3f8fdc38bca5f0c87b928b9eac49522a7267`
- Remote GitHub `main`: `0f8f3f8fdc38bca5f0c87b928b9eac49522a7267`
- Latest Vercel production deployment:
  - Deployment ID: redacted for public repo hygiene
  - Commit ref: `main`
  - Commit SHA: `0f8f3f8fdc38bca5f0c87b928b9eac49522a7267`
  - Status: `READY`

## Integrated live route pass

### Passed

- `/`
  - Loaded successfully.
  - Confirmed event-centric homepage content is live, including:
    - `Top 5 Most Important Events Today`
    - `Why it matters`
    - `What led to today`
    - grouped related coverage
- `/dashboard`
  - Loaded successfully in public mode.
- `/topics`
  - Loaded successfully in public mode.
- `/sources`
  - Loaded successfully in public mode.
- `/history`
  - Loaded successfully in public mode.
- `/settings`
  - Loaded successfully.

### Expected behavior

- `/auth/password`
  - `GET` returned `405 Method Not Allowed`.
  - This is acceptable for a POST-only auth route.

### Needs follow-up

- `/auth/callback`
  - Direct fetch returned `200`, but not a meaningful callback validation because no auth tokens or provider params were supplied.
  - Route still needs a real provider-driven callback test.

## Issues found

### 1. Production signup flow currently fails

- Severity: High
- Route: `/auth/password`
- Test:
  - Submitted a live signup POST on April 15, 2026 using a fresh email.
- Result:
  - Server returned `307` redirect to `/?auth=signup-error`
- Impact:
  - Blocks end-to-end verification of account creation, seeded topics, and post-auth user flows on production.

### 2. Seeded-topic behavior is not verifiable from public mode alone

- Severity: Medium
- Route: `/topics`
- Result:
  - Public mode still shows demo topics (`Tech`, `Finance`) rather than a signed-in user's seeded topics.
- Impact:
  - This is not necessarily a bug, but it means the live anonymous route pass does not prove that new users receive all four seeded topics (`Tech`, `Finance`, `World`, `Business`).
- Dependency:
  - Requires a working signup or authenticated test account flow to complete verification.

### 3. Auth callback route not fully validated

- Severity: Medium
- Route: `/auth/callback`
- Result:
  - Bare request returned `200`, but without callback params this does not validate the real auth exchange.
- Impact:
  - We cannot yet confirm callback-driven onboarding and seeding behavior on production.

## Recommended next check

1. Fix the production signup error path.
2. Repeat the live signup test with a brand-new user.
3. Verify the signed-in user sees:
   - `Tech`
   - `Finance`
   - `World`
   - `Business`
4. Re-test `/dashboard`, `/topics`, `/sources`, and `/settings` while authenticated.
