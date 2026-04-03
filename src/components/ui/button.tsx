import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
  }
>;

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-transform duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--foreground)] text-white shadow-[0_12px_30px_rgba(19,26,34,0.18)]",
        variant === "secondary" &&
          "border border-[var(--line-strong)] bg-[var(--surface-strong)] text-[var(--foreground)]",
        variant === "ghost" && "text-[var(--foreground)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
