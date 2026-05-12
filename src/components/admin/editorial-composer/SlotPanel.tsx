"use client";

import { Send } from "lucide-react";

import { publishFinalSlateAction } from "@/app/dashboard/signals/editorial-review/actions";
import { Button } from "@/components/ui/button";
import type { EditorialSignalPost } from "@/lib/signals-editorial";
import { cn } from "@/lib/utils";

export type ComposerSlot = {
  rank: number;
  tier: "core" | "context";
  post: EditorialSignalPost | null;
};

type SlotPanelProps = {
  slots: ComposerSlot[];
  canPublish: boolean;
  publishDisabledReason?: string | null;
};

export function SlotPanel({ slots, canPublish, publishDisabledReason }: SlotPanelProps) {
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
}: {
  coreSlots: ComposerSlot[];
  contextSlots: ComposerSlot[];
  canPublish: boolean;
  publishDisabledReason?: string | null;
}) {
  return (
    <>
      <div className="mt-[var(--bu-space-4)] space-y-[var(--bu-space-4)]">
        <SlotGroup label="Core · 5 slots" slots={coreSlots} />
        <SlotGroup label="Context · 2 slots" slots={contextSlots} />
      </div>
      <form action={publishFinalSlateAction} className="mt-[var(--bu-space-5)] space-y-[var(--bu-space-2)]">
        <Button type="submit" disabled={!canPublish} className="w-full gap-2">
          <Send className="h-4 w-4" aria-hidden="true" />
          Publish slate
        </Button>
        <p className="text-[var(--bu-size-micro)] leading-5 text-[var(--bu-text-tertiary)]">
          {publishDisabledReason ?? "Sticky · stays visible on scroll"}
        </p>
      </form>
    </>
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
