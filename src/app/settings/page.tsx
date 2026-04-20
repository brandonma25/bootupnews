import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Database,
  ExternalLink,
  Key,
  Lock,
  Rss,
  Server,
  Shield,
  Sparkles,
  User,
  Zap,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { FeaturePlaceholder } from "@/components/feature-placeholder";
import { SettingsPreferences } from "@/components/settings-preferences";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getDashboardPageState } from "@/lib/data";
import { env, isAiConfigured, isSupabaseConfigured } from "@/lib/env";
import { buildPersonalizationTopicOptions, buildSuggestedEntities } from "@/lib/personalization";

export const metadata: Metadata = {
  title: "Settings — Daily Intelligence",
};

const setupItems = [
  {
    label: "Supabase URL",
    icon: Server,
    ready: isSupabaseConfigured,
    value: env.supabaseUrl || "Not connected",
    helpText: "Set NEXT_PUBLIC_SUPABASE_URL in your environment variables.",
    docsUrl: "https://supabase.com/docs/guides/getting-started",
  },
  {
    label: "Supabase anon key",
    icon: Key,
    ready: isSupabaseConfigured,
    value: env.supabaseAnonKey ? "Connected" : "Not connected",
    helpText:
      "Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment variables.",
    docsUrl: "https://supabase.com/docs/guides/getting-started",
  },
  {
    label: "AI provider key",
    icon: Zap,
    ready: isAiConfigured,
    value: env.openAiApiKey ? "Connected" : "Not connected",
    helpText: "Set OPENAI_API_KEY (or compatible) in your environment variables. Required to generate briefings.",
    docsUrl: "https://platform.openai.com/api-keys",
  },
];

const connectedCount = [isSupabaseConfigured, isSupabaseConfigured, isAiConfigured].filter(Boolean).length;

const accountSettingsFeatures = [
  {
    icon: User,
    title: "Profile details",
    description: "Name, preferred email, and the account identity shown across the app.",
    comingSoonNote: "Profile editing and account identity sync are still in development, so there are no editable fields here yet.",
  },
  {
    icon: Sparkles,
    title: "Briefing preferences",
    description: "Default topics, reading order, and whether the dashboard opens in personal or public mode.",
    href: "/topics",
    hrefLabel: "Manage topics",
  },
  {
    icon: Rss,
    title: "Source controls",
    description: "Add and review RSS feeds that power your briefing today.",
    href: "/sources",
    hrefLabel: "Manage sources",
    supportingNote: "Source editing, pause or resume controls, and feed health tools are still in development.",
  },
  {
    icon: Bell,
    title: "Delivery cadence",
    description: "Email digests, refresh timing, and notification reminders for the daily briefing window.",
    comingSoonNote: "Delivery timing, digest scheduling, and reminder controls are not wired up yet, so this section stays in placeholder mode.",
  },
];

const accountManagementFeatures = [
  {
    icon: Shield,
    title: "Security and sessions",
    description: "Magic-link login activity, sign-out from other devices, and account verification status.",
    comingSoonNote: "Session history, device management, and broader security controls are planned but not available yet.",
  },
  {
    icon: Database,
    title: "Data controls",
    description: "Export briefing history, clear saved reads, and request account deletion when needed.",
    comingSoonNote: "Export, deletion, and account-level data controls need backend support before they can be offered safely.",
  },
];

