import type { Metadata } from "next";

import PersonalizedDashboard from "@/components/dashboard/personalized-dashboard";
import { getDashboardPageState } from "@/lib/data";
import { isAiConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Today's Briefing — Daily Intelligence",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string; allread?: string }>;
}) {
  const [params, pageState] = await Promise.all([
    searchParams,
    getDashboardPageState("/dashboard"),
  ]);

  return (
    <PersonalizedDashboard
      searchParams={params}
      data={pageState.data}
      viewer={pageState.viewer}
      isAiConfigured={isAiConfigured}
    />
  );
}
