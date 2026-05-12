import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-button border border-[var(--bu-border-subtle)] bg-[var(--bu-bg-surface)] px-2.5 py-1 text-[var(--bu-size-meta)] font-normal text-[var(--bu-text-secondary)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
