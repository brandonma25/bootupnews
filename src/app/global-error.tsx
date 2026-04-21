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
            <h1 className="mt-3 text-xl font-semibold text-[var(--text-primary)] md:text-2xl">
              We hit a larger app error, but the workspace itself is still reachable.
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--text-secondary)]">
              Use the link below to recover.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center rounded-button bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
