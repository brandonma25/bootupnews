# PRD-25 to PRD-31 Governance Pipeline — Testing Report

## Release Metadata
- Date: 2026-04-18
- Branch: `feature/prd-25-governance-pipeline`
- PR: pending

## Commands Run
- `python3 scripts/validate-feature-system-csv.py`
- `python3 scripts/validate-documentation-coverage.py --base-sha origin/main --head-sha HEAD --branch-name feature/prd-25-governance-pipeline`
- `python3 scripts/release-governance-gate.py --base-sha origin/main --head-sha HEAD --branch-name feature/prd-25-governance-pipeline`
- `python3 scripts/check-governance-hotspots.py --base-sha origin/main --head-sha HEAD --branch-name feature/prd-25-governance-pipeline --require-fresh`
- `python3 scripts/pr-governance-audit.py --base-sha origin/main --head-sha HEAD --branch-name feature/prd-25-governance-pipeline`
- `python3 -m py_compile scripts/governance_common.py scripts/validate-documentation-coverage.py scripts/release-governance-gate.py scripts/pr-governance-audit.py scripts/check-governance-hotspots.py scripts/validate-feature-system-csv.py`
- `ruby -e 'require "yaml"; ARGV.each { |path| YAML.load_file(path) }; puts "workflow yaml ok"' .github/workflows/release-governance-gate.yml`
- `npm install`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run dev`
- `curl -s http://localhost:3000/`
- `curl -s http://localhost:3000/dashboard`

## Automated Results
- Governance validators: passed after local diff detection was updated to include working-tree and untracked files.
- YAML parse check: passed.
- Lint: passed.
- Unit/integration tests: passed (`25` files, `134` tests).
- Build: passed.
- Local smoke: passed. `http://localhost:3000` started successfully and both `/` and `/dashboard` returned `200`.

## Human Auth / Session Results
- Not run in this session.
- No auth-specific behavior was changed by this governance pipeline, so preview-only auth checks remain informational rather than blocking for this branch.

## Remaining Risks
- The release governance workflow still depends on external GitHub branch-protection configuration to make the check truly blocking on GitHub.
- Google Sheets status changes were not executed directly from this repo workflow.
