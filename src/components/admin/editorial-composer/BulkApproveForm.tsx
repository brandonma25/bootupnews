"use client";

import { approveAllSignalPostsAction } from "@/app/dashboard/signals/editorial-review/actions";
import { ApproveAllButton } from "@/app/dashboard/signals/editorial-review/ApproveAllButton";
import type { EditorialSignalPost } from "@/lib/signals-editorial";

type BulkApproveFormProps = {
  /**
   * Candidates that satisfy the bulk-approve gate:
   *   - WITM validator status === "passed"
   *   - assigned to a final-slate slot
   *   - not already in approved or published state
   *   - editorial decision is not blocking (rejected / held / etc.)
   *   - storage is ready
   *
   * Filtering happens in EditorialComposerClient so this component
   * stays render-only and predictable to test.
   */
  eligibleCandidates: EditorialSignalPost[];
  /**
   * Disabled tooltip surfaced on the submit button when there are zero
   * eligible candidates. Explicitly names the gate to mirror the button
   * label.
   */
  disabledReason?: string;
};

/**
 * Bulk approve form rendered at the top of the candidate pool in the
 * editorial composer. Submits one POST to `approveAllSignalPostsAction`
 * containing explicit hidden inputs per eligible candidate.
 *
 * The previous implementation collected hidden inputs from individually
 * expanded SignalPostEditor rewrite editors via DOM scraping, which
 * coupled the bulk action to per-row UI engagement. Lifting the form
 * up here makes the bulk action operate on the full candidate pool
 * state — exactly the "approve every WITM-passed candidate in the
 * pool" semantic the workflow needs.
 */
export function BulkApproveForm({
  eligibleCandidates,
  disabledReason,
}: BulkApproveFormProps) {
  const hasEligible = eligibleCandidates.length > 0;
  const resolvedDisabledReason = hasEligible
    ? undefined
    : disabledReason ?? "No WITM-passed candidates assigned to slots";

  return (
    <form
      action={approveAllSignalPostsAction}
      className="mb-[var(--bu-space-4)] flex flex-wrap items-center justify-between gap-3 rounded-[var(--bu-radius-lg)] border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)] p-[var(--bu-space-3)]"
      data-testid="bulk-approve-form"
    >
      <div className="min-w-0">
        <p className="text-[var(--bu-size-meta)] font-medium text-[var(--bu-text-primary)]">
          Bulk approve
        </p>
        <p className="mt-1 text-[var(--bu-size-micro)] leading-5 text-[var(--bu-text-secondary)]">
          {hasEligible
            ? `${eligibleCandidates.length} ${eligibleCandidates.length === 1 ? "candidate" : "candidates"} ready · WITM passed and assigned to a slot`
            : "No WITM-passed candidates currently assigned to a slot."}
        </p>
      </div>

      {eligibleCandidates.map((candidate) => (
        <CandidateHiddenInputs key={candidate.id} candidate={candidate} />
      ))}

      <ApproveAllButton disabled={!hasEligible} disabledReason={resolvedDisabledReason} />
    </form>
  );
}

function CandidateHiddenInputs({ candidate }: { candidate: EditorialSignalPost }) {
  const persistedEditorialText =
    candidate.editedWhyItMatters ?? candidate.publishedWhyItMatters ?? candidate.aiWhyItMatters ?? "";
  const structuredContent =
    candidate.editedWhyItMattersStructured ?? candidate.publishedWhyItMattersStructured ?? null;
  const structuredJson = structuredContent ? JSON.stringify(structuredContent) : "";

  return (
    <>
      <input
        type="hidden"
        name="postId"
        value={candidate.id}
        data-testid={`bulk-approve-post-id-${candidate.id}`}
      />
      <input type="hidden" name="editedWhyItMatters" value={persistedEditorialText} />
      <input type="hidden" name="structuredWhyItMatters" value={structuredJson} />
    </>
  );
}

/**
 * Pure predicate used by the parent EditorialComposerClient to compute
 * the eligible-candidates list. Exported here so the gate is tested
 * alongside the form that renders it.
 */
export function isEligibleForBulkApprove(
  candidate: EditorialSignalPost,
  storageReady: boolean,
): boolean {
  return (
    storageReady &&
    candidate.persisted &&
    candidate.finalSlateRank !== null &&
    candidate.whyItMattersValidationStatus === "passed" &&
    candidate.editorialStatus !== "approved" &&
    candidate.editorialStatus !== "published" &&
    !candidate.isLive &&
    !candidate.publishedAt &&
    !isBlockingDecision(candidate.editorialDecision)
  );
}

function isBlockingDecision(decision: string | null) {
  return (
    decision === "rejected" ||
    decision === "held" ||
    decision === "rewrite_requested" ||
    decision === "removed_from_slate"
  );
}
