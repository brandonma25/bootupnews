import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getHistory } from "@/lib/data";
import { formatBriefingDate } from "@/lib/utils";

export default async function HistoryPage() {
  const history = await getHistory();

  return (
    <AppShell currentPath="/history" mode="demo">
      <div className="space-y-6 py-2">
        <PageHeader
          eyebrow="Briefing history"
          title="Review previous daily briefings"
          description="History helps you go back to prior scans, revisit stories you skipped, and build a lightweight knowledge trail over time."
        />

        <div className="grid gap-4">
          {history.map((briefing) => (
            <Panel key={briefing.id} className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--muted)]">
                    {formatBriefingDate(briefing.briefingDate)}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {briefing.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                    {briefing.intro}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{briefing.items.length} stories</Badge>
                  <Badge>{briefing.readingWindow}</Badge>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
