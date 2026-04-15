import { AppShell } from "@/components/app-shell";
import { DashboardStatePanel } from "@/components/dashboard/dashboard-state-panel";

export default function Loading() {
  return (
    <AppShell currentPath="/dashboard" mode="public" account={null}>
      <div className="space-y-5 py-2">
        <DashboardStatePanel
          title="Fetching your intelligence…"
          description="We’re loading your dashboard, clustering the latest reporting, and getting Today’s Briefing ready."
          tone="accent"
          loading
          meta={
            <>
              <span className="rounded-full border border-[rgba(31,79,70,0.12)] bg-white/80 px-3 py-1.5">
                Live dashboard refresh
              </span>
              <span className="rounded-full border border-[rgba(31,79,70,0.12)] bg-white/80 px-3 py-1.5">
                Pulling the latest signals
              </span>
            </>
          }
        />
      </div>
    </AppShell>
  );
}
