"use client";

import { signInWithProviderAction } from "@/app/actions";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AuthModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              Create your account
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Choose a provider to continue.
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

        <div className="space-y-3">
          <form action={signInWithProviderAction}>
            <input type="hidden" name="provider" value="google" />
            <button
              type="submit"
              className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:translate-y-[-1px]"
            >
              Continue with Google
            </button>
          </form>

          <form action={signInWithProviderAction}>
            <input type="hidden" name="provider" value="apple" />
            <button
              type="submit"
              className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:translate-y-[-1px]"
            >
              Continue with Apple
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
