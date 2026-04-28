# Tracker Sync Fallback - Batch 1 Accessible Source Promotion

Date: 2026-04-28

## Live Sheet Status

Direct Google Sheets write/readback was not available from this Codex session.

## Manual Update Payload

Workbook: `Features Table`

Recommended row mapping:

- Existing governed source-governance row: `PRD-42`
- Existing governed public-source-manifest row: `PRD-54`

Suggested status:

- Status: `In Review`
- Decision: `keep`
- Last updated: `2026-04-28`

Suggested notes:

`Implemented Batch 1 accessible source promotion under PRD-42 / PRD-54: added validated NPR Business/Economy/World/Politics, ProPublica Main, Federal Reserve all/monetary, BLS principal indicators/CPI/employment, CNBC Business/Economy/Finance/Politics, and MarketWatch Top Stories to the governed public.home source manifest with source-role, tier, and public eligibility metadata. Treasury, broken BLS broad feed, ProPublica topic guesses, MarketWatch Market Pulse, broad CNBC/NPR top feeds, TLDR public authority, and unofficial AP/Reuters feeds were not promoted. Source-accessibility predicates remain authoritative, so abstract-only/support sources cannot fill Core slots by brand alone.`

## Validation Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 72 files / 466 tests.
- `npm run build`: passed.
- Governance checks: passed.
- `python3 scripts/validate-feature-system-csv.py`: passed with existing unrelated slug warnings.
- `python3 scripts/release-governance-gate.py`: passed.
- Chromium/WebKit E2E: passed, 33 tests each.
- Controlled `dry_run`: completed with `insertedCount=0` and no `signal_posts` persistence.
