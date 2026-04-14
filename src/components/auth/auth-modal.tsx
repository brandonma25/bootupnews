"use client";
import { useFormStatus } from "react-dom";

import { signInWithProviderAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

type Props = {
  open: boolean;
  onClose: () => void;
  errorMessage?: string | null;
};

export default function AuthModal({ open, onClose, errorMessage }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Continue to Daily Intelligence</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Use Google for the fastest path, or continue with email and password. Existing onboarding will continue after auth.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-[var(--muted-foreground)] hover:bg-[var(--surface-strong)]"
          >
            Close
          </button>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-[rgba(154,52,18,0.18)] bg-[rgba(154,52,18,0.08)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
            {errorMessage}
          </div>
        ) : null}

        <form action={signInWithProviderAction} className="space-y-3">
          <input type="hidden" name="provider" value="google" />
          <input type="hidden" name="next" value="/dashboard" />
          <GoogleAuthButton />
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Or continue with email</span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <form action="/auth/password" method="post" className="space-y-4" id="email-access">
          <div className="space-y-2">
            <label htmlFor="auth-email" className="text-sm font-medium text-[var(--foreground)]">
              Email
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)]"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="auth-password" className="text-sm font-medium text-[var(--foreground)]">
              Password
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)]"
              placeholder="At least 8 characters"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <EmailAuthButton mode="signin" idleLabel="Sign in with email" pendingLabel="Signing in..." />
            <EmailAuthButton mode="signup" idleLabel="Create account" pendingLabel="Creating account..." />
          </div>
        </form>

        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          Password sign-up uses the same onboarding bootstrap as Google. If your project requires email confirmation, you may be asked to verify your inbox before the session is ready.
        </p>

        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          Trouble signing in? Check the Google OAuth redirect settings in Supabase and make sure the current environment URL is allowed as a callback.
        </p>
      </div>
    </div>
  );
}

function GoogleAuthButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:translate-y-[-1px] disabled:translate-y-0 disabled:opacity-70"
    >
      <GoogleMark />
      <span>{pending ? "Redirecting to Google..." : "Continue with Google"}</span>
    </button>
  );
}

function EmailAuthButton({
  mode,
  idleLabel,
  pendingLabel,
}: {
  mode: "signin" | "signup";
  idleLabel: string;
  pendingLabel: string;
}) {
  return (
    <SubmitButton
      idleLabel={idleLabel}
      pendingLabel={pendingLabel}
      variant={mode === "signin" ? "secondary" : "primary"}
      className="w-full rounded-xl px-4 py-3"
      name="mode"
      value={mode}
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
