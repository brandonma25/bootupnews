# AGENTS.md — Codex Operating Rules

## 1. Read Before Work
Before any substantial implementation, read:
`docs/engineering-protocol.md`

---

## 2. Scope & Branching
- Always make an explicit branch decision
- One feature/fix per branch
- Do not mix unrelated changes
- Do not modify unrelated files

---

## 3. Validation Order (MANDATORY)
Follow this sequence:

Local -> Vercel Preview -> Production

- Local = code correctness
- Preview = source of truth for:
  - auth
  - cookies
  - redirects
  - SSR
  - environment variables
- Production = final sanity check only

Never treat production as the first debugging environment.

---

## 4. Required Automated Checks
Always run:

- `npm install`
- `npm run lint || true`
- `npm run test || true`
- `npm run build (must pass)`

Then:
- enforce DEV SERVER RULE (port 3000)
- start dev server
- verify app loads

If build fails -> STOP

---

## 5. Human Validation Required
You must request user validation for:

- OAuth / login flows
- session persistence
- preview environment behavior
- any auth, SSR, or env-dependent feature

---

## 6. Documentation (MANDATORY)
For every feature or fix:

Update:
- `docs/prd-summaries/`
- `docs/bug-fixes/`
- `docs/testing/`

Docs must be:
- concise
- structured
- sanitized

---

## 7. Security Rules (NON-NEGOTIABLE)
Never write or expose:

- API keys
- tokens
- secrets
- auth vulnerabilities
- exploit steps
- cookies / headers
- sensitive logs

---

## 8. Merge Conditions
Do NOT recommend merge unless:

- build passes
- local validation complete
- preview validation confirmed
- documentation updated

---

## 9. If Uncertain
Ask for clarification before proceeding.
