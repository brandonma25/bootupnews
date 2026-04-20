import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found — Daily Intelligence",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="rounded-card border border-[var(--border)] bg-[var(--card)] p-8 text-center max-w-sm w-full">
        <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
          404
        </p>
        <h1 className="mt-3 text-2xl text-[var(--text-primary)]">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Head back to the dashboard to continue your daily briefing.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-button bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          Go to Today
        </Link>
      </div>
    </div>
  );
}
