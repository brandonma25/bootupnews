import type { AnchorHTMLAttributes, ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type BaseButtonProps = PropsWithChildren<{
    variant?: "primary" | "secondary" | "ghost";
  }>;

type ButtonProps =
  | (BaseButtonProps & ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" })
  | (BaseButtonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a" });

export function Button({
  as = "button",
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-button px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
    variant === "primary" &&
      "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:bg-[var(--accent-hover)]",
    variant === "secondary" &&
      "border border-[var(--text-primary)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg)] active:bg-[var(--sidebar)]",
    variant === "ghost" && "text-[var(--text-primary)] hover:bg-[var(--bg)] active:bg-[var(--sidebar)]",
    className,
  );

  if (as === "a") {
    return (
      <a className={classes} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  return (
    <button
      className={classes}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
