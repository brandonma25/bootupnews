# PRD-53 — Signals admin editorial layer

- PRD ID: `PRD-53`
- Canonical file: `docs/product/prd/prd-53-signals-admin-editorial-layer.md`
- Feature system row: `docs/product/feature-system.csv`
- 2026-04-29 amendment status: `Draft for review`
- 2026-04-29 readiness label: `ready_for_card_level_editorial_authority_prd_review`
- 2026-04-30 implementation checkpoint: minimal final-slate composer in review
- 2026-04-30 readiness label: `ready_for_prd_53_minimal_final_slate_composer_review`
- 2026-04-30 implementation checkpoint: editorial card controls in review
- 2026-04-30 readiness label: `ready_for_prd_53_editorial_card_controls_review`
- 2026-04-30 implementation checkpoint: seven-row publish workflow hardening in review
- 2026-04-30 readiness label: `ready_for_prd_53_seven_row_publish_hardening_review`
- 2026-04-30 implementation checkpoint: minimal published-slate audit/history in review
- 2026-04-30 readiness label: `ready_for_prd_53_minimal_published_slate_audit_history_review`

## Objective

Add a private in-app editorial review workflow for the public Top 5 Signals list so an authorized editor can review AI-drafted “Why it matters” copy, write the human editorial version, approve each signal, and publish the final list.

The published homepage experience must use the human editorial layer as the source of truth while keeping the collapsed “Why it matters” summary box readable, intentional, and sentence-complete across all five homepage editorial cards.

The 2026-04-29 amendment extends this editorial layer from row-level copy review into explicit card-level editorial authority for final slate composition: accept, reject, hold, replace, promote, demote, reorder, compose, validate, lock, publish, and roll back a reviewed `5 Core + 2 Context` public briefing slate.

## User Problem

The site can produce ranked signal posts, but the final public “Why it matters” layer needs human editorial judgment before publication. Without an in-app workflow, review either happens outside the product or risks exposing raw AI draft copy before approval.

## Scope

- Add an environment-variable based admin/editor authorization helper using `ADMIN_EMAILS`.
- Grant admin/editor access to configured Google-authenticated users, including `[REDACTED_EMAIL_ADDRESS]` when configured.
- Add `/dashboard/signals/editorial-review` as the private review route.
- Add a persisted `signal_posts` editorial model for the current Top 5 list.
- Support draft save, approval, reset to AI draft, and full-list publishing.
- Add `/signals` as the public published Top 5 Signals route.
- Ensure the public route renders `publishedWhyItMatters`, not raw AI draft copy.
- Support lightweight structured editorial authoring for homepage preview, thesis, and sectioned expanded copy.
- Preserve legacy single-block editorial copy as a safe fallback when structured content is absent.
- Render homepage `Why it matters` cards with collapsed previews that end at complete sentence boundaries and expand inline to the full published editorial note.
- Clean pre-truncated stored snippets so collapsed summaries do not end with broken `...` fragments such as `wa...`.

## Non-Goals

- Do not replace Supabase/Google authentication.
- Do not add a separate role provider or auth stack.
- Do not implement the standalone AI draft-generation prompt/template system.
- Do not edit LLM prompt engineering files or content-generation-only utilities owned by the parallel generation task.
- Do not validate Vercel preview or production behavior from local tests alone.
- The 2026-04-29 amendment does not authorize code implementation, database mutation, public publish, cron re-enable, `draft_only`, `dry_run`, source expansion, ranking-threshold changes, WITM-threshold changes, Vercel/domain/environment changes, Phase 2 architecture, historical snapshot implementation, personalization, or removal of approved production admin access.

## Implementation Shape / System Impact

