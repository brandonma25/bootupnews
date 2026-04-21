"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ResetPasswordFormProps = {
  className?: string;
};

const minimumPasswordLength = 8;
const passwordTooShortMessage = "Password too short";
const expiredResetLinkMessage = "This reset link has expired. Please request a new one.";

function readResetQuery(searchParams: URLSearchParams) {
  return {
    code: searchParams.get("code")?.trim() ?? "",
    tokenHash: searchParams.get("token_hash")?.trim() ?? "",
    type: searchParams.get("type")?.trim() ?? "",
  };
}

export function ResetPasswordForm({ className }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const resetQuery = readResetQuery(searchParams);
  const hasResetToken = Boolean(resetQuery.code || resetQuery.tokenHash);
  const visibleTokenError = tokenError ?? (hasResetToken ? null : expiredResetLinkMessage);
  const canSubmit = password.length > 0 && !isSubmitting && hasResetToken;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setTokenError(null);

    if (!hasResetToken) {
      setTokenError(expiredResetLinkMessage);
      return;
    }

    if (password.length < minimumPasswordLength) {
      setPasswordError(passwordTooShortMessage);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setTokenError(expiredResetLinkMessage);
      return;
    }

    setIsSubmitting(true);

    if (resetQuery.code) {
      const exchangeResult = await supabase.auth.exchangeCodeForSession(resetQuery.code);
      if (exchangeResult.error) {
        setTokenError(expiredResetLinkMessage);
        setIsSubmitting(false);
        return;
      }
    } else if (resetQuery.tokenHash && resetQuery.type) {
      const verifyResult = await supabase.auth.verifyOtp({
        token_hash: resetQuery.tokenHash,
        type: resetQuery.type as "signup" | "recovery" | "invite" | "email_change" | "magiclink",
      });
      if (verifyResult.error) {
        setTokenError(expiredResetLinkMessage);
        setIsSubmitting(false);
        return;
      }
    } else {
      setTokenError(expiredResetLinkMessage);
      setIsSubmitting(false);
      return;
    }

    const updateResult = await supabase.auth.updateUser({ password });
    if (updateResult.error) {
      setTokenError(expiredResetLinkMessage);
      setIsSubmitting(false);
      return;
    }

    router.push("/login?message=password-updated");
    router.refresh();
  }

  return (
    <form className={className ?? "mx-auto w-full max-w-sm space-y-4"} noValidate onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="reset-password" className="text-sm font-medium text-[var(--foreground)]">
          New password
        </label>
        <div className="relative">
          <Input
            id="reset-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            disabled={isSubmitting || !hasResetToken}
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "reset-password-error" : undefined}
            className="pr-12"
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted)] disabled:opacity-60"
            disabled={isSubmitting || !hasResetToken}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {passwordError ? (
          <p id="reset-password-error" role="alert" className="text-sm font-medium text-[var(--error)]">
            {passwordError}
          </p>
        ) : null}
      </div>

      {visibleTokenError ? (
        <p role="alert" className="text-sm font-medium text-[var(--error)]">
          {visibleTokenError}{" "}
          <Link href="/forgot-password" className="underline underline-offset-4">
            Request a new one
          </Link>
        </p>
      ) : null}

      <Button type="submit" className="min-h-11 w-full" disabled={!canSubmit}>
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating password
          </span>
        ) : (
          "Update password"
        )}
      </Button>
    </form>
  );
}
