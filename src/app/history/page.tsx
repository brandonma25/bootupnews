import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getHistory, getViewerAccount } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { formatBriefingDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "History — Daily Intelligence",
};

export default async function HistoryPage() {
  const history = await getHistory();
  const viewer = await getViewerAccount();
  const isGuest = !viewer && isSupabaseConfigured;
  const isDemo = !isSupabaseConfigured;

  return (
    <AppShell
      currentPath="/history"
      mode={viewer ? "live" : isSupabaseConfigured ? "public" : "demo"}
      account={viewer}
    >
      <div className="space-y-5 py-2">
        <PageHeader
          eyebrow="Briefing history"
          title="Review previous daily briefings"
          description="Go back to prior scans, revisit stories you skipped, and build a lightweight knowledge trail over time."
        />

        {/* Guest / demo context banners */}
        {isGuest ? (
          <div className="flex flex-col gap-4 rounded-[22px] border border-[var(--line)] bg-white/70 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Sample history shown
              </p>
              <p className="text-sm text-[var(--muted)]">
                Sign in to see your personal briefing history — every daily briefing you generate is saved here automatically.
              </p>
            </div>
            <Link
              href="/#email-access"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-white"
            >
              Sign in
            </Link>
          </div>
        ) : null}

        {isDemo ? (
          <div className="rounded-[22px] border border-[var(--line)] bg-white/70 px-5 py-4 text-sm text-[var(--foreground)]">
            Demo mode — sample briefing history shown.{" "}
            <Link href="/settings" className="font-semibold underline underline-offset-2">
              Connect Supabase
            </Link>{" "}
            to save real briefing history.
          </div>
        ) : null}

        {history.length === 0 ? (
          <Panel className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--warm)]">
              <BookOpen className="h-5 w-5 text-[var(--muted)]" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[var(--foreground)]">
              No briefings yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
              Once you generate your first daily briefing from the{" "}
              <Link href="/dashboard" className="font-semibold underline underline-offset-2">
                Today
              </Link>{" "}
              page, it will appear here.
            </p>
          </Panel>
        ) : (
          <div className="grid gap-3">
            {history.map((briefing) => (
              <Panel key={briefing.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      {formatBriefingDate(briefing.briefingDate)}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {briefing.title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                      {briefing.intro}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Badge>{briefing.items.length} {briefing.items.length === 1 ? "story" : "stories"}</Badge>
                    <Badge>{briefing.readingWindow}</Badge>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
