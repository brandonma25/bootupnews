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
        "rounded-[24px] border border-[rgba(19,26,34,0.08)] bg-[rgba(255,255,255,0.72)] shadow-[0_16px_50px_rgba(17,24,39,0.05)]",
        className,
      )}
      {...props}
    >
      {children}
    </article>
  );
}
