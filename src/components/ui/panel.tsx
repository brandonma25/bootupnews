import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<"div">>) {
  return (
    <div className={cn("glass-panel rounded-card", className)} {...props}>
      {children}
    </div>
  );
}
