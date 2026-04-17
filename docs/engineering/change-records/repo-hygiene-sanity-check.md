# Bug Fix: Repo Hygiene Sanity Check

## Problem
The repository contained public-facing documentation and test fixtures with environment-specific details that were useful during setup and debugging, but too specific for a public GitHub repo.

## Symptoms
- `README.md` referenced a local absolute filesystem path
- `README.md` included concrete Vercel deployment URLs and a real Supabase project URL
- The repo documentation referenced `.env.example`, but no tracked example file existed
- A tracked auth test used project-specific OAuth callback domains
- A tracked live verification note included a concrete production URL and deployment identifier

## Root Cause
Auth troubleshooting and deployment verification were documented quickly for active development, and those notes were never normalized back to public-safe placeholders.

## Fix
- Replaced deployment-specific setup examples in `README.md` with reusable placeholders
- Removed the local absolute path from setup instructions
- Added a tracked `.env.example` containing placeholders only
- Updated `.gitignore` so real env files remain ignored while `.env.example` stays committed
- Replaced project-specific OAuth URLs in the auth modal test with `example` domains
- Redacted production-specific identifiers from the live verification note

## Verification
- Confirmed `.env.local` and `.env.local.save` are ignored by Git
- Confirmed no tracked `.env`, `.pem`, `.key`, `.crt`, or `.p12` files remain
- Confirmed example emails in tests are placeholder addresses only
- Confirmed the README setup flow still points to valid placeholder inputs rather than real credentials

## Remaining Manual Review
- Review any future ad hoc QA or incident notes before committing them, since those documents are the easiest place for deployment-specific details to slip back in.
- If credentials were ever committed before this cleanup, rotate them through the relevant provider dashboards rather than relying on repo cleanup alone.
