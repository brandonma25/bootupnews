"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ForgotPasswordFormProps = {
  className?: string;
};

const accountNotFoundMessage = "No account found with this email address";

function getPasswordResetRedirectTo() {
  if (typeof window === "undefined") {
    return "/reset-password";
  }

  return new URL("/reset-password", window.location.origin).toString();
}

export function ForgotPasswordForm({ className }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const canSubmit = email.trim().length > 0 && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    if (!canSubmit) {
      return;
    }

    const trimmedEmail = email.trim();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setFieldError(accountNotFoundMessage);
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: getPasswordResetRedirectTo(),
    });

    if (error) {
      setFieldError(accountNotFoundMessage);
      setIsSubmitting(false);
      return;
    }

    setSubmittedEmail(trimmedEmail);
    setIsSubmitting(false);
  }

  if (submittedEmail) {
    return (
      <div className={className ?? "mx-auto w-full max-w-sm space-y-4"}>
        <p role="status" className="rounded-xl border border-[var(--line-strong)] bg-[var(--surface-strong)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
          Check your inbox — we&apos;ve sent a reset link to {submittedEmail}
        </p>
        <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--foreground)] underline underline-offset-4">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form className={className ?? "mx-auto w-full max-w-sm space-y-4"} noValidate onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="forgot-password-email" className="text-sm font-medium text-[var(--foreground)]">
          Email
        </label>
        <Input
          id="forgot-password-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? "forgot-password-email-error" : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
        {fieldError ? (
          <p id="forgot-password-email-error" role="alert" className="text-sm font-medium text-red-700">
            {fieldError}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="min-h-11 w-full" disabled={!canSubmit}>
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending reset link
          </span>
        ) : (
          "Send reset link"
        )}
      </Button>

      <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--foreground)] underline underline-offset-4">
        Back to login
      </Link>
    </form>
  );
}
