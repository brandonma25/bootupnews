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
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
