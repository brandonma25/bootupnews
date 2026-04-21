import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { BriefingDetailView } from "@/components/briefing/BriefingDetailView";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getBriefingDetailPageState } from "@/lib/data";
import { isValidBriefingDateKey } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Briefing Detail — Daily Intelligence",
};

export default async function BriefingDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  if (!isValidBriefingDateKey(date)) {
    notFound();
  }

  const { data, briefing, viewer } = await getBriefingDetailPageState(date, `/briefing/${date}`);

  if (!briefing) {
    return (
      <AppShell currentPath={`/briefing/${date}`} mode={data.mode} account={viewer}>
        <div className="py-2">
          <Panel className="p-6">
            <p className="section-label">Briefing unavailable</p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              This briefing is not available
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--text-secondary)]">
              Public access is limited to the current Top Events briefing. Sign in and open History to review saved briefing dates.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/login?redirectTo=${encodeURIComponent(`/briefing/${date}`)}`}>
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/">Back home</Link>
              </Button>
            </div>
          </Panel>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentPath={`/briefing/${date}`} mode={data.mode} account={viewer}>
      <BriefingDetailView data={{ ...data, briefing }} viewer={viewer} />
    </AppShell>
  );
}
