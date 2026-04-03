import Link from "next/link";
import { Newspaper, Settings2, History, Rss, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Today", icon: Newspaper },
  { href: "/topics", label: "Topics", icon: Layers3 },
  { href: "/sources", label: "Sources", icon: Rss },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({
  children,
  currentPath,
  mode,
}: {
  children: React.ReactNode;
  currentPath: string;
  mode: "demo" | "live";
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-6 px-4 py-4 lg:px-6">
      <aside className="hidden w-[280px] shrink-0 lg:block">
        <Panel className="sticky top-4 flex min-h-[calc(100vh-2rem)] flex-col justify-between p-6">
          <div className="space-y-10">
            <div className="space-y-4">
              <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">Daily Intelligence</Badge>
              <div className="space-y-2">
                <h1 className="display-font text-3xl leading-none text-[var(--foreground)]">
                  Aggregator
                </h1>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  High-signal daily briefings built for fast executive scanning.
                </p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--foreground)] text-white"
                        : "text-[var(--foreground)] hover:bg-white/60",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="rounded-[24px] border border-[var(--line)] bg-[var(--warm)]/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Mode
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
              {mode === "demo"
                ? "Demo mode is active. Connect Supabase and your AI key to save data and generate live briefings."
                : "Live mode is active. Your saved topics, sources, and briefings are connected."}
            </p>
          </div>
        </Panel>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
