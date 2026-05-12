import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountPageClient } from "@/components/account/AccountPageClient";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { isAdminUser } from "@/lib/admin-auth";
import { getAccountPageState } from "@/lib/data";

export const metadata: Metadata = {
  title: "Boot Up — Account",
};

export default async function AccountPage() {
  const { viewer, sources, preferences } = await getAccountPageState("/account");

  if (!viewer) {
    redirect("/login?redirectTo=/account");
  }

  return (
    <AppShell
      currentPath="/account"
      mode="live"
      account={viewer}
      isAdmin={isAdminUser({ email: viewer.email })}
    >
      <div className="space-y-5 py-2">
        <PageHeader
          eyebrow="Account"
          title="Account"
          description="Profile, RSS feeds, category preferences, newsletter delivery, and sign out live here in V1."
        />
        <AccountPageClient
          viewer={viewer}
          sources={sources}
          preferences={preferences}
          isAdmin={isAdminUser({ email: viewer.email })}
        />
      </div>
    </AppShell>
  );
}
