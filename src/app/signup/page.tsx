import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { SignupForm } from "@/components/auth/SignupForm";
import { safePostAuthRedirectPath } from "@/lib/auth";
import { getViewerAccount } from "@/lib/data";

export const metadata: Metadata = {
  title: "Signup — Daily Intelligence",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const [params, viewer] = await Promise.all([
    searchParams,
    getViewerAccount("/signup"),
  ]);
  const redirectTo = safePostAuthRedirectPath(params.redirectTo, "/");

  if (viewer) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Create account</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Create your Daily Intelligence account.
          </p>
        </div>
        <SignupForm redirectTo={redirectTo} />
        <div className="text-center text-sm">
          <Link
            href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
          >
            Already have an account? Sign in
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