- `src/lib/admin-auth.ts` parses comma-separated admin emails and checks the authenticated Supabase user email.
- `src/lib/signals-editorial.ts` owns server-side editorial reads and mutations. Mutations require an authenticated admin/editor and use the Supabase service-role key only after that in-app authorization check.
- `public.signal_posts` stores ranked signal metadata, AI draft reference copy, human edited copy, published copy, status, and edit/approval/publish metadata.
- `public.published_slates` and `public.published_slate_items` store the minimal internal audit record for supported final-slate publishes: published row IDs, archived previous live row IDs, final rank/tier, Card copy snapshots, source snapshots, replacement metadata, and rollback preparation notes.
- RLS does not grant direct anonymous table reads. The public `/signals` route reads published rows server-side and renders only sanitized public fields.
- `/dashboard/signals/editorial-review` is noindexed and blocks unauthenticated and non-admin users.
- `/signals` shows the final published editorial layer only when all five posts have been published.
- Homepage Top 5 cards receive published editorial overrides through the homepage model and render collapsed summaries with a shared intentional-preview helper.
- Structured editorial payloads take priority when present: the explicit preview controls the collapsed state, and thesis plus sections control the expanded state.
- Legacy published text remains supported and is split into readable expanded paragraphs without creating a second canonical summary field.
- The admin preview simulation uses the same sentence-complete preview helper as the homepage so editors see the same collapsed behavior before publishing.

## Terminology Requirement

- Object levels modified by the 2026-04-29 amendment: Signal interpretation, Card copy, and Surface Placement.
- A Signal remains the interpreted unit of importance.
- A Card is the edited UI rendering of a Signal.
- A Surface Placement is where the Signal Card appears, such as homepage Core slots 1-5 or `/signals` Context slots 6-7.
- `public.signal_posts` is legacy/runtime naming for editorial and published Surface Placement plus Card copy. It is not canonical Signal identity.
- This amendment uses "card-level editorial authority" to mean editorial control over Card copy and final Surface Placement for reviewed Signals, not a new Signal identity model.

## 2026-04-29 Amendment: Card-Level Editorial Authority

### Governance Treatment

This is a PRD-53 amendment, not a separate PRD file. The repository protocol requires one canonical PRD file per PRD ID, so this amendment is recorded in `docs/product/prd/prd-53-signals-admin-editorial-layer.md` rather than creating `docs/product/prd/prd-53-amendment-card-level-editorial-authority.md`.

Effective change type: feature / PRD-53 amendment.

Canonical readiness label:

```text
ready_for_card_level_editorial_authority_prd_review
```

Primary sources:

```text
Product Position
Existing PRD-53 Signals admin editorial layer
April 29 controlled manual publish cycle summary
Change Classification and Governance template
Bootup News canonical terminology
```

Bootup News's product standard remains a curated daily intelligence briefing, not a feed: `Top 5 Core Signals + Next 2 Context Signals`, each with explicit structural "why it matters" reasoning and no false freshness.

### Problem Statement

The April 29 controlled manual publish cycle proved that Bootup News can produce a real public briefing when pipeline output is paired with human editorial judgment.

The cycle delivered:

```text
5 Core Signals
2 Context Signals
public homepage verification
public /signals verification
no visible held, unpublished, Depth, or non-live rows
cron still disabled
```

However, the path was too manual and not repeatable enough for durable Phase 1 editorial workflow. The following decisions happened outside a complete in-app authority system:

```text
row-by-row rewrite and copyedit
rejecting or holding a weak Core row
parking the SF Fed Economic Letter Countdown row
replacing that row with a homeowners-insurance candidate
promoting a Depth/artifact-backed candidate into Core
accepting Liberty Street source concentration consciously
forming the final 5 Core + 2 Context slate
updating six existing rows manually
inserting one replacement row manually
publishing exactly seven rows through scoped database intervention
excluding rank 8 / held / unpublished rows
remediating /signals so Context rows became publicly visible
```

This exposed a product gap: the current admin flow can support review, but it does not yet give editors explicit card-level authority over final slate composition. Without this capability, future publish cycles risk direct database intervention becoming the operating workflow, weak WITM rows slipping into publishable state, Depth or parked rows leaking publicly, slate composition being implicit rather than auditable, source concentration decisions being undocumented, replacement decisions being unreplayable, and public surfaces diverging from editorial intent.

The core product issue is that Bootup News needs a repeatable in-app way to turn pipeline candidates into a reviewed public editorial slate.

### Amendment Goals

- Enable editors to accept, reject, hold, replace, promote, demote, remove, and reorder cards.
- Make the final `5 Core + 2 Context` slate explicit before publish.
- Preserve human editorial review as the Phase 1 quality backbone.
- Prevent bad, generic, malformed, or WITM-failed rows from publishing.
- Prevent non-live, unapproved, Depth, rejected, held, parked, or rank-8 rows from leaking publicly.
- Allow replacements from governed candidate sources while preserving provenance.
- Make source concentration visible and consciously accepted when present.
- Create a clear audit trail for editorial decisions.
- Reduce direct database intervention.
- Keep cron disabled until the controlled editorial path is proven.

