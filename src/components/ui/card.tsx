import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<"article">>) {
  return (
    <article
      className={cn(
        "rounded-card border border-[var(--border)] bg-[var(--card)]",
        className,
      )}
      {...props}
    >
      {children}
    </article>
  );
}
