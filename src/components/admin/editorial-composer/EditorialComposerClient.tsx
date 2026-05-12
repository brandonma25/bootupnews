"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { assignFinalSlateSlotInlineAction } from "@/app/dashboard/signals/editorial-review/actions";
import { CandidateRow } from "@/components/admin/editorial-composer/CandidateRow";
import { SlotPanel, type ComposerSlot } from "@/components/admin/editorial-composer/SlotPanel";
import {
  FINAL_SLATE_RANKS,
  getFinalSlateTierForRank,
  validateFinalSlateReadiness,
} from "@/lib/final-slate-readiness";
import type { EditorialSignalPost } from "@/lib/signals-editorial";

type EditorialComposerClientProps = {
  candidates: EditorialSignalPost[];
  storageReady: boolean;
  auditStorageReady: boolean;
  publishDisabledReason: string | null;
};

export function EditorialComposerClient({
  candidates,
  storageReady,
  auditStorageReady,
  publishDisabledReason,
}: EditorialComposerClientProps) {
  const router = useRouter();
  const [localCandidates, setLocalCandidates] = useState(candidates);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const readiness = useMemo(() => validateFinalSlateReadiness(localCandidates), [localCandidates]);
  const slots = useMemo(() => buildSlots(localCandidates), [localCandidates]);
  const openSlots = slots.filter((slot) => !slot.post).map((slot) => slot.rank);
  const effectivePublishDisabledReason =
    !storageReady
      ? "Publishing is blocked until editorial storage is configured."
      : !auditStorageReady
        ? "Publishing is blocked until published-slate audit storage is configured."
        : !readiness.ready
          ? readiness.failures[0]?.message ?? "Final slate validation has not passed."
          : publishDisabledReason;
  const canPublish = readiness.selectedRows.length > 0 && !effectivePublishDisabledReason;

  async function handleAssign(postId: string, slotId: string) {
    const finalSlateRank = Number(slotId);
    const finalSlateTier = getFinalSlateTierForRank(finalSlateRank);

    if (!finalSlateTier) {
      return;
    }

    setInlineError(null);
    setLocalCandidates((current) =>
      current.map((candidate) =>
        candidate.id === postId
          ? {
              ...candidate,
              finalSlateRank,
              finalSlateTier,
            }
          : candidate,
      ),
    );

    const result = await assignFinalSlateSlotInlineAction(postId, finalSlateRank);

    if (!result.ok) {
      setInlineError(result.message);
      setLocalCandidates(candidates);
      return;
    }

    router.refresh();
  }

  return (
    <section className="grid gap-[var(--bu-space-4)] lg:grid-cols-[280px_1fr]">
      <SlotPanel
        slots={slots}
        canPublish={canPublish}
        publishDisabledReason={effectivePublishDisabledReason}
      />

      <div className="min-w-0">
        <div className="mb-[var(--bu-space-4)] flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[var(--bu-size-ui)] font-medium text-[var(--bu-text-primary)]">
              Candidate pool
            </h2>
          </div>
          <p className="text-[var(--bu-size-meta)] font-normal text-[var(--bu-text-tertiary)]">
            {localCandidates.length} reviewable · {localCandidates.filter((candidate) => !candidate.finalSlateRank).length} unassigned
          </p>
        </div>

        {inlineError ? (
          <p className="mb-[var(--bu-space-3)] rounded-[var(--bu-radius-md)] bg-[var(--bu-status-danger-bg)] px-3 py-2 text-[var(--bu-size-meta)] text-[var(--bu-status-danger-text)]">
            {inlineError}
          </p>
        ) : null}

        {localCandidates.length ? (
          <div className="grid gap-[var(--bu-space-2)]">
            {localCandidates.map((candidate) => (
              <CandidateRow
                key={candidate.id}
                candidate={candidate}
                openSlots={openSlots}
                storageReady={storageReady}
                onAssign={handleAssign}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-[var(--bu-radius-lg)] border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)] p-[var(--bu-space-4)] text-[var(--bu-size-ui)] text-[var(--bu-text-secondary)]">
            No current briefing candidates are available for slate composition.
          </p>
        )}
      </div>
    </section>
  );
}

function buildSlots(candidates: EditorialSignalPost[]): ComposerSlot[] {
  return FINAL_SLATE_RANKS.map((rank) => ({
    rank,
    tier: getFinalSlateTierForRank(rank) ?? "core",
    post: candidates.find((candidate) => candidate.finalSlateRank === rank) ?? null,
  }));
}
