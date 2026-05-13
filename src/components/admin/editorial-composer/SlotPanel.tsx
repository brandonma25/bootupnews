"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";

import { publishFinalSlateAction } from "@/app/dashboard/signals/editorial-review/actions";
import { PublishConfirmDialog } from "@/components/admin/editorial-composer/PublishConfirmDialog";
import { Button } from "@/components/ui/button";
import type { EditorialSignalPost } from "@/lib/signals-editorial";
import { cn } from "@/lib/utils";

export type ComposerSlot = {
  rank: number;
  tier: "core" | "context";
  post: EditorialSignalPost | null;
};

export type PublishCounts = {
  /** Candidates currently in the "approved" editorial state. */
  approved: number;
  /** Subset of approved that are not yet live (pending publish). */
  pendingPublish: number;
  /** Candidates already published / live. */
  alreadyLive: number;
};

type SlotPanelProps = {
  slots: ComposerSlot[];
  canPublish: boolean;
  publishDisabledReason?: string | null;
  /**
   * Live counts shown above the Publish slate button so the editor can
   * see, at a glance, what the slate looks like before the confirm
   * dialog opens. Optional to preserve existing test fixtures.
   */
  publishCounts?: PublishCounts;
  /**
   * Approved-but-not-yet-published candidates. Drives the confirm
   * dialog count, tier breakdown, and title list. Optional for
   * backward compatibility with tests that only exercise the slot
   * rendering and disabled-state behavior.
   */
  pendingPublishCandidates?: EditorialSignalPost[];
};

export function SlotPanel({
  slots,
  canPublish,
  publishDisabledReason,
  publishCounts,
  pendingPublishCandidates,
}: SlotPanelProps) {
  const filledCount = slots.filter((slot) => slot.post).length;
  const coreSlots = slots.filter((slot) => slot.tier === "core");
  const contextSlots = slots.filter((slot) => slot.tier === "context");

  return (
    <>
      <details className="group sticky top-[var(--bu-space-3)] z-10 rounded-[var(--bu-radius-lg)] border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)] p-[var(--bu-space-4)] lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[var(--bu-size-ui)] font-medium text-[var(--bu-text-primary)] [&::-webkit-details-marker]:hidden">
          <span>Final slate</span>
          <span className="text-[var(--bu-size-meta)] font-normal text-[var(--bu-text-tertiary)]">
            {filledCount} / 7
          </span>
        </summary>
        <SlotPanelBody
          coreSlots={coreSlots}
          contextSlots={contextSlots}
          canPublish={canPublish}
          publishDisabledReason={publishDisabledReason}
          publishCounts={publishCounts}
          pendingPublishCandidates={pendingPublishCandidates}
        />
      </details>

      <aside className="sticky top-[var(--bu-space-5)] hidden rounded-[var(--bu-radius-lg)] border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)] p-[var(--bu-space-4)] lg:block">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[var(--bu-size-ui)] font-medium text-[var(--bu-text-primary)]">
            Final slate
          </h2>
          <p className="text-[var(--bu-size-meta)] text-[var(--bu-text-tertiary)]">
            {filledCount} / 7
          </p>
        </div>

        <SlotPanelBody
          coreSlots={coreSlots}
          contextSlots={contextSlots}
          canPublish={canPublish}
          publishDisabledReason={publishDisabledReason}
          publishCounts={publishCounts}
          pendingPublishCandidates={pendingPublishCandidates}
        />
      </aside>
    </>
  );
}