The user-facing product goal remains unchanged: users should receive a small number of structurally important Signals, ranked by importance rather than recency, with reasoning that explains why each Signal matters.

### Amendment Non-Goals

- No cron re-enable.
- No automated publishing.
- No full pipeline write-mode run.
- No `draft_only` or `dry_run` execution as part of this PRD/design task.
- No new source expansion.
- No ranking threshold changes.
- No WITM threshold changes.
- No source governance changes.
- No URL, domain, environment, or Vercel setting changes.
- No public UI redesign beyond ensuring the already-approved Core + Context slate is visible.
- No Phase 2 architecture implementation.
- No first-class four-object content model implementation yet.
- No semantic cluster engine.
- No cluster persistence.
- No same-cluster-different-treatment surfaces.
- No historical snapshot/schema implementation yet, except design implications.
- No personalization.
- No removal of approved production admin access unless separately authorized.

### Roles and Permissions

Admin/editor:

- Can view candidate rows, WITM status, failure reasons, source metadata, and provenance.
- Can edit Card copy, save draft edits, approve rows, request rewrites, reject rows, and hold rows as training/editorial evidence.
- Can replace a row with an existing governed candidate, promote a candidate to Core, demote Core to Context or Depth, remove a row from the final slate, reorder rows, accept source concentration warnings, compose the final slate, run pre-publish validation, publish the validated slate, and initiate rollback according to a runbook.
- Should not be able to publish WITM-failed rows, publish fewer or more than seven rows without a future exception policy, publish rank gaps or duplicate ranks, publish rejected or held rows, publish Depth rows unless explicitly promoted into Core or Context, or bypass final slate validation.

Public user:

- Can view live published Core rows on the homepage.
- Can view live published Core + Context rows on `/signals`.
- Cannot see draft, rejected, held, Depth, candidate, rank-8, unpublished, non-live, or unpublished-at rows.

System/pipeline:

- Can generate candidates and supporting metadata only when explicitly allowed.
- Can assign preliminary rank/tier suggestions, calculate WITM validation status, store WITM failure details, and surface source metadata/provenance.
- Should not publish automatically, override editor final slate decisions, silently promote Depth to Core, silently suppress WITM failures, or write public rows without an explicit guarded publish workflow.

### Card-Level Actions

Approve:

- Marks a row as editorially acceptable for final slate consideration.
- Requires WITM passed and acceptable title/source/WITM copy.
- Stores reviewer identity and timestamp.
- Does not imply public visibility.

Request rewrite:

- Marks a row as needing editorial or generation improvement.
- Keeps the row excluded from the final slate until fixed.
- Keeps failure reasons visible and allows editor rewrite notes.
- Does not require automated rewrite implementation.

Save draft edit:

- Saves edited title, WITM, and summary fields without approval.
- Preserves original generated copy.
- Marks the row as draft-edited or needs-review-after-edit.
- Requires WITM validation after material WITM changes.
- Does not make the row public.

Reject:

- Excludes a row from final slate use.
- Requires `rejected_reason`.
- Stores `rejected_by` and `rejected_at`.
- Keeps the row queryable in admin history.

Hold as training evidence:

- Parks a row without treating it as fully rejected.
- Requires `held_reason`.
- Stores `held_by` and `held_at`.
- Prevents final slate selection and public visibility.
- Applies to cases like the April 29 SF Fed Economic Letter Countdown row, which remained useful for calibration but retained `requires_human_rewrite` / `unsupported_structural_claim`.

Replace with existing candidate:

- Allows an editor to replace a weak slate row with a stronger governed candidate.
- Requires the original row to be rejected or held.
- Requires the replacement candidate to exist as a governed row or controlled artifact-backed insertion.
- Requires WITM passed, editor approval, non-live state before publish, and stored replacement relationship/provenance.

Promote candidate to Core:

- Allows a candidate, Depth row, or artifact-backed replacement to become a Core Surface Placement.
- Requires WITM passed, adequate source evidence, editor approval, final tier `core`, valid Core rank, and preserved provenance.
- A Depth row must never become public simply because it exists.

Demote Core to Context or Depth:

