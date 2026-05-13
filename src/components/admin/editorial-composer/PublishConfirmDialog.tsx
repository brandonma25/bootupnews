"use client";

import { useEffect } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EditorialSignalPost } from "@/lib/signals-editorial";

type PublishConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  /**
   * Candidates that will actually be published when the user confirms.
   * The parent SlotPanel filters down to approved-but-not-yet-published
   * rows. The dialog only displays them; the publishFinalSlateAction
   * server action still drives the actual publish, gated server-side.
   */
  pendingPublishCandidates: EditorialSignalPost[];
  /**
   * Inline submit-confirm trigger. Pressed by the dialog's "Publish all"
   * button to actually run publishFinalSlateAction. SlotPanel keeps the
   * form wired so this stays the existing server action with the
   * existing eligibility gate.
   */
  onConfirm: () => void;
};

/**
 * Two-step confirm overlay for the Publish slate action.
 *
 * Sits between the Publish button and `publishFinalSlateAction` so an
 * editor sees a count + tier breakdown + title list before pushing
 * approved candidates live. This preserves the two-gate workflow
 * (approve, then publish) while making the publish step bulk-aware
 * and reversible up to the explicit confirmation click.
 *
 * Built as a lightweight fixed-position overlay (no portal) to match
 * the existing AuthModal pattern in this repo. If a shared Dialog
 * primitive is introduced later, this component should migrate to it.
 */
export function PublishConfirmDialog({
  open,
  onClose,
  pendingPublishCandidates,
  onConfirm,
}: PublishConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const total = pendingPublishCandidates.length;
  const coreCount = pendingPublishCandidates.filter(
    (post) => post.finalSlateTier === "core",
  ).length;
  const contextCount = pendingPublishCandidates.filter(
    (post) => post.finalSlateTier === "context",
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-confirm-title"
      data-testid="publish-confirm-dialog"
    >
      <div className="w-full max-w-md rounded-[var(--bu-radius-lg)] border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)] p-[var(--bu-space-5)] shadow-xl">
        <h2
          id="publish-confirm-title"
          className="text-[var(--bu-size-ui)] font-medium text-[var(--bu-text-primary)]"
        >
          Publish this slate?
        </h2>
        <p className="mt-2 text-[var(--bu-size-meta)] leading-5 text-[var(--bu-text-secondary)]">
          {total} {total === 1 ? "candidate" : "candidates"} will be published live.
        </p>
        <p
          className="mt-1 text-[var(--bu-size-micro)] leading-5 text-[var(--bu-text-tertiary)]"
          data-testid="publish-confirm-tier-breakdown"
        >
          {coreCount} Core · {contextCount} Context
        </p>

        <ul
          className="mt-[var(--bu-space-4)] max-h-48 space-y-1 overflow-y-auto rounded-[var(--bu-radius-md)] border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-subtle)] p-[var(--bu-space-3)]"
          data-testid="publish-confirm-title-list"
        >
          {pendingPublishCandidates.map((post) => (
            <li
              key={post.id}
              className="text-[var(--bu-size-meta)] leading-5 text-[var(--bu-text-primary)]"
            >
              <span className="mr-2 text-[var(--bu-text-tertiary)]">
                {post.finalSlateRank
                  ? post.finalSlateRank.toString().padStart(2, "0")
                  : "--"}
              </span>
              {post.title}
            </li>
          ))}
        </ul>

        <div className="mt-[var(--bu-space-5)] flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            autoFocus
            data-testid="publish-confirm-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="gap-2"
            data-testid="publish-confirm-submit"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Publish all
          </Button>
        </div>
      </div>
    </div>
  );
}