function SlotPanelBody({
  coreSlots,
  contextSlots,
  canPublish,
  publishDisabledReason,
  publishCounts,
  pendingPublishCandidates,
}: {
  coreSlots: ComposerSlot[];
  contextSlots: ComposerSlot[];
  canPublish: boolean;
  publishDisabledReason?: string | null;
  publishCounts?: PublishCounts;
  pendingPublishCandidates?: EditorialSignalPost[];
}) {
  return (
    <>
      <div className="mt-[var(--bu-space-4)] space-y-[var(--bu-space-4)]">
        <SlotGroup label="Core · 5 slots" slots={coreSlots} />
        <SlotGroup label="Context · 2 slots" slots={contextSlots} />
      </div>
      {publishCounts ? (
        <p
          className="mt-[var(--bu-space-4)] text-[var(--bu-size-micro)] leading-5 text-[var(--bu-text-secondary)]"
          data-testid="publish-summary"
        >
          {publishCounts.approved} approved · {publishCounts.pendingPublish} pending publish · {publishCounts.alreadyLive} already live
        </p>
      ) : null}
      <PublishSlateControls
        canPublish={canPublish}
        publishDisabledReason={publishDisabledReason}
        publishCounts={publishCounts}
        pendingPublishCandidates={pendingPublishCandidates ?? []}
      />
    </>
  );
}

function PublishSlateControls({
  canPublish,
  publishDisabledReason,
  publishCounts,
  pendingPublishCandidates,
}: {
  canPublish: boolean;
  publishDisabledReason?: string | null;
  publishCounts?: PublishCounts;
  pendingPublishCandidates: EditorialSignalPost[];
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const pendingCount = publishCounts?.pendingPublish ?? pendingPublishCandidates.length;
  const hasPending = pendingCount > 0;
  const isDisabled = !canPublish || !hasPending;
  const buttonLabel = hasPending ? `Publish ${pendingCount} candidates` : "Publish slate";
  const helperText = !hasPending && canPublish
    ? "No approved candidates pending publish."
    : publishDisabledReason ?? "Sticky · stays visible on scroll";

  function openConfirm() {
    if (isDisabled) {
      return;
    }
    setConfirmOpen(true);
  }

  function handleConfirmPublish() {
    // Trigger the form submission so publishFinalSlateAction runs with
    // the existing server-side eligibility gate. Using a ref keeps the
    // mobile-drawer / desktop-aside double render correct because each
    // instance owns its own form node.
    formRef.current?.requestSubmit();
    setConfirmOpen(false);
  }

  return (
    <form
      ref={formRef}
      action={publishFinalSlateAction}
      className="mt-[var(--bu-space-5)] space-y-[var(--bu-space-2)]"
    >
      <Button
        type="button"
        disabled={isDisabled}
        onClick={openConfirm}
        className="w-full gap-2"
        data-testid="publish-slate-open"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {buttonLabel}
      </Button>
      <p className="text-[var(--bu-size-micro)] leading-5 text-[var(--bu-text-tertiary)]">
        {helperText}
      </p>
      <PublishConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        pendingPublishCandidates={pendingPublishCandidates}
        onConfirm={handleConfirmPublish}
      />
    </form>
  );
}

function SlotGroup({ label, slots }: { label: string; slots: ComposerSlot[] }) {
  return (
    <section className="space-y-[var(--bu-space-2)]">
      <p className="text-[var(--bu-size-micro)] font-medium uppercase tracking-[0.08em] text-[var(--bu-text-tertiary)]">
        {label}
      </p>
      <div className="space-y-[var(--bu-space-2)]">
        {slots.map((slot) => (
          <SlotRow key={slot.rank} slot={slot} />
        ))}
      </div>
    </section>
  );
}

function SlotRow({ slot }: { slot: ComposerSlot }) {
  const filled = Boolean(slot.post);

  return (
    <div
      className={cn(
        "min-w-0 border-l-2 py-1 pl-[var(--bu-space-2)]",
        filled && slot.tier === "core" && "border-l-[var(--bu-accent)]",
        filled && slot.tier === "context" && "border-l-[var(--bu-border-default)]",
        !filled && "border-l-[var(--bu-border-default)] border-dashed",
      )}
    >
      <p className="text-[var(--bu-size-micro)] leading-4 text-[var(--bu-text-tertiary)]">
        {slot.rank.toString().padStart(2, "0")}
      </p>
      <p
        className={cn(
          "truncate text-[var(--bu-size-meta)] leading-5",
          filled
            ? "font-normal text-[var(--bu-text-primary)]"
            : "font-heading italic text-[var(--bu-text-tertiary)]",
        )}
      >
        {slot.post?.title ?? "Empty"}
      </p>
    </div>
  );
}
