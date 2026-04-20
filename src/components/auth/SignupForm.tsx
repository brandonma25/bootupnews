"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type SignupFormProps = {
  className?: string;
};

const minimumPasswordLength = 8;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function SignupForm({ className }: SignupFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setEmailError("Invalid email format");
      return;
    }

    if (password.length < minimumPasswordLength) {
      setPasswordError("Password too short");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setFormError("An account with this email already exists");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    if (error) {
      setFormError("An account with this email already exists");
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form className={className ?? "mx-auto w-full max-w-sm space-y-4"} noValidate onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="signup-email" className="text-sm font-medium text-[var(--foreground)]">
          Email
        </label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          disabled={isSubmitting}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "signup-email-error" : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
        {emailError ? (
          <p id="signup-email-error" role="alert" className="text-sm font-medium text-red-700">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password" className="text-sm font-medium text-[var(--foreground)]">
          Password
        </label>
        <div className="relative">
          <Input
            id="signup-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            disabled={isSubmitting}
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "signup-password-error" : undefined}
            className="pr-12"
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted)]"
            disabled={isSubmitting}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {passwordError ? (
          <p id="signup-password-error" role="alert" className="text-sm font-medium text-red-700">
            {passwordError}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {formError}
        </p>
      ) : null}

      <Button type="submit" className="min-h-11 w-full" disabled={!canSubmit}>
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account
          </span>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
