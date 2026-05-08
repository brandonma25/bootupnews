# Test Checklist

## 1. Branch & Scope
- Correct branch is being used.
- No unrelated changes are included.
- Scope matches the task.
- [ ] Confirmed object level before coding: Article, Story Cluster, Signal, Card, or Surface Placement.
- [ ] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [ ] If legacy naming is inconsistent, document it instead of silently expanding it.

## 2. Local Validation
- App runs locally.
- No crashes during the tested flow.
- Relevant flows work as expected.

## 3. Preview Validation
- OAuth or login works if applicable.
- Session persists after refresh.
- Redirects are correct.
- Signed-in and signed-out state is correct.
- No SSR or hydration mismatch appears.
- Environment variables behave correctly.

## 4. Production Sanity
- No regressions are visible after merge.
- Critical flows remain intact.

## 5. Auth-Specific Checks
- Login works.
- Logout works.
- Session persistence is correct.
- Refresh state is correct.

## 6. SSR / Env Checks
- Rendering is correct on refresh.
- No hydration mismatch appears.
- Env-sensitive logic behaves correctly.

## 7. Documentation Check
- Canonical PRD updated if applicable.
- [ ] Terminology check completed: Article, Story Cluster, Signal, Card, and Surface Placement are used according to the canonical terminology document.
- [ ] PRD clearly states which object level the feature modifies.
- [ ] PRD does not describe UI cards as signals unless referring to the underlying Signal object.
- Product brief added or updated if the feature work is meaningful.
- `docs/product/feature-system.csv` updated if applicable.
- Bug-fix, incident, or change-record doc created if applicable.
- Branch cleanup record created in `docs/operations/branch-cleanup/` if branch deletion or bulk branch cleanup occurred.
- Testing note added if meaningful validation was performed.
- Google Sheet / Google Work Log was not treated as canonical and was not updated for routine closeout.
- No routine tracker-sync fallback file was created.
- No sensitive information is included.

## 8. Merge Readiness
- Build passes.
- Preview validation is complete.
- GitHub documentation closeout is complete in the correct canonical lane.
- Codex has not claimed Google tracker, preview, production, or external-log validation unless that system was actually checked.
- No known blockers remain.
