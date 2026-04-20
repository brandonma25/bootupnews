"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function SubmitButton({
  idleLabel,
  pendingLabel,
  className,
  variant = "primary",
  disabled = false,
  ...props
}: {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} className={className} disabled={pending || disabled} {...props}>
      {pending ? (
        <>
          <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-button border-2 border-current border-t-transparent" />
          {pendingLabel}
        </>
      ) : (
        idleLabel
      )}
    </Button>
  );
}
