"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type ApproveAllButtonProps = {
  /**
   * When true, the button is rendered in a disabled state regardless of
   * pending status. Used when the candidate pool has zero rows that
   * satisfy the bulk-approve gate (WITM passed + slot assigned + not
   * already approved).
   */
  disabled: boolean;
  /**
   * Optional explanatory text rendered as a native tooltip when the
   * button is disabled. Lets editors see why bulk approve is currently
   * unavailable without leaving the surface.
   */
  disabledReason?: string;
};

/**
 * Bulk-approve submit button for the editorial composer Candidate pool.
 *
 * Pairs with a parent <form action={approveAllSignalPostsAction}> that
 * already contains explicit hidden inputs for every candidate that
 * satisfies the bulk-approve gate. This button does NOT scrape the DOM
 * for inputs — that legacy behavior was retired when the form moved up
 * to EditorialComposerClient so bulk approve no longer depends on
 * per-row rewrite editors being open.
 *
 * Label wording — "Approve all WITM-passed" — explicitly names the gate
 * so editors understand the bulk action is bounded by the WITM
 * validator and slot-assignment state, not by their UI engagement.
 */
export function ApproveAllButton({ disabled, disabledReason }: ApproveAllButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;
  const tooltip = isDisabled && !pending ? disabledReason : undefined;

  return (
    <Button
      type="submit"
      variant="secondary"
      disabled={isDisabled}
      className="gap-2"
      title={tooltip}
      aria-label={tooltip ? `Approve all WITM-passed — ${tooltip}` : undefined}
      data-testid="bulk-approve-submit"
    >
      {pending ? (
        <>
          <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-button border-2 border-current border-t-transparent" />
          Approving...
        </>
      ) : (
        "Approve all WITM-passed"
      )}
    </Button>
  );
}
