"use client";

import Link from "next/link";

export default function GlobalError() {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto flex min-h-screen w-full max-w-[960px] items-center px-4 py-10">
          <div className="glass-panel w-full rounded-card p-8">
            <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
              Global fallback
            </p>
            <h1 className="mt-3 text-3xl text-[var(--text-primary)]">
              We hit a larger app error, but the workspace itself is still reachable.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Use the links below to recover, or clear local state if the browser is holding a stale session.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center rounded-button bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                Go home
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-button border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]"
              >
                Open Today
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
