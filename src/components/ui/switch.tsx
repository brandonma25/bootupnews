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
        "inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-transparent bg-[var(--bu-border-default)] p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        checked && "bg-[var(--bu-accent)]",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "block h-5 w-5 rounded-full bg-[var(--bu-bg-surface)] transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