- Allows an editor to lower a candidate's surface role.
- If demoted to Context, the row must receive a valid Context rank.
- If demoted to Depth, it must be excluded from the public final slate.
- Demotion does not imply rejection.

Reorder within ranks 1-7:

- Ranks 1-5 are Core.
- Ranks 6-7 are Context.
- Duplicate ranks and rank gaps are invalid.
- Public order uses final editorial placement rank, not preliminary pipeline rank.

Remove from final slate:

- Clears final slate rank and tier while preserving editorial decision history.
- Keeps the row non-live.
- Supports good-but-not-selected rows.

Publish final slate:

- Runs pre-publish validation.
- Archives previous live slate.
- Publishes exactly seven final slate rows.
- Sets `is_live=true`, `editorial_status='published'`, `published_at`, and `publish_batch_id` only on selected final slate rows.
- Verifies homepage and `/signals` behavior after publish.

Publishing is a slate-level action, not a row-by-row action.

### Final Slate Model

A publishable slate is a validated editorial object consisting of exactly seven public rows:

```text
5 Core rows
2 Context rows
```

A slate is publishable only if all of the following are true:

```text
exactly 7 rows selected
exactly 5 final_slate_tier='core'
exactly 2 final_slate_tier='context'
Core rows occupy ranks 1-5
Context rows occupy ranks 6-7
no rank gaps
no duplicate ranks
all seven rows have WITM passed
all seven rows are editor-approved
no row has editorial_decision='rejected'
no row has editorial_decision='held'
no row has editorial_decision='rewrite_requested'
no row has unresolved WITM failure details
no row is Depth unless explicitly promoted into Core or Context
no row is already live before publish
no row is missing required source metadata
no row has unsupported structural claims
no row is stale without explicit editorial acceptance
source concentration warnings are resolved or accepted
```

Before publish, selected rows remain:

```text
is_live=false
published_at=null
not visible publicly
```

After publish, public reads must require:

```text
is_live=true
editorial_status='published'
published_at IS NOT NULL
```

The public product must not infer visibility from rank alone.

### Replacement Candidate Handling

Existing `signal_posts` rows are the best initial replacement path when the candidate already exists, has source metadata, has WITM metadata, is non-live, and is not rejected or held.

Dry-run artifacts are design-supported but are not enabled by this PRD alone. They require controlled conversion into a non-live row, artifact date/hash, source URL, source title, source publisher, generated Card copy, post-insertion WITM validation, and editor approval.

Candidate artifacts are eligible only with sufficient provenance:

```text
artifact_id
artifact_created_at
source_url
source_name
source_title
candidate_title
candidate_summary
candidate_witm
candidate_tier_suggestion
pipeline_run_id, if available
```

Controlled insert workflow:

- Creates a non-live row.
- Starts as `needs_review`.
- Cannot publish until approved.
- Stores provenance.
- Stores `promoted_from_artifact_id`, if applicable.
- Stores `replacement_of_row_id`, if applicable.

The April 29 homeowners-insurance replacement is the canonical example: a stronger candidate was inserted/promoted and the weaker SF Fed row was parked outside the final public slate.

### Data Model and Schema Implications

Existing `signal_posts` fields are likely not sufficient to model final slate composition cleanly because they can conflate:

```text
pipeline rank
editorial rank
public rank
candidate tier
final surface tier
row quality state
publish state
replacement relationship
slate membership
publish batch identity
```

Minimal additive field candidates:

```text
editorial_decision
final_slate_rank
final_slate_tier
replacement_of_row_id
held_reason
rejected_reason
promoted_from_artifact_id
final_slate_id
publish_batch_id
reviewed_by
reviewed_at
decision_note
source_concentration_accepted
source_concentration_note
```

Suggested enum values:

```text
editorial_decision:
- pending_review
- draft_edited
- approved
- rewrite_requested
- rejected
- held
- removed_from_slate

final_slate_tier:
- core
- context
- none
```

Recommended long-term model:

```text
signal_posts
- legacy/runtime candidate and Card copy rows

editorial_slates
- briefing date or publishable slate

editorial_slate_items
- maps signal_posts into final public placement

editorial_decision_events
- immutable audit trail of approve/reject/hold/promote/demote/reorder actions

publish_batches
- public publish execution, verification, and rollback metadata
```

