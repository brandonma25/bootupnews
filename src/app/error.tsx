"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    captureRouteError(error);
    console.error("Route error boundary triggered.", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[960px] items-center px-4 py-10">
      <div className="glass-panel w-full rounded-card p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-[var(--card)] text-[var(--error)]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-normal text-[var(--text-secondary)]">
              Temporary issue
            </p>
            <h1 className="text-xl font-medium text-[var(--text-primary)] md:text-2xl">
              This page hit a server problem, but the app is still recoverable.
            </h1>
            <p className="max-w-2xl text-base text-[var(--text-secondary)]">
              Try the page again, or head back home while we fall back to safer defaults.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-button bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                <RotateCcw className="h-4 w-4" />
                Retry page
              </button>
              <Link
                href="/"
                className="inline-flex items-center rounded-button border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-medium text-[var(--text-primary)]"
              >
                Open Home
              </Link>
            </div>
            {error.digest ? (
              <p className="text-xs leading-6 text-[var(--text-secondary)]">Error digest: {error.digest}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function captureRouteError(error: Error) {
  Sentry.withScope((scope) => {
    if (isRssRelatedRenderError(error)) {
      scope.setTag("component", "rss");
      scope.setTag("rss.phase", "render");
    }

    Sentry.captureException(error);
  });
}

function isRssRelatedRenderError(error: Error) {
  return /rss|feed|source|ingestion|briefing|signal_posts/i.test(error.message);
}
