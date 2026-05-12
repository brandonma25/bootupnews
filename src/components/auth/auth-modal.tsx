"use client";
import { useMemo, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { getSupabasePublicEnvDiagnostics, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  errorMessage?: string | null;
};

export default function AuthModal({ open, onClose, errorMessage }: Props) {
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const authDiagnostics = useMemo(() => getSupabasePublicEnvDiagnostics(), []);
  const authConfigured = isSupabaseConfigured;
  const configErrorMessage = authConfigured
    ? null
    : `Authentication is not configured for this environment yet. Missing: ${authDiagnostics.missingNames.join(", ")}.`;
  const visibleError = googleError ?? errorMessage ?? null;

  if (!open) return null;

  async function handleGoogleSignIn() {
    const supabase = createSupabaseBrowserClient();
    const redirectTo = getGoogleRedirectTo();

    console.info("[auth] Google button clicked", {
      redirectFlow: "full-page redirect",
      redirectTo,
      supabaseConfigured: Boolean(supabase),
    });

    if (!supabase) {
      const message =
        `Google sign-in is not configured on this deployment. Missing: ${authDiagnostics.missingNames.join(", ")}.`;
      console.error("[auth] Google OAuth cannot start because public Supabase env vars are missing", {
        redirectTo,
        missingNames: authDiagnostics.missingNames,
      });
      setGoogleError(message);
      return;
    }

    setGooglePending(true);
    setGoogleError(null);

    try {
      console.info("[auth] Calling supabase.auth.signInWithOAuth in browser", {
        provider: "google",
        redirectTo,
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      console.info("[auth] signInWithOAuth completed", {
        provider: "google",
        redirectTo,
        hasUrl: Boolean(data?.url),
        errorMessage: error?.message ?? null,
      });

      if (error) {
        const message = `Google sign-in could not be started: ${error.message}`;
        console.error("[auth] Google OAuth returned an error", {
          redirectTo,
          error,
        });
        setGoogleError(message);
        setGooglePending(false);
        return;
      }

      if (!data?.url) {
        const message =
          "Google sign-in did not return a redirect URL. Check the Google provider setup in Supabase and the allowed redirect URLs for this environment.";
        console.error("[auth] Google OAuth returned no redirect URL", {
          redirectTo,
          data,
        });
        setGoogleError(message);
        setGooglePending(false);
        return;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? `Google sign-in failed before redirect: ${error.message}`
          : "Google sign-in failed before redirect due to an unknown error.";
      console.error("[auth] Google OAuth threw before redirect", {
        redirectTo,
        error,
      });
      setGoogleError(message);
      setGooglePending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-card border border-[var(--border)] bg-[var(--card)] p-6 ">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-medium text-[var(--text-primary)]">Continue to Boot Up</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Use Google for the fastest path, or continue with email and password. Existing onboarding will continue after auth.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-button px-3 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg)]"
          >
            Close
          </button>
        </div>

        {visibleError ? (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 rounded-card border border-[var(--error)] bg-[var(--card)] px-4 py-3 text-base text-[var(--error)]"
          >
            {visibleError}
          </div>
        ) : null}

        {configErrorMessage ? (
          <div className="mb-4 rounded-card border border-[var(--error)] bg-[var(--card)] px-4 py-3 text-base text-[var(--error)]">
            {configErrorMessage}
          </div>
        ) : null}

        <div className="space-y-3">
          <GoogleAuthButton pending={googlePending} onClick={handleGoogleSignIn} disabled={!authConfigured} />
          <p className="text-xs text-[var(--text-secondary)]">
            Google uses a full-page redirect flow through{" "}
            <span className="font-medium text-[var(--text-primary)]">/auth/callback</span>.
          </p>
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs font-medium uppercase tracking-normal text-[var(--text-secondary)]">Or continue with email</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <form action="/auth/password" method="post" className="space-y-4" id="email-access">
          <div className="space-y-2">
            <label htmlFor="auth-email" className="text-sm font-medium text-[var(--text-primary)]">
              Email
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={!authConfigured}
              className="w-full rounded-input border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition hover:border-[var(--text-secondary)] focus:border-[var(--text-primary)] disabled:opacity-40"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="auth-password" className="text-sm font-medium text-[var(--text-primary)]">
              Password
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={!authConfigured}
              minLength={8}
              className="w-full rounded-input border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition hover:border-[var(--text-secondary)] focus:border-[var(--text-primary)] disabled:opacity-40"
              placeholder="At least 8 characters"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <EmailAuthButton mode="signin" idleLabel="Sign in with email" pendingLabel="Signing in..." disabled={!authConfigured} />
            <EmailAuthButton mode="signup" idleLabel="Create account" pendingLabel="Creating account..." disabled={!authConfigured} />
          </div>
        </form>

        <p className="mt-4 text-xs text-[var(--text-secondary)]">
          Password sign-up uses the same onboarding bootstrap as Google. If your project requires email confirmation, you may be asked to verify your inbox before the session is ready.
        </p>

        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Trouble signing in? Check the Google OAuth redirect settings in Supabase and make sure the current environment URL is allowed as a callback.
        </p>
      </div>
    </div>
  );
}

function GoogleAuthButton({
  pending,
  onClick,
  disabled,
}: {
  pending: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      className="flex w-full items-center justify-center gap-3 rounded-button border border-[var(--text-primary)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg)] active:bg-[var(--sidebar)] disabled:opacity-40"
    >
      {pending ? <span className="h-3.5 w-3.5 animate-spin rounded-button border-2 border-current border-t-transparent" /> : <GoogleMark />}
      <span>{pending ? "Redirecting to Google..." : "Continue with Google"}</span>
    </button>
  );
}

function getGoogleRedirectTo() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }

  return "/auth/callback";
}

function EmailAuthButton({
  mode,
  idleLabel,
  pendingLabel,
  disabled = false,
}: {
  mode: "signin" | "signup";
  idleLabel: string;
  pendingLabel: string;
  disabled?: boolean;
}) {
  return (
    <SubmitButton
      idleLabel={idleLabel}
      pendingLabel={pendingLabel}
      variant={mode === "signin" ? "secondary" : "primary"}
      className="w-full rounded-button px-4 py-3"
      name="mode"
      value={mode}
      disabled={disabled}
    />
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="h-[18px] w-[18px] shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2087 1.125-.8431 2.0782-1.7986 2.7164v2.2582h2.9086c1.7018-1.5668 2.6864-3.875 2.6864-6.6155Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.8068 5.9564-2.1791l-2.9086-2.2582c-.8068.54-1.8409.8591-3.0478.8591-2.3441 0-4.3282-1.5827-5.0359-3.7105H.9573v2.3291C2.4382 15.9827 5.4818 18 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.9641 10.7105c-.18-.54-.2814-1.1168-.2814-1.7105 0-.5936.1014-1.1705.2814-1.7105V4.9605H.9573A8.9884 8.9884 0 0 0 0 9c0 1.4495.3477 2.8214.9573 4.0391l3.0068-2.3286Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4391 1.3459l2.5786-2.5786C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0173.9573 4.9605l3.0068 2.3286C4.6718 5.1623 6.6559 3.5795 9 3.5795Z"
      />
    </svg>
  );
}