This avoids coupling Signal identity to Surface Placement, which is a known ambiguity risk before Phase 2's richer content model. This amendment does not require the full historical snapshot or four-object model now. It only requires designing the admin workflow so later migration remains possible.

### Publish Workflow

Pre-publish validation must check:

```text
exactly 7 rows selected
exactly 5 Core
exactly 2 Context
ranks 1-7 exist
no duplicate ranks
no rank gaps
all selected rows are editor-approved
all selected rows have WITM passed
no selected row is held
no selected row is rejected
no selected row is rewrite_requested
no selected row is Depth unless promoted
all selected rows are non-live before publish
all selected rows have source metadata
all selected rows have publishable title/WITM copy
all source concentration warnings are resolved
no excluded row is accidentally marked for publish
```

The publish button must remain disabled until validation passes.

Lock final slate:

- Freeze final slate rank and tier.
- Store validation snapshot.
- Store editor identity and `locked_at`.
- Prevent accidental reorder/edit without unlocking.
- Make unlocking auditable.

Archive previous live slate:

- Identify current live rows.
- Store previous publish batch identity.
- Set previous live rows `is_live=false`.
- Preserve prior `published_at`.
- Store `archived_at` if supported.
- Never delete previous rows.

Publish final slate:

- Update only selected final slate rows.
- Set `is_live=true`.
- Set `editorial_status='published'`.
- Set `published_at` to current timestamp.
- Assign `publish_batch_id`.
- Assign public rank/tier from final slate placement if separate fields exist.

Rows not in the final slate must remain non-live and not visible publicly, including rank 8, held, rejected, Depth, candidate, draft, and rewrite-requested rows.

Post-publish verification must check:

```text
homepage returns 200
/signals returns 200
homepage shows current intended briefing date
homepage shows Top 5 Core Signals only, if that remains the public homepage design
/signals shows Top 5 Core Signals + Next 2 Context Signals
all 5 Core titles are visible
both Context titles are visible
held/rejected/rank-8 rows are not visible
Depth rows are not visible
unpublished rows are not visible
database has exactly 7 live rows for the publish batch
cron remains disabled
```

Rollback must be defined before implementation:

```text
identify failed publish_batch_id
set failed batch rows is_live=false
restore prior publish_batch_id rows to is_live=true
preserve audit trail
mark failed batch as rolled_back
record rollback reason
verify homepage and /signals again
```

Context visibility expectations:

- Homepage displays the Top 5 Core Signals and does not need to display Context unless separately designed.
- `/signals` displays the published Core + Context slate.
- Context visibility must not depend on ad hoc route fixes after publish.

### Safety and Guardrails

- No publish until final slate validation passes.
- No WITM-failed rows in final slate.
- No generic fallback WITM copy may pass validation.
- No unsupported structural claim may pass validation.
- Public reads require `is_live=true`, `editorial_status='published'`, and `published_at IS NOT NULL`.
- No rank 8 rows public.
- No held rows public.
- No rejected rows public.
- No rewrite-requested rows public.
- No Depth rows public unless explicitly promoted into the final slate.
- No candidate rows public.
- No non-live rows public.
- No publish without audit trail.
- No source concentration without visible warning and explicit acceptance.
- No replacement without provenance.
- No direct database intervention as the normal workflow.
- No cron re-enable through this PRD.

Recommended source concentration warning:

```text
Trigger warning if more than 2 final slate rows come from the same publisher.
Trigger stronger warning if more than 3 final slate rows come from the same source family or institution type.
Do not hard-block by default unless future editorial policy requires it.
Require editor note when warning is accepted.
```

The April 29 slate consciously accepted Liberty Street source concentration for a controlled manual slate; the future workflow should make that decision visible and auditable.

### Admin UX Requirements

Row status badges should distinguish:

```text
Needs review
Draft edited
WITM passed
Requires rewrite
Approved
Rejected
Held
Selected for final slate
Core
Context
Depth
Replacement
Published
```

Badges must make it impossible to confuse "approved" with "published."

WITM failure display should show:

```text
WITM status
failure category
failure details
unsupported claim indicators
generic fallback indicators
last validation time
```

Final slate composer should provide:

```text
Core slots 1-5
Context slots 6-7
drag/reorder or rank controls
tier controls
remove-from-slate control
validation state
publish readiness state
```

Replacement picker should show title, source, candidate tier, WITM status, failure details, source date, provenance, and duplicate/source concentration warnings.

