import type { Metadata } from "next";

import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Signup — Daily Intelligence",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-5">
        <SignupForm />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Or</span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>
        <GoogleAuthButton />
      </div>
    </main>
  );
}
