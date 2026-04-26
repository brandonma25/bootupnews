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
- Testing note added if meaningful validation was performed.
- Google Sheets tracker updated and verified, or fallback tracker-sync file created in `docs/operations/tracker-sync/`.
- Live tracker verification confirms normalized `Status`, correct `Owner`, and canonical `PRD File` path when a PRD file exists.
- No sensitive information is included.

## 8. Merge Readiness
- Build passes.
- Preview validation is complete.
- Tracker closeout is complete: live Google Sheets row verified or exact manual update payload recorded in repo fallback.
- Codex has not claimed tracker closeout from intent alone; the live row was reread after write, or the fallback file exists.
- No known blockers remain.
