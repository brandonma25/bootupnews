import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { env, isAiConfigured, isSupabaseConfigured } from "@/lib/env";

const setupItems = [
  {
    label: "Supabase URL",
    ready: isSupabaseConfigured,
    value: env.supabaseUrl || "Not connected",
  },
  {
    label: "Supabase anon key",
    ready: isSupabaseConfigured,
    value: env.supabaseAnonKey ? "Connected" : "Not connected",
  },
  {
    label: "AI provider key",
    ready: isAiConfigured,
    value: env.openAiApiKey ? "Connected" : "Not connected",
  },
];

export default function SettingsPage() {
  return (
    <AppShell currentPath="/settings" mode={isSupabaseConfigured ? "live" : "demo"}>
      <div className="space-y-6 py-2">
        <PageHeader
          eyebrow="Settings"
          title="Connect the services that power the live product"
          description="The app runs in demo mode without setup. Add Supabase and your AI key when you are ready to save user data, ingest live feeds, and generate real briefings."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {setupItems.map((item) => (
            <Panel key={item.label} className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--foreground)]">{item.label}</p>
                <Badge className={item.ready ? "text-[var(--accent)]" : ""}>
                  {item.ready ? "Ready" : "Pending"}
                </Badge>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{item.value}</p>
            </Panel>
          ))}
        </div>

        <Panel className="p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">What you need for launch</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              "A Supabase project for login and the database.",
              "An OpenAI-compatible API key for summaries.",
              "A Vercel account for deployment.",
              "Your starting list of RSS feeds and topic categories.",
            ].map((line) => (
              <div key={line} className="rounded-[22px] border border-[var(--line)] bg-white/60 p-4 text-sm leading-7 text-[var(--foreground)]">
                {line}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