export default async function SettingsPage() {
  const { viewer, data } = await getDashboardPageState("/settings");
  const allConnected = isSupabaseConfigured && isAiConfigured;
  const personalizationTopics = buildPersonalizationTopicOptions(data.topics, data.briefing.items);
  const suggestedEntities = buildSuggestedEntities(data.briefing.items);

  return (
    <AppShell currentPath="/settings" mode={isSupabaseConfigured ? "live" : "demo"} account={viewer}>
      <div className="space-y-5 py-2">
        <PageHeader
          eyebrow="Settings"
          title={allConnected ? "Account and app settings" : "Connect the services that power the live product"}
          description={
            allConnected
              ? "Manage your personal preferences, briefing settings, and account controls."
              : "The app runs in demo mode without setup. Add Supabase and your AI key to save user data, ingest live feeds, and generate real briefings."
          }
        />

        {/* Setup progress */}
        {allConnected ? (
          <Panel className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-[var(--sidebar)]">
                <CheckCircle2 className="h-4 w-4 text-[var(--text-primary)]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">All services connected</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Supabase and AI provider are live. The app is running in connected mode.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="text-[var(--text-primary)]">Supabase</Badge>
                <Badge className="text-[var(--text-primary)]">AI provider</Badge>
              </div>
            </div>
          </Panel>
        ) : (
          <>
            {/* Progress indicator */}
            <Panel className="p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Setup progress
                </p>
                <Badge className={connectedCount === 3 ? "text-[var(--text-primary)]" : ""}>
                  {connectedCount} / 3 connected
                </Badge>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-button bg-[var(--border)]">
                <div
                  className="h-full rounded-button bg-[var(--text-primary)] transition-all"
                  style={{ width: `${(connectedCount / 3) * 100}%` }}
                />
              </div>
            </Panel>

            {/* Service cards */}
            <div className="grid gap-4 lg:grid-cols-3">
              {setupItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Panel key={item.label} className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-card ${item.ready ? "bg-[var(--sidebar)]" : "bg-[var(--warm)]"}`}>
                          <Icon className={`h-4 w-4 ${item.ready ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`} />
                        </span>
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {item.label}
                        </p>
                      </div>
                      <Badge className={item.ready ? "shrink-0 text-[var(--text-primary)]" : "shrink-0"}>
                        {item.ready ? "Ready" : "Pending"}
                      </Badge>
                    </div>

                    <p className={`mt-3 text-xs leading-5 ${item.ready ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}`}>
                      {item.ready ? item.value : item.helpText}
                    </p>

                    {!item.ready ? (
                      <a
                        href={item.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        Setup guide
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </Panel>
                );
              })}
            </div>
          </>
        )}

        {/* Account Settings */}
        <Panel id="account-settings" className="scroll-mt-24 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
                Account settings
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                Personal preferences
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                Settings that shape how each signed-in reader experiences the product.
              </p>
            </div>

            {viewer ? (
              <div className="flex shrink-0 items-center gap-3 rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-[var(--text-primary)] text-sm font-semibold text-white">
                  {viewer.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {viewer.displayName}
                  </p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">{viewer.email}</p>
                </div>
              </div>
            ) : (
              <div className="flex shrink-0 flex-col gap-3 rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:flex-row sm:items-center">
                <p className="text-sm text-[var(--text-primary)]">
                  Sign in to unlock personal account controls.
                </p>
                <Link href="/#email-access">
                  <Button variant="secondary" className="gap-2 whitespace-nowrap text-sm">
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {accountSettingsFeatures.map((item) => {
              const Icon = item.icon;
              if ("comingSoonNote" in item) {
                return (
                  <FeaturePlaceholder
                    key={item.title}
                    icon={Icon}
                    title={item.title}
                    description={item.description}
                    note={item.comingSoonNote ?? ""}
                    compact
                  />
                );
              }

              return (
                <div
                  key={item.title}
                  className="flex flex-col rounded-card border border-[var(--border)] bg-[var(--card)] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-[var(--warm)]">
                      <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
                    </span>
                    {!viewer && <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                  {"supportingNote" in item ? (
                    <p className="mt-3 rounded-card border border-[var(--border)] bg-[var(--panel)]/45 px-3 py-2 text-xs leading-5 text-[var(--text-primary)]">
                      {item.supportingNote}
                    </p>
                  ) : null}
                  {viewer && item.href ? (
                    <Link
                      href={item.href}
                      className="mt-3 flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)] hover:underline"
                    >
                      {item.hrefLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Panel>

        <SettingsPreferences
          defaultEmail={viewer?.email}
          availableTopics={personalizationTopics}
          suggestedEntities={suggestedEntities}
          signedIn={Boolean(viewer)}
        />

        {/* Account Management */}
        <Panel id="account-management" className="scroll-mt-24 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-secondary)]">
              Account management
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              Ownership and controls
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Account-level governance, privacy, and lifecycle controls.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {accountManagementFeatures.map((item) => {
              const Icon = item.icon;
              return (
                <FeaturePlaceholder
                  key={item.title}
                  icon={Icon}
                  title={item.title}
                  description={item.description}
                  note={item.comingSoonNote}
                  compact
                />
              );
            })}
          </div>
        </Panel>

        {/* Launch requirements — only in demo/unconfigured mode */}
        {!isSupabaseConfigured && (
          <Panel className="p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">What you need for launch</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {[
                { icon: Database, text: "A Supabase project for login and the database." },
                { icon: Zap, text: "An OpenAI-compatible API key for summaries." },
                { icon: Server, text: "A Vercel account for deployment." },
                { icon: Rss, text: "Your starting list of RSS feeds and topic categories." },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-start gap-3 rounded-card border border-[var(--border)] bg-[var(--card)] p-4"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-button bg-[var(--warm)]">
                    <Icon className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  </span>
                  <p className="text-sm leading-6 text-[var(--text-primary)]">{text}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
