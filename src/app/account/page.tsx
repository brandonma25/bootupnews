import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountPageClient } from "@/components/account/AccountPageClient";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { getAccountPageState } from "@/lib/data";

export const metadata: Metadata = {
  title: "Account — Daily Intelligence",
};

export default async function AccountPage() {
  const { data, viewer, sources, preferences } = await getAccountPageState("/account");

  if (!viewer) {
    redirect("/login?redirectTo=/account");
  }

  return (
    <AppShell currentPath="/account" mode={data.mode} account={viewer}>
      <div className="space-y-5 py-2">
        <PageHeader
          eyebrow="Account"
          title="Manage your briefing account"
          description="Profile, RSS feeds, category preferences, newsletter delivery, and sign out live here in V1."
        />
        <AccountPageClient
          viewer={viewer}
          sources={sources}
          preferences={preferences}
        />
      </div>
    </AppShell>
  );
}
