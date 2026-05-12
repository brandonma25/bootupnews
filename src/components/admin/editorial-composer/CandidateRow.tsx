"use client";

import { useState, useTransition } from "react";

import { SignalPostEditor } from "@/app/dashboard/signals/editorial-review/StructuredEditorialFields";
import { Button } from "@/components/ui/button";
import { formatSlotLabel } from "@/lib/final-slate-readiness";
import type { EditorialSignalPost } from "@/lib/signals-editorial";
import { cn } from "@/lib/utils";

type CandidateRowProps = {
  candidate: EditorialSignalPost;
  openSlots: number[];
  storageReady: boolean;
  onAssign: (postId: string, slotId: string) => Promise<void>;
};

export function CandidateRow({
  candidate,
  openSlots,
  storageReady,
  onAssign,
}: CandidateRowProps) {
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const requiresRewrite = candidate.whyItMattersValidationStatus === "requires_human_rewrite";
  const canAssign = isCandidateAssignable(candidate, storageReady) && !requiresRewrite;
  const status = getCandidateStatus(candidate);
  const witmBody = getCandidateWitmBody(candidate);

  return (
    <article className="rounded-[var(--bu-radius-lg)] border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)] p-[var(--bu-space-4)]">
      <div className="grid gap-[var(--bu-space-4)] lg:grid-cols-[minmax(0,1fr)_120px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[var(--bu-size-micro)] font-medium uppercase tracking-[0.08em] text-[var(--bu-text-tertiary)]">
              {getCandidateCategory(candidate)} · {candidate.sourceName || "Missing source"}
            </p>
            <StatusPill status={status} />
          </div>

          <h3 className="mt-2 text-[var(--bu-size-ui)] font-medium leading-[1.3] text-[var(--bu-text-primary)]">
            {candidate.title}
          </h3>

          <p
            className={cn(
              "mt-2 font-heading text-[var(--bu-size-meta)] leading-[1.5] text-[var(--bu-text-secondary)]",
              requiresRewrite && "italic text-[var(--bu-text-tertiary)]",
            )}
          >
            {requiresRewrite
              ? "Template placeholder language detected. WITM requires editorial rewrite before this candidate is publishable."
              : witmBody}
          </p>
        </div>

        <div className="space-y-[var(--bu-space-2)]">
          <label htmlFor={`slot-${candidate.id}`} className="sr-only">
            Assign {candidate.title} to a slot
          </label>
          <select
            id={`slot-${candidate.id}`}
            value=""
            disabled={!canAssign || isPending}
            className="w-full rounded-[var(--bu-radius-md)] border border-[var(--bu-border-default)] bg-[var(--bu-bg-surface)] px-2 py-2 text-[var(--bu-size-meta)] text-[var(--bu-text-primary)] disabled:text-[var(--bu-text-tertiary)]"
            onChange={(event) => {
              const slotId = event.target.value;
              if (!slotId) {
                return;
              }

              startTransition(() => {
                void onAssign(candidate.id, slotId);
              });
            }}
          >
            <option value="">
              {requiresRewrite ? "Blocked · rewrite first" : candidate.finalSlateRank ? "Assigned" : "Assign to slot…"}
            </option>
            {openSlots.map((slot) => (
              <option key={slot} value={slot}>
                {formatSlotLabel(slot).replace(" slot ", " ")}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="secondary"
            className="w-full px-3 text-[var(--bu-size-meta)]"
            onClick={() => setRewriteOpen((value) => !value)}
          >
            {requiresRewrite ? "Open rewrite" : "Rewrite WITM"}
          </Button>
        </div>
      </div>

      {rewriteOpen ? (
        <div className="mt-[var(--bu-space-4)]">
          <SignalPostEditor post={candidate} storageReady={storageReady} defaultExpanded />
        </div>
      ) : null}
    </article>
  );
}

function StatusPill({ status }: { status: "passed" | "rewrite" | "failed" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-[var(--bu-size-micro)] font-medium leading-none",
        status === "passed" && "bg-[var(--bu-status-success-bg)] text-[var(--bu-status-success-text)]",
        status === "rewrite" && "bg-[var(--bu-status-warning-bg)] text-[var(--bu-status-warning-text)]",
        status === "failed" && "bg-[var(--bu-status-danger-bg)] text-[var(--bu-status-danger-text)]",
      )}
    >
      {status === "passed" ? "WITM passed" : status === "rewrite" ? "Needs rewrite" : "Failed validator"}
    </span>
  );
}

function getCandidateStatus(candidate: EditorialSignalPost) {
  if (candidate.whyItMattersValidationStatus === "passed") {
    return "passed" as const;
  }

  if (candidate.whyItMattersValidationStatus === "requires_human_rewrite") {
    return "rewrite" as const;
  }

  return "failed" as const;
}

function getCandidateWitmBody(candidate: EditorialSignalPost) {
  return (
    candidate.editedWhyItMatters ||
    candidate.publishedWhyItMatters ||
    candidate.aiWhyItMatters ||
    "No WITM draft available."
  );
}

function getCandidateCategory(candidate: EditorialSignalPost) {
  return candidate.tags.find((tag) => !["critical", "high", "watch"].includes(tag.toLowerCase())) ?? "Signal";
}

function isCandidateAssignable(candidate: EditorialSignalPost, storageReady: boolean) {
  return (
    storageReady &&
    candidate.persisted &&
    !candidate.isLive &&
    candidate.editorialStatus !== "published" &&
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
