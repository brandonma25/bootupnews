import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-button border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
