import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="rounded-[32px] border border-[var(--line)] bg-white/70 p-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Page not found
        </p>
        <h1 className="display-font mt-4 text-4xl text-[var(--foreground)]">
          This page does not exist.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Head back to the dashboard to continue reviewing your daily briefing.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
