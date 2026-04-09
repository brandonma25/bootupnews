import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found — Daily Intelligence",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="rounded-[32px] border border-[var(--line)] bg-white/70 p-8 text-center max-w-sm w-full">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          404
        </p>
        <h1 className="display-font mt-3 text-2xl text-[var(--foreground)]">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Head back to the dashboard to continue your daily briefing.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          Go to Today
        </Link>
      </div>
    </div>
  );
}
