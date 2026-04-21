import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-input border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
