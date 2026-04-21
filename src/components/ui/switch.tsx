import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type SwitchProps = Omit<ComponentPropsWithoutRef<"button">, "onChange"> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "inline-flex h-7 w-12 shrink-0 items-center rounded-button border border-transparent bg-[var(--border)] p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        checked && "bg-[var(--foreground)]",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "block h-5 w-5 rounded-button bg-[var(--card)] transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