Rank/tier controls must distinguish:

```text
pipeline suggested tier
editorial final tier
public published tier
```

Publish readiness checklist:

```text
5 Core selected
2 Context selected
Ranks 1-7 complete
No duplicate ranks
All WITM passed
All rows approved
No held rows selected
No rejected rows selected
No rewrite rows selected
No Depth rows selected unless promoted
Source concentration reviewed
Previous live slate identified
Rollback target identified
Public surface expected behavior confirmed
```

Disabled publish states must explain the specific blocker, such as:

```text
Only 4 Core rows selected; 5 required.
Context slot 7 is empty.
Row 3 has WITM status requires_human_rewrite.
Selected row is marked held.
Ranks 4 and 5 are duplicated.
Source concentration warning has not been accepted.
Replacement candidate has no provenance.
Rollback target could not be identified.
```

### Amendment Acceptance Criteria

1. Editor can form a `5 Core + 2 Context` slate.
   - Given candidate rows exist in admin, when an editor selects 5 Core rows and 2 Context rows, assigns ranks 1-7, and approves all seven rows, then the final slate composer shows a valid 7-row slate, the readiness checklist passes composition checks, and no public rows change before publish.

2. Rejected row is excluded.
   - Given a row is marked rejected, when an editor attempts to add it to the final slate, then the action is blocked, the row remains non-live, and rejection reason remains visible.

3. Held row is excluded but retained.
   - Given a row is marked held, when final slate validation runs, then the held row cannot be selected or published and remains available in admin history/training evidence.

4. Replacement candidate can be promoted safely.
   - Given a weak Core row is held or rejected and a stronger non-live candidate exists, when the editor selects the stronger candidate as replacement, promotes it to Core, assigns a valid rank, and approves it, then `replacement_of_row_id` is recorded, provenance is visible, the original row remains non-live, and the replacement remains non-live until slate publish.

5. WITM-failed row blocks publish.
   - Given a selected row has WITM status `requires_human_rewrite`, when the editor attempts to publish, then publish is disabled, the failing row is identified, failure details are visible, and no rows are made live.

6. Rank gaps and duplicate ranks block publish.
   - Given the final slate has missing rank 6 or two rows assigned rank 4, when pre-publish validation runs, then validation fails, publish remains disabled, and the rank issue is shown clearly.

7. Depth rows cannot leak publicly.
   - Given a Depth row exists, when a final slate is published, then the Depth row remains hidden unless explicitly promoted into Core or Context.

8. Final publish updates public surface correctly.
   - Given a valid final slate is locked, when the editor publishes it, then the previous live slate is archived, exactly 7 new rows are live, homepage shows the Core slate according to current design, `/signals` shows Top 5 Core + Next 2 Context, and held/rejected/unpublished/Depth/rank-8 rows are hidden.

9. Rollback plan exists and is executable.
   - Given a publish batch fails public verification, when rollback is initiated, then failed batch rows are removed from live visibility, the previous live batch is restored, rollback reason is stored, and public surfaces are verified again.

10. Audit trail exists.
    - Given an editor approves, rejects, holds, promotes, demotes, replaces, reorders, or publishes, then the system stores action type, actor, timestamp, affected row, previous value, new value, and required reason/note.

### Amendment Risks

- Overbuilding before repeated manual cycles.
  - Mitigation: ship the minimal final slate composer first, defer historical snapshot implementation, defer Phase 2 content model, and keep workflow scoped to `5 Core + 2 Context`.

- Source concentration.
  - Mitigation: show concentration warnings, require editor acceptance note, and do not silently block unless future policy says so.

- Direct database update bypasses.
  - Mitigation: make the admin composer the normal publish path, log publish batches, require validation before writes, and document direct database updates as emergency-only.

- Stale artifact replacement.
  - Mitigation: store artifact date/hash, warn on stale artifacts, require editor acceptance, rerun WITM validation, and require current source evidence.

- Schema coupling to `signal_posts`.
  - Mitigation: use minimal additive fields for Phase 1, design toward slate/slate-item separation, and defer full historical snapshot/schema work.

- Ambiguity between Signal identity and Surface Placement.
  - Mitigation: separate candidate rows from final slate membership where possible, store final slate rank/tier separately from pipeline suggestions, and reserve deeper content model work for a later phase.

