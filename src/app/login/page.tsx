import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { LoginForm } from "@/components/auth/LoginForm";
import { safePostAuthRedirectPath } from "@/lib/auth";
import { getViewerAccount } from "@/lib/data";

export const metadata: Metadata = {
  title: "Login — Daily Intelligence",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const [params, viewer] = await Promise.all([
    searchParams,
    getViewerAccount("/login"),
  ]);
  const redirectTo = safePostAuthRedirectPath(params.redirectTo, "/");

  if (viewer) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Sign in</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Continue to your Daily Intelligence account.
          </p>
        </div>
        <LoginForm redirectTo={redirectTo} />
        <div className="flex items-center justify-between gap-3 text-sm">
          <Link
            href="/forgot-password"
            className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
          >
            Forgot Password?
          </Link>
          <Link
            href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
          >
            Create account
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="text-xs font-semibold uppercase tracking-normal text-[var(--muted)]">Or</span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>
        <GoogleAuthButton redirectPath={redirectTo} />
      </div>
    </main>
  );
}
