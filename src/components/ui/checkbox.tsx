import type { ComponentPropsWithoutRef } from "react";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<ComponentPropsWithoutRef<"button">, "onChange"> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function Checkbox({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-button border border-[var(--border)] bg-[var(--card)] text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        checked && "border-[var(--foreground)] bg-[var(--foreground)]",
        className,
      )}
      {...props}
    >
      {checked ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
    </button>
  );
}