- Public Context visibility drift.
  - Mitigation: include `/signals` verification in publish workflow, test public filters, and require Core + Context expected rendering before publish is considered complete.

### Amendment Implementation Phases

Phase 1 - PRD/design only:

- Draft and review this PRD-53 amendment.
- Confirm data model direction.
- Confirm acceptance criteria and non-goals.
- No code, database mutation, or publish.

Phase 2 - Admin final-slate composer:

- Display candidate pool, Core slots 1-5, and Context slots 6-7.
- Allow selection/removal/reorder.
- Show WITM status and readiness checklist.
- Keep publish disabled until validation passes.
- This phase can be read-only or non-publishing at first.

2026-04-30 implementation checkpoint:

- Implement the minimal composer against the existing PRD-53 admin surface, not a parallel admin architecture.
- Persist only draft placement metadata on `signal_posts` through nullable `final_slate_rank` and `final_slate_tier`.
- Validate readiness for exactly 5 Core rows and 2 Context rows before any future publish workflow.
- Keep final slate publish execution disabled in this phase.
- Keep public reads gated by `is_live = true`, `editorial_status = 'published'`, and `published_at IS NOT NULL`; `final_slate_rank` alone is not public visibility.
- Defer reject, hold, replace, promote, demote, publish batches, rollback execution, historical snapshots, and cron re-enable to later phases from the composer-only checkpoint.

Phase 3 - Replacement / hold / reject / promote / demote actions:

- Approve row, request rewrite, save draft edit, reject row, hold row, replace with existing candidate, promote to Core, demote to Context/Depth, store decision audit trail, and show source concentration warning.
- Publish can remain disabled or controlled until validation matures.

2026-04-30 implementation checkpoint:

- Add explicit admin controls for approve, save draft edit, request rewrite, reject, hold, replace with existing candidate, promote, demote, reorder, and remove from the draft slate.
- Persist card-level decision state through nullable `signal_posts.editorial_decision`, decision notes/reasons, replacement linkage, and reviewer metadata.
- Keep `editorial_status` as the existing draft/review/approved/published lifecycle and use `editorial_decision` for PRD-53 card-level authority so public visibility still requires `is_live = true`, `editorial_status = 'published'`, and `published_at IS NOT NULL`.
- Block rejected, held, rewrite-requested, removed, live, and already-published rows from draft slate assignment.
- Keep final public publish execution, publish batches, rollback execution, source concentration controls, historical snapshots, and cron re-enable out of this phase.

Phase 4 - Controlled publish workflow hardening:

- Lock validated final slate, archive previous live slate, publish exactly selected rows, assign `publish_batch_id`, verify homepage, verify `/signals`, and support rollback.
- This phase replaces ad hoc database intervention for controlled manual publish.

Phase 5 - Historical snapshot/schema layer:

- Design or implement slate history, preserve final published Card state, capture source attribution at publish time, capture replacement/hold/reject decisions, preserve category/surface placement, and support replayable historical briefings.
- Do this after editorial authority is working, not before.

Phase 6 - Cron re-enable consideration:

- Consider scheduled fetch only after controlled path is reliable.
- Keep human approval before public publish.
- Do not allow automatic public publication unless separately approved.
- Cron remains last.

### Amendment Open Questions

1. Should source concentration be warning-only or hard-blocking above a threshold?
2. What exact source concentration threshold should apply: same publisher, same source family, same institution type, or all three?
3. Should publishing require one editor approval or a two-step approve/publish separation?
4. Does editing WITM copy require automatic revalidation before approval?
5. What artifact sources are eligible for replacement insertion: dry-run artifacts, pipeline artifacts, admin-uploaded artifacts, or only existing database rows?
6. How stale can an artifact-backed replacement be before it is blocked rather than warned?
7. Should held rows be used as future few-shot/training examples automatically, or only after separate editorial training-evidence approval?
8. What is the rollback target if there is no previous live slate for the same briefing date?
9. Should admin support a "no publish today" decision with reason while preserving the last clean briefing?
10. Should final slate locking prevent copy edits, rank changes, or both?
11. Should replacement relationships support one-to-one only, or can multiple weak rows be replaced by one stronger synthesized row?
12. Should public routes read directly from `signal_posts` or from a future `editorial_slate_items` table?
13. What tests currently exist for public filtering by `is_live`, `editorial_status`, and `published_at`?
14. Should Context rows appear only on `/signals`, or should homepage eventually expose them below Core?
15. How should `publish_batch_id` interact with historical snapshots once Phase 5 begins?
16. What is the emergency protocol if admin publish succeeds but public verification fails?
17. Who is allowed to override a validation warning, and which warnings are never overrideable?

