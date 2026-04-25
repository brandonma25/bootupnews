import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DateGroupHeader } from "@/components/history/DateGroupHeader";
import { HistoryEmptyState } from "@/components/history/HistoryEmptyState";
import { StoryPreviewRow } from "@/components/history/StoryPreviewRow";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getHistoryPageState } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { getBriefingDateKey } from "@/lib/utils";

export const metadata: Metadata = {
  title: "History — Daily Intelligence",
};

export default async function HistoryPage() {
  const { history, viewer } = await getHistoryPageState("/history");
  const mode = viewer ? "live" : isSupabaseConfigured ? "public" : "demo";

  return (
    <AppShell currentPath="/history" mode={mode} account={viewer}>
      <div className="space-y-5 py-2">
        <PageHeader
          eyebrow="History"
          title="Briefing history"
          description="Review saved daily briefings by date and reopen the full briefing detail."
        />

        {!viewer ? (
          <HistorySoftGate />
        ) : history.length === 0 ? (
          <HistoryEmptyState />
        ) : (
          <div className="space-y-4">
            {history.map((briefing) => {
              const dateKey = getBriefingDateKey(briefing.briefingDate);
              const previewItems = briefing.items.slice(0, 4);

              return (
                <Panel key={briefing.id} className="p-5">
                  <DateGroupHeader date={dateKey} briefingDate={dateKey} />
                  <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <h2 className="briefing-title text-[var(--text-primary)]">
                        {briefing.title}
                      </h2>
                      <p className="mt-2 text-base text-[var(--text-secondary)]">
                        {briefing.intro}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Badge>{briefing.items.length} {briefing.items.length === 1 ? "event" : "events"}</Badge>
                      <Badge>{briefing.readingWindow}</Badge>
                    </div>
                  </div>
                  {previewItems.length ? (
                    <div className="mt-4 space-y-1">
                      {previewItems.map((item) => (
                        <StoryPreviewRow key={item.id} title={item.title} />
                      ))}
                    </div>
                  ) : null}
                </Panel>
              );
            })}
          </div>
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
          <p className="text-base font-semibold text-[var(--text-primary)]">
            Sign in to view briefing history
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Home Top Events stay public. Saved briefing history is account-only.
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
