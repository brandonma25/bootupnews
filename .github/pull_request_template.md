# Summary

## Branch
- [ ] Correct branch used
- [ ] No unrelated changes included
- [ ] PR title or branch includes canonical `PRD-XX` when this work maps to a governed feature

## Change Classification
- [ ] Change type declared: feature / remediation / refactor / bug-fix / hotfix / docs-only
- [ ] Source of truth identified: PRD, bug report, remediation brief, decision ledger, or explicit request
- [ ] User-facing behavior changes stated, or confirmed none
- [ ] If this is not feature work, no new canonical PRD was created

## Terminology
- [ ] Read `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`
- [ ] Confirmed object level before coding: Article, Story Cluster, Signal, Card, or Surface Placement
- [ ] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card
- [ ] If legacy naming is inconsistent, documented it instead of silently expanding it
- [ ] PRD clearly states which object level the feature modifies, if applicable
- [ ] PRD does not describe UI cards as signals unless referring to the underlying Signal object

## Local Validation
- [ ] App runs locally
- [ ] Relevant flows tested

## Preview Validation
- [ ] OAuth or login works if applicable
- [ ] Session persists
- [ ] Redirects are correct
- [ ] Signed-in versus signed-out state is correct
- [ ] No SSR or hydration issues
- [ ] Environment variables behave correctly

## Production Impact
- [ ] No known regression risk
- [ ] Safe to deploy

## Feature Type
- [ ] UI / Experience
- [ ] Data / Pipeline
- [ ] Auth / Session
- [ ] SSR / Environment Logic

## Documentation Updates
- [ ] `docs/product/briefs/` updated if applicable
- [ ] `docs/product/prd/` updated if applicable
- [ ] Stable public docs updated if product behavior, public framing, or governance changed
- [ ] Operational evidence kept in PR body, GitHub metadata, or private archive when not portfolio-facing
- [ ] No sensitive information included

## Security Check
- [ ] No secrets or tokens included
- [ ] No auth vulnerabilities exposed
- [ ] No sensitive logs, cookies, or headers included

## Build & Test
- [ ] Build passes
- [ ] Lint and test results reviewed

## Merge Readiness
- [ ] Local validation complete
- [ ] Preview validation complete
- [ ] Documentation complete
- [ ] No known blockers