### Explicit Amendment Non-Goals Confirmed

```text
Do not implement code yet.
Do not mutate database rows.
Do not publish.
Do not run cron.
Do not run draft_only.
Do not run dry_run.
Do not change source governance.
Do not add sources.
Do not change ranking thresholds.
Do not change WITM thresholds.
Do not change public URL/domain/env/Vercel settings.
Do not expose secrets.
Do not start historical snapshot implementation.
Do not start Phase 2 architecture.
Do not start Phase 3 personalization.
Do not treat card-level editorial authority as remediation.
Do not bypass canonical PRD/amendment governance.
```

## Dependencies and Risks

- Requires Supabase tables and `SUPABASE_SERVICE_ROLE_KEY` for editorial mutation operations.
- Requires `ADMIN_EMAILS` to include the editor’s Google-auth email in each deployed environment.
- Vercel preview remains required for auth, cookies, redirects, SSR, and env-sensitive confirmation.
- Open PR #98 already edits the hotspot feature registry and adds PRD-52, so this branch uses PRD-53 and must be synced with `origin/main` after #98 lands.
- The initial current Top 5 import uses the existing briefing pipeline output as the AI draft source and does not refresh over an already edited table to avoid clobbering human work.
- The preview cleanup is display-layer remediation. It must not rewrite stored editorial text, ranking inputs, source ingestion, or AI-generation templates.

## Acceptance Criteria

- A Google-authenticated user whose email is listed in `ADMIN_EMAILS` can access `/dashboard/signals/editorial-review`.
- Non-admin signed-in users and unauthenticated users cannot access the review workflow.
- The page shows five ranked signal posts when the editorial table is ready.
- Each signal exposes the AI draft internally and pre-fills the editorial textarea from `editedWhyItMatters` or the AI draft.
- Editors can save drafts, approve individual posts, reset to the AI draft, and publish only after all five posts are approved.
- Publishing copies edited text into `publishedWhyItMatters` and marks all five posts as `published`.
- `/signals` displays only the final published editorial text.
- Raw `aiWhyItMatters` is not exposed on the public page.
- The homepage uses published manual editorial content when available.
- Each of the five collapsed homepage `Why it matters` summary boxes ends with complete sentence punctuation and does not show broken terminal `...` snippets.
- `Read more` expands inline to the full published editorial note, and `Show less` returns to the clean collapsed preview.
- Short complete notes do not show unnecessary expand/collapse controls.

## Evidence and Confidence

- Repo evidence used:
  - Existing Google/Supabase auth helpers in `src/lib/auth.ts` and `src/lib/supabase/server.ts`.
  - Existing signal/briefing models in `src/lib/types.ts` and `src/lib/data.ts`.
  - Existing internal route pattern in `src/app/internal/mit-review/page.tsx`.
  - Homepage editorial rendering path in `src/components/landing/homepage.tsx` and shared structured editorial utilities in `src/lib/editorial-content.ts`.
- Confidence: High for local editorial rendering after automated and human homepage checks; medium for deployed auth/env behavior until Vercel preview validation is completed.

## Closeout Checklist

This checklist records the original PRD-53 implementation closeout. The 2026-04-29 card-level editorial authority amendment is draft/design-only; no amendment implementation, database mutation, pipeline run, or publish has started.

- Scope completed: yes
- Tests run: `npm install`; `npm run lint`; focused homepage/editorial preview tests; targeted server-page reruns; `npm run build`; local browser homepage proof; `npx playwright test --project=chromium`
- Local validation complete: yes
- Preview validation complete, if applicable: pending
- Production sanity check complete, only after preview is good: not applicable before merge
- PRD summary stored in repo: yes
- Bug-fix report stored in repo, if applicable: yes, `docs/engineering/bug-fixes/homepage-editorial-preview-truncation.md`
- GitHub documentation closeout completed in the canonical lane: yes
- Google Sheet / Work Log not treated as canonical or updated for routine closeout: yes
