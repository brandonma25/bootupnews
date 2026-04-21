"use client";

import Link from "next/link";
import { useState } from "react";
import {
  History,
  House,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
} from "lucide-react";

import { signOutAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { ViewerAccount } from "@/lib/types";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/history", label: "History", icon: History },
  { href: "/account", label: "Account", icon: UserRound },
];

export function AppShell({
  children,
  currentPath,
  account,
}: {
  children: React.ReactNode;
  currentPath: string;
  mode: "demo" | "live" | "public";
  account?: ViewerAccount | null;
}) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-4 px-4 py-4 pb-24 lg:px-6 lg:pb-4">
      <aside
        className={cn(
          "hidden shrink-0 transition-[width] duration-300 lg:block",
          desktopCollapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        <SidebarPanel
          currentPath={currentPath}
          account={account}
          collapsed={desktopCollapsed}
          onToggleCollapse={() => setDesktopCollapsed((value) => !value)}
        />
      </aside>

      <main className="min-w-0 flex-1">{children}</main>

      <MobileBottomTabs currentPath={currentPath} />
    </div>
  );
}

function isActivePath(currentPath: string, href: string) {
  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function SidebarPanel({
  currentPath,
  account,
  collapsed,
  onToggleCollapse,
}: {
  currentPath: string;
  account?: ViewerAccount | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <Panel className="sticky top-4 flex min-h-[calc(100vh-2rem)] w-full flex-col justify-between p-5 transition-all duration-300">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-2">
          {collapsed ? (
            <div className="flex w-full flex-col items-center gap-3">
              <Badge className="px-2.5 py-1 text-xs">DI</Badge>
              <p className="text-center text-lg font-semibold text-[var(--text-primary)]">DIA</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Badge>Daily Intelligence</Badge>
              <div>
                <h1 className="text-xl font-semibold text-[var(--text-primary)]">Aggregator</h1>
                <p className="mt-1.5 text-xs leading-5 text-[var(--text-secondary)]">
                  High-signal daily briefings for fast executive scanning.
                </p>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            className="h-9 w-9 shrink-0 rounded-button px-0"
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="space-y-1" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(currentPath, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-none border-l-2 text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                  active
                    ? "border-l-[var(--accent)] bg-[var(--sidebar)] text-[var(--text-primary)]"
                    : "border-l-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {collapsed ? null : item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={cn("rounded-card border border-[var(--border)] bg-[var(--card)]", collapsed ? "p-3" : "p-4")}>
        {collapsed ? (
          <UserRound className="mx-auto h-4 w-4 text-[var(--text-secondary)]" />
        ) : account ? (
          <div className="space-y-3">
            <Link href="/account" className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-[var(--text-primary)] text-sm font-semibold text-white">
                {account.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {account.displayName}
                </p>
                <p className="truncate text-xs text-[var(--text-secondary)]">{account.email}</p>
              </div>
            </Link>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Public briefing</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Sign in to unlock History and Account.
            </p>
            <Link
              href={`/login?redirectTo=${encodeURIComponent(currentPath || "/")}`}
              className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline"
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
    </Panel>
  );
}

function MobileBottomTabs({ currentPath }: { currentPath: string }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--card)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(currentPath, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-button px-2 py-1 text-xs font-semibold transition-colors",
                active
                  ? "bg-[var(--sidebar)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
