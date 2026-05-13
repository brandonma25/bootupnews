import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { HistoryEmptyState } from "@/components/history/HistoryEmptyState";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { isAdminUser } from "@/lib/admin-auth";
import { getHistoryPageState } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { getBriefingDateKey } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Bootup News — Past briefings",
};

export default async function HistoryPage() {
  const { history, viewer } = await getHistoryPageState("/history");
  const mode = viewer ? "live" : isSupabaseConfigured ? "public" : "demo";

  return (
    <AppShell
      currentPath="/history"
      mode={mode}
      account={viewer}
      isAdmin={isAdminUser({ email: viewer?.email ?? undefined })}
    >
      <div className="mx-auto w-full max-w-[var(--bu-container-narrow)] px-[var(--bu-space-2)] py-[var(--bu-space-7)] md:px-0">
        {!viewer ? (
          <HistorySoftGate />
        ) : history.length === 0 ? (
          <HistoryEmptyState />
        ) : (
          <section>
            <h1 className="text-[var(--bu-size-page-title)] font-medium leading-tight text-[var(--bu-text-primary)]">
              Past briefings
            </h1>
            <div className="mt-[var(--bu-space-5)] divide-y divide-[var(--bu-border-subtle)] border-y border-[var(--bu-border-subtle)]">
              {history.map((briefing) => {
                const dateKey = getBriefingDateKey(briefing.briefingDate);

                return (
                  <Link
                    key={briefing.id}
                    href={`/briefing/${dateKey}`}
                    className="flex items-center justify-between gap-4 px-[var(--bu-space-3)] py-[var(--bu-space-4)] transition-colors hover:bg-[var(--bu-bg-subtle)]"
                  >
                    <span className="text-[var(--bu-size-card-title)] font-medium leading-tight text-[var(--bu-text-primary)]">
                      {formatHistoryDate(dateKey)}
                    </span>
                    <span className="text-[var(--bu-size-meta)] font-normal text-[var(--bu-text-tertiary)]">
                      {briefing.items.length} {briefing.items.length === 1 ? "signal" : "signals"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function HistorySoftGate() {
  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h1 className="text-base font-medium text-[var(--bu-text-primary)]">
            Sign in to view briefing history
          </h1>
          <p className="mt-2 text-sm text-[var(--bu-text-secondary)]">
            Today&apos;s signals stay public. Saved briefing history is account-only.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/login?redirectTo=/history">Sign in</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/signup?redirectTo=/history">Create account</Link>
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function formatHistoryDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00.000Z`));
}
